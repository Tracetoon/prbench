// Accuracy adjudication by expert judges. The pairwise judges of a comparison
// flag statements in drafts as contradicted or unsupported; the adoption gate
// counts only flags a reviewer confirms with hash-checked source proof. Here
// two independent judges (Fable 5.1 and GPT-6 Astra by default) read each
// case's evidence and every flagged statement of that case's drafts, blind to
// which system wrote them, and rule confirmed or false-positive with evidence
// references. Agreement stands; a split is decided by the decider judge
// (Fable). Each ruling's references are resolved to adjudication sources the
// comparison re-verifies (diff, commit, file at base/head, session, or the
// draft's own captured validation command), and the result is written as the
// run's adjudications.json. Rebuild the gate with `compare --resume
// --report-only`.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import {
  releaseCodexLoginLease,
  setCodexLoginSharing,
} from "../agents/codexAuth.ts";
import { sourceContent } from "../../scripts/provenance.ts";
import type { AccuracyFinding } from "../gates.ts";
import { modelRoot, type ComparisonManifest } from "../comparison.ts";
import {
  validationSourceText,
  type AdjudicationSource,
} from "../run/adjudication.ts";
import { artifactDigest, type PRArtifact } from "../schema/artifact.ts";
import { caseDirs, loadCase } from "../schema/case.ts";
import { digest } from "../util/hash.ts";
import {
  buildEvidence,
  json,
  judgeFor,
  limiter,
  makeCaller,
  packetFor,
  type CallStats,
  type Reviewer,
} from "./panel.ts";
import { WORKSPACE } from "./prompt.ts";
import { resolveRef } from "./record.ts";
import type { SheetItem } from "./schema.ts";

export const ACCURACY_PROMPT_VERSION = 1;
export const DEFAULT_ACCURACY_JUDGES = [
  "claude/claude-fable-5-1",
  "codex/gpt-6-astra",
];

type Outcome = "confirmed" | "false-positive";

interface FlagView {
  /** F1, F2, ... within the case. */
  id: string;
  /** The draft the statement is in (drafts/<draft>.md). */
  draft: string;
  claim: string;
  /** What the pairwise judges said, without their names. */
  reasons: string[];
}

interface RulingReply {
  items: {
    id: string;
    outcome: Outcome;
    reason: string;
    evidenceRefs: string[];
  }[];
}

const str = { type: "string" };
const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

function rulingSchema(ids: string[]) {
  return obj({
    items: {
      type: "array",
      items: obj({
        id: ids.length ? { type: "string", enum: ids } : str,
        outcome: { type: "string", enum: ["confirmed", "false-positive"] },
        reason: str,
        evidenceRefs: { type: "array", items: str },
      }),
    },
  });
}

function checkRulings(value: unknown, ids: string[]): string[] {
  const v = value as RulingReply;
  if (!v || !Array.isArray(v.items)) return ["expected {items: [...]}"];
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const r of v.items) {
    if (!ids.includes(r?.id)) {
      problems.push(`unknown id ${JSON.stringify(r?.id)}`);
      continue;
    }
    if (seen.has(r.id)) problems.push(`${r.id}: answered more than once`);
    seen.add(r.id);
    if (r.outcome !== "confirmed" && r.outcome !== "false-positive")
      problems.push(`${r.id}: outcome must be confirmed or false-positive`);
    if (typeof r.reason !== "string" || !r.reason.trim())
      problems.push(`${r.id}: reason is required`);
    if (!Array.isArray(r.evidenceRefs) || !r.evidenceRefs.length)
      problems.push(`${r.id}: cite at least one evidence reference`);
  }
  for (const id of ids) if (!seen.has(id)) problems.push(`${id}: not ruled`);
  return problems;
}

export function accuracyPrompt(flags: FlagView[]): string {
  const body = flags
    .map((f) =>
      [
        `### ${f.id} (in drafts/${f.draft}.md)`,
        `Statement: ${f.claim}`,
        ...f.reasons.map((r) => `  flagged because: ${r}`),
      ].join("\n"),
    )
    .join("\n\n");
  return `Pull-request descriptions of one code change were scored by judges, who flagged the statements below as factually wrong or unsupported. You decide each flag.

${WORKSPACE}

The descriptions are in drafts/<name>.md, and drafts/<name>.validation.json holds the commands the description's author captured (V1, V2, ...). Nothing says which tool or system wrote a description.

## Flagged statements (also in flags.json)

${body}

## Your task

For every flag decide:
- confirmed: the statement, as written in its description, is contradicted by the evidence, or asserts something the evidence does not support, so a reviewer reading it would be misled;
- false-positive: the evidence supports the statement (or it is a fair reading, an accurate hedge, or plainly the description's own opinion).

Read the statement in its draft for context. Check the evidence yourself rather than trusting the flag. Cite the references that settle it, using the forms above, or \`drafts/<name>.validation.json:V3\` for a captured command. Give a one-line reason.

Reply with the JSON object only.`;
}

export interface AccuracyReviewOptions {
  /** A finished comparison run (its accuracy-findings.json and artifacts). */
  run: string;
  /** The cases directory the comparison ran on. */
  cases: string;
  out: string;
  /** Only these cases (trials; never with write). */
  caseIds?: string[];
  judges?: string[];
  effort?: string;
  /** The judge whose ruling decides splits (default: the first judge). */
  decider?: string;
  packets?: string;
  parallel?: number;
  resume?: boolean;
  /** Write <run>/adjudications.json (refused if one exists, unless overwrite). */
  write?: boolean;
  overwrite?: boolean;
  aggregateOnly?: boolean;
  log?: (line: string) => void;
}

export interface AccuracyReviewSummary {
  findings: number;
  ruled: number;
  agreed: number;
  decided: number;
  outcomes: { confirmed: number; falsePositive: number };
  byArm: Record<string, { flags: number; confirmed: number }>;
  /** Rulings with no evidence reference that resolves to a verifiable source; left unadjudicated. */
  unsourced: number;
  calls: number;
  cachedCalls: number;
  costUsd: number;
  written: boolean;
}

function judgeOf(spec: string, effort: string, i: number): Reviewer {
  const m = /^(claude|codex)\/(.+)$/.exec(spec);
  if (!m)
    throw new Error(`--judge ${spec}: use claude/<model> or codex/<model>`);
  const provider = m[1] as "claude" | "codex";
  return {
    id: `judge-${i + 1}`,
    family: provider === "claude" ? "anthropic" : "openai",
    model: m[2]!,
    provider,
    replicate: 0,
    effort,
    judge: judgeFor(provider, m[2]!, effort),
  };
}

/** An evidence reference as an adjudication source the comparison can re-verify, or undefined. */
export function adjudicationSource(
  ref: string,
  ctx: {
    caseDir: string;
    bare: string;
    base: string;
    head: string;
    sessions: string[];
  },
  drafts: Map<string, PRArtifact>,
): AdjudicationSource | undefined {
  const v = /^drafts\/([^/:]+)\.validation\.json:(V[1-9]\d*)$/.exec(ref.trim());
  if (v) {
    const artifact = drafts.get(v[1]!);
    if (!artifact) return undefined;
    try {
      const text = validationSourceText(artifact, v[2]!);
      return {
        kind: "validation",
        artifactDigest: artifactDigest(artifact),
        commandId: v[2]!,
        sha256: digest(text),
        startLine: 1,
        endLine: text.split(/\r?\n/).length,
      };
    } catch {
      return undefined;
    }
  }
  const s = resolveRef(ref, ctx);
  if (!s || !["diff", "commit", "git", "session"].includes(s.kind))
    return undefined;
  try {
    const text = sourceContent(ctx.caseDir, ctx.bare, s);
    return { ...s, sha256: digest(text) } as AdjudicationSource;
  } catch {
    return undefined;
  }
}

export async function accuracyReview(
  opts: AccuracyReviewOptions,
): Promise<AccuracyReviewSummary> {
  const log = opts.aggregateOnly
    ? () => {}
    : (opts.log ?? ((l: string) => console.error(l)));
  const run = resolve(opts.run);
  const manifest = JSON.parse(
    readFileSync(join(run, "manifest.json"), "utf8"),
  ) as ComparisonManifest;
  const file = JSON.parse(
    readFileSync(join(run, "accuracy-findings.json"), "utf8"),
  );
  if (file.experiment !== manifest.id)
    throw new Error("accuracy-findings.json belongs to another experiment");
  const findings: AccuracyFinding[] = file.findings;
  const adjFile = join(run, "adjudications.json");
  if (opts.write && existsSync(adjFile) && !opts.overwrite)
    throw new Error(`${adjFile} exists; pass --overwrite to replace it`);
  const effort = opts.effort ?? "xhigh";
  const judges = (
    opts.judges?.length ? opts.judges : DEFAULT_ACCURACY_JUDGES
  ).map((s, i) => judgeOf(s, effort, i));
  const decider = opts.decider ?? judges[0]!.model;
  if (!judges.some((j) => j.model === decider))
    throw new Error(`--decider ${decider} is not one of the judges`);
  const out = resolve(opts.out);
  if (existsSync(join(out, "run.json")) && !opts.resume)
    throw new Error(`${out} already holds an accuracy review; pass --resume`);
  mkdirSync(join(out, "calls"), { recursive: true });
  writeFileSync(
    join(out, "run.json"),
    json({
      schema: "prbench.accuracy-review-run/v1",
      promptVersion: ACCURACY_PROMPT_VERSION,
      comparison: basename(run),
      experiment: manifest.id,
      judges: judges.map((j) => ({ model: j.model, effort })),
      decider,
    }),
  );
  const stats: CallStats = { calls: 0, cached: 0, costUsd: 0 };
  const call = makeCaller(
    out,
    !!opts.resume,
    limiter(opts.parallel ?? 6),
    stats,
  );
  const caseLimit = limiter(
    Math.max(1, Math.ceil((opts.parallel ?? 6) / judges.length)),
  );
  const packets = opts.packets ? resolve(opts.packets) : undefined;
  const loaded = new Map(
    caseDirs(resolve(opts.cases)).map((d) => {
      const l = loadCase(d);
      return [l.case.id, l] as const;
    }),
  );
  const summary: AccuracyReviewSummary = {
    findings: findings.length,
    ruled: 0,
    agreed: 0,
    decided: 0,
    outcomes: { confirmed: 0, falsePositive: 0 },
    byArm: {},
    unsourced: 0,
    calls: 0,
    cachedCalls: 0,
    costUsd: 0,
    written: false,
  };
  const entries: {
    finding: string;
    arm: string;
    outcome: Outcome;
    reviewedBy: string;
    reviewedAt: string;
    rationale: string;
    sources: AdjudicationSource[];
  }[] = [];
  const byCase = new Map<string, AccuracyFinding[]>();
  for (const f of findings)
    if (!opts.caseIds?.length || opts.caseIds.includes(f.case))
      byCase.set(f.case, [...(byCase.get(f.case) ?? []), f]);

  async function reviewCase(
    caseId: string,
    list: AccuracyFinding[],
  ): Promise<void> {
    const l = loaded.get(caseId);
    if (!l) throw new Error(`case ${caseId} not found under ${opts.cases}`);
    const caseOut = join(out, caseId);
    mkdirSync(caseOut, { recursive: true });
    const ev = buildEvidence(l, packetFor(l, packets, caseOut));
    try {
      // Drafts are named by order of first appearance, never by system.
      const draftNames = new Map<string, string>();
      const drafts = new Map<string, PRArtifact>();
      const files: Record<string, unknown> = {};
      for (const f of list) {
        const arm = f.arm ?? "tracetoon-candidate";
        const key = `${f.replicate}/${f.model}/${arm}`;
        if (draftNames.has(key)) continue;
        const path = join(
          modelRoot(run, f.replicate, f.model),
          "artifacts",
          caseId,
          `${arm}.json`,
        );
        const artifact = JSON.parse(readFileSync(path, "utf8")) as PRArtifact;
        if (artifactDigest(artifact) !== f.artifactDigest)
          throw new Error(
            `${caseId}: artifact ${key} changed since the findings were collected`,
          );
        const name = `d${draftNames.size + 1}`;
        draftNames.set(key, name);
        drafts.set(name, artifact);
      }
      const flags: FlagView[] = list.map((f, i) => ({
        id: `F${i + 1}`,
        draft: draftNames.get(
          `${f.replicate}/${f.model}/${f.arm ?? "tracetoon-candidate"}`,
        )!,
        claim: f.claim,
        reasons: [...new Set(f.observations.map((o) => o.reason))],
      }));
      for (const [name, a] of drafts) {
        files[`drafts/${name}.md`] = `# ${a.title}\n\n${a.body}\n`;
        files[`drafts/${name}.validation.json`] = {
          commands: (a.validation?.commands ?? []).map((c) => ({
            id: c.id,
            command: c.command,
            outcome: (c as any).outcome,
            summary: (c as any).summary,
          })),
        };
      }
      files["flags.json"] = { flags };
      const ids = flags.map((f) => f.id);
      log(`case  ${caseId}: ${flags.length} flags in ${drafts.size} drafts`);
      const sheet: SheetItem[] = flags.map((f) => ({
        id: f.id,
        category: "claims",
        text: f.claim,
      }));
      const prompt = accuracyPrompt(flags);
      const replies = await Promise.all(
        judges.map(async (j) => ({
          j,
          reply: await call<RulingReply>(caseOut, ev, sheet, {
            kind: "accuracy",
            round: 1,
            reviewer: j,
            prompt,
            schema: rulingSchema(ids),
            check: (v) => checkRulings(v, ids),
            files,
            saveAs: `judge-${j.model}.json`,
          }),
        })),
      );
      const ctx = {
        caseDir: l.dir,
        bare: ev.bare,
        base: l.case.repo.base,
        head: l.case.repo.head!,
        sessions: (l.case.sessions ?? []).map((s) => s.file),
      };
      const rulings: unknown[] = [];
      list.forEach((f, i) => {
        const id = ids[i]!;
        const per = replies.map(({ j, reply }) => ({
          judge: j.model,
          ...reply.items.find((x) => x.id === id)!,
        }));
        const agreed = new Set(per.map((p) => p.outcome)).size === 1;
        const chosen = agreed ? per[0]! : per.find((p) => p.judge === decider)!;
        const refs = agreed
          ? [...new Set(per.flatMap((p) => p.evidenceRefs))]
          : chosen.evidenceRefs;
        const sources: AdjudicationSource[] = [];
        for (const r of refs) {
          const s = adjudicationSource(r, ctx, drafts);
          if (
            s &&
            !sources.some((x) => JSON.stringify(x) === JSON.stringify(s))
          )
            sources.push(s);
        }
        const arm = f.arm ?? "tracetoon-candidate";
        summary.ruled++;
        if (agreed) summary.agreed++;
        else summary.decided++;
        rulings.push({
          flag: id,
          finding: f.id,
          arm,
          rulings: per,
          outcome: chosen.outcome,
          agreed,
          sources: sources.length,
        });
        if (!sources.length) {
          summary.unsourced++;
          return;
        }
        const tally = (summary.byArm[arm] ??= { flags: 0, confirmed: 0 });
        tally.flags++;
        if (chosen.outcome === "confirmed") {
          tally.confirmed++;
          summary.outcomes.confirmed++;
        } else summary.outcomes.falsePositive++;
        entries.push({
          finding: f.id,
          arm,
          outcome: chosen.outcome,
          reviewedBy: `expert judges ${judges.map((j) => `${j.model}@${effort}`).join(" + ")}${agreed ? " (agreed)" : `; split decided by ${decider}`}`,
          reviewedAt: new Date().toISOString(),
          rationale: agreed
            ? per.map((p) => `${p.judge}: ${p.reason}`).join(" | ")
            : `${decider}: ${chosen.reason} (other: ${per
                .filter((p) => p.judge !== decider)
                .map((p) => `${p.judge} ${p.outcome}: ${p.reason}`)
                .join(" | ")})`,
          sources,
        });
      });
      writeFileSync(
        join(caseOut, "rulings.json"),
        json({
          schema: "prbench.accuracy-rulings/v1",
          case: caseId,
          drafts: Object.fromEntries([...draftNames].map(([k, v]) => [v, k])),
          rulings,
        }),
      );
      log(`done  ${caseId}: ${flags.length} ruled`);
    } finally {
      const { rmSync } = await import("node:fs");
      rmSync(ev.dir, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    }
  }

  const codex = judges.some((j) => j.provider === "codex");
  if (codex) setCodexLoginSharing(true);
  try {
    await Promise.all(
      [...byCase].map(([c, list]) => caseLimit(() => reviewCase(c, list))),
    );
  } finally {
    if (codex) {
      setCodexLoginSharing(false);
      releaseCodexLoginLease();
    }
  }
  Object.assign(summary, {
    calls: stats.calls,
    cachedCalls: stats.cached,
    costUsd: stats.costUsd,
  });
  entries.sort((a, b) => a.finding.localeCompare(b.finding));
  const doc = {
    schema: "prbench.adjudications/v1",
    experiment: manifest.id,
    entries,
  };
  writeFileSync(join(out, "adjudications.json"), json(doc));
  if (opts.write) {
    writeFileSync(adjFile, json(doc));
    summary.written = true;
  }
  writeFileSync(join(out, "summary.json"), json(summary));
  return summary;
}

export function accuracySummaryLines(s: AccuracyReviewSummary): string[] {
  return [
    `accuracy review: ${s.ruled}/${s.findings} flags ruled; judges agreed on ${s.agreed}, decider settled ${s.decided}`,
    `adjudicated: ${s.outcomes.confirmed} confirmed, ${s.outcomes.falsePositive} false positives; ${Object.entries(
      s.byArm,
    )
      .sort()
      .map(([a, t]) => `${a} ${t.confirmed}/${t.flags} confirmed`)
      .join(
        ", ",
      )}${s.unsourced ? `; ${s.unsourced} left unresolved (no verifiable source)` : ""}`,
    `calls ${s.calls} new, ${s.cachedCalls} reused; reported cost $${s.costUsd.toFixed(2)} (Claude calls)${s.written ? "; adjudications.json written to the run" : ""}`,
  ];
}
