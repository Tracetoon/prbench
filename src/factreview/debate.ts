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
  sheetOf,
  VERDICTS,
  type Category,
  type SheetItem,
  type Verdict,
} from "./schema.ts";

export const DEBATE_PROMPT_VERSION = 2;
export const DEFAULT_JUDGE = "claude/claude-fable-5-2";

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

export interface Ruling {
  entry: DebateEntry;
  position: Verdict;
  text: string | null;
  reason: string;
  evidenceRefs: string[];
  /** Each debater's position as advocate. */
  advocated: { opus: Verdict; sol: Verdict };
  /** Whom the ruling's position sided with. */
  sidedWith: "both" | "opus" | "sol" | "neither";
  debater1: "opus" | "sol";
  /** Control mode: the outcomes counted as correct, and the entry's group. */
  expected?: Verdict[];
  group?: string;
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

/** An explicit set of entries per case, with the outcomes that count as correct: the judge's control set. */
export interface ControlSpec {
  schema: "prbench.fact-debate-control/v1";
  cases: {
    case: string;
    /** The sheet to show (e.g. a canary sheet); the case's own sheet when absent. */
    sheet?: SheetItem[];
    entries: (DebateEntry & { expected: Verdict[]; group: string })[];
  }[];
}

export interface DebateOptions {
  cases: string;
  caseIds?: string[];
  /** Earlier fact-review runs whose disputed items and additions are settled. */
  from?: string[];
  /** Control mode: explicit entries with expected outcomes; scored, never applied. */
  control?: string;
  /** provider/model of the judge (default claude/claude-fable-5-2). */
  judge?: string;
  judgeEffort?: string;
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

export interface DebateSummary {
  runId: string;
  mode: "settle" | "control";
  judge: string;
  cases: number;
  entries: number;
  rulings: Record<string, number>;
  sidedWith: Record<string, number>;
  /** Rulings whose position matched only Debater 1's case, or only Debater 2's. */
  byLabel: { debater1: number; debater2: number };
  unsourced: number;
  control?: {
    correct: number;
    total: number;
    byGroup: Record<string, { correct: number; total: number }>;
  };
  calls: number;
  cachedCalls: number;
  costUsd: number;
  applied: number;
}

function judgeOf(spec: string, effort: string): Reviewer {
  const m = /^(claude|codex)\/(.+)$/.exec(spec);
  if (!m)
    throw new Error(`--judge ${spec}: use claude/<model> or codex/<model>`);
  const provider = m[1] as "claude" | "codex";
  return {
    id: "judge",
    family: provider === "claude" ? "anthropic" : "openai",
    model: m[2]!,
    provider,
    replicate: 0,
    effort,
    judge: judgeFor(provider, m[2]!, effort),
  };
}

export async function factDebate(opts: DebateOptions): Promise<DebateSummary> {
  const log = opts.aggregateOnly
    ? () => {}
    : (opts.log ?? ((l: string) => console.error(l)));
  if (!!opts.control === !!opts.from?.length)
    throw new Error(
      "give either --from <run> (settle disputes) or --control <spec> (score the judge)",
    );
  if (opts.control && opts.apply)
    throw new Error("--apply cannot be used with --control");
  const effort = opts.effort ?? "xhigh";
  const judge = judgeOf(
    opts.judge ?? DEFAULT_JUDGE,
    opts.judgeEffort ?? "xhigh",
  );
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
      schema: "prbench.fact-debate-run/v2",
      promptVersion: DEBATE_PROMPT_VERSION,
      runId,
      mode: control ? "control" : "settle",
      effort,
      judge: { model: judge.model, effort: judge.effort },
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
    judge: judge.model,
    cases: 0,
    entries: 0,
    rulings: {},
    sidedWith: {},
    byLabel: { debater1: 0, debater2: 0 },
    unsourced: 0,
    ...(control ? { control: { correct: 0, total: 0, byGroup: {} } } : {}),
    calls: 0,
    cachedCalls: 0,
    costUsd: 0,
    applied: 0,
  };
  const bump = (o: Record<string, number>, k: string) =>
    (o[k] = (o[k] ?? 0) + 1);

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
      const ruled = (
        await call<PositionsReply>(caseOut, ev, sheet, {
          kind: "debate-judge",
          round: 3,
          reviewer: judge,
          prompt: judgePrompt(sheet, shown, shownDebates),
          schema: positionsSchema(ids),
          check: (v) => checkPositions(v, shown),
          files,
          saveAs: "judge.json",
        })
      ).items;
      const get = (ps: Position[], eid: string) =>
        ps.find((p) => p.id === eid)!;
      const rulings: Ruling[] = entries.map((entry) => {
        const r = get(ruled, entry.id);
        const advocated = {
          opus: get(A.opening, entry.id).position,
          sol: get(B.opening, entry.id).position,
        };
        const o = r.position === advocated.opus;
        const s = r.position === advocated.sol;
        const sidedWith = o && s ? "both" : o ? "opus" : s ? "sol" : "neither";
        return {
          entry: {
            id: entry.id,
            kind: entry.kind,
            category: entry.category,
            text: entry.text,
            earlier: entry.earlier,
          },
          position: r.position,
          text: r.text,
          reason: r.argument,
          evidenceRefs: r.evidenceRefs,
          advocated,
          sidedWith,
          debater1: order === "opus-first" ? "opus" : "sol",
          ...(entry.expected
            ? { expected: entry.expected, group: entry.group }
            : {}),
        };
      });
      summary.cases++;
      for (const r of rulings) {
        summary.entries++;
        bump(summary.rulings, `${r.entry.kind}:${r.position}`);
        bump(summary.sidedWith, r.sidedWith);
        if (r.sidedWith === "opus" || r.sidedWith === "sol")
          summary.byLabel[
            r.sidedWith === r.debater1 ? "debater1" : "debater2"
          ]++;
        if (summary.control && r.expected) {
          const ok = r.expected.includes(r.position);
          summary.control.total++;
          if (ok) summary.control.correct++;
          const g = (summary.control.byGroup[r.group ?? "other"] ??= {
            correct: 0,
            total: 0,
          });
          g.total++;
          if (ok) g.correct++;
        }
      }
      let unsourced: AdditionDecision[] = [];
      if (opts.apply) {
        unsourced = applyRulings(
          loaded,
          facts,
          sheet,
          rulings,
          ev.bare,
          runId,
          judge,
        );
        summary.applied++;
        summary.unsourced += unsourced.length;
      }
      writeFileSync(
        join(caseOut, "debates.json"),
        json({
          schema: "prbench.fact-debate/v2",
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
        humanReview(id, unsourced),
      );
      log(
        `done  ${id}: ${rulings.length} ruled${opts.apply ? ", applied" : ""}${unsourced.length ? `, ${unsourced.length} unsourced` : ""}`,
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

  // Sol calls share the benchmark Codex login, as in factReview.
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

/** Writes the judge's rulings into the case (rewrites, removals, additions) with provenance from its cited evidence; returns additions that could not be sourced. */
function applyRulings(
  loaded: ReturnType<typeof loadCase>,
  facts: Facts,
  sheet: SheetItem[],
  rulings: Ruling[],
  bare: string,
  runId: string,
  judge: Reviewer,
): AdditionDecision[] {
  const draft = baseDraft(loaded.dir, facts);
  if (!draft)
    throw new Error(
      `${loaded.case.id}: no fact provenance to apply the rulings to`,
    );
  const vr = (r: Ruling, text: string) => ({
    round: 0,
    candidate: {
      text,
      reason: `judge ruling: ${r.reason}`,
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
    const r = rulings.find(
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
        why: r ? "judge ruling: keep" : "not disputed",
      };
    if (r.position === "remove")
      return {
        ...base,
        outcome: "removed",
        finalText: null,
        why: "judge ruling: remove",
      };
    return {
      ...base,
      outcome: "revised",
      finalText: r.text,
      why: "judge ruling: revise",
      rewriteRounds: [vr(r, r.text!)],
    };
  });
  const additions: AdditionDecision[] = rulings
    .filter((r) => r.entry.kind === "addition" && r.position !== "remove")
    .map((r, i) => {
      const text = r.position === "revise" ? r.text! : r.entry.text;
      return {
        id: `A${i + 1}`,
        category: r.entry.category,
        text,
        members: [],
        proposers: ["judge"],
        outcome: "added",
        round: 0,
        why: "judge ruling",
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
    reviewedBy: `expert panel debate ${runId} (opus and sol at xhigh, judged by ${judge.model} at ${judge.effort})`,
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
        {
          model: judge.model,
          family: judge.family,
          effort: judge.effort,
          count: 1,
        },
      ],
      rounds: 3,
      disputed: additions.filter((a) => a.outcome === "unsourced").length,
      revised: items.filter((i) => i.outcome === "revised").length,
      removed: items.filter((i) => i.outcome === "removed").length,
      added: additions.filter((a) => a.outcome === "added").length,
    },
  });
  return additions.filter((a) => a.outcome === "unsourced");
}

function humanReview(caseId: string, unsourced: AdditionDecision[]): string {
  const out = [`# Human review after the judge: ${caseId}`, ""];
  if (!unsourced.length)
    return [
      ...out,
      "Nothing to review: the judge ruled on every entry and every accepted addition is sourced.",
      "",
    ].join("\n");
  out.push(
    "The judge accepted these additions, but none of their evidence references resolve to a citable source, so they are not on the sheet. Add each with a source, or drop it.",
    "",
  );
  for (const a of unsourced)
    out.push(`## ${a.id} (${a.category})`, "", `> ${a.text}`, "", a.why, "");
  return out.join("\n");
}

export function debateSummaryLines(s: DebateSummary): string[] {
  const kv = (o: Record<string, number>) =>
    Object.entries(o)
      .sort()
      .map(([k, v]) => `${k} ${v}`)
      .join(", ") || "none";
  const lines = [
    `${s.mode === "control" ? "judge control" : "debate and judge"} (${s.judge}): cases ${s.cases}; entries ${s.entries}`,
    `rulings: ${kv(s.rulings)}${s.unsourced ? `; unsourced additions ${s.unsourced}` : ""}`,
    `ruling sided with: ${kv(s.sidedWith)}; with Debater 1 only ${s.byLabel.debater1}, Debater 2 only ${s.byLabel.debater2}`,
  ];
  if (s.control)
    lines.push(
      `control: ${s.control.correct}/${s.control.total} correct; ${Object.entries(
        s.control.byGroup,
      )
        .sort()
        .map(([g, v]) => `${g} ${v.correct}/${v.total}`)
        .join(", ")}`,
    );
  lines.push(
    `calls ${s.calls} new, ${s.cachedCalls} reused; reported cost $${s.costUsd.toFixed(2)}${s.applied ? `; applied to ${s.applied} case(s)` : ""}`,
  );
  return lines;
}
