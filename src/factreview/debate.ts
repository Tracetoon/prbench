// Debate plus judge, for fact-sheet entries the panel's families did not agree
// on (round-1 disputes, rewrites that failed the round-2 vote, disputed
// additions). Per case, two mirrored debates run over all entries at once:
//
//   A: Opus makes the case, Sol must rebut it.
//   B: Sol makes the case, Opus must rebut it.
//
// A single strong judge (Fable by default) then reads the same evidence and
// both debates and rules on every entry. Its ruling is final.
//
// Why not consensus: in cross-examination and in an amend-and-pick debate the
// Claude reviewers moved toward a well-argued position far more readily than
// Sol did, so any rule needing both families to agree drifted toward the more
// stubborn side. A unilateral judge removes that asymmetry; its own bias is
// measured on a control set (unanimous keeps and planted canaries) first.
//
// Prompts name roles (advocate, respondent; Debater 1 and 2), never models.
// Which model is Debater 1 is chosen per case from a hash of the case ID and
// recorded, so position bias can be checked.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import {
  releaseCodexLoginLease,
  setCodexLoginSharing,
} from "../agents/codexAuth.ts";
import { caseDirs, loadCase, type Facts } from "../schema/case.ts";
import { digest } from "../util/hash.ts";
import {
  buildEvidence,
  json,
  judgeFor,
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
  checkVotes,
  sheetOf,
  VERDICTS,
  voteSchema,
  type Category,
  type SheetItem,
  type Verdict,
  type VoteReply,
} from "./schema.ts";

export const DEBATE_PROMPT_VERSION = 2;

/** One disputed thing to settle: an item on the sheet, or a proposed addition. */
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

const str = { type: "string" };
const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
const idsOf = (ids: string[]) =>
  ids.length ? { type: "string", enum: ids } : str;

/** Debate turns and judge rulings share one shape: a position (and text) per entry, with the reasoning and evidence. */
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
  return `Reviewers checking a fact sheet for a code change against the raw evidence could not agree on the entries below.

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

You are the advocate. For every entry, take the position the evidence best supports and make the full case for it: what the evidence shows (open it and cite it), why the other positions are worse, and, for revise, why your text is right. Your case will be rebutted and then judged, so make it complete and exact.

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

You are the respondent. Write a rebuttal for every entry; it is required even if you agree with the advocate. Check the evidence the case cites and the evidence it leaves out, and say what it gets wrong, overstates or misses. If after checking you agree, say why the case holds and what, if anything, would make it stronger. Then state your own position (and text, for revise). A judge will read both sides.

Reply with the JSON object only, with your rebuttal in "argument".`;
}

export interface Debate {
  /** "Debater 1" or "Debater 2". */
  advocate: string;
  respondent: string;
  opening: Position[];
  rebuttal: Position[];
}

export function judgePrompt(
  sheet: SheetItem[],
  entries: DebateEntry[],
  debates: [Debate, Debate],
): string {
  const body = entries
    .map((e) =>
      [
        `### ${e.id}`,
        ...debates.flatMap((d, i) => [
          `Debate ${i + 1}:`,
          positionLine(
            `${d.advocate} (case)`,
            d.opening.find((p) => p.id === e.id)!,
          ),
          positionLine(
            `${d.respondent} (rebuttal)`,
            d.rebuttal.find((p) => p.id === e.id)!,
          ),
        ]),
      ].join("\n"),
    )
    .join("\n\n");
  return `${preamble(sheet, entries)}

## The debates

Two debaters argued every entry twice. In debate 1, ${debates[0].advocate} made the case and ${debates[0].respondent} rebutted; in debate 2 the roles were reversed.

${body}

## Your task: rule

You are the judge, and your ruling on each entry is final. Decide on the evidence: open the files and check every point the ruling turns on yourself. Weigh what the debaters showed, not how long, confident or persistent they were, and do not favour either debater or either debate. You may adopt a debater's text or write your own. In "argument", give the reason for your ruling and what in the evidence settles it.

Reply with the JSON object only.`;
}

/** Which model is "Debater 1" for a case: fixed by a hash of the case ID, so it is stable and roughly balanced. */
export function debaterOrder(caseId: string): "opus-first" | "sol-first" {
  return parseInt(digest(caseId).slice(0, 8), 16) % 2 === 0
    ? "opus-first"
    : "sol-first";
}

/** One judge's ruling on one entry. */
export interface JudgeRuling {
  judge: string;
  position: Verdict;
  text: string | null;
  reason: string;
  evidenceRefs: string[];
}

/** A text check: one judge votes on the other's rewrite. */
export interface TextCheck {
  checker: string;
  author: string;
  text: string;
  vote: "accept" | "reject";
  reason: string;
}

export interface Ruling {
  entry: DebateEntry;
  /** applied: the judges agreed (and, for a rewrite, one accepted the other's text); human: they did not. */
  outcome: "applied" | "human";
  position: Verdict | null;
  text: string | null;
  reason: string;
  evidenceRefs: string[];
  why: string;
  judges: JudgeRuling[];
  textChecks: TextCheck[];
  /** Each debater's stance: as advocate (open) and as respondent after reading the other's case (final). */
  stances: {
    opus: { open: Verdict; final: Verdict };
    sol: { open: Verdict; final: Verdict };
  };
  debater1: "opus" | "sol";
  /** Control mode: the outcomes counted as correct, and the entry's group. */
  expected?: Verdict[];
  group?: string;
}

/**
 * Combines independent judge rulings on one entry. All the same keep or
 * remove: applied. All revise: the first text another judge accepted is
 * applied (checks are tried in order). Anything else goes to a human.
 */
export function combine(
  rulings: JudgeRuling[],
  checks: TextCheck[],
  decider?: string,
): Pick<
  Ruling,
  "outcome" | "position" | "text" | "reason" | "evidenceRefs" | "why"
> {
  const result = combineJudges(rulings, checks);
  if (result.outcome === "applied" || !decider) return result;
  const d = rulings.find((r) => r.judge === decider);
  if (!d) throw new Error(`decider ${decider} is not one of the judges`);
  return {
    outcome: "applied",
    position: d.position,
    text: d.text,
    reason: d.reason,
    evidenceRefs: [...new Set(d.evidenceRefs)],
    why: `${result.why}; decided by ${decider}`,
  };
}

function combineJudges(
  rulings: JudgeRuling[],
  checks: TextCheck[],
): Pick<
  Ruling,
  "outcome" | "position" | "text" | "reason" | "evidenceRefs" | "why"
> {
  const refs = [...new Set(rulings.flatMap((r) => r.evidenceRefs))];
  const positions = new Set(rulings.map((r) => r.position));
  const reason = rulings.map((r) => `${r.judge}: ${r.reason}`).join(" | ");
  if (positions.size > 1)
    return {
      outcome: "human",
      position: null,
      text: null,
      reason,
      evidenceRefs: refs,
      why: `the judges disagreed: ${rulings.map((r) => `${r.judge} ${r.position}`).join(", ")}`,
    };
  const position = rulings[0]!.position;
  if (position !== "revise")
    return {
      outcome: "applied",
      position,
      text: null,
      reason,
      evidenceRefs: refs,
      why: `all judges ruled ${position}`,
    };
  if (rulings.length === 1) {
    const only = rulings[0]!;
    return {
      outcome: "applied",
      position,
      text: only.text,
      reason,
      evidenceRefs: refs,
      why: "the judge ruled revise",
    };
  }
  const accepted = checks.find((c) => c.vote === "accept");
  if (!accepted)
    return {
      outcome: "human",
      position: "revise",
      text: null,
      reason,
      evidenceRefs: refs,
      why: "all judges ruled revise, but no judge accepted another's text",
    };
  const author = rulings.find((r) => r.judge === accepted.author)!;
  return {
    outcome: "applied",
    position,
    text: accepted.text,
    reason,
    evidenceRefs: [...new Set(author.evidenceRefs)],
    why: `all judges ruled revise; ${accepted.checker} accepted ${accepted.author}'s text`,
  };
}

interface Disputes {
  items: { category: Category; text: string; earlier: string | null }[];
  additions: { category: Category; text: string }[];
}

/** Disputed items and additions recorded for a case across earlier fact-review runs (later runs win). */
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

/** An explicit set of entries per case, with the outcomes that count as correct: the judges' control set. */
export interface ControlSpec {
  schema: "prbench.fact-debate-control/v1";
  cases: {
    case: string;
    /** The sheet to show (e.g. a canary sheet); the case's own sheet when absent. */
    sheet?: SheetItem[];
    entries: (DebateEntry & { expected: Verdict[]; group: string })[];
  }[];
}

export const DEFAULT_JUDGES = ["claude/claude-fable-5-1", "codex/gpt-6-astra"];

export interface DebateOptions {
  cases: string;
  caseIds?: string[];
  /** Earlier fact-review runs whose disputed items and additions are settled. */
  from?: string[];
  /** Control mode: explicit entries with expected outcomes; scored, never applied. */
  control?: string;
  /** provider/model of each independent judge (default Fable 5.1 and GPT-6 Astra). */
  judges?: string[];
  judgeEffort?: string;
  /** Model of the judge whose ruling decides entries the judges disagree on (default: none, a human decides). */
  decider?: string;
  /** Effort for the two debaters. */
  effort?: string;
  out: string;
  resume?: boolean;
  parallel?: number;
  apply?: boolean;
  aggregateOnly?: boolean;
  packets?: string;
  log?: (line: string) => void;
}

interface Tally {
  correct: number;
  wrong: number;
  human: number;
  total: number;
}

export interface DebateSummary {
  runId: string;
  mode: "settle" | "control";
  judges: string[];
  cases: number;
  entries: number;
  /** Combined outcomes: kind:position for applied rulings, "human" otherwise. */
  outcomes: Record<string, number>;
  judgesAgreed: number;
  /** Per judge, on entries where the debaters' final stances differ: rulings matching Opus's or Sol's final stance, and Debater 1's or 2's. */
  perJudge: Record<
    string,
    {
      contested: number;
      withOpus: number;
      withSol: number;
      withDebater1: number;
      withDebater2: number;
      rulings: Record<string, number>;
    }
  >;
  /** Debaters who moved from their opening case when rebutting the other's. */
  moved: { opus: number; sol: number };
  unsourced: number;
  control?: {
    combined: Record<string, Tally>;
    perJudge: Record<string, Record<string, Tally>>;
  };
  calls: number;
  cachedCalls: number;
  costUsd: number;
  applied: number;
}

function judgeOf(spec: string, effort: string, index: number): Reviewer {
  const m = /^(claude|codex)\/(.+)$/.exec(spec);
  if (!m)
    throw new Error(`--judge ${spec}: use claude/<model> or codex/<model>`);
  const provider = m[1] as "claude" | "codex";
  return {
    id: `judge-${index + 1}`,
    family: provider === "claude" ? "anthropic" : "openai",
    model: m[2]!,
    provider,
    replicate: 0,
    effort,
    judge: judgeFor(provider, m[2]!, effort),
  };
}

function textCheckPrompt(
  sheet: SheetItem[],
  entries: { entry: DebateEntry; text: string }[],
): string {
  const body = entries
    .map(({ entry, text }) =>
      [
        `### ${entry.id} (${entry.kind === "addition" ? `proposed addition to ${entry.category}` : entry.category})`,
        `Current text: ${entry.text}`,
        `Proposed text: ${text}`,
      ].join("\n"),
    )
    .join("\n\n");
  return `A ruling on a fact sheet for a code change replaces the entries below with new text. Check each proposed text against the evidence.

${SHEET_RULES}

${WORKSPACE}

## The sheet (also in sheet.json)

${list(sheet)}

## Proposed texts (also in proposals.json)

${body}

## Your task

For every entry vote accept if the proposed text is correct against the evidence (check it), specific enough to score, and no longer than it needs to be; otherwise reject. Give a one-line reason and the evidence references you checked.

Reply with the JSON object only.`;
}

export async function factDebate(opts: DebateOptions): Promise<DebateSummary> {
  const log = opts.aggregateOnly
    ? () => {}
    : (opts.log ?? ((l: string) => console.error(l)));
  if (!!opts.control === !!opts.from?.length)
    throw new Error(
      "give either --from <run> (settle disputes) or --control <spec> (score the judges)",
    );
  if (opts.control && opts.apply)
    throw new Error("--apply cannot be used with --control");
  const effort = opts.effort ?? "xhigh";
  const judgeSpecs = opts.judges?.length ? opts.judges : DEFAULT_JUDGES;
  const judges = judgeSpecs.map((s, i) =>
    judgeOf(s, opts.judgeEffort ?? "xhigh", i),
  );
  if (new Set(judges.map((j) => j.model)).size !== judges.length)
    throw new Error("each judge model may be listed once");
  const [opus, sol] = reviewersOf(parsePanel("opus:1,sol:1"), effort) as [
    Reviewer,
    Reviewer,
  ];
  const out = resolve(opts.out);
  const runId = basename(out);
  const from = (opts.from ?? []).map((r) => resolve(r));
  for (const r of from)
    if (!existsSync(r)) throw new Error(`--from ${r}: no such run folder`);
  const control: ControlSpec | undefined = opts.control
    ? JSON.parse(readFileSync(resolve(opts.control), "utf8"))
    : undefined;
  const runFile = join(out, "run.json");
  if (existsSync(runFile) && !opts.resume)
    throw new Error(
      `${out} already holds a debate run; pass --resume to continue it`,
    );
  mkdirSync(join(out, "calls"), { recursive: true });
  writeFileSync(
    runFile,
    json({
      schema: "prbench.fact-debate-run/v3",
      promptVersion: DEBATE_PROMPT_VERSION,
      runId,
      mode: control ? "control" : "settle",
      effort,
      judges: judges.map((j) => ({ model: j.model, effort: j.effort })),
      from: from.map((r) => basename(r)),
      control: opts.control ? basename(opts.control) : null,
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
    mode: control ? "control" : "settle",
    judges: judges.map((j) => j.model),
    cases: 0,
    entries: 0,
    outcomes: {},
    judgesAgreed: 0,
    perJudge: Object.fromEntries(
      judges.map((j) => [
        j.model,
        {
          contested: 0,
          withOpus: 0,
          withSol: 0,
          withDebater1: 0,
          withDebater2: 0,
          rulings: {},
        },
      ]),
    ),
    moved: { opus: 0, sol: 0 },
    unsourced: 0,
    ...(control
      ? {
          control: {
            combined: {},
            perJudge: Object.fromEntries(judges.map((j) => [j.model, {}])),
          },
        }
      : {}),
    calls: 0,
    cachedCalls: 0,
    costUsd: 0,
    applied: 0,
  };
  const bump = (o: Record<string, number>, k: string) =>
    (o[k] = (o[k] ?? 0) + 1);
  const tally = (
    o: Record<string, Tally>,
    group: string,
    applied: boolean,
    ok: boolean,
  ) => {
    const t = (o[group] ??= { correct: 0, wrong: 0, human: 0, total: 0 });
    t.total++;
    if (!applied) t.human++;
    else if (ok) t.correct++;
    else t.wrong++;
  };

  const work = caseDirs(resolve(opts.cases))
    .map((dir) => loadCase(dir))
    .filter(
      (l) =>
        (!wanted || wanted.has(l.case.id)) &&
        (!control || control.cases.some((c) => c.case === l.case.id)),
    );

  async function settleCase(
    loaded: ReturnType<typeof loadCase>,
  ): Promise<void> {
    const id = loaded.case.id;
    const factsFile = join(loaded.dir, loaded.case.facts ?? "facts.json");
    if (!existsSync(factsFile)) return;
    const facts: Facts = JSON.parse(readFileSync(factsFile, "utf8"));
    const spec = control?.cases.find((c) => c.case === id);
    const sheet = spec?.sheet ?? sheetOf(facts);
    let entries: (DebateEntry & { expected?: Verdict[]; group?: string })[] =
      [];
    if (spec) entries = spec.entries;
    else {
      const disputes = disputesFrom(from, id);
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
    }
    if (!entries.length) return;
    const caseOut = join(out, id);
    mkdirSync(caseOut, { recursive: true });
    const ev = buildEvidence(loaded, packetFor(loaded, packets, caseOut));
    try {
      log(`case  ${id}: ${entries.length} entries`);
      const shown: DebateEntry[] = entries.map(
        ({ id, kind, category, text, earlier }) => ({
          id,
          kind,
          category,
          text,
          earlier,
        }),
      );
      const ids = shown.map((e) => e.id);
      const files = { "debate.json": { entries: shown } };
      const turn = (
        kind: "debate-open" | "debate-rebut",
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
          check: (v) => checkPositions(v, shown),
          files,
          saveAs: `debate-${tag}/${kind.slice(7)}-${who.id}.json`,
        });
      const debate = async (
        advocate: Reviewer,
        respondent: Reviewer,
        tag: string,
      ) => {
        const opening = (
          await turn("debate-open", 1, advocate, openPrompt(sheet, shown), tag)
        ).items;
        const rebuttal = (
          await turn(
            "debate-rebut",
            2,
            respondent,
            rebutPrompt(sheet, shown, opening),
            tag,
          )
        ).items;
        return { advocate, respondent, opening, rebuttal };
      };
      const [A, B] = await Promise.all([
        debate(opus, sol, "a"),
        debate(sol, opus, "b"),
      ]);
      const order = debaterOrder(id);
      const label = (r: Reviewer) =>
        (r === opus) === (order === "opus-first") ? "Debater 1" : "Debater 2";
      // Debate 1 is the one Debater 1 opened.
      const [first, second] = order === "opus-first" ? [A, B] : [B, A];
      const shownDebates = [first, second].map((d) => ({
        advocate: label(d.advocate),
        respondent: label(d.respondent),
        opening: d.opening,
        rebuttal: d.rebuttal,
      })) as [Debate, Debate];
      const judgePromptText = judgePrompt(sheet, shown, shownDebates);
      const byJudge = await Promise.all(
        judges.map(async (j) => ({
          j,
          items: (
            await call<PositionsReply>(caseOut, ev, sheet, {
              kind: "debate-judge",
              round: 3,
              reviewer: j,
              prompt: judgePromptText,
              schema: positionsSchema(ids),
              check: (v) => checkPositions(v, shown),
              files,
              saveAs: `judge-${j.model}.json`,
            })
          ).items,
        })),
      );
      const get = (ps: Position[], eid: string) =>
        ps.find((p) => p.id === eid)!;
      const rulingsOf = (eid: string): JudgeRuling[] =>
        byJudge.map(({ j, items }) => {
          const p = get(items, eid);
          return {
            judge: j.model,
            position: p.position,
            text: p.text,
            reason: p.argument,
            evidenceRefs: p.evidenceRefs,
          };
        });

      // Text checks where every judge ruled revise with different texts: each later judge checks the first judge's text, then the reverse.
      const checks = new Map<string, TextCheck[]>();
      if (judges.length > 1) {
        const pending = shown.filter((e) => {
          const rs = rulingsOf(e.id);
          return (
            rs.every((r) => r.position === "revise") &&
            new Set(rs.map((r) => r.text!.trim())).size > 1
          );
        });
        for (const e of shown) {
          const rs = rulingsOf(e.id);
          if (
            rs.every((r) => r.position === "revise") &&
            new Set(rs.map((r) => r.text!.trim())).size === 1
          )
            checks.set(e.id, [
              {
                checker: "(identical texts)",
                author: rs[0]!.judge,
                text: rs[0]!.text!,
                vote: "accept",
                reason: "all judges wrote the same text",
              },
            ]);
        }
        const pairs: [Reviewer, Reviewer][] = [
          [judges[1]!, judges[0]!],
          [judges[0]!, judges[1]!],
        ];
        let open = pending;
        for (const [k, [checker, author]] of pairs.entries()) {
          if (!open.length) break;
          const view = open.map((entry) => ({
            entry,
            text: rulingsOf(entry.id).find((r) => r.judge === author.model)!
              .text!,
          }));
          const proposals = view.map(({ entry, text }) => ({
            id: entry.id,
            kind: "revise" as const,
            category: entry.category,
            original: entry.text,
            text,
            evidenceRefs: [] as string[],
          }));
          const pIds = proposals.map((p) => p.id);
          const reply = await call<VoteReply>(caseOut, ev, sheet, {
            kind: "debate-textcheck",
            round: 4 + k,
            reviewer: checker,
            prompt: textCheckPrompt(sheet, view),
            schema: voteSchema(pIds),
            check: (v) => checkVotes(v, proposals),
            files: { "proposals.json": { proposals } },
            saveAs: `textcheck-${checker.model}-on-${author.model}.json`,
          });
          for (const { entry, text } of view) {
            const v = reply.votes.find((x) => x.id === entry.id)!;
            checks.set(entry.id, [
              ...(checks.get(entry.id) ?? []),
              {
                checker: checker.model,
                author: author.model,
                text,
                vote: v.vote,
                reason: v.reason,
              },
            ]);
          }
          open = open.filter(
            (e) => !(checks.get(e.id) ?? []).some((c) => c.vote === "accept"),
          );
        }
      }

      const rulings: Ruling[] = entries.map((entry) => {
        const js = rulingsOf(entry.id);
        const cs = checks.get(entry.id) ?? [];
        const stances = {
          opus: {
            open: get(A.opening, entry.id).position,
            final: get(B.rebuttal, entry.id).position,
          },
          sol: {
            open: get(B.opening, entry.id).position,
            final: get(A.rebuttal, entry.id).position,
          },
        };
        return {
          entry: {
            id: entry.id,
            kind: entry.kind,
            category: entry.category,
            text: entry.text,
            earlier: entry.earlier,
          },
          ...combine(js, cs, opts.decider),
          judges: js,
          textChecks: cs,
          stances,
          debater1: order === "opus-first" ? "opus" : "sol",
          ...(entry.expected
            ? { expected: entry.expected, group: entry.group }
            : {}),
        };
      });
      summary.cases++;
      for (const r of rulings) {
        summary.entries++;
        bump(
          summary.outcomes,
          r.outcome === "applied" ? `${r.entry.kind}:${r.position}` : "human",
        );
        if (new Set(r.judges.map((j) => j.position)).size === 1)
          summary.judgesAgreed++;
        if (r.stances.opus.open !== r.stances.opus.final) summary.moved.opus++;
        if (r.stances.sol.open !== r.stances.sol.final) summary.moved.sol++;
        const contested = r.stances.opus.final !== r.stances.sol.final;
        for (const j of r.judges) {
          const pj = summary.perJudge[j.judge]!;
          bump(pj.rulings, `${r.entry.kind}:${j.position}`);
          if (!contested) continue;
          pj.contested++;
          const withOpus = j.position === r.stances.opus.final;
          const withSol = j.position === r.stances.sol.final;
          if (withOpus) pj.withOpus++;
          if (withSol) pj.withSol++;
          if (
            (withOpus && r.debater1 === "opus") ||
            (withSol && r.debater1 === "sol")
          )
            pj.withDebater1++;
          if (
            (withOpus && r.debater1 === "sol") ||
            (withSol && r.debater1 === "opus")
          )
            pj.withDebater2++;
        }
        if (summary.control && r.expected) {
          tally(
            summary.control.combined,
            r.group ?? "other",
            r.outcome === "applied",
            r.position !== null && r.expected.includes(r.position),
          );
          for (const j of r.judges)
            tally(
              summary.control.perJudge[j.judge]!,
              r.group ?? "other",
              true,
              r.expected.includes(j.position),
            );
        }
      }
      let unsourced: AdditionDecision[] = [];
      if (opts.apply && rulings.some((r) => r.outcome === "applied")) {
        unsourced = applyRulings(
          loaded,
          facts,
          sheet,
          rulings,
          ev.bare,
          runId,
          judges,
        );
        summary.applied++;
        summary.unsourced += unsourced.length;
      }
      writeFileSync(
        join(caseOut, "debates.json"),
        json({
          schema: "prbench.fact-debate/v3",
          runId,
          case: id,
          debater1: order === "opus-first" ? opus.model : sol.model,
          opusOpens: { opening: A.opening, rebuttal: A.rebuttal },
          solOpens: { opening: B.opening, rebuttal: B.rebuttal },
          rulings,
        }),
      );
      writeFileSync(
        join(caseOut, "human-review.md"),
        humanReview(id, rulings, unsourced),
      );
      const h = rulings.filter((r) => r.outcome === "human").length;
      log(
        `done  ${id}: ${rulings.length - h}/${rulings.length} applied${h ? `, ${h} to human review` : ""}${unsourced.length ? `, ${unsourced.length} unsourced` : ""}`,
      );
    } finally {
      rmSync(ev.dir, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    }
  }

  // Sol and Astra calls share the benchmark Codex login, as in factReview.
  setCodexLoginSharing(true);
  try {
    await Promise.all(
      work.map((loaded) => caseLimit(() => settleCase(loaded))),
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

/** Writes applied rulings into the case (rewrites, removals, additions) with provenance from the judges' cited evidence; returns additions that could not be sourced. */
export function applyRulings(
  loaded: ReturnType<typeof loadCase>,
  facts: Facts,
  sheet: SheetItem[],
  rulings: Ruling[],
  bare: string,
  runId: string,
  judges: Reviewer[],
): AdditionDecision[] {
  const draft = baseDraft(loaded.dir, facts);
  if (!draft)
    throw new Error(
      `${loaded.case.id}: no fact provenance to apply the rulings to`,
    );
  const applied = rulings.filter((r) => r.outcome === "applied");
  const vr = (r: Ruling, text: string) => ({
    round: 0,
    candidate: {
      text,
      reason: `judge ruling (${r.why})`,
      evidenceRefs: r.evidenceRefs,
    },
    consensus: {
      status: "settled" as const,
      value: "accept" as const,
      byFamily: {},
    },
    votes: [],
  });
  const items: ItemDecision[] = sheet.map((s) => {
    const r = applied.find(
      (x) => x.entry.kind === "item" && x.entry.id === s.id,
    );
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
      rewriteRounds: [] as ItemDecision["rewriteRounds"],
    };
    if (!r || r.position === "keep")
      return {
        ...base,
        outcome: "kept",
        finalText: s.text,
        why: r ? r.why : "not ruled on",
      };
    if (r.position === "remove")
      return { ...base, outcome: "removed", finalText: null, why: r.why };
    return {
      ...base,
      outcome: "revised",
      finalText: r.text,
      why: r.why,
      rewriteRounds: [vr(r, r.text!)],
    };
  });
  const additions: AdditionDecision[] = applied
    .filter((r) => r.entry.kind === "addition" && r.position !== "remove")
    .map((r, i) => {
      const text = r.position === "revise" ? r.text! : r.entry.text;
      return {
        id: `A${i + 1}`,
        category: r.entry.category,
        text,
        members: [],
        proposers: ["judges"],
        outcome: "added",
        round: 0,
        why: r.why,
        evidenceRefs: r.evidenceRefs,
        rounds: [vr(r, text)],
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
    reviewedBy: `expert panel debate ${runId} (opus and sol at xhigh; judges ${judges.map((j) => `${j.model} at ${j.effort}`).join(", ")})`,
    record: {
      runId,
      reviewers: [
        {
          model: "claude-opus-5-5",
          family: "anthropic",
          effort: "xhigh",
          count: 1,
        },
        { model: "gpt-6.1-sol", family: "openai", effort: "xhigh", count: 1 },
        ...judges.map((j) => ({
          model: j.model,
          family: j.family,
          effort: j.effort,
          count: 1,
        })),
      ],
      rounds: 3,
      disputed:
        rulings.filter((r) => r.outcome === "human").length +
        additions.filter((a) => a.outcome === "unsourced").length,
      revised: items.filter((i) => i.outcome === "revised").length,
      removed: items.filter((i) => i.outcome === "removed").length,
      added: additions.filter((a) => a.outcome === "added").length,
    },
  });
  return additions.filter((a) => a.outcome === "unsourced");
}

function humanReview(
  caseId: string,
  rulings: Ruling[],
  unsourced: AdditionDecision[],
): string {
  const open = rulings.filter((r) => r.outcome === "human");
  const out = [`# Human review after the judges: ${caseId}`, ""];
  if (!open.length && !unsourced.length)
    return [
      ...out,
      "Nothing to review: the judges agreed on every entry.",
      "",
    ].join("\n");
  if (open.length)
    out.push(
      "The judges did not agree on these entries. Disputed items stay on the sheet as they were; disputed additions are left out.",
      "",
    );
  for (const r of open) {
    out.push(
      `## ${r.entry.id} (${r.entry.kind === "addition" ? `proposed addition to ${r.entry.category}` : r.entry.category})`,
      "",
      `> ${r.entry.text}`,
      "",
      `Why: ${r.why}`,
      "",
    );
    for (const j of r.judges)
      out.push(
        `- **${j.judge}:** ${j.position}${j.text ? ` → "${j.text}"` : ""} — ${j.reason}${j.evidenceRefs.length ? `\n  evidence: ${j.evidenceRefs.join(", ")}` : ""}`,
      );
    for (const c of r.textChecks)
      out.push(
        `- **${c.checker} on ${c.author}'s text:** ${c.vote} — ${c.reason}`,
      );
    out.push(
      "",
      `Debaters: Opus opened ${r.stances.opus.open} and ended ${r.stances.opus.final}; Sol opened ${r.stances.sol.open} and ended ${r.stances.sol.final}. Full debates in debates.json.`,
      "",
    );
  }
  if (unsourced.length) {
    out.push(
      "The judges accepted these additions, but none of their evidence references resolve to a citable source, so they are not on the sheet. Add each with a source, or drop it.",
      "",
    );
    for (const a of unsourced)
      out.push(`## ${a.id} (${a.category})`, "", `> ${a.text}`, "", a.why, "");
  }
  return out.join("\n");
}

export function debateSummaryLines(s: DebateSummary): string[] {
  const kv = (o: Record<string, number>) =>
    Object.entries(o)
      .sort()
      .map(([k, v]) => `${k} ${v}`)
      .join(", ") || "none";
  const tallies = (o: Record<string, Tally>) =>
    Object.entries(o)
      .sort()
      .map(
        ([g, t]) =>
          `${g} ${t.correct}/${t.total}${t.wrong ? ` (${t.wrong} wrong)` : ""}${t.human ? ` (${t.human} to human)` : ""}`,
      )
      .join(", ");
  const lines = [
    `${s.mode === "control" ? "judge control" : "debate and judges"} (${s.judges.join(" + ")}): cases ${s.cases}; entries ${s.entries}; judges agreed on ${s.judgesAgreed}`,
    `outcomes: ${kv(s.outcomes)}${s.unsourced ? `; unsourced additions ${s.unsourced}` : ""}`,
    `debaters who moved when rebutting: opus ${s.moved.opus}, sol ${s.moved.sol}`,
    ...Object.entries(s.perJudge).map(
      ([j, p]) =>
        `${j}: ${kv(p.rulings)}; on ${p.contested} contested entries sided with opus ${p.withOpus}, sol ${p.withSol}; Debater 1 ${p.withDebater1}, Debater 2 ${p.withDebater2}`,
    ),
  ];
  if (s.control) {
    lines.push(`control, combined: ${tallies(s.control.combined)}`);
    for (const [j, t] of Object.entries(s.control.perJudge))
      lines.push(`control, ${j} alone: ${tallies(t)}`);
  }
  lines.push(
    `calls ${s.calls} new, ${s.cachedCalls} reused; reported cost $${s.costUsd.toFixed(2)} (Claude calls; Codex runs on the subscription)${s.applied ? `; applied to ${s.applied} case(s)` : ""}`,
  );
  return lines;
}

export interface DecideSummary {
  cases: number;
  decided: number;
  outcomes: Record<string, number>;
  /** Entries whose text is no longer on the case's sheet (edited since the run). */
  skipped: number;
  unsourced: number;
}

/**
 * Settles the entries a finished fact-debate run sent to human review with
 * one judge's ruling: the decider's position (and text) is applied to the
 * case's current sheet, matched by the entry's text. Makes no model calls.
 */
export function decideFinished(opts: {
  run: string;
  cases: string;
  decider: string;
  caseIds?: string[];
  apply?: boolean;
  /** Prebuilt fact packets; the bare clone in each case's packet backs the provenance hashes. */
  packets?: string;
  log?: (line: string) => void;
}): DecideSummary {
  const log = opts.log ?? (() => {});
  const run = resolve(opts.run);
  const meta = JSON.parse(readFileSync(join(run, "run.json"), "utf8"));
  const judgeModels: string[] = (meta.judges ?? []).map(
    (j: { model: string }) => j.model,
  );
  if (!judgeModels.includes(opts.decider))
    throw new Error(
      `--decider ${opts.decider} was not a judge in ${basename(run)} (${judgeModels.join(", ")})`,
    );
  const judges = meta.judges.map(
    (j: { model: string; effort: string }, i: number) => {
      const provider = j.model.startsWith("claude-") ? "claude" : "codex";
      return {
        id: `judge-${i + 1}`,
        family: provider === "claude" ? "anthropic" : "openai",
        model: j.model,
        provider,
        replicate: 0,
        effort: j.effort,
      } as unknown as Reviewer;
    },
  );
  const runId = `${basename(run)}+decided-by-${opts.decider}`;
  const wanted = opts.caseIds?.length ? new Set(opts.caseIds) : undefined;
  const summary: DecideSummary = {
    cases: 0,
    decided: 0,
    outcomes: {},
    skipped: 0,
    unsourced: 0,
  };
  for (const dir of caseDirs(resolve(opts.cases))) {
    const loaded = loadCase(dir);
    const id = loaded.case.id;
    const file = join(run, id, "debates.json");
    if ((wanted && !wanted.has(id)) || !existsSync(file)) continue;
    const open: Ruling[] = (
      JSON.parse(readFileSync(file, "utf8")).rulings as Ruling[]
    ).filter((r) => r.outcome === "human");
    if (!open.length) continue;
    const facts: Facts = JSON.parse(
      readFileSync(join(loaded.dir, loaded.case.facts ?? "facts.json"), "utf8"),
    );
    const sheet = sheetOf(facts);
    const decided: Ruling[] = [];
    for (const r of open) {
      const d = r.judges.find((j) => j.judge === opts.decider)!;
      let entry = r.entry;
      if (entry.kind === "item") {
        const item = sheet.find(
          (s) => s.category === entry.category && s.text === entry.text,
        );
        if (!item) {
          summary.skipped++;
          continue;
        }
        entry = { ...entry, id: item.id };
      }
      decided.push({
        ...r,
        entry,
        outcome: "applied",
        position: d.position,
        text: d.text,
        reason: d.reason,
        evidenceRefs: [...new Set(d.evidenceRefs)],
        why: `${r.why}; decided by ${opts.decider}`,
      });
      summary.outcomes[`${entry.kind}:${d.position}`] =
        (summary.outcomes[`${entry.kind}:${d.position}`] ?? 0) + 1;
    }
    if (!decided.length) continue;
    summary.cases++;
    summary.decided += decided.length;
    if (opts.apply) {
      const packet = packetFor(
        loaded,
        opts.packets ? resolve(opts.packets) : undefined,
        join(run, id),
      );
      const unsourced = applyRulings(
        loaded,
        facts,
        sheet,
        decided,
        join(packet, "repo.git"),
        runId,
        judges,
      );
      summary.unsourced += unsourced.length;
      writeFileSync(
        join(run, id, "decided.json"),
        json({
          schema: "prbench.fact-decide/v1",
          decider: opts.decider,
          rulings: decided,
          unsourced: unsourced.map((a) => ({
            category: a.category,
            text: a.text,
          })),
        }),
      );
    }
    log(`decided ${id}: ${decided.length}${opts.apply ? ", applied" : ""}`);
  }
  return summary;
}
