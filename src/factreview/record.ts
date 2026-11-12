// What a fact-review run leaves behind, per case: decisions.json (which item
// changed, why, and by whose votes), the revised facts.json, human-review.md
// (disputed items only, with both sides' evidence) and, with --apply, the
// case's own facts.json and facts-provenance.json rebuilt as an expert-panel
// review with every cited range rehashed.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Facts } from "../schema/case.ts";
import type { ExpertReviewRecord, FactProvenance } from "../run/preflight.ts";
import { digest } from "../util/hash.ts";
import {
  buildProvenance,
  draftOf,
  sourceContent,
  type Draft,
  type DraftFact,
  type DraftSource,
} from "../../scripts/provenance.ts";
import type {
  Consensus,
  ItemRound1,
  ProposedAddition,
  VoteRecord,
} from "./aggregate.ts";
import {
  CATEGORIES,
  factsOf,
  type Category,
  type SheetItem,
  type Verdict,
  type Vote,
} from "./schema.ts";

export interface VoteRound {
  round: number;
  candidate: { text: string; reason: string; evidenceRefs: string[] };
  consensus: Consensus<Vote>;
  votes: VoteRecord[];
}

/** The cross-examination of a disputed item: every reviewer's final choice after seeing all arguments. */
export interface CrossExamRound {
  candidate: { text: string; reason: string; evidenceRefs: string[] } | null;
  consensus: Consensus<Verdict>;
  votes: {
    reviewer: string;
    family: string;
    choice: Verdict;
    /** The reviewer's round-1 verdict, to measure how many changed their mind. */
    before: Verdict;
    reason: string;
    evidenceRefs: string[];
  }[];
}

export interface ItemDecision {
  id: string;
  category: Category;
  text: string;
  outcome: "kept" | "removed" | "revised" | "disputed";
  /** The text the revised sheet carries (the original for kept and disputed items), or null when removed. */
  finalText: string | null;
  /** The round that settled it (or the last round tried). */
  round: number;
  why: string;
  round1: ItemRound1;
  rewriteRounds: VoteRound[];
  crossExam?: CrossExamRound;
  /** False for context items a focused re-review did not put to the panel. */
  reviewed?: boolean;
}

export interface AdditionDecision {
  /** A1, A2, ...: one per cluster of proposed additions. */
  id: string;
  category: Category;
  text: string;
  /** Raw proposals (P<n>) in the cluster and the distinct reviewers behind them. */
  members: string[];
  proposers: string[];
  outcome: "added" | "rejected" | "disputed" | "dropped-single" | "unsourced";
  round: number;
  why: string;
  evidenceRefs: string[];
  rounds: VoteRound[];
}

export interface CaseResult {
  caseId: string;
  sheet: SheetItem[];
  items: ItemDecision[];
  additions: AdditionDecision[];
  proposals: ProposedAddition[];
  facts: Facts;
}

export interface CaseCounts {
  items: number;
  settled: number;
  kept: number;
  disputed: number;
  revised: number;
  removed: number;
  added: number;
  additionsDisputed: number;
  additionsDropped: number;
}

export function countsOf(r: CaseResult): CaseCounts {
  const reviewed = r.items.filter((i) => i.reviewed !== false);
  const n = (o: ItemDecision["outcome"]) =>
    reviewed.filter((i) => i.outcome === o).length;
  return {
    items: reviewed.length,
    settled: reviewed.length - n("disputed"),
    kept: n("kept"),
    disputed: n("disputed"),
    revised: n("revised"),
    removed: n("removed"),
    added: r.additions.filter((a) => a.outcome === "added").length,
    additionsDisputed: r.additions.filter(
      (a) => a.outcome === "disputed" || a.outcome === "unsourced",
    ).length,
    additionsDropped: r.additions.filter(
      (a) => a.outcome === "dropped-single" || a.outcome === "rejected",
    ).length,
  };
}

/** The revised sheet: kept and disputed items as they were, rewrites applied, removals dropped, additions appended. */
export function revisedFacts(
  items: ItemDecision[],
  additions: AdditionDecision[],
): Facts {
  return factsOf([
    ...items
      .filter((i) => i.finalText !== null)
      .map((i) => ({ category: i.category, text: i.finalText! })),
    ...additions
      .filter((a) => a.outcome === "added")
      .map((a) => ({ category: a.category, text: a.text })),
  ]);
}

const factsText = (facts: Facts) => JSON.stringify(facts, null, 2) + "\n";

export function writeCaseRecord(
  dir: string,
  r: CaseResult,
  run: { runId: string },
): void {
  writeFileSync(join(dir, "facts.json"), factsText(r.facts));
  writeFileSync(
    join(dir, "decisions.json"),
    JSON.stringify(
      {
        schema: "prbench.fact-review-decisions/v1",
        runId: run.runId,
        case: r.caseId,
        counts: countsOf(r),
        items: r.items,
        additions: r.additions,
        proposals: r.proposals,
      },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(join(dir, "human-review.md"), humanReview(r));
}

const votesTable = (
  votes: {
    reviewer: string;
    family: string;
    value: string;
    reason: string;
    evidenceRefs: string[];
    extra?: string;
  }[],
) =>
  votes
    .map(
      (v) =>
        `- **${v.reviewer}** (${v.family}): ${v.value}${v.extra ?? ""} — ${v.reason}${v.evidenceRefs.length ? `\n  evidence: ${v.evidenceRefs.join(", ")}` : ""}`,
    )
    .join("\n");

const familyLine = (byFamily: Record<string, string | null>) =>
  Object.entries(byFamily)
    .map(([f, v]) => `${f}: ${v ?? "no majority"}`)
    .join("; ");

/** Disputed items only, each with every reviewer's position and evidence. */
export function humanReview(r: CaseResult): string {
  const out = [`# Human review: ${r.caseId}`, ""];
  const items = r.items.filter((i) => i.outcome === "disputed");
  const adds = r.additions.filter(
    (a) => a.outcome === "disputed" || a.outcome === "unsourced",
  );
  if (!items.length && !adds.length)
    return [
      ...out,
      "Nothing disputed: the panel reached consensus on every item.",
      "",
    ].join("\n");
  out.push(
    "Each entry below lacked family consensus. The revised facts.json keeps disputed items as they were and leaves disputed additions out; decide each one and edit the sheet.",
    "",
  );
  for (const i of items) {
    out.push(
      `## ${i.id} (${i.category})`,
      "",
      `> ${i.text}`,
      "",
      `Why disputed: ${i.why}`,
      "",
      `### Round 1 verdicts (${familyLine(i.round1.consensus.byFamily)})`,
      "",
    );
    out.push(
      votesTable(
        i.round1.votes.map((v) => ({
          ...v,
          value: v.verdict,
          extra: `${v.trapIsReal !== null ? `, trap real: ${v.trapIsReal}` : ""}${v.rewrite ? `\n  rewrite: ${v.rewrite}` : ""}`,
        })),
      ),
      "",
    );
    if (i.crossExam) {
      const x = i.crossExam;
      out.push(
        `### Cross-examination (${familyLine(x.consensus.byFamily)})`,
        "",
        ...(x.candidate ? [`Candidate rewrite: ${x.candidate.text}`, ""] : []),
        votesTable(
          x.votes.map((v) => ({
            ...v,
            value:
              v.choice === v.before
                ? v.choice
                : `${v.choice} (was ${v.before})`,
          })),
        ),
        "",
      );
    }
    for (const rr of i.rewriteRounds) {
      out.push(
        `### Round ${rr.round} vote on a rewrite (${familyLine(rr.consensus.byFamily)})`,
        "",
        `> ${rr.candidate.text}`,
        "",
      );
      out.push(votesTable(rr.votes.map((v) => ({ ...v, value: v.vote }))), "");
    }
  }
  for (const a of adds) {
    out.push(
      `## Addition ${a.id} (${a.category})`,
      "",
      `> ${a.text}`,
      "",
      `Why: ${a.why}`,
      `Proposed by: ${a.proposers.join(", ")}`,
      a.evidenceRefs.length ? `Evidence: ${a.evidenceRefs.join(", ")}` : "",
      "",
    );
    for (const rr of a.rounds) {
      out.push(
        `### Round ${rr.round} vote (${familyLine(rr.consensus.byFamily)})`,
        "",
        `> ${rr.candidate.text}`,
        "",
      );
      out.push(votesTable(rr.votes.map((v) => ({ ...v, value: v.vote }))), "");
    }
  }
  return out.join("\n");
}

/** What evidence references resolve against: the case's commits, sessions and changed files. */
export interface RefContext {
  caseDir: string;
  bare: string;
  base: string;
  head: string;
  sessions: string[];
}

/** One evidence reference as a provenance source with a checked line range, or undefined. */
export function resolveRef(
  ref: string,
  ctx: RefContext,
): DraftSource | undefined {
  const trimmed = ref.trim().replace(/^`|`$/g, "");
  const commitOnly = /^commit\s+([0-9a-f]{40})$/.exec(trimmed);
  const m = /^(.+?):L(\d+)(?:\s*-\s*L?(\d+))?$/.exec(trimmed);
  let source: DraftSource | undefined;
  let start = m ? Number(m[2]) : 1;
  let end = m ? Number(m[3] ?? m[2]) : Number.POSITIVE_INFINITY;
  const file = m?.[1] ?? "";
  if (commitOnly)
    source = {
      kind: "commit",
      revision: commitOnly[1]!,
      startLine: 1,
      endLine: 1,
    };
  else if (file === "diff.patch")
    source = { kind: "diff", startLine: start, endLine: end };
  else if (/^commits\/[0-9a-f]{40}\.txt$/.test(file))
    source = {
      kind: "commit",
      revision: file.slice(8, 48),
      startLine: start,
      endLine: end,
    };
  else if (file.startsWith("head/") || file.startsWith("base/"))
    source = {
      kind: "git",
      revision: file.startsWith("head/") ? ctx.head : ctx.base,
      path: file.slice(5),
      startLine: start,
      endLine: end,
    };
  else if (file.startsWith("raw/") && ctx.sessions.includes(file.slice(4)))
    source = {
      kind: "session",
      path: file.slice(4),
      startLine: start,
      endLine: end,
    };
  else if (file === "fact-sources/digest.json")
    source = {
      kind: "historical-digest",
      path: file,
      startLine: start,
      endLine: end,
    };
  if (!source) return undefined;
  let lines: number;
  try {
    lines = sourceContent(ctx.caseDir, ctx.bare, source).split(/\r?\n/).length;
  } catch {
    return undefined;
  }
  if (commitOnly) [start, end] = [1, lines];
  if (!Number.isFinite(end)) end = lines;
  if (start < 1 || end < start || end > lines) return undefined;
  return { ...source, startLine: start, endLine: end };
}

/** A provenance source as the evidence reference reviewers cite. */
export function refOf(
  s: {
    kind: string;
    path?: string;
    revision?: string;
    startLine: number;
    endLine: number;
  },
  base: string,
): string {
  const lines = `:L${s.startLine}-L${s.endLine}`;
  if (s.kind === "diff") return `diff.patch${lines}`;
  if (s.kind === "commit") return `commits/${s.revision}.txt${lines}`;
  if (s.kind === "git")
    return `${s.revision === base ? "base" : "head"}/${s.path}${lines}`;
  if (s.kind === "session") return `raw/${s.path}${lines}`;
  if (s.kind === "historical-digest") return `${s.path}${lines}`;
  return `${s.kind}:${s.path ?? ""}${lines}`;
}

/** The draft the case's current sheet came from: facts-provenance.json, else a packet facts.draft.json. */
export function baseDraft(
  caseDir: string,
  facts: Facts | undefined,
  draftFile?: string,
): Draft | undefined {
  const prov = join(caseDir, "facts-provenance.json");
  if (facts && existsSync(prov))
    return draftOf(
      facts,
      JSON.parse(readFileSync(prov, "utf8")) as FactProvenance,
    );
  if (draftFile && existsSync(draftFile))
    return JSON.parse(readFileSync(draftFile, "utf8")) as Draft;
  return undefined;
}

/**
 * The revised draft: kept items keep their sources, rewrites keep theirs plus
 * any the panel cited, additions carry only what the panel cited. An accepted
 * addition with no resolvable reference cannot be sourced: it becomes
 * "unsourced" and goes to human review instead of the sheet.
 */
export function revisedDraft(
  base: Draft,
  r: CaseResult,
  resolve: (ref: string) => DraftSource | undefined,
): Draft {
  const draft = {
    claims: [],
    context: [],
    uncertainties: [],
    traps: [],
  } as Draft;
  const sources = (refs: string[]) => {
    const out: DraftSource[] = [];
    for (const ref of refs) {
      const s = resolve(ref);
      if (s && !out.some((o) => JSON.stringify(o) === JSON.stringify(s)))
        out.push(s);
    }
    return out;
  };
  for (const item of r.items) {
    if (item.finalText === null) continue;
    const index = Number(item.id.slice(1)) - 1;
    const old = base[item.category][index] as DraftFact;
    if (item.outcome !== "revised") {
      draft[item.category].push({ ...old, text: item.finalText });
      continue;
    }
    const last = item.crossExam?.candidate
      ? { candidate: item.crossExam.candidate }
      : item.rewriteRounds.at(-1)!;
    const extra = sources(last.candidate.evidenceRefs).filter(
      (s) => !old.sources.some((o) => JSON.stringify(o) === JSON.stringify(s)),
    );
    draft[item.category].push({
      text: item.finalText,
      rationale: `${old.rationale} Expert panel revision: ${last.candidate.reason}`,
      sources: [...old.sources, ...extra],
    });
  }
  for (const a of r.additions) {
    if (a.outcome !== "added") continue;
    const s = sources([
      ...(a.rounds.at(-1)?.candidate.evidenceRefs ?? []),
      ...a.evidenceRefs,
    ]);
    if (!s.length) {
      a.outcome = "unsourced";
      a.why = `accepted by the panel, but none of its evidence references resolve to a citable source (${a.evidenceRefs.join(", ") || "none"})`;
      continue;
    }
    draft[a.category].push({
      text: a.text,
      rationale: `Added by expert panel: ${a.rounds.at(-1)?.candidate.reason ?? a.why}`,
      sources: s,
    });
  }
  return draft;
}

/**
 * Applies a reviewed sheet to its case: rebuilds facts.json and
 * facts-provenance.json from the revised draft (hashing every cited range as
 * preflight reads it) and records the panel.
 */
export function applyToCase(
  caseDir: string,
  draft: Draft,
  opts: {
    bare: string;
    reviewedBy: string;
    record: Omit<ExpertReviewRecord, "factsSha256">;
  },
): { facts: Facts; provenance: FactProvenance } {
  const { facts, provenance } = buildProvenance(caseDir, draft, {
    bare: opts.bare,
    reviewedBy: opts.reviewedBy,
    reviewKind: "expert-panel",
  });
  const text = factsText(facts);
  provenance.expertReview = { ...opts.record, factsSha256: digest(text) };
  const c = JSON.parse(readFileSync(join(caseDir, "case.json"), "utf8"));
  const factsFile = c.facts ?? "facts.json";
  writeFileSync(join(caseDir, factsFile), text);
  writeFileSync(
    join(caseDir, "facts-provenance.json"),
    JSON.stringify(provenance, null, 2) + "\n",
  );
  if (!c.facts) {
    c.facts = factsFile;
    writeFileSync(
      join(caseDir, "case.json"),
      JSON.stringify(c, null, 2) + "\n",
    );
  }
  return { facts, provenance };
}

/** Facts from a draft (texts only), in draft order. */
export function factsOfDraft(draft: Draft): Facts {
  return factsOf(
    CATEGORIES.flatMap((category) =>
      (draft[category] ?? []).map((f) => ({ category, text: f.text })),
    ),
  );
}
