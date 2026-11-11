// Shapes of everything the fact-review panel reads and writes: the sheet under
// review, each reviewer's reply, synthesis replies and round-2 votes, with JSON
// Schemas strict enough for both Claude's --json-schema and Codex's
// --output-schema (every property required, optional values nullable).
import { FACTS_SCHEMA, type Facts } from '../schema/case.ts';

export const CATEGORIES = ['claims', 'context', 'uncertainties', 'traps'] as const;
export type Category = (typeof CATEGORIES)[number];
export const PREFIX: Record<Category, string> = { claims: 'C', context: 'X', uncertainties: 'U', traps: 'T' };
export const VERDICTS = ['keep', 'revise', 'remove'] as const;
export type Verdict = (typeof VERDICTS)[number];
export const VOTES = ['accept', 'reject'] as const;
export type Vote = (typeof VOTES)[number];

/** One fact on the sheet, with the ID the provenance file uses (C1, X2, U1, T3). */
export interface SheetItem {
  id: string;
  category: Category;
  text: string;
}

export interface ItemReview {
  id: string;
  category: Category;
  verdict: Verdict;
  reason: string;
  evidenceRefs: string[];
  rewrite: string | null;
  /** Traps only: the statement is tempting for a writer and is in fact false. */
  trapIsReal: boolean | null;
}

export interface Addition {
  category: Category;
  text: string;
  reason: string;
  evidenceRefs: string[];
}

export interface ReviewReply {
  items: ItemReview[];
  additions: Addition[];
}

/** A change put to the round-2 vote: a merged rewrite of an item, or a clustered addition. */
export interface Proposal {
  /** R:<item id> for a rewrite, A<n> for an addition. */
  id: string;
  kind: 'revise' | 'add';
  category: Category;
  /** The item's current text, for rewrites. */
  original: string | null;
  text: string;
  evidenceRefs: string[];
}

export interface VoteReply {
  votes: { id: string; vote: Vote; reason: string; evidenceRefs: string[] }[];
}

export interface RewriteReply {
  candidates: { id: string; text: string; reason: string; evidenceRefs: string[] }[];
}

export interface ClusterReply {
  clusters: { category: Category; text: string; members: string[]; evidenceRefs: string[] }[];
}

const str = { type: 'string' };
const refs = { type: 'array', items: str };
const ids = (values: string[]) => (values.length ? { type: 'string', enum: [...values] } : str);
const object = (properties: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

export function reviewSchema(itemIds: string[]) {
  return object({
    items: {
      type: 'array',
      items: object({
        id: ids(itemIds),
        category: { type: 'string', enum: [...CATEGORIES] },
        verdict: { type: 'string', enum: [...VERDICTS] },
        reason: str,
        evidenceRefs: refs,
        rewrite: { type: ['string', 'null'] },
        trapIsReal: { type: ['boolean', 'null'] },
      }),
    },
    additions: {
      type: 'array',
      items: object({ category: { type: 'string', enum: [...CATEGORIES] }, text: str, reason: str, evidenceRefs: refs }),
    },
  });
}

export function voteSchema(proposalIds: string[]) {
  return object({
    votes: { type: 'array', items: object({ id: ids(proposalIds), vote: { type: 'string', enum: [...VOTES] }, reason: str, evidenceRefs: refs }) },
  });
}

export function rewriteSchema(itemIds: string[]) {
  return object({ candidates: { type: 'array', items: object({ id: ids(itemIds), text: str, reason: str, evidenceRefs: refs }) } });
}

export function clusterSchema(additionIds: string[]) {
  return object({
    clusters: {
      type: 'array',
      items: object({ category: { type: 'string', enum: [...CATEGORIES] }, text: str, members: { type: 'array', items: ids(additionIds) }, evidenceRefs: refs }),
    },
  });
}

const isObj = (x: unknown): x is Record<string, any> => !!x && typeof x === 'object' && !Array.isArray(x);
const isStrings = (x: unknown) => Array.isArray(x) && x.every((s) => typeof s === 'string');
const isCategory = (x: unknown): x is Category => (CATEGORIES as readonly unknown[]).includes(x);

/** Everything a review reply must satisfy beyond its schema: every item reviewed once, consistently. */
export function checkReview(value: unknown, sheet: SheetItem[]): string[] {
  const problems: string[] = [];
  if (!isObj(value) || !Array.isArray(value.items) || !Array.isArray(value.additions)) return ['expected {items: [...], additions: [...]}'];
  const byId = new Map(sheet.map((s) => [s.id, s]));
  const seen = new Set<string>();
  for (const [i, r] of (value.items as unknown[]).entries()) {
    if (!isObj(r)) {
      problems.push(`items[${i}]: expected an object`);
      continue;
    }
    const item = byId.get(r.id);
    if (!item) {
      problems.push(`items[${i}]: unknown id ${JSON.stringify(r.id)}`);
      continue;
    }
    if (seen.has(r.id)) problems.push(`${r.id}: reviewed more than once`);
    seen.add(r.id);
    if (r.category !== item.category) problems.push(`${r.id}: category must be ${item.category}`);
    if (!(VERDICTS as readonly unknown[]).includes(r.verdict)) problems.push(`${r.id}: verdict must be keep, revise or remove`);
    if (typeof r.reason !== 'string' || !r.reason.trim()) problems.push(`${r.id}: reason is required`);
    if (!isStrings(r.evidenceRefs)) problems.push(`${r.id}: evidenceRefs must be strings`);
    if (r.verdict === 'revise' && (typeof r.rewrite !== 'string' || !r.rewrite.trim())) problems.push(`${r.id}: a revise verdict needs a rewrite`);
    if (item.category === 'traps') {
      if (typeof r.trapIsReal !== 'boolean') problems.push(`${r.id}: traps need trapIsReal true or false`);
      else if (r.trapIsReal === false && r.verdict === 'keep') problems.push(`${r.id}: a trap that is not real cannot be kept as it is`);
    }
  }
  for (const s of sheet) if (!seen.has(s.id)) problems.push(`${s.id}: not reviewed`);
  for (const [i, a] of (value.additions as unknown[]).entries()) {
    if (!isObj(a) || !isCategory(a.category) || typeof a.text !== 'string' || !a.text.trim() || !isStrings(a.evidenceRefs) || typeof a.reason !== 'string')
      problems.push(`additions[${i}]: needs category, text, reason and evidenceRefs`);
  }
  return problems;
}

export function checkVotes(value: unknown, proposals: Proposal[]): string[] {
  if (!isObj(value) || !Array.isArray(value.votes)) return ['expected {votes: [...]}'];
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const v of value.votes as any[]) {
    if (!isObj(v) || !proposals.some((p) => p.id === v.id)) {
      problems.push(`unknown proposal ${JSON.stringify(v?.id)}`);
      continue;
    }
    if (seen.has(v.id)) problems.push(`${v.id}: voted more than once`);
    seen.add(v.id);
    if (!(VOTES as readonly unknown[]).includes(v.vote)) problems.push(`${v.id}: vote must be accept or reject`);
    if (typeof v.reason !== 'string' || !v.reason.trim()) problems.push(`${v.id}: reason is required`);
    if (!isStrings(v.evidenceRefs)) problems.push(`${v.id}: evidenceRefs must be strings`);
  }
  for (const p of proposals) if (!seen.has(p.id)) problems.push(`${p.id}: no vote`);
  return problems;
}

export function checkRewrites(value: unknown, wanted: string[]): string[] {
  if (!isObj(value) || !Array.isArray(value.candidates)) return ['expected {candidates: [...]}'];
  const got = (value.candidates as any[]).filter((c) => isObj(c) && typeof c.text === 'string' && c.text.trim() && isStrings(c.evidenceRefs));
  const problems = (value.candidates as any[]).length !== got.length ? ['every candidate needs id, text, reason and evidenceRefs'] : [];
  for (const id of wanted) if (got.filter((c) => c.id === id).length !== 1) problems.push(`${id}: expected exactly one candidate`);
  return problems;
}

export function checkClusters(value: unknown, additionIds: string[]): string[] {
  if (!isObj(value) || !Array.isArray(value.clusters)) return ['expected {clusters: [...]}'];
  const problems: string[] = [];
  const placed = new Map<string, number>();
  for (const [i, c] of (value.clusters as any[]).entries()) {
    if (!isObj(c) || !isCategory(c.category) || typeof c.text !== 'string' || !c.text.trim() || !isStrings(c.members) || !c.members.length || !isStrings(c.evidenceRefs)) {
      problems.push(`clusters[${i}]: needs category, text, members and evidenceRefs`);
      continue;
    }
    for (const m of c.members as string[]) placed.set(m, (placed.get(m) ?? 0) + 1);
  }
  for (const id of additionIds) if (placed.get(id) !== 1) problems.push(`${id}: must be in exactly one cluster`);
  for (const id of placed.keys()) if (!additionIds.includes(id)) problems.push(`unknown addition ${id}`);
  return problems;
}

/**
 * The sheet's items in provenance-ID order. Reviewers get the texts only, not
 * the drafter's citations or rationales, so nothing anchors them and canary
 * sheets look exactly like real ones.
 */
export function sheetOf(facts: Facts): SheetItem[] {
  return CATEGORIES.flatMap((category) => (facts[category] ?? []).map((text, i) => ({ id: `${PREFIX[category]}${i + 1}`, category, text })));
}

export function factsOf(items: { category: Category; text: string }[]): Facts {
  const facts: Facts = { schema: FACTS_SCHEMA, claims: [], context: [], uncertainties: [], traps: [] };
  for (const item of items) facts[item.category].push(item.text);
  return facts;
}
