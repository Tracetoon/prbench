import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { buildProvenance, type Draft } from "../scripts/provenance.ts";
import { preflightCase } from "../src/run/preflight.ts";
import { loadCase, type Facts } from "../src/schema/case.ts";
import { exec } from "../src/util/exec.ts";
import { digest } from "../src/util/hash.ts";
import { consensus, majority } from "../src/factreview/aggregate.ts";
import {
  alterClaim,
  plantDefects,
  restates,
  scoreCanaries,
  selectCanaryCases,
} from "../src/factreview/canaries.ts";
import {
  factReview,
  parsePanel,
  summaryLines,
  type FactReviewOptions,
} from "../src/factreview/panel.ts";
import {
  checkCrossExam,
  checkReview,
  sheetOf,
} from "../src/factreview/schema.ts";
import { decide, factDebate } from "../src/factreview/debate.ts";
import { refOf, resolveRef } from "../src/factreview/record.ts";
import { cleanupTemps, copyExample, ROOT, tempDir } from "./helpers.ts";

afterAll(cleanupTemps);
const saved: Record<string, string | undefined> = {};
function env(vars: Record<string, string>): void {
  for (const [k, v] of Object.entries(vars)) {
    if (!(k in saved)) saved[k] = process.env[k];
    process.env[k] = v;
  }
}
afterAll(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

const FAKE = JSON.stringify([
  process.execPath,
  join(import.meta.dir, "fixtures", "fake-reviewer.ts"),
]);
let auth: string;
beforeAll(() => {
  auth = tempDir();
  writeFileSync(join(auth, "auth.json"), '{"generation":1}');
  env({
    PRBENCH_CLAUDE_COMMAND: FAKE,
    PRBENCH_CODEX_COMMAND: FAKE,
    PRBENCH_CLAUDE_OAUTH_TOKEN: "test-token",
    PRBENCH_CODEX_AUTH_HOME: auth,
  });
});

function bareOf(dir: string): string {
  const bare = join(tempDir(), "repo.git");
  exec(["git", "init", "--quiet", "--bare", bare]);
  exec([
    "git",
    "--git-dir",
    bare,
    "fetch",
    "--quiet",
    "--no-tags",
    join(dir, "repo.bundle"),
    "+refs/*:refs/prbench-source/*",
  ]);
  return bare;
}

/** The example case under `id`, with provenance citing the diff for every fact. */
function reviewedCase(id: string): { root: string; dir: string; facts: Facts } {
  const { root, dir } = copyExample(id);
  const facts = JSON.parse(
    readFileSync(join(dir, "facts.json"), "utf8"),
  ) as Facts;
  const draft = Object.fromEntries(
    (["claims", "context", "uncertainties", "traps"] as const).map((k) => [
      k,
      facts[k].map((text) => ({
        text,
        rationale: "from the diff",
        sources: [{ kind: "diff", startLine: 1, endLine: 2 }],
      })),
    ]),
  ) as unknown as Draft;
  const built = buildProvenance(dir, draft, {
    bare: bareOf(dir),
    reviewedBy: "test drafter",
    reviewKind: "automated",
  });
  writeFileSync(
    join(dir, "facts.json"),
    JSON.stringify(built.facts, null, 2) + "\n",
  );
  writeFileSync(
    join(dir, "facts-provenance.json"),
    JSON.stringify(built.provenance, null, 2) + "\n",
  );
  return { root, dir, facts: built.facts };
}

function setup(script: unknown) {
  const work = tempDir("prbench-factreview-test-");
  const scriptFile = join(work, "script.json");
  writeFileSync(scriptFile, JSON.stringify(script));
  mkdirSync(join(work, "state"));
  env({
    FAKE_REVIEW_SCRIPT: scriptFile,
    FAKE_REVIEW_STATE: join(work, "state"),
    FAKE_REVIEW_LOG: join(work, "calls.jsonl"),
  });
  const calls = () =>
    existsSync(join(work, "calls.jsonl"))
      ? readFileSync(join(work, "calls.jsonl"), "utf8")
          .trim()
          .split("\n")
          .map((l) => JSON.parse(l))
      : [];
  return { out: join(work, "run-1"), calls };
}

const OPUS = "claude-opus-5-5";
const SOL = "gpt-6.1-sol";
const run = (o: Partial<FactReviewOptions> & { cases: string; out: string }) =>
  factReview({ log: () => {}, ...o });
const decisions = (out: string, id: string) =>
  JSON.parse(readFileSync(join(out, id, "decisions.json"), "utf8"));

describe("family consensus", () => {
  test("majority and consensus rules", () => {
    expect(majority(["keep", "keep", "revise"])).toBe("keep");
    expect(majority(["keep", "revise", "remove"])).toBeNull();
    const m = (id: string, family: string) => ({ id, family, model: family });
    const a = [
      m("o1", "anthropic"),
      m("o2", "anthropic"),
      m("o3", "anthropic"),
      m("s1", "openai"),
      m("s2", "openai"),
      m("s3", "openai"),
    ];
    const vote = (values: string[]) =>
      consensus(a.map((member, i) => ({ member, value: values[i]! })));
    expect(
      vote(["keep", "keep", "remove", "keep", "revise", "keep"]),
    ).toMatchObject({ status: "settled", value: "keep" });
    expect(
      vote(["keep", "revise", "remove", "keep", "keep", "keep"]),
    ).toMatchObject({ status: "disputed", why: "family-split" });
    expect(
      vote(["remove", "remove", "keep", "keep", "keep", "keep"]),
    ).toMatchObject({
      status: "disputed",
      why: "cross-family",
      byFamily: { anthropic: "remove", openai: "keep" },
    });
  });

  test("panel specs and reply checks", () => {
    expect(
      parsePanel("opus:3,sol:3").map((g) => [g.model, g.family, g.count]),
    ).toEqual([
      [OPUS, "anthropic", 3],
      [SOL, "openai", 3],
    ]);
    expect(parsePanel("codex/gpt-x:2")[0]).toMatchObject({
      provider: "codex",
      model: "gpt-x",
      count: 2,
    });
    expect(() => parsePanel("mystery:2")).toThrow(/unknown panel member/);
    const sheet = sheetOf({
      schema: "prbench.facts/v1",
      claims: ["a"],
      context: [],
      uncertainties: [],
      traps: ["b"],
    });
    const item = (id: string, category: string, extra = {}) => ({
      id,
      category,
      verdict: "keep",
      reason: "r",
      evidenceRefs: [],
      rewrite: null,
      trapIsReal: category === "traps" ? true : null,
      ...extra,
    });
    expect(
      checkReview(
        { items: [item("C1", "claims"), item("T1", "traps")], additions: [] },
        sheet,
      ),
    ).toEqual([]);
    expect(
      checkReview(
        { items: [item("C1", "claims", { verdict: "revise" })], additions: [] },
        sheet,
      ),
    ).toEqual(["C1: a revise verdict needs a rewrite", "T1: not reviewed"]);
    expect(
      checkReview(
        {
          items: [
            item("C1", "claims"),
            item("T1", "traps", { trapIsReal: false }),
          ],
          additions: [],
        },
        sheet,
      ),
    ).toEqual(["T1: a trap that is not real cannot be kept as it is"]);
  });
});

describe("fact-review with a fake panel", () => {
  test("consensus keep leaves the sheet as it was, in read-only sandboxes, blind", async () => {
    const { root, facts } = reviewedCase("keep-all");
    const { out, calls } = setup({});
    const s = await run({ cases: root, out });
    expect(s.counts).toMatchObject({
      items: 9,
      settled: 9,
      kept: 9,
      disputed: 0,
      revised: 0,
      removed: 0,
      added: 0,
    });
    expect(s.calls).toBe(6);
    expect(
      JSON.parse(readFileSync(join(out, "keep-all", "facts.json"), "utf8")),
    ).toEqual(facts);
    expect(readdirSync(join(out, "keep-all", "round-1")).sort()).toEqual([
      "opus-1.json",
      "opus-2.json",
      "opus-3.json",
      "sol-1.json",
      "sol-2.json",
      "sol-3.json",
      "summary.json",
    ]);
    expect(
      readFileSync(join(out, "keep-all", "human-review.md"), "utf8"),
    ).toContain("Nothing disputed");
    const log = calls();
    expect(
      log.filter((c) => c.provider === "claude" && c.model === OPUS),
    ).toHaveLength(3);
    expect(
      log.filter((c) => c.provider === "codex" && c.model === SOL),
    ).toHaveLength(3);
    for (const c of log) {
      expect(c.files).toEqual(
        expect.arrayContaining([
          "README.md",
          "diff.patch",
          "commits",
          "raw",
          "base",
          "head",
          "repo.git",
          "sheet.json",
        ]),
      );
      expect(c.files.some((f: string) => f.startsWith("facts"))).toBe(false);
      expect(c.prompt).not.toMatch(
        /opus|claude|anthropic|gpt|codex|drafted by|probably correct/i,
      );
      if (c.provider === "claude") {
        expect(c.args[c.args.indexOf("--tools") + 1]).toBe("Read,Grep,Glob");
        expect(c.args[c.args.indexOf("--allowedTools") + 1]).toBe(
          "Read,Grep,Glob",
        );
        expect(c.args[c.args.indexOf("--disallowedTools") + 1]).toContain(
          "Bash",
        );
        expect(c.args).toEqual(
          expect.arrayContaining([
            "--effort",
            "xhigh",
            "--no-session-persistence",
            "--strict-mcp-config",
          ]),
        );
      } else {
        expect(c.args).toEqual(
          expect.arrayContaining([
            "-s",
            "read-only",
            "-C",
            c.cwd,
            'model_reasoning_effort="xhigh"',
            'approval_policy="never"',
          ]),
        );
        expect(c.args).not.toContain("shell_tool");
      }
    }
    // The same call twice is refused without --resume, and reused with it.
    await expect(run({ cases: root, out })).rejects.toThrow(/--resume/);
    const again = await run({ cases: root, out, resume: true });
    expect(again).toMatchObject({ calls: 0, cachedCalls: 6 });
  });

  test("a family split or cross-family disagreement is disputed and listed for humans", async () => {
    const { root } = reviewedCase("split");
    const { out } = setup({
      "*": {
        review: {
          [OPUS]: [
            { C1: { verdict: "remove", reason: "opus one" } },
            {
              C1: { verdict: "revise", rewrite: "A rewrite." },
              X1: { verdict: "remove" },
            },
            { X1: { verdict: "remove", reason: "not in the evidence" } },
          ],
          [SOL]: [{ X1: { verdict: "keep" } }, {}, {}],
        },
      },
    });
    const s = await run({ cases: root, out });
    expect(s.counts).toMatchObject({ items: 9, disputed: 2, kept: 7 });
    const d = decisions(out, "split");
    const c1 = d.items.find((i: any) => i.id === "C1");
    expect(c1).toMatchObject({
      outcome: "disputed",
      round1: {
        consensus: {
          status: "disputed",
          why: "family-split",
          byFamily: { anthropic: null, openai: "keep" },
        },
      },
    });
    expect(d.items.find((i: any) => i.id === "X1")).toMatchObject({
      outcome: "disputed",
      round1: {
        consensus: {
          why: "cross-family",
          byFamily: { anthropic: "remove", openai: "keep" },
        },
      },
    });
    const human = readFileSync(join(out, "split", "human-review.md"), "utf8");
    expect(human).toContain("## C1 (claims)");
    expect(human).toContain("## X1 (context)");
    expect(human).toContain("not in the evidence");
    expect(human).not.toContain("## C2");
  });

  test("an agreed revision is synthesized, then accepted in round 2", async () => {
    const { root } = reviewedCase("revise");
    const rewrite =
      'Empty, whitespace-only and missing names all produce "Hello, world!".';
    const all = (o: object) => [o, o, o];
    const { out, calls } = setup({
      "*": {
        review: {
          [OPUS]: all({ C2: { verdict: "revise", rewrite } }),
          [SOL]: all({ C2: { verdict: "revise", rewrite: `${rewrite}!` } }),
        },
      },
    });
    const s = await run({ cases: root, out });
    expect(s.counts).toMatchObject({ revised: 1, kept: 8, disputed: 0 });
    const d = decisions(out, "revise");
    expect(d.items.find((i: any) => i.id === "C2")).toMatchObject({
      outcome: "revised",
      finalText: rewrite,
      round: 2,
      rewriteRounds: [
        { round: 2, consensus: { status: "settled", value: "accept" } },
      ],
    });
    const facts = JSON.parse(
      readFileSync(join(out, "revise", "facts.json"), "utf8"),
    );
    expect(facts.claims[1]).toBe(rewrite);
    const log = calls();
    expect(log.filter((c) => c.kind === "rewrite")).toHaveLength(1);
    expect(log.find((c) => c.kind === "rewrite").model).toBe(OPUS);
    expect(log.filter((c) => c.kind === "vote")).toHaveLength(6);
    expect(
      existsSync(join(out, "revise", "round-2", "synthesis-revisions.json")),
    ).toBe(true);
    expect(existsSync(join(out, "revise", "round-2", "summary.json"))).toBe(
      true,
    );
  });

  test("a rewrite the families split on stays disputed after the last round", async () => {
    const { root } = reviewedCase("revise-reject");
    const all = (o: object) => [o, o, o];
    const { out } = setup({
      "*": {
        review: {
          [OPUS]: all({ C2: { verdict: "revise", rewrite: "New text." } }),
          [SOL]: all({ C2: { verdict: "revise", rewrite: "New text." } }),
        },
        vote: { [SOL]: all({ "R:C2": "reject" }) },
      },
    });
    const s = await run({ cases: root, out, rounds: 3 });
    expect(s.counts).toMatchObject({ revised: 0, disputed: 1 });
    const c2 = decisions(out, "revise-reject").items.find(
      (i: any) => i.id === "C2",
    );
    expect(c2.rewriteRounds.map((r: any) => r.round)).toEqual([2, 3]);
    expect(c2.rewriteRounds[1].candidate.text).toBe("New text. (refined)");
    expect(c2.finalText).toBe(c2.text);
    expect(
      readFileSync(join(out, "revise-reject", "human-review.md"), "utf8"),
    ).toContain("Round 3 vote on a rewrite");
  });

  test("additions are clustered; clusters from two or more reviewers go to the vote", async () => {
    const { root } = reviewedCase("adds");
    const shared = { category: "context", text: "greet() lives in greet.js." };
    const { out, calls } = setup({
      "*": {
        review: {
          [OPUS]: [
            { _additions: [shared] },
            {
              _additions: [
                { category: "claims", text: "A fact only one reviewer saw." },
              ],
            },
            {},
          ],
          [SOL]: [
            { _additions: [{ ...shared, text: "GREET() lives in greet.js." }] },
            {},
            {},
          ],
        },
      },
    });
    const s = await run({ cases: root, out });
    expect(s.counts).toMatchObject({ added: 1, additionsDropped: 1 });
    const d = decisions(out, "adds");
    expect(d.proposals).toHaveLength(3);
    const added = d.additions.find((a: any) => a.outcome === "added");
    expect(added).toMatchObject({
      category: "context",
      text: shared.text,
      members: expect.any(Array),
    });
    expect(added.proposers).toHaveLength(2);
    expect(
      d.additions.find((a: any) => a.outcome === "dropped-single"),
    ).toMatchObject({ text: "A fact only one reviewer saw." });
    expect(
      JSON.parse(readFileSync(join(out, "adds", "facts.json"), "utf8")).context,
    ).toContain(shared.text);
    expect(calls().filter((c) => c.kind === "cluster")).toHaveLength(1);
    expect(
      existsSync(join(out, "adds", "round-2", "synthesis-additions.json")),
    ).toBe(true);
  });

  test("--apply rewrites the case facts and records an expert-panel provenance that preflight accepts", async () => {
    const { root, dir } = reviewedCase("apply");
    const all = (o: object) => [o, o, o];
    const verdicts = {
      C2: {
        verdict: "revise",
        rewrite: "Blank names fall back to world.",
        evidenceRefs: ["diff.patch:L1-L4", "nowhere:L1"],
      },
      T2: { verdict: "remove" },
      _additions: [
        {
          category: "claims",
          text: "The change touches greet.js.",
          evidenceRefs: ["diff.patch:L1-L3"],
        },
      ],
    };
    const { out } = setup({
      "*": { review: { [OPUS]: all(verdicts), [SOL]: all(verdicts) } },
    });
    const before = readFileSync(join(dir, "facts.json"), "utf8");
    const s = await run({ cases: root, out, apply: true });
    expect(s).toMatchObject({
      applied: 1,
      counts: { revised: 1, removed: 1, added: 1 },
    });
    const facts = readFileSync(join(dir, "facts.json"), "utf8");
    expect(facts).not.toBe(before);
    expect(facts).toBe(readFileSync(join(out, "apply", "facts.json"), "utf8"));
    const parsed = JSON.parse(facts);
    expect(parsed.claims).toEqual(
      expect.arrayContaining([
        "Blank names fall back to world.",
        "The change touches greet.js.",
      ]),
    );
    expect(parsed.traps).toHaveLength(2);
    const prov = JSON.parse(
      readFileSync(join(dir, "facts-provenance.json"), "utf8"),
    );
    expect(prov).toMatchObject({
      reviewKind: "expert-panel",
      factsSha256: digest(facts),
      expertReview: {
        runId: "run-1",
        factsSha256: digest(facts),
        rounds: 2,
        disputed: 0,
        revised: 1,
        removed: 1,
        added: 1,
        reviewers: [
          { model: OPUS, family: "anthropic", effort: "xhigh", count: 3 },
          { model: SOL, family: "openai", effort: "xhigh", count: 3 },
        ],
      },
    });
    // The revision keeps its old source and adds the resolvable one the panel cited; the addition carries its own.
    expect(
      prov.entries.C2.sources.map((x: any) => [x.kind, x.startLine, x.endLine]),
    ).toEqual([
      ["diff", 1, 2],
      ["diff", 1, 4],
    ]);
    expect(
      prov.entries.C5.sources.map((x: any) => [x.kind, x.startLine, x.endLine]),
    ).toEqual([["diff", 1, 3]]);
    expect(
      preflightCase(loadCase(dir), {
        cache: tempDir(),
        requireProvenance: true,
      }).checkedFacts,
    ).toBe(9);
    const validate = exec([
      process.execPath,
      "run",
      join(ROOT, "src", "cli.ts"),
      "validate",
      root,
    ]);
    expect(validate.code).toBe(0);
    // Rehashing keeps the panel record.
    const rehash = exec([
      process.execPath,
      "run",
      join(ROOT, "scripts", "provenance.ts"),
      "--case",
      dir,
      "--rehash",
    ]);
    expect(rehash.code).toBe(0);
    expect(
      JSON.parse(readFileSync(join(dir, "facts-provenance.json"), "utf8")),
    ).toMatchObject({
      reviewKind: "expert-panel",
      expertReview: { runId: "run-1" },
    });
  });

  test("an accepted addition with no resolvable evidence goes to human review instead of the sheet", async () => {
    const { root, dir } = reviewedCase("unsourced");
    const all = (o: object) => [o, o, o];
    const add = {
      _additions: [
        {
          category: "claims",
          text: "Something without a source.",
          evidenceRefs: ["session-9:#S23"],
        },
      ],
    };
    const { out } = setup({
      "*": { review: { [OPUS]: all(add), [SOL]: all(add) } },
    });
    const before = readFileSync(join(dir, "facts.json"), "utf8");
    const s = await run({ cases: root, out });
    expect(s.counts).toMatchObject({ added: 0, additionsDisputed: 1 });
    expect(readFileSync(join(dir, "facts.json"), "utf8")).toBe(before);
    expect(
      readFileSync(join(out, "unsourced", "human-review.md"), "utf8"),
    ).toContain("Something without a source.");
  });

  test("--aggregate-only prints counts, never case names or fact text", async () => {
    const { root, facts } = reviewedCase("sealed-secret-case");
    const rewrite = "Sealed rewrite text that must stay private.";
    const all = (o: object) => [o, o, o];
    const { out } = setup({
      "*": {
        review: {
          [OPUS]: [
            { C1: { verdict: "remove" }, C2: { verdict: "revise", rewrite } },
            { C2: { verdict: "revise", rewrite } },
            { C1: { verdict: "revise", rewrite } },
          ],
          [SOL]: all({
            C2: { verdict: "revise", rewrite },
            _additions: [{ category: "claims", text: "Sealed addition text." }],
          }),
        },
      },
    });
    const r = exec(
      [
        process.execPath,
        "run",
        join(ROOT, "src", "cli.ts"),
        "fact-review",
        "--cases",
        root,
        "--out",
        out,
        "--aggregate-only",
        "--packets",
        join(out, "none"),
      ],
      { env: { ...process.env } },
    );
    expect(r.code).toBe(0);
    const printed = r.stdout + r.stderr;
    expect(printed).toContain("cases 1");
    expect(printed).toMatch(/settled \d+/);
    expect(printed).toMatch(/disputed \d+/);
    expect(printed).not.toContain("sealed-secret-case");
    expect(printed).not.toContain(out);
    for (const text of [
      ...facts.claims,
      ...facts.context,
      ...facts.uncertainties,
      ...facts.traps,
      rewrite,
      "Sealed addition text.",
    ])
      expect(printed).not.toContain(text);
    for (const word of ["greet", "world", "Sealed", "C1", "C2", "A1"])
      expect(printed).not.toContain(word);
    // The run folder still holds everything for the person resolving disputes.
    expect(
      readFileSync(join(out, "sealed-secret-case", "human-review.md"), "utf8"),
    ).toContain("## C1");
  });
});

describe("cross-examination and focused re-review", () => {
  test("cross-examination settles a dispute by family consensus and records changed minds", async () => {
    const { root } = reviewedCase("cross");
    const rewrite = "A sharper first claim.";
    const { out, calls } = setup({
      "*": {
        review: {
          [OPUS]: [{}, {}, {}],
          [SOL]: [
            { C1: { verdict: "revise", rewrite, reason: "overstated" } },
            { C1: { verdict: "revise", rewrite, reason: "overstated" } },
            { X1: { verdict: "remove", reason: "incidental" } },
          ],
        },
        cross: {
          [OPUS]: [{ C1: "revise" }, { C1: "revise" }, { C1: "keep" }],
          [SOL]: [{ C1: "revise" }, { C1: "revise" }, { C1: "revise" }],
        },
      },
    });
    const s = await run({ cases: root, out, crossExam: true });
    const d = decisions(out, "cross");
    const c1 = d.items.find((i: any) => i.id === "C1");
    expect(c1).toMatchObject({
      outcome: "revised",
      finalText: rewrite,
      crossExam: {
        candidate: { text: rewrite },
        consensus: { status: "settled", value: "revise" },
      },
    });
    expect(
      c1.crossExam.votes.filter((v: any) => v.choice !== v.before),
    ).toHaveLength(3);
    // X1 had only a single remove vote, so its family majority was keep: settled in round 1.
    expect(d.items.find((i: any) => i.id === "X1").outcome).toBe("kept");
    expect(s.crossExam).toMatchObject({
      items: 1,
      settled: 1,
      changed: { anthropic: 2, openai: 1 },
      votes: 6,
    });
    const log = calls();
    const cross = log.filter((c) => c.kind === "cross-exam");
    expect(cross).toHaveLength(6);
    // Arguments are shown without reviewer names or counts.
    expect(cross[0].prompt).toContain("Arguments for revise:");
    expect(cross[0].prompt).not.toMatch(/opus-\d|sol-\d|anthropic|openai/);
    expect(cross[0].files).toContain("disputes.json");
    const facts = JSON.parse(
      readFileSync(join(out, "cross", "facts.json"), "utf8"),
    );
    expect(facts.claims[0]).toBe(rewrite);
    const human = readFileSync(join(out, "cross", "human-review.md"), "utf8");
    expect(human).not.toContain("## C1");
  });

  test("a dispute the families still split on after cross-examination stays disputed", async () => {
    const { root } = reviewedCase("cross-split");
    const { out } = setup({
      "*": {
        review: {
          [OPUS]: [{}, {}, {}],
          [SOL]: [
            { X1: { verdict: "remove" } },
            { X1: { verdict: "remove" } },
            {},
          ],
        },
        cross: {
          [SOL]: [{ X1: "remove" }, { X1: "remove" }, { X1: "remove" }],
        },
      },
    });
    const s = await run({ cases: root, out, crossExam: true });
    const x1 = decisions(out, "cross-split").items.find(
      (i: any) => i.id === "X1",
    );
    expect(x1.outcome).toBe("disputed");
    expect(x1.why).toContain("still disputed after cross-examination");
    expect(s.counts.disputed).toBe(1);
    expect(
      readFileSync(join(out, "cross-split", "human-review.md"), "utf8"),
    ).toContain("### Cross-examination");
  });

  test("a choice of revise without a candidate is refused and corrected", async () => {
    expect(
      checkCrossExam(
        {
          items: [
            { id: "X1", choice: "revise", reason: "r", evidenceRefs: [] },
          ],
        },
        [{ id: "X1", candidate: null }],
      ),
    ).toEqual(["X1: no rewrite was proposed, so choose keep or remove"]);
  });

  test("--focus-run reviews only items changed since that run, with the sheet as context", async () => {
    const { root, dir } = reviewedCase("focus");
    const first = setup({ "*": {} });
    await run({ cases: root, out: first.out });
    // Change one claim on the case's sheet, as an applied revision would.
    const facts = JSON.parse(readFileSync(join(dir, "facts.json"), "utf8"));
    facts.claims[1] = "A changed second claim.";
    writeFileSync(
      join(dir, "facts.json"),
      JSON.stringify(facts, null, 2) + "\n",
    );
    const second = setup({
      "*": {
        review: {
          [SOL]: [
            { C2: { verdict: "remove" } },
            { C2: { verdict: "remove" } },
            {},
          ],
          [OPUS]: [
            { C2: { verdict: "remove" } },
            { C2: { verdict: "remove" } },
            {},
          ],
        },
      },
    });
    const s = await run({ cases: root, out: second.out, focusRun: first.out });
    expect(s.counts).toMatchObject({ items: 1, removed: 1, settled: 1 });
    const reviews = second.calls().filter((c) => c.kind === "review");
    expect(reviews).toHaveLength(6);
    expect(reviews[0].prompt).toContain(
      "## The items to review\n\n- C2 (claims): A changed second claim.",
    );
    expect(reviews[0].prompt).toContain("## The whole sheet, for context");
    const d = decisions(second.out, "focus");
    expect(d.items.find((i: any) => i.id === "C1")).toMatchObject({
      outcome: "kept",
      reviewed: false,
    });
    const out = JSON.parse(
      readFileSync(join(second.out, "focus", "facts.json"), "utf8"),
    );
    expect(out.claims).not.toContain("A changed second claim.");
    expect(out.claims).toContain(facts.claims[0]);
  });
});

describe("debate", () => {
  test("decide: agreement settles, a split stays disputed, two rewrites need matching picks", () => {
    const p = (position: any, text: string | null = null) => ({
      id: "C1",
      position,
      text,
      argument: "a",
      evidenceRefs: ["diff.patch:L1-L2"],
    });
    expect(decide(p("keep"), p("keep")).status).toBe("settled");
    expect(decide(p("keep"), p("remove"))).toMatchObject({
      status: "disputed",
    });
    expect(decide(p("revise", "x"), p("revise", "x"))).toMatchObject({
      status: "settled",
      text: "x",
    });
    expect(decide(p("revise", "x"), p("revise", "y")).status).toBe("disputed");
    const pick = (choice: "1" | "2") => ({ reviewer: "r", choice, reason: "" });
    expect(
      decide(p("revise", "x"), p("revise", "y"), [pick("2"), pick("2")]),
    ).toMatchObject({ status: "settled", text: "y" });
    expect(
      decide(p("revise", "x"), p("revise", "y"), [pick("1"), pick("2")]).status,
    ).toBe("disputed");
  });

  test("a disputed item is debated both ways, settled, applied, and recorded", async () => {
    const { root, dir } = reviewedCase("debate");
    // First, a review that leaves X1 disputed across families.
    const first = setup({
      "*": {
        review: {
          [SOL]: [
            { X1: { verdict: "remove" } },
            { X1: { verdict: "remove" } },
            {},
          ],
        },
      },
    });
    await run({ cases: root, out: first.out });
    expect(
      decisions(first.out, "debate").items.find((i: any) => i.id === "X1")
        .outcome,
    ).toBe("disputed");
    const x1 = JSON.parse(readFileSync(join(dir, "facts.json"), "utf8"))
      .context[0];
    // Opus opens with keep, is rebutted by Sol (remove), and amends to remove; Sol opens and amends with remove.
    const second = setup({
      "*": {
        debate: {
          [OPUS]: {
            open: {},
            rebut: { X1: { position: "remove" } },
            amend: { X1: { position: "remove" } },
          },
          [SOL]: {
            open: { X1: { position: "remove" } },
            rebut: { X1: { position: "remove" } },
            amend: { X1: { position: "remove" } },
          },
        },
      },
    });
    const s = await factDebate({
      cases: root,
      from: [first.out],
      out: second.out,
      apply: true,
      log: () => {},
    });
    expect(s).toMatchObject({
      cases: 1,
      entries: 1,
      settled: 1,
      disputed: 0,
      applied: 1,
    });
    expect(s.changedMinds).toEqual({ anthropic: 1 });
    const log = second.calls();
    const kinds = log
      .map(
        (c) =>
          `${c.model}:${c.prompt.includes("make the case") ? "open" : c.prompt.includes("Your task: rebut") ? "rebut" : "amend"}`,
      )
      .sort();
    expect(kinds).toEqual([
      `${OPUS}:amend`,
      `${OPUS}:open`,
      `${OPUS}:rebut`,
      `${SOL}:amend`,
      `${SOL}:open`,
      `${SOL}:rebut`,
    ]);
    // The rebuttal prompt shows the case but never names models or families.
    const rebut = log.find((c) => c.prompt.includes("Your task: rebut"));
    expect(rebut.prompt).toContain("The advocate's case");
    expect(rebut.prompt).not.toMatch(
      /opus|sol-1|anthropic|openai|gpt-|claude-/i,
    );
    const facts = JSON.parse(readFileSync(join(dir, "facts.json"), "utf8"));
    expect(facts.context).not.toContain(x1);
    const prov = JSON.parse(
      readFileSync(join(dir, "facts-provenance.json"), "utf8"),
    );
    expect(prov.reviewKind).toBe("expert-panel");
    expect(
      preflightCase(loadCase(dir), {
        cache: tempDir(),
        requireProvenance: true,
      }).checkedFacts,
    ).toBe(
      facts.claims.length +
        facts.context.length +
        facts.uncertainties.length +
        facts.traps.length,
    );
    expect(
      JSON.parse(
        readFileSync(join(second.out, "debate", "debates.json"), "utf8"),
      ).outcomes[0],
    ).toMatchObject({ status: "settled", position: "remove" });
  });
});

describe("canaries", () => {
  test("mutations are deterministic and cover all four defects", () => {
    expect(alterClaim("Retries 3 times.")).toBe("Retries 4 times.");
    expect(alterClaim("Timeouts increase under load.")).toBe(
      "Timeouts decrease under load.",
    );
    expect(alterClaim("Calls `parseJudge` early.")).toBe(
      "Calls `parseJudgeLegacy` early.",
    );
    const facts: Facts = {
      schema: "prbench.facts/v1",
      claims: [
        "Short one.",
        "The longest claim about retry backoff behaviour.",
        "Uses 2 workers.",
      ],
      context: ["ctx"],
      uncertainties: [],
      traps: ["A trap."],
    };
    const c = plantDefects(facts, "Injected from elsewhere.");
    expect(c).toEqual(plantDefects(facts, "Injected from elsewhere."));
    expect(c.defects.map((d) => [d.kind, d.id])).toEqual([
      ["contradicted", "C1"],
      ["missing", undefined],
      ["unsupported", "C3"],
      ["trap-true", "T1"],
    ]);
    expect(c.facts.claims).toEqual([
      "It is not the case that short one.",
      "Uses 2 workers.",
      "Injected from elsewhere.",
    ]);
    expect(c.facts.traps).toEqual(["Uses 2 workers."]);
    expect(
      restates(
        "The longest claim about retry backoff behaviour.",
        "Retry backoff behaviour changed (longest claim).",
      ),
    ).toBe(true);
    expect(
      restates(
        "The longest claim about retry backoff behaviour.",
        "Unrelated.",
      ),
    ).toBe(false);
    expect(
      selectCanaryCases(
        [
          { id: "a-1", agent: "codex" },
          { id: "a-2", agent: "codex" },
          { id: "b-1", agent: "codex" },
          { id: "c-1", agent: "claude-code" },
        ],
        3,
      ),
    ).toEqual(["c-1", "a-1", "b-1"]);
  });

  test("scoring counts catches, false alarms and per-family recall", () => {
    const settled = (
      value: string,
      byFamily = { anthropic: value, openai: value },
    ) => ({ status: "settled", value, byFamily });
    const item = (id: string, consensus: any) => ({
      id,
      round1: { consensus },
    });
    const result: any = {
      items: [
        item("C1", settled("revise")),
        item("C2", settled("keep")),
        item("C3", {
          status: "disputed",
          why: "cross-family",
          byFamily: { anthropic: "remove", openai: "keep" },
        }),
        item("T1", settled("remove")),
        item("X1", settled("remove")),
      ],
      proposals: [
        {
          text: "missing fact about widgets",
          family: "anthropic",
          reviewer: "opus-1",
        },
        {
          text: "missing fact about widgets",
          family: "anthropic",
          reviewer: "opus-2",
        },
      ],
      additions: [],
    };
    const canary: any = {
      defects: [
        { kind: "contradicted", id: "C1" },
        { kind: "unsupported", id: "C3" },
        { kind: "trap-true", id: "T1" },
        { kind: "missing", text: "Missing fact about widgets." },
      ],
    };
    const s = scoreCanaries([
      { result, canary, familySizes: { anthropic: 3, openai: 3 }, rounds: 2 },
    ]);
    expect(s).toMatchObject({
      planted: 4,
      caught: 2,
      catchRate: 0.5,
      unmutated: 2,
      falseAlarms: 1,
      falseAlarmRate: 0.5,
      pass: false,
    });
    expect(s.perFamily).toEqual({
      anthropic: { flagged: 4, recall: 1 },
      openai: { flagged: 2, recall: 0.5 },
    });
    expect(s.byKind.missing).toEqual({ planted: 1, caught: 0 });
  });

  test("a canary run plants defects, records ground truth and reports PASS", async () => {
    const { root } = reviewedCase("alpha-greet");
    const other = copyExample("beta-greet");
    exec(["mv", other.dir, join(root, "beta-greet")]);
    const donor = {
      schema: "prbench.facts/v1",
      claims: ["The beta service now caches tokens for 5 minutes."],
      context: [],
      uncertainties: [],
      traps: [],
    };
    writeFileSync(
      join(root, "beta-greet", "facts.json"),
      JSON.stringify(donor),
    );
    const original = JSON.parse(
      readFileSync(join(root, "alpha-greet", "facts.json"), "utf8"),
    );
    const planted = plantDefects(
      original,
      donor.claims[0],
      original.claims.map(() => 1),
    );
    const missing = planted.defects.find((d) => d.kind === "missing")!.text;
    const flags = Object.fromEntries(
      planted.defects
        .filter((d) => d.id)
        .map((d) => [d.id, { verdict: "remove" }]),
    );
    const all = (o: object) => [o, o, o];
    const verdicts = {
      ...flags,
      _additions: [{ category: "claims", text: missing }],
    };
    const { out } = setup({
      "alpha-greet": {
        review: { [OPUS]: all(verdicts), [SOL]: all(verdicts) },
      },
    });
    const s = await run({
      cases: root,
      out,
      canaries: 1,
      caseIds: ["alpha-greet"],
    });
    expect(s.mode).toBe("canary");
    expect(s.canary).toMatchObject({
      cases: 1,
      planted: 4,
      caught: 4,
      catchRate: 1,
      falseAlarms: 0,
      pass: true,
    });
    expect(
      JSON.parse(readFileSync(join(out, "alpha-greet", "canary.json"), "utf8"))
        .defects,
    ).toHaveLength(4);
    expect(
      JSON.parse(readFileSync(join(out, "canary-report.json"), "utf8")).pass,
    ).toBe(true);
    expect(summaryLines(s).join("\n")).toContain("PASS");
    // The case's own sheet is never touched in canary mode, and --apply is refused.
    expect(
      JSON.parse(readFileSync(join(root, "alpha-greet", "facts.json"), "utf8")),
    ).toEqual(original);
    await expect(
      run({
        cases: root,
        out: join(out, "..", "run-2"),
        canaries: 1,
        apply: true,
      }),
    ).rejects.toThrow(/--apply/);
  });
});

describe("historical-digest sources", () => {
  test("a fact-sources/digest.json line range resolves and reads back", () => {
    const dir = tempDir();
    writeFileSync(
      join(dir, "case.json"),
      JSON.stringify({ repo: { base: "a", head: "b" }, sessions: [] }),
    );
    mkdirSync(join(dir, "fact-sources"));
    writeFileSync(
      join(dir, "fact-sources", "digest.json"),
      '{\n  "a": 1,\n  "b": 2\n}\n',
    );
    const ctx = {
      caseDir: dir,
      bare: join(dir, "missing.git"),
      base: "a",
      head: "b",
      sessions: [],
    };
    const s = resolveRef("fact-sources/digest.json:L2-L3", ctx);
    expect(s).toMatchObject({
      kind: "historical-digest",
      path: "fact-sources/digest.json",
      startLine: 2,
      endLine: 3,
    });
    expect(refOf(s!, "a")).toBe("fact-sources/digest.json:L2-L3");
    expect(resolveRef("fact-sources/digest.json:L2-L99", ctx)).toBeUndefined();
    expect(resolveRef("fact-sources/other.json:L1-L2", ctx)).toBeUndefined();
  });
});
