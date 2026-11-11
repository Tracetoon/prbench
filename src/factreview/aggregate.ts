// Family consensus. Each family's verdict on a question is the majority of its
// reviewers; a question is settled only when every family's majority agrees.
// No majority inside a family (e.g. a 1-1-1 split) or families disagreeing
// makes it disputed. The real independence is between families: replicates
// of one model mostly measure sampling noise, so they never outvote another
// family.
import type { Addition, Category, ItemReview, ReviewReply, SheetItem, Verdict, Vote, VoteReply } from './schema.ts';

export interface Member {
  /** e.g. "opus-2" */
  id: string;
  family: string;
  model: string;
}

export type Consensus<T extends string> =
  | { status: 'settled'; value: T; byFamily: Record<string, T | null> }
  | { status: 'disputed'; why: 'family-split' | 'cross-family'; byFamily: Record<string, T | null> };

/** The value more than half of `values` share, else null. */
export function majority<T extends string>(values: T[]): T | null {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  for (const [v, n] of counts) if (n * 2 > values.length) return v;
  return null;
}

/** Family consensus over one question, given each member's answer. */
export function consensus<T extends string>(answers: { member: Member; value: T }[]): Consensus<T> {
  const families = new Map<string, T[]>();
  for (const a of answers) families.set(a.member.family, [...(families.get(a.member.family) ?? []), a.value]);
  const byFamily: Record<string, T | null> = {};
  for (const [family, values] of [...families].sort(([a], [b]) => a.localeCompare(b))) byFamily[family] = majority(values);
  const verdicts = Object.values(byFamily);
  if (verdicts.some((v) => v === null)) return { status: 'disputed', why: 'family-split', byFamily };
  if (new Set(verdicts).size !== 1) return { status: 'disputed', why: 'cross-family', byFamily };
  return { status: 'settled', value: verdicts[0]!, byFamily };
}

export interface ReviewerVote {
  reviewer: string;
  family: string;
  verdict: Verdict;
  reason: string;
  evidenceRefs: string[];
  rewrite: string | null;
  trapIsReal: boolean | null;
}

export interface ItemRound1 {
  id: string;
  category: Category;
  text: string;
  consensus: Consensus<Verdict>;
  /** Traps: each family's majority on whether the trap is tempting and false. */
  trapIsReal?: Record<string, boolean | null>;
  votes: ReviewerVote[];
}

/** Round 1: every member's verdict on every sheet item, under family consensus. */
export function aggregateItems(sheet: SheetItem[], replies: { member: Member; reply: ReviewReply }[]): ItemRound1[] {
  return sheet.map((item) => {
    const votes: ReviewerVote[] = replies.map(({ member, reply }) => {
      const r = reply.items.find((x) => x.id === item.id) as ItemReview;
      return { reviewer: member.id, family: member.family, verdict: r.verdict, reason: r.reason, evidenceRefs: r.evidenceRefs, rewrite: r.rewrite, trapIsReal: r.trapIsReal };
    });
    const answers = replies.map(({ member }, i) => ({ member, value: votes[i]!.verdict }));
    const out: ItemRound1 = { id: item.id, category: item.category, text: item.text, consensus: consensus(answers), votes };
    if (item.category === 'traps') {
      const real = consensus(replies.map(({ member }, i) => ({ member, value: String(votes[i]!.trapIsReal) as 'true' | 'false' })));
      out.trapIsReal = Object.fromEntries(Object.entries(real.byFamily).map(([f, v]) => [f, v === null ? null : v === 'true']));
    }
    return out;
  });
}

export interface ProposedAddition extends Addition {
  /** P1, P2, ... in member order, then reply order. */
  id: string;
  reviewer: string;
  family: string;
}

export function numberAdditions(replies: { member: Member; reply: ReviewReply }[]): ProposedAddition[] {
  let n = 0;
  return replies.flatMap(({ member, reply }) => reply.additions.map((a) => ({ ...a, id: `P${++n}`, reviewer: member.id, family: member.family })));
}

export interface VoteRecord {
  reviewer: string;
  family: string;
  vote: Vote;
  reason: string;
  evidenceRefs: string[];
}

/** Round 2+: every member's accept/reject on every proposal, under family consensus. */
export function aggregateVotes(proposalIds: string[], replies: { member: Member; reply: VoteReply }[]): Map<string, { consensus: Consensus<Vote>; votes: VoteRecord[] }> {
  const out = new Map<string, { consensus: Consensus<Vote>; votes: VoteRecord[] }>();
  for (const id of proposalIds) {
    const votes = replies.map(({ member, reply }) => {
      const v = reply.votes.find((x) => x.id === id)!;
      return { reviewer: member.id, family: member.family, vote: v.vote, reason: v.reason, evidenceRefs: v.evidenceRefs };
    });
    out.set(id, { consensus: consensus(replies.map(({ member }, i) => ({ member, value: votes[i]!.vote }))), votes });
  }
  return out;
}
