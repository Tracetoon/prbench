// Debate rounds for fact-sheet items the panel left disputed. Each disputed
// item (or disputed proposed addition) goes through two mirrored debates:
//
//   A: Opus makes the case, Sol must rebut it, Opus gives an amended decision.
//   B: Sol makes the case, Opus must rebut it, Sol gives an amended decision.
//
// The item settles when both amended decisions agree. When both end in a
// revision with different texts, one Opus and one Sol call each pick the
// better of the two texts, and the item settles only if they pick the same
// one. Anything else stays disputed for a human. Prompts name roles
// (advocate, respondent), never models or families.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { caseDirs, loadCase, type Facts } from "../schema/case.ts";
import {
  releaseCodexLoginLease,
  setCodexLoginSharing,
} from "../agents/codexAuth.ts";
import {
  buildEvidence,
  json,
  limiter,
  makeCaller,
  packetFor,
  parsePanel,
  reviewersOf,
  type CallStats,
  type Reviewer,
} from "./panel.ts";
import { list, SHEET_RULES, WORKSPACE } from "./prompt.ts";
import {
  applyToCase,
  baseDraft,
  resolveRef,
  revisedDraft,
  type AdditionDecision,
  type CaseResult,
  type ItemDecision,
} from "./record.ts";
import {
  sheetOf,
  VERDICTS,
  type Category,
  type SheetItem,
  type Verdict,
} from "./schema.ts";

export const DEBATE_PROMPT_VERSION = 1;

/** One disputed thing to debate: an item on the sheet, or a proposed addition. */
export interface DebateEntry {
  /** The sheet item's ID, or N1, N2, ... for proposed additions. */
  id: string;
  kind: "item" | "addition";
  category: Category;
  text: string;
  /** A rewrite proposed earlier, if any, for context. */
  earlier: string | null;
}

export interface Position {
  id: string;
  position: Verdict;
  text: string | null;
  argument: string;
  evidenceRefs: string[];
}

interface PositionsReply {
  items: Position[];
}
interface ReconcileReply {
  items: { id: string; choice: "1" | "2"; reason: string }[];
}

const str = { type: "string" };
const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
const idsOf = (ids: string[]) =>
  ids.length ? { type: "string", enum: ids } : str;

export function positionsSchema(ids: string[]) {
  return obj({
    items: {
      type: "array",
      items: obj({
        id: idsOf(ids),
        position: { type: "string", enum: [...VERDICTS] },
        text: { type: ["string", "null"] },
        argument: str,
        evidenceRefs: { type: "array", items: str },
      }),
    },
  });
}

function reconcileSchema(ids: string[]) {
  return obj({
    items: {
      type: "array",
      items: obj({
        id: idsOf(ids),
        choice: { type: "string", enum: ["1", "2"] },
        reason: str,
      }),
    },
  });
}

export function checkPositions(
  value: unknown,
  entries: DebateEntry[],
): string[] {
  const v = value as PositionsReply;
  if (!v || typeof v !== "object" || !Array.isArray(v.items))
    return ["expected {items: [...]}"];
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const p of v.items) {
    if (!entries.some((e) => e.id === p?.id)) {
      problems.push(`unknown id ${JSON.stringify(p?.id)}`);
      continue;
    }
    if (seen.has(p.id)) problems.push(`${p.id}: answered more than once`);
    seen.add(p.id);
    if (!(VERDICTS as readonly string[]).includes(p.position))
      problems.push(`${p.id}: position must be keep, revise or remove`);
    if (
      p.position === "revise" &&
      (typeof p.text !== "string" || !p.text.trim())
    )
      problems.push(`${p.id}: revise needs the text`);
    if (typeof p.argument !== "string" || !p.argument.trim())
      problems.push(`${p.id}: the argument is required`);
    if (!Array.isArray(p.evidenceRefs))
      problems.push(`${p.id}: evidenceRefs must be a list`);
  }
  for (const e of entries)
    if (!seen.has(e.id)) problems.push(`${e.id}: not answered`);
  return problems;
}

function checkReconcile(value: unknown, ids: string[]): string[] {
  const v = value as ReconcileReply;
  if (!v || !Array.isArray(v.items)) return ["expected {items: [...]}"];
  const problems: string[] = [];
  for (const id of ids)
    if (
      v.items.filter(
        (x) => x?.id === id && (x.choice === "1" || x.choice === "2"),
      ).length !== 1
    )
      problems.push(`${id}: choose 1 or 2 exactly once`);
  return problems;
}

const OPTIONS = `Positions:
- For an item on the sheet: keep (correct, supported, specific and worth scoring as it stands), revise (worth keeping, but give the corrected text in "text"), or remove (unsupported, contradicted, trivial, or a duplicate).
- For a proposed addition: keep (add it as proposed), revise (add it with your text in "text"), or remove (do not add it).

Prefer the shortest text that is correct and scoreable. Extra detail or qualification is not better in itself: add it only when a description written from the shorter text would be wrong or misleading. Set "text" to null unless the position is revise.`;

function entriesBlock(entries: DebateEntry[]): string {
  return entries
    .map((e) =>
      [
        `### ${e.id} (${e.kind === "addition" ? `proposed addition to ${e.category}` : e.category})`,
        `Text: ${e.text}`,
        ...(e.earlier ? [`A rewrite proposed earlier: ${e.earlier}`] : []),
      ].join("\n"),
    )
    .join("\n\n");
}

const positionLine = (label: string, p: Position) =>
  [
    `${label}: ${p.position}${p.text ? ` -> "${p.text}"` : ""}`,
    `  ${p.argument.replace(/\n+/g, " ")}`,
    `  evidence: ${p.evidenceRefs.join(", ") || "none"}`,
  ].join("\n");

function preamble(sheet: SheetItem[], entries: DebateEntry[]): string {
  return `Reviewers checking a fact sheet for a code change against the raw evidence could not agree on the entries below. They are now settled by debate.

${SHEET_RULES}

${WORKSPACE}

## The sheet (also in sheet.json)

${list(sheet)}

## The disputed entries (also in debate.json)

${entriesBlock(entries)}

${OPTIONS}`;
}

export function openPrompt(sheet: SheetItem[], entries: DebateEntry[]): string {
  return `${preamble(sheet, entries)}

## Your task: make the case

You are the advocate. For every entry, take the position the evidence best supports and make the full case for it: what the evidence shows (open it and cite it), why the other positions are worse, and, for revise, why your text is right. Your case will be rebutted, so make it complete and exact.

Reply with the JSON object only, with your case in "argument".`;
}

export function rebutPrompt(
  sheet: SheetItem[],
  entries: DebateEntry[],
  opening: Position[],
): string {
  const body = entries
    .map(
      (e) =>
        `### ${e.id}\n${positionLine(
          "The advocate's case",
          opening.find((p) => p.id === e.id)!,
        )}`,
    )
    .join("\n\n");
  return `${preamble(sheet, entries)}

## The advocate's case

${body}

## Your task: rebut

You are the respondent. Write a rebuttal for every entry; it is required even if you agree with the advocate. Check the evidence the case cites and the evidence it leaves out, and say what it gets wrong, overstates or misses. If after checking you agree, say why the case holds and what, if anything, would make it stronger. Then state your own position (and text, for revise).

Reply with the JSON object only, with your rebuttal in "argument".`;
}

export function amendPrompt(
  sheet: SheetItem[],
  entries: DebateEntry[],
  opening: Position[],
  rebuttal: Position[],
): string {
  const body = entries
    .map((e) =>
      [
        `### ${e.id}`,
        positionLine(
          "Your case",
          opening.find((p) => p.id === e.id)!,
        ),
        positionLine(
          "The respondent's rebuttal",
          rebuttal.find((p) => p.id === e.id)!,
        ),
      ].join("\n"),
    )
    .join("\n\n");
  return `${preamble(sheet, entries)}

## The debate so far

${body}

## Your task: amended decision

You made the case above, and the respondent rebutted it. Check any evidence the rebuttal cites, then give your amended final decision for every entry. Change your position or text where the rebuttal is right on the evidence; keep it where it is not. Do not split the difference. In "argument", say what you changed and why, or why the rebuttal does not move you.

Reply with the JSON object only.`;
}

function reconcilePrompt(
  sheet: SheetItem[],
  entries: { entry: DebateEntry; one: string; two: string }[],
): string {
  const body = entries
    .map(({ entry, one, two }) =>
      [
        `### ${entry.id} (${entry.category})`,
        `Current text: ${entry.text}`,
        `Text 1: ${one}`,
        `Text 2: ${two}`,
      ].join("\n"),
    )
    .join("\n\n");
  return `Two debates over a fact sheet for a code change both concluded that these entries need new text, but wrote different texts. Choose the better text for each.

${SHEET_RULES}

${WORKSPACE}

## The sheet (also in sheet.json)

${list(sheet)}

## The entries

${body}

## Your task

For every entry choose 1 or 2: the text that is correct against the evidence (check it), specific enough to score, and no longer than it needs to be. Give a one-line reason.

Reply with the JSON object only.`;
}

export interface DebateOutcome {
  entry: DebateEntry;
  status: "settled" | "disputed";
  position: Verdict | null;
  text: string | null;
  evidenceRefs: string[];
  why: string;
  debates: {
    opener: string;
    respondent: string;
    opening: Position;
    rebuttal: Position;
    amended: Position;
  }[];
  reconcile?: { reviewer: string; choice: "1" | "2"; reason: string }[];
}

/** Decides an entry from the two amended positions and, for two different rewrites, the reconcilers' picks. */
export function decide(
  a: Position,
  b: Position,
  picks?: { reviewer: string; choice: "1" | "2"; reason: string }[],
): Pick<
  DebateOutcome,
  "status" | "position" | "text" | "evidenceRefs" | "why"
> {
  const refs = [...new Set([...a.evidenceRefs, ...b.evidenceRefs])];
  if (a.position !== b.position)
    return {
      status: "disputed",
      position: null,
      text: null,
      evidenceRefs: refs,
      why: `the debates ended apart: ${a.position} vs ${b.position}`,
    };
  if (a.position !== "revise")
    return {
      status: "settled",
      position: a.position,
      text: null,
      evidenceRefs: refs,
      why: `both debates ended in ${a.position}`,
    };
  if (a.text!.trim() === b.text!.trim())
    return {
      status: "settled",
      position: "revise",
      text: a.text,
      evidenceRefs: refs,
      why: "both debates ended in the same rewrite",
    };
  if (!picks?.length)
    return {
      status: "disputed",
      position: "revise",
      text: null,
      evidenceRefs: refs,
      why: "both debates ended in revise, with different texts",
    };
  const choices = new Set(picks.map((p) => p.choice));
  if (choices.size !== 1)
    return {
      status: "disputed",
      position: "revise",
      text: null,
      evidenceRefs: refs,
      why: "both debates ended in revise; the reconcilers picked different texts",
    };
  const chosen = [...choices][0] === "1" ? a : b;
  return {
    status: "settled",
    position: "revise",
    text: chosen.text,
    evidenceRefs: [...new Set(chosen.evidenceRefs)],
    why: `both debates ended in revise; both reconcilers picked text ${[...choices][0]}`,
  };
}

interface Disputes {
  items: { category: Category; text: string; earlier: string | null }[];
  additions: { category: Category; text: string }[];
}

/** Disputed items and additions recorded for a case across earlier runs (later runs win). */
export function disputesFrom(runs: string[], caseId: string): Disputes {
  const out: Disputes = { items: [], additions: [] };
  for (const run of runs) {
    const file = join(run, caseId, "decisions.json");
    if (!existsSync(file)) continue;
    const d = JSON.parse(readFileSync(file, "utf8"));
    for (const i of d.items ?? []) {
      if (i.outcome !== "disputed" || i.reviewed === false) continue;
      const earlier =
        i.crossExam?.candidate?.text ??
        i.rewriteRounds?.at(-1)?.candidate?.text ??
        null;
      if (
        !out.items.some((x) => x.category === i.category && x.text === i.text)
      )
        out.items.push({ category: i.category, text: i.text, earlier });
    }
    for (const a of d.additions ?? [])
      if (
        (a.outcome === "disputed" || a.outcome === "unsourced") &&
        !out.additions.some((x) => x.text === a.text)
      )
        out.additions.push({ category: a.category, text: a.text });
  }
  return out;
}

export interface DebateOptions {
  cases: string;
  caseIds?: string[];
  /** Earlier fact-review runs whose disputed items and additions are debated. */
  from: string[];
  effort?: string;
  out: string;
  resume?: boolean;
  parallel?: number;
  apply?: boolean;
  aggregateOnly?: boolean;
  packets?: string;
  log?: (line: string) => void;
}

export interface DebateSummary {
  runId: string;
  cases: number;
  entries: number;
  settled: number;
  disputed: number;
  outcomes: Record<string, number>;
  /** Amended decisions that differ from the same model's opening case. */
  changedMinds: Record<string, number>;
  reconciled: number;
  calls: number;
  cachedCalls: number;
  costUsd: number;
  applied: number;
}

export async function factDebate(opts: DebateOptions): Promise<DebateSummary> {
  const log = opts.aggregateOnly
    ? () => {}
    : (opts.log ?? ((l: string) => console.error(l)));
  const effort = opts.effort ?? "xhigh";
  const [opus, sol] = reviewersOf(parsePanel("opus:1,sol:1"), effort) as [
    Reviewer,
    Reviewer,
  ];
  const out = resolve(opts.out);
  const runId = basename(out);
  const from = opts.from.map((r) => resolve(r));
  for (const r of from)
    if (!existsSync(r)) throw new Error(`--from ${r}: no such run folder`);
  const runFile = join(out, "run.json");
  if (existsSync(runFile) && !opts.resume)
    throw new Error(
      `${out} already holds a debate run; pass --resume to continue it`,
    );
  mkdirSync(join(out, "calls"), { recursive: true });
  writeFileSync(
    runFile,
    json({
      schema: "prbench.fact-debate-run/v1",
      promptVersion: DEBATE_PROMPT_VERSION,
      runId,
      effort,
      from: from.map((r) => basename(r)),
      debaters: [opus.model, sol.model],
    }),
  );

  const stats: CallStats = { calls: 0, cached: 0, costUsd: 0 };
  const call = makeCaller(
    out,
    !!opts.resume,
    limiter(opts.parallel ?? 6),
    stats,
  );
  const caseLimit = limiter(Math.max(1, Math.ceil((opts.parallel ?? 6) / 2)));
  const packets = opts.packets ? resolve(opts.packets) : undefined;
  const wanted = opts.caseIds?.length ? new Set(opts.caseIds) : undefined;
  const summary: DebateSummary = {
    runId,
    cases: 0,
    entries: 0,
    settled: 0,
    disputed: 0,
    outcomes: {},
    changedMinds: {},
    reconciled: 0,
    calls: 0,
    cachedCalls: 0,
    costUsd: 0,
    applied: 0,
  };

  const work = caseDirs(resolve(opts.cases))
    .map((dir) => loadCase(dir))
    .filter((l) => !wanted || wanted.has(l.case.id));
  // Sol calls share the benchmark Codex login, as in factReview.
  setCodexLoginSharing(true);
  try {
    await Promise.all(
      work.map((loaded) =>
        caseLimit(async () => {
          const id = loaded.case.id;
          const factsFile = join(loaded.dir, loaded.case.facts ?? "facts.json");
          if (!existsSync(factsFile)) return;
          const facts: Facts = JSON.parse(readFileSync(factsFile, "utf8"));
          const sheet = sheetOf(facts);
          const disputes = disputesFrom(from, id);
          const entries: DebateEntry[] = [];
          for (const d of disputes.items) {
            const item = sheet.find(
              (s) => s.category === d.category && s.text === d.text,
            );
            if (item)
              entries.push({
                id: item.id,
                kind: "item",
                category: item.category,
                text: item.text,
                earlier: d.earlier,
              });
          }
          disputes.additions.forEach((a, i) => {
            if (!sheet.some((s) => s.text === a.text))
              entries.push({
                id: `N${i + 1}`,
                kind: "addition",
                category: a.category,
                text: a.text,
                earlier: null,
              });
          });
          if (!entries.length) return;
          const caseOut = join(out, id);
          mkdirSync(caseOut, { recursive: true });
          const ev = buildEvidence(loaded, packetFor(loaded, packets, caseOut));
          try {
            log(`case  ${id}: ${entries.length} disputed entries`);
            const ids = entries.map((e) => e.id);
            const files = { "debate.json": { entries } };
            const stage = (
              kind: "debate-open" | "debate-rebut" | "debate-amend",
              round: number,
              who: Reviewer,
              prompt: string,
              tag: string,
            ) =>
              call<PositionsReply>(caseOut, ev, sheet, {
                kind,
                round,
                reviewer: who,
                prompt,
                schema: positionsSchema(ids),
                check: (v) => checkPositions(v, entries),
                files,
                saveAs: `debate-${tag}/${kind.slice(7)}-${who.id}.json`,
              });
            const debate = async (
              opener: Reviewer,
              respondent: Reviewer,
              tag: string,
            ) => {
              const opening = (
                await stage(
                  "debate-open",
                  1,
                  opener,
                  openPrompt(sheet, entries),
                  tag,
                )
              ).items;
              const rebuttal = (
                await stage(
                  "debate-rebut",
                  2,
                  respondent,
                  rebutPrompt(sheet, entries, opening),
                  tag,
                )
              ).items;
              const amended = (
                await stage(
                  "debate-amend",
                  3,
                  opener,
                  amendPrompt(sheet, entries, opening, rebuttal),
                  tag,
                )
              ).items;
              return { opener, respondent, opening, rebuttal, amended };
            };
            const [A, B] = await Promise.all([
              debate(opus, sol, "a"),
              debate(sol, opus, "b"),
            ]);
            const get = (ps: Position[], eid: string) =>
              ps.find((p) => p.id === eid)!;
            const split = entries.filter((e) => {
              const a = get(A.amended, e.id),
                b = get(B.amended, e.id);
              return (
                a.position === "revise" &&
                b.position === "revise" &&
                a.text!.trim() !== b.text!.trim()
              );
            });
            const picks = new Map<
              string,
              { reviewer: string; choice: "1" | "2"; reason: string }[]
            >();
            if (split.length) {
              const rIds = split.map((e) => e.id);
              const view = split.map((entry) => ({
                entry,
                one: get(A.amended, entry.id).text!,
                two: get(B.amended, entry.id).text!,
              }));
              const replies = await Promise.all(
                [opus, sol].map(async (who) => ({
                  who,
                  reply: await call<ReconcileReply>(caseOut, ev, sheet, {
                    kind: "debate-reconcile",
                    round: 4,
                    reviewer: who,
                    prompt: reconcilePrompt(sheet, view),
                    schema: reconcileSchema(rIds),
                    check: (v) => checkReconcile(v, rIds),
                    files: { "texts.json": { entries: view } },
                    saveAs: `debate-reconcile/${who.id}.json`,
                  }),
                })),
              );
              for (const e of split)
                picks.set(
                  e.id,
                  replies.map(({ who, reply }) => ({
                    reviewer: who.id,
                    ...reply.items.find((x) => x.id === e.id)!,
                  })),
                );
            }
            const outcomes: DebateOutcome[] = entries.map((entry) => {
              const a = get(A.amended, entry.id),
                b = get(B.amended, entry.id);
              for (const [d, amended] of [
                [A, a],
                [B, b],
              ] as const) {
                const opened = get(d.opening, entry.id);
                if (
                  opened.position !== amended.position ||
                  (opened.text ?? "") !== (amended.text ?? "")
                )
                  summary.changedMinds[d.opener.family] =
                    (summary.changedMinds[d.opener.family] ?? 0) + 1;
              }
              const result = decide(a, b, picks.get(entry.id));
              if (picks.has(entry.id) && result.status === "settled")
                summary.reconciled++;
              return {
                entry,
                ...result,
                debates: [A, B].map((d) => ({
                  opener: d.opener.id,
                  respondent: d.respondent.id,
                  opening: get(d.opening, entry.id),
                  rebuttal: get(d.rebuttal, entry.id),
                  amended: get(d.amended, entry.id),
                })),
                ...(picks.has(entry.id)
                  ? { reconcile: picks.get(entry.id) }
                  : {}),
              };
            });
            writeFileSync(
              join(caseOut, "debates.json"),
              json({
                schema: "prbench.fact-debate/v1",
                runId,
                case: id,
                outcomes,
              }),
            );
            writeFileSync(
              join(caseOut, "human-review.md"),
              debateHumanReview(id, outcomes),
            );
            summary.cases++;
            for (const o of outcomes) {
              summary.entries++;
              summary[o.status]++;
              const k =
                o.status === "settled"
                  ? `${o.entry.kind}:${o.position}`
                  : "disputed";
              summary.outcomes[k] = (summary.outcomes[k] ?? 0) + 1;
            }
            let applied = false;
            if (opts.apply && outcomes.some((o) => o.status === "settled")) {
              applyDebate(
                loaded,
                facts,
                sheet,
                outcomes,
                ev.bare,
                runId,
                effort,
              );
              applied = true;
              summary.applied++;
            }
            const n = (s: string) =>
              outcomes.filter((o) => o.status === s).length;
            log(
              `done  ${id}: ${n("settled")}/${outcomes.length} settled${applied ? ", applied" : ""}`,
            );
          } finally {
            rmSync(ev.dir, {
              recursive: true,
              force: true,
              maxRetries: 5,
              retryDelay: 100,
            });
          }
        }),
      ),
    );
  } finally {
    setCodexLoginSharing(false);
    releaseCodexLoginLease();
  }
  Object.assign(summary, {
    calls: stats.calls,
    cachedCalls: stats.cached,
    costUsd: stats.costUsd,
  });
  writeFileSync(join(out, "summary.json"), json(summary));
  return summary;
}

/** Writes settled debate outcomes into the case: rewrites, removals and additions, with provenance from the cited evidence. */
function applyDebate(
  loaded: ReturnType<typeof loadCase>,
  facts: Facts,
  sheet: SheetItem[],
  outcomes: DebateOutcome[],
  bare: string,
  runId: string,
  effort: string,
): void {
  const draft = baseDraft(loaded.dir, facts);
  if (!draft)
    throw new Error(
      `${loaded.case.id}: no fact provenance to apply the debate to`,
    );
  const settle = (eid: string) =>
    outcomes.find((o) => o.entry.id === eid && o.status === "settled");
  const vr = (o: DebateOutcome, text: string) => ({
    round: 0,
    candidate: {
      text,
      reason: `settled by debate (${o.why})`,
      evidenceRefs: o.evidenceRefs,
    },
    consensus: {
      status: "settled" as const,
      value: "accept" as const,
      byFamily: {},
    },
    votes: [],
  });
  const items: ItemDecision[] = sheet.map((s) => {
    const o = settle(s.id);
    const base = {
      id: s.id,
      category: s.category,
      text: s.text,
      round: 0,
      round1: {
        id: s.id,
        category: s.category,
        text: s.text,
        consensus: {
          status: "settled" as const,
          value: "keep" as const,
          byFamily: {},
        },
        votes: [],
      },
      rewriteRounds: [] as any[],
    };
    if (!o || o.position === "keep")
      return {
        ...base,
        outcome: "kept",
        finalText: s.text,
        why: o ? o.why : "not debated",
        reviewed: !!o,
      };
    if (o.position === "remove")
      return { ...base, outcome: "removed", finalText: null, why: o.why };
    return {
      ...base,
      outcome: "revised",
      finalText: o.text,
      why: o.why,
      rewriteRounds: [vr(o, o.text!)],
    };
  });
  const additions: AdditionDecision[] = outcomes
    .filter(
      (o) =>
        o.entry.kind === "addition" &&
        o.status === "settled" &&
        o.position !== "remove",
    )
    .map((o, i) => {
      const text = o.position === "revise" ? o.text! : o.entry.text;
      return {
        id: `A${i + 1}`,
        category: o.entry.category,
        text,
        members: [],
        proposers: ["debate"],
        outcome: "added",
        round: 0,
        why: o.why,
        evidenceRefs: o.evidenceRefs,
        rounds: [vr(o, text)],
      };
    });
  const result: CaseResult = {
    caseId: loaded.case.id,
    sheet,
    items,
    additions,
    proposals: [],
    facts,
  };
  const ctx = {
    caseDir: loaded.dir,
    bare,
    base: loaded.case.repo.base,
    head: loaded.case.repo.head!,
    sessions: (loaded.case.sessions ?? []).map((s) => s.file),
  };
  const revised = revisedDraft(draft, result, (ref) => resolveRef(ref, ctx));
  applyToCase(loaded.dir, revised, {
    bare,
    reviewedBy: `expert panel debate ${runId} (opus and sol at ${effort})`,
    record: {
      runId,
      reviewers: [
        { model: "claude-opus-5-5", family: "anthropic", effort, count: 1 },
        { model: "gpt-6.1-sol", family: "openai", effort, count: 1 },
      ],
      rounds: 3,
      disputed: outcomes.filter((o) => o.status === "disputed").length,
      revised: items.filter((i) => i.outcome === "revised").length,
      removed: items.filter((i) => i.outcome === "removed").length,
      added: additions.filter((a) => a.outcome === "added").length,
    },
  });
}

function debateHumanReview(caseId: string, outcomes: DebateOutcome[]): string {
  const open = outcomes.filter((o) => o.status === "disputed");
  const out = [`# Human review after debate: ${caseId}`, ""];
  if (!open.length)
    return [...out, "Every debated entry settled.", ""].join("\n");
  out.push(
    "These entries stayed disputed after both debates. The sheet keeps disputed items as they were and leaves disputed additions out.",
    "",
  );
  for (const o of open) {
    out.push(
      `## ${o.entry.id} (${o.entry.kind === "addition" ? `proposed addition to ${o.entry.category}` : o.entry.category})`,
      "",
      `> ${o.entry.text}`,
      "",
      `Why still disputed: ${o.why}`,
      "",
    );
    for (const d of o.debates) {
      out.push(`### ${d.opener} makes the case, ${d.respondent} rebuts`, "");
      for (const [label, p] of [
        ["Case", d.opening],
        ["Rebuttal", d.rebuttal],
        ["Amended", d.amended],
      ] as const)
        out.push(
          `- **${label}:** ${p.position}${p.text ? ` → "${p.text}"` : ""} — ${p.argument}${p.evidenceRefs.length ? `\n  evidence: ${p.evidenceRefs.join(", ")}` : ""}`,
        );
      out.push("");
    }
    for (const r of o.reconcile ?? [])
      out.push(`- **${r.reviewer} picks text ${r.choice}:** ${r.reason}`);
    out.push("");
  }
  return out.join("\n");
}

export function debateSummaryLines(s: DebateSummary): string[] {
  const kv = (o: Record<string, number>) =>
    Object.entries(o)
      .map(([k, v]) => `${k} ${v}`)
      .join(", ") || "none";
  return [
    `debate: cases ${s.cases}; entries ${s.entries}; settled ${s.settled}; disputed ${s.disputed}`,
    `outcomes: ${kv(s.outcomes)}; reconciled rewrites ${s.reconciled}`,
    `amended decisions that moved from the opening case: ${kv(s.changedMinds)}`,
    `calls ${s.calls} new, ${s.cachedCalls} reused; reported cost $${s.costUsd.toFixed(2)}${s.applied ? `; applied to ${s.applied} case(s)` : ""}`,
  ];
}
