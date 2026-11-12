// Planted-error canaries: calibrate the panel on sheets with known defects
// before trusting it on real ones. Mutations are deterministic, so the ground
// truth is fixed: one important claim removed (missing), one claim's number,
// direction or identifier altered (contradicted), one claim from another case
// injected (unsupported), and one trap replaced by a true statement.
import type { Facts } from "../schema/case.ts";
import type { CaseResult } from "./record.ts";
import { PREFIX } from "./schema.ts";

export type DefectKind =
  "missing" | "contradicted" | "unsupported" | "trap-true";

export interface Defect {
  kind: DefectKind;
  /** The mutated sheet's item ID (none for a missing fact). */
  id?: string;
  text: string;
  original?: string;
}

export interface Canary {
  facts: Facts;
  defects: Defect[];
  /** Mutations the sheet was too small for. */
  skipped: DefectKind[];
}

export interface CanaryCandidate {
  id: string;
  agent: string;
}

/**
 * n cases spread across agents and repository families (the case ID's first
 * segment), deterministically: round-robin over agents, preferring a family
 * not yet chosen.
 */
export function selectCanaryCases(
  cases: CanaryCandidate[],
  n: number,
): string[] {
  const byAgent = new Map<string, CanaryCandidate[]>();
  for (const c of [...cases].sort((a, b) => a.id.localeCompare(b.id)))
    byAgent.set(c.agent, [...(byAgent.get(c.agent) ?? []), c]);
  const agents = [...byAgent.keys()].sort();
  const family = (id: string) => id.split("-")[0]!;
  const families = new Set<string>();
  const chosen: string[] = [];
  for (let i = 0; chosen.length < Math.min(n, cases.length); i++) {
    const pool = byAgent.get(agents[i % agents.length]!)!;
    if (!pool.length) continue;
    const pick = pool.find((c) => !families.has(family(c.id))) ?? pool[0]!;
    pool.splice(pool.indexOf(pick), 1);
    families.add(family(pick.id));
    chosen.push(pick.id);
  }
  return chosen;
}

const DIRECTIONS: [string, string][] = [
  ["increases", "decreases"],
  ["increase", "decrease"],
  ["enabled", "disabled"],
  ["enables", "disables"],
  ["enable", "disable"],
  ["added", "removed"],
  ["adds", "removes"],
  ["before", "after"],
  ["true", "false"],
  ["more", "fewer"],
  ["larger", "smaller"],
  ["higher", "lower"],
  ["above", "below"],
  ["first", "last"],
  ["with", "without"],
];

const sameCase = (word: string, like: string) =>
  like[0] === like[0]!.toUpperCase()
    ? word[0]!.toUpperCase() + word.slice(1)
    : word;

/** Alters one number, direction word or identifier in a claim, or negates it as a last resort. */
export function alterClaim(text: string): string {
  // A number that is not part of a hash or identifier.
  const num = /(?<![\w.])(\d+)(?![\w])/.exec(text);
  if (num)
    return (
      text.slice(0, num.index) +
      String(Number(num[1]) + 1) +
      text.slice(num.index + num[1]!.length)
    );
  for (const [a, b] of DIRECTIONS) {
    const m = new RegExp(`\\b(${a}|${b})\\b`, "i").exec(text);
    if (m) {
      const swap = m[1]!.toLowerCase() === a ? b : a;
      return (
        text.slice(0, m.index) +
        sameCase(swap, m[1]!) +
        text.slice(m.index + m[1]!.length)
      );
    }
  }
  // An identifier: something in backticks, a call, or a camelCase/snake_case name.
  const ident =
    /`([^`]+)`|\b([A-Za-z_][A-Za-z0-9_]*)\(\)|\b([a-z]+[A-Z][A-Za-z0-9]*|[a-z]+_[a-z0-9_]+)\b/.exec(
      text,
    );
  if (ident) {
    const name = ident[1] ?? ident[2] ?? ident[3]!;
    const at = ident.index + ident[0].indexOf(name);
    return text.slice(0, at) + `${name}Legacy` + text.slice(at + name.length);
  }
  return `It is not the case that ${text[0]!.toLowerCase()}${text.slice(1)}`;
}

/**
 * Plants the four defects in a copy of `facts`. `importance` ranks claims for
 * removal (e.g. the number of cited sources); ties go to the longer claim.
 */
export function plantDefects(
  facts: Facts,
  donorClaim: string | undefined,
  importance: number[] = [],
): Canary {
  const claims = facts.claims.map((text, i) => ({ text, i }));
  const skipped: Canary["skipped"] = [];
  const defects: Defect[] = [];
  const score = (c: { text: string; i: number }) =>
    (importance[c.i] ?? 0) * 10_000 + c.text.length;
  const missing =
    claims.length >= 2
      ? [...claims].sort((a, b) => score(b) - score(a) || a.i - b.i)[0]!
      : undefined;
  const remaining = claims.filter((c) => c !== missing);
  const contradicted = remaining[0];
  const truthForTrap =
    remaining.find((c) => c !== contradicted) ??
    (facts.context.length ? { text: facts.context[0]!, i: -1 } : undefined);

  const out: Facts = {
    ...facts,
    claims: [],
    context: [...facts.context],
    uncertainties: [...facts.uncertainties],
    traps: [...facts.traps],
  };
  for (const c of remaining) {
    if (c === contradicted) {
      const altered = alterClaim(c.text);
      out.claims.push(altered);
      defects.push({
        kind: "contradicted",
        id: `${PREFIX.claims}${out.claims.length}`,
        text: altered,
        original: c.text,
      });
    } else out.claims.push(c.text);
  }
  if (missing) defects.push({ kind: "missing", text: missing.text });
  else skipped.push("missing");
  if (!contradicted) skipped.push("contradicted");
  if (donorClaim) {
    out.claims.push(donorClaim);
    defects.push({
      kind: "unsupported",
      id: `${PREFIX.claims}${out.claims.length}`,
      text: donorClaim,
    });
  } else skipped.push("unsupported");
  if (out.traps.length && truthForTrap) {
    defects.push({
      kind: "trap-true",
      id: `${PREFIX.traps}1`,
      text: truthForTrap.text,
      original: out.traps[0],
    });
    out.traps[0] = truthForTrap.text;
  } else skipped.push("trap-true");
  return { facts: out, defects, skipped };
}

const STOP = new Set([
  "that",
  "this",
  "with",
  "when",
  "from",
  "into",
  "than",
  "then",
  "they",
  "were",
  "have",
  "been",
  "which",
  "their",
  "there",
  "will",
  "also",
  "only",
  "does",
  "each",
  "other",
]);
const tokens = (s: string) =>
  new Set(
    (s.toLowerCase().match(/[a-z0-9_.()'-]+/g) ?? [])
      .map((t) => t.replace(/^[^a-z0-9_]+|[^a-z0-9_)]+$/g, ""))
      .filter((t) => (t.length >= 4 || /\d/.test(t)) && !STOP.has(t)),
  );

/** Whether a proposed addition restates a removed fact: at least half its distinctive words recur. */
export function restates(removed: string, proposed: string): boolean {
  const want = tokens(removed);
  if (!want.size) return false;
  const got = tokens(proposed);
  let hit = 0;
  for (const t of want) if (got.has(t)) hit++;
  return hit * 2 >= want.size;
}

export interface CanaryScore {
  cases: number;
  planted: number;
  caught: number;
  catchRate: number;
  unmutated: number;
  falseAlarms: number;
  falseAlarmRate: number;
  byKind: Record<DefectKind, { planted: number; caught: number }>;
  /** Defects each family flagged on its own (its majority), over all planted defects. */
  perFamily: Record<string, { flagged: number; recall: number }>;
  pass: boolean;
}

export const CATCH_BAR = 0.8;
export const FALSE_ALARM_BAR = 0.1;

/**
 * Scores canary runs. An item defect is caught when the panel's round-1
 * consensus is revise or remove; a missing fact is caught when a matching
 * addition was accepted by consensus (or, with one round, when both families'
 * majorities proposed one). A false alarm is an unmutated item with a
 * consensus revise or remove. Disputed items count as neither caught nor
 * false alarms.
 */
export function scoreCanaries(
  runs: {
    result: CaseResult;
    canary: Canary;
    familySizes: Record<string, number>;
    rounds: number;
  }[],
): CanaryScore {
  const kinds: DefectKind[] = [
    "missing",
    "contradicted",
    "unsupported",
    "trap-true",
  ];
  const byKind = Object.fromEntries(
    kinds.map((k) => [k, { planted: 0, caught: 0 }]),
  ) as CanaryScore["byKind"];
  const perFamily: Record<string, { flagged: number; recall: number }> = {};
  let planted = 0,
    caught = 0,
    unmutated = 0,
    falseAlarms = 0;
  for (const { result, canary, familySizes, rounds } of runs) {
    for (const f of Object.keys(familySizes))
      perFamily[f] ??= { flagged: 0, recall: 0 };
    const defectIds = new Set(
      canary.defects.flatMap((d) => (d.id ? [d.id] : [])),
    );
    for (const d of canary.defects) {
      planted++;
      byKind[d.kind].planted++;
      let hit = false;
      const flaggedBy: string[] = [];
      if (d.kind === "missing") {
        const proposers = new Map<string, Set<string>>();
        for (const p of result.proposals)
          if (restates(d.text, p.text))
            proposers.set(
              p.family,
              (proposers.get(p.family) ?? new Set()).add(p.reviewer),
            );
        for (const [f, size] of Object.entries(familySizes))
          if ((proposers.get(f)?.size ?? 0) * 2 > size) flaggedBy.push(f);
        hit =
          rounds >= 2
            ? result.additions.some(
                (a) => a.outcome === "added" && restates(d.text, a.text),
              )
            : flaggedBy.length === Object.keys(familySizes).length;
      } else {
        const item = result.items.find((i) => i.id === d.id)!;
        const c = item.round1.consensus;
        hit = c.status === "settled" && c.value !== "keep";
        for (const [f, v] of Object.entries(c.byFamily))
          if (v !== null && v !== "keep") flaggedBy.push(f);
      }
      if (hit) {
        caught++;
        byKind[d.kind].caught++;
      }
      for (const f of flaggedBy) perFamily[f]!.flagged++;
    }
    for (const item of result.items) {
      if (defectIds.has(item.id)) continue;
      unmutated++;
      const c = item.round1.consensus;
      if (c.status === "settled" && c.value !== "keep") falseAlarms++;
    }
  }
  for (const f of Object.values(perFamily))
    f.recall = planted ? f.flagged / planted : 0;
  const catchRate = planted ? caught / planted : 0;
  const falseAlarmRate = unmutated ? falseAlarms / unmutated : 0;
  return {
    cases: runs.length,
    planted,
    caught,
    catchRate,
    unmutated,
    falseAlarms,
    falseAlarmRate,
    byKind,
    perFamily,
    pass:
      planted > 0 &&
      catchRate >= CATCH_BAR &&
      falseAlarmRate <= FALSE_ALARM_BAR,
  };
}
