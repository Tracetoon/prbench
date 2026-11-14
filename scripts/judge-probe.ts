/**
 * Judge calibration probe (protocol step 4). Takes real candidate drafts from
 * finished dev comparisons, makes two one-sentence mutants of each with Opus:
 *
 *   M1 overclaim:     asserts as settled something an uncertainty U_k says is not established;
 *   M2 contradiction: changes one factual detail of a claim the draft covers to a wrong value;
 *
 * then has each configured pairwise judge compare original vs mutant in both
 * orders through the benchmark's own judgePair. Detection:
 *   M1: U_k in the original side's uncertaintiesRespected and not in the mutant side's;
 *   M2: the mutant side has more factual errors (or contradicted assessments) than the original.
 *
 * Usage: bun run scripts/judge-probe.ts --run <dev run> [--run <dev run>] --cases <dir> --out <dir> [--per-run 6] [--parallel 8]
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { modelRoot, type ComparisonManifest } from "../src/comparison.ts";
import {
  claudeJudge,
  extractJson,
  parseJudge,
} from "../src/judge/providers.ts";
import { claudeEffort } from "../src/agents/claude.ts";
import {
  releaseCodexLoginLease,
  setCodexLoginSharing,
} from "../src/agents/codexAuth.ts";
import { judgePair, type PairResult } from "../src/judge/pairwise.ts";
import type { PRArtifact } from "../src/schema/artifact.ts";
import { caseDirs, loadCase, loadFacts } from "../src/schema/case.ts";

const argv = process.argv.slice(2);
const all = (n: string) =>
  argv.flatMap((a, i) => (a === n ? [argv[i + 1]!] : []));
const one = (n: string) => all(n)[0];
const runs = all("--run").map((r) => resolve(r));
const cases = resolve(one("--cases") ?? "");
const out = resolve(one("--out") ?? "");
const perRun = Number(one("--per-run") ?? 6);
const parallel = Number(one("--parallel") ?? 8);
if (!runs.length || !one("--cases") || !one("--out")) {
  console.error(
    "usage: judge-probe.ts --run <dev run> [--run ...] --cases <dir> --out <dir> [--per-run 6] [--parallel 8]",
  );
  process.exit(2);
}
mkdirSync(out, { recursive: true });

const limiter = (n: number) => {
  let active = 0;
  const q: (() => void)[] = [];
  return async <T>(fn: () => Promise<T>) => {
    if (active >= n) await new Promise<void>((r) => q.push(r));
    active++;
    try {
      return await fn();
    } finally {
      active--;
      q.shift()?.();
    }
  };
};
const limit = limiter(parallel);
const loaded = new Map(
  caseDirs(cases).map((d) => {
    const l = loadCase(d);
    return [l.case.id, l] as const;
  }),
);

interface Pick {
  run: string;
  provider: string;
  model: string;
  judges: string[];
  caseId: string;
  artifact: PRArtifact;
}
const picks: Pick[] = [];
const used = new Set<string>();
for (const run of runs) {
  const m = JSON.parse(
    readFileSync(join(run, "manifest.json"), "utf8"),
  ) as ComparisonManifest & { settings: any };
  const model = m.settings.models[0];
  const dir = join(modelRoot(run, 1, model), "artifacts");
  let n = 0;
  for (const caseId of readdirSync(dir).sort()) {
    if (n >= perRun) break;
    if (used.has(caseId)) continue;
    const l = loaded.get(caseId);
    const f = join(dir, caseId, "tracetoon-candidate.json");
    if (!l || !existsSync(f)) continue;
    const facts = loadFacts(l)!;
    if (facts.uncertainties.length < 2 || facts.claims.length < 3) continue;
    picks.push({
      run,
      provider: m.settings.provider ?? "codex",
      model,
      judges: m.settings.judges,
      caseId,
      artifact: JSON.parse(readFileSync(f, "utf8")),
    });
    used.add(caseId);
    n++;
  }
}
console.error(`probe: ${picks.length} drafts`);

const mutator = claudeJudge(
  "claude-opus-5-5",
  30 * 60_000,
  claudeEffort("xhigh"),
);
const mutantSchema = {
  type: "object",
  additionalProperties: false,
  required: ["overclaim", "contradiction"],
  properties: {
    overclaim: {
      type: "object",
      additionalProperties: false,
      required: ["uncertainty", "sentence", "body"],
      properties: {
        uncertainty: { type: "string" },
        sentence: { type: "string" },
        body: { type: "string" },
      },
    },
    contradiction: {
      type: "object",
      additionalProperties: false,
      required: ["claim", "sentence", "body"],
      properties: {
        claim: { type: "string" },
        sentence: { type: "string" },
        body: { type: "string" },
      },
    },
  },
};
const changedLines = (a: string, b: string) => {
  const x = a.split("\n"),
    y = b.split("\n");
  const setX = new Map<string, number>();
  for (const l of x) setX.set(l, (setX.get(l) ?? 0) + 1);
  let common = 0;
  for (const l of y) {
    const c = setX.get(l) ?? 0;
    if (c > 0) {
      common++;
      setX.set(l, c - 1);
    }
  }
  return Math.max(x.length, y.length) - common;
};

async function mutants(p: Pick) {
  const file = join(out, p.caseId, "mutants.json");
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const facts = loadFacts(loaded.get(p.caseId)!)!;
  const prompt = `You are preparing a calibration probe for judges of pull-request descriptions. Make two minimal edits of the description below, each changing or inserting exactly one sentence and leaving everything else byte-for-byte identical.

## Facts about the change
Claims (things a good description conveys):
${facts.claims.map((c, i) => `C${i + 1}: ${c}`).join("\n")}
Uncertainties (things the evidence does NOT establish; a description must not overclaim them):
${facts.uncertainties.map((u, i) => `U${i + 1}: ${u}`).join("\n")}

## The description
${p.artifact.body}

## Edits
1. overclaim: pick one uncertainty Uk and make the description assert, plainly and as settled, the thing Uk says is not established (for example that it was verified or tested, or that the open question is resolved). Edit or insert one sentence only, in the description's own voice. Give uk's id, the new sentence, and the full edited body.
2. contradiction: pick one claim Cj the description already conveys and change one factual detail of that sentence (a name, number, direction, file or behaviour) to a wrong value, keeping it plausible. One sentence only. Give Cj's id, the new sentence, and the full edited body.

Reply with the JSON object only.`;
  const reply = await mutator.ask(prompt, mutantSchema);
  const m = extractJson(reply.text) as any;
  for (const k of ["overclaim", "contradiction"]) {
    const n = changedLines(p.artifact.body, m[k].body);
    if (n < 1 || n > 3) throw new Error(`${p.caseId} ${k}: ${n} lines changed`);
  }
  if (
    !/^U\d+$/.test(m.overclaim.uncertainty) ||
    !/^C\d+$/.test(m.contradiction.claim)
  )
    throw new Error(`${p.caseId}: bad ids`);
  mkdirSync(join(out, p.caseId), { recursive: true });
  writeFileSync(
    file,
    JSON.stringify({ ...m, costUsd: reply.costUsd }, null, 2),
  );
  return m;
}

type Row = {
  case: string;
  provider: string;
  judge: string;
  kind: "overclaim" | "contradiction";
  target: string;
  order: number;
  detected: boolean;
};
const rows: Row[] = [];
const sideOf = (r: PairResult, sys: string, i: number) => r.sides[sys]![i]!;
const errors = (s: any) =>
  (s.factualErrors?.length ?? 0) +
  (s.claimAssessments ?? []).filter((a: any) => a.status === "contradicted")
    .length;

setCodexLoginSharing(true);
await Promise.all(
  picks.map(async (p) => {
    let m: any;
    try {
      m = await limit(() => mutants(p));
    } catch (e) {
      console.error(`mutants ${p.caseId}: ${e}`);
      return;
    }
    const l = loaded.get(p.caseId)!;
    const facts = loadFacts(l)!;
    // Judge with both judge families, whatever the draft's provider was.
    const judgeSpecs = [
      "claude:claude-opus-5-5@medium",
      "claude:claude-sonnet-5-5@medium",
      "codex:gpt-6.1-sol@medium",
      "codex:gpt-6.1-terra@medium",
    ];
    await Promise.all(
      (["overclaim", "contradiction"] as const).flatMap((kind) =>
        judgeSpecs.map((spec) =>
          limit(async () => {
            const mutant: PRArtifact = {
              ...p.artifact,
              system: "probe-mutant",
              body: m[kind].body,
            };
            const original: PRArtifact = {
              ...p.artifact,
              system: "probe-original",
            };
            const judge = parseJudge(spec);
            let r: PairResult;
            try {
              r = await judgePair({
                loaded: l,
                facts,
                x: original,
                y: mutant,
                judge,
                outDir: join(
                  out,
                  p.caseId,
                  kind,
                  spec.replace(/[^a-z0-9.-]/gi, "_"),
                ),
              });
            } catch (e) {
              console.error(
                `judge ${p.caseId} ${kind} ${spec}: ${String(e).slice(0, 200)}`,
              );
              return;
            }
            const target =
              kind === "overclaim"
                ? m.overclaim.uncertainty
                : m.contradiction.claim;
            for (let i = 0; i < (r.sides["probe-original"]?.length ?? 0); i++) {
              const o = sideOf(r, "probe-original", i),
                x = sideOf(r, "probe-mutant", i);
              const detected =
                kind === "overclaim"
                  ? (o.uncertaintiesRespected ?? []).includes(target) &&
                    !(x.uncertaintiesRespected ?? []).includes(target)
                  : errors(x) > errors(o);
              rows.push({
                case: p.caseId,
                provider: p.provider,
                judge: spec,
                kind,
                target,
                order: i,
                detected,
              });
            }
            console.error(`judged ${p.caseId} ${kind} ${spec}`);
          }),
        ),
      ),
    );
  }),
);

setCodexLoginSharing(false);
releaseCodexLoginLease();
const rate = (f: (r: Row) => boolean) => {
  const s = rows.filter(f);
  return {
    n: s.length,
    detected: s.filter((r) => r.detected).length,
    rate: s.length ? s.filter((r) => r.detected).length / s.length : NaN,
  };
};
const families = {
  claude: (r: Row) => r.judge.startsWith("claude:"),
  codex: (r: Row) => r.judge.startsWith("codex:"),
};
const report = {
  drafts: picks.length,
  byJudge: Object.fromEntries(
    [...new Set(rows.map((r) => r.judge))]
      .sort()
      .map((j) => [
        j,
        {
          overclaim: rate((r) => r.judge === j && r.kind === "overclaim"),
          contradiction: rate(
            (r) => r.judge === j && r.kind === "contradiction",
          ),
        },
      ]),
  ),
  byFamily: Object.fromEntries(
    Object.entries(families).map(([f, fn]) => [
      f,
      {
        overclaim: rate((r) => fn(r) && r.kind === "overclaim"),
        contradiction: rate((r) => fn(r) && r.kind === "contradiction"),
      },
    ]),
  ),
  rows,
};
writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2));
const pct = (x: { n: number; detected: number; rate: number }) =>
  `${x.detected}/${x.n} (${Number.isFinite(x.rate) ? Math.round(x.rate * 100) : "-"}%)`;
for (const [j, v] of Object.entries(report.byJudge))
  console.log(
    `${j}: overclaim ${pct(v.overclaim)}, contradiction ${pct(v.contradiction)}`,
  );
for (const [f, v] of Object.entries(report.byFamily))
  console.log(
    `family ${f}: overclaim ${pct(v.overclaim)}, contradiction ${pct(v.contradiction)}`,
  );
