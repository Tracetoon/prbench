// Stands in for both `claude -p` and `codex exec` as a fact-review panel
// member. Never contacts a model. It reads the sandbox it was started in
// (sheet.json, proposals.json, README.md for the case id), works out the call
// kind from the reply schema, and answers from FAKE_REVIEW_SCRIPT:
//
//   { "<case id>" | "*": {
//       "review": { "<model>": [ { "<item id>": { "verdict": "revise", "rewrite": "..." },
//                                   "_additions": [ { "category": "claims", "text": "..." } ] },
//                                ... one entry per replicate, in call order ] },
//       "vote":   { "<model>": [ { "<proposal id>": "reject" }, ... ] },
//       "cross":  { "<model>": [ { "<item id>": "keep" | "revise" | "remove" }, ... ] } } }
//
// Unscripted items are kept (traps real), unscripted proposals accepted,
// rewrites take the first proposal, clusters group identical texts.
// Replicates of one model get identical prompts, so each (model, prompt) pair
// is numbered with an atomic mkdir counter in FAKE_REVIEW_STATE.
// FAKE_REVIEW_LOG gets one JSON line per call.
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const args = process.argv.slice(2);
if (args[0] === "--version") {
  console.log(
    args.includes("exec") ? "codex-cli 9.8.7" : "9.9.9 (Claude Code)",
  );
  process.exit(0);
}
const codex = args[0] === "exec";
const flag = (name: string) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const prompt = readFileSync(0, "utf8");
const model = (codex ? flag("-m") : flag("--model")) ?? "default";
const schema = JSON.parse(
  codex
    ? readFileSync(flag("--output-schema")!, "utf8")
    : flag("--json-schema")!,
);
const required: string[] = schema.required ?? [];
const crossExam = existsSync(join(process.cwd(), "disputes.json"));
const kind =
  required.includes("items") && crossExam
    ? "cross-exam"
    : required.includes("items")
      ? "review"
      : required.includes("votes")
        ? "vote"
        : required.includes("candidates")
          ? "rewrite"
          : required.includes("clusters")
            ? "cluster"
            : "unknown";
const cwd = process.cwd();
const read = (f: string) =>
  existsSync(join(cwd, f))
    ? JSON.parse(readFileSync(join(cwd, f), "utf8"))
    : undefined;
const caseId = existsSync(join(cwd, "README.md"))
  ? /# Fact packet: (\S+)/.exec(
      readFileSync(join(cwd, "README.md"), "utf8"),
    )?.[1]
  : undefined;
const all = process.env.FAKE_REVIEW_SCRIPT
  ? JSON.parse(readFileSync(process.env.FAKE_REVIEW_SCRIPT, "utf8"))
  : {};
const script = (caseId && all[caseId]) ?? all["*"] ?? {};

let replicate = 0;
const state = process.env.FAKE_REVIEW_STATE;
if (state) {
  const key = createHash("sha256")
    .update(`${model}\n${kind}\n${prompt}`)
    .digest("hex")
    .slice(0, 24);
  while (true) {
    try {
      mkdirSync(join(state, `${key}-${replicate}`));
      break;
    } catch {
      replicate++;
    }
  }
}

if (process.env.FAKE_REVIEW_LOG)
  appendFileSync(
    process.env.FAKE_REVIEW_LOG,
    JSON.stringify({
      provider: codex ? "codex" : "claude",
      model,
      kind,
      replicate,
      caseId,
      args,
      cwd,
      files: readdirSync(cwd).sort(),
      prompt,
    }) + "\n",
  );

const sheet: { id: string; category: string; text: string }[] =
  read("sheet.json")?.items ?? [];
const proposals = read("proposals.json") ?? {};
let reply: unknown;
if (kind === "review") {
  const s = script.review?.[model]?.[replicate] ?? {};
  reply = {
    items: sheet.map((item) => {
      const o = s[item.id] ?? {};
      return {
        id: item.id,
        category: item.category,
        verdict: o.verdict ?? "keep",
        reason: o.reason ?? "supported by the diff",
        evidenceRefs: o.evidenceRefs ?? ["diff.patch:L1-L2"],
        rewrite: o.rewrite ?? null,
        trapIsReal:
          item.category === "traps"
            ? (o.trapIsReal ??
              (o.verdict && o.verdict !== "keep" ? false : true))
            : null,
      };
    }),
    additions: (s._additions ?? []).map((a: Record<string, unknown>) => ({
      reason: "missing",
      evidenceRefs: ["diff.patch:L1-L3"],
      ...a,
    })),
  };
} else if (kind === "rewrite") {
  reply = {
    candidates: (proposals.items ?? []).map((i: any) => ({
      id: i.id,
      text: i.previous ? `${i.rewrites[0].text} (refined)` : i.rewrites[0].text,
      reason: "merged the proposals",
      evidenceRefs: [
        ...new Set(i.rewrites.flatMap((r: any) => r.evidenceRefs)),
      ],
    })),
  };
} else if (kind === "cluster") {
  const groups = new Map<string, any[]>();
  for (const a of proposals.additions ?? []) {
    const k = String(a.text).toLowerCase().trim();
    groups.set(k, [...(groups.get(k) ?? []), a]);
  }
  reply = {
    clusters: [...groups.values()].map((g) => ({
      category: g[0].category,
      text: g[0].text,
      members: g.map((a) => a.id),
      evidenceRefs: g[0].evidenceRefs,
    })),
  };
} else if (kind === "cross-exam") {
  const s = script.cross?.[model]?.[replicate] ?? {};
  const disputes = read("disputes.json")?.items ?? [];
  reply = {
    items: disputes.map((d: any) => ({
      id: d.id,
      choice: s[d.id] ?? "keep",
      reason: "weighed the arguments",
      evidenceRefs: ["diff.patch:L1-L2"],
    })),
  };
} else if (kind === "vote") {
  const s = script.vote?.[model]?.[replicate] ?? {};
  reply = {
    votes: (proposals.proposals ?? []).map((p: any) => ({
      id: p.id,
      vote: s[p.id] ?? "accept",
      reason: "checked against the diff",
      evidenceRefs: ["diff.patch:L1-L2"],
    })),
  };
}

const text = JSON.stringify(reply);
if (codex) {
  writeFileSync(flag("-o")!, text);
  console.log(
    JSON.stringify({
      type: "item.completed",
      item: { type: "agent_message", text },
    }),
  );
  console.log(
    JSON.stringify({
      type: "turn.completed",
      usage: { input_tokens: 100, cached_input_tokens: 0, output_tokens: 20 },
    }),
  );
} else {
  console.log(
    JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: false,
      result: text,
      structured_output: reply,
      total_cost_usd: 0.01,
    }),
  );
}
