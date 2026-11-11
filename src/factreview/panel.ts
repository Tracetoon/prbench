// `prbench fact-review`: an expert model panel reviews each case's fact sheet
// against the raw evidence. Every reviewer call is a fresh read-only agentic
// session in its own copy of the evidence; round 1 reviews every item, a
// synthesis call merges agreed rewrites and clusters proposed additions, and
// later rounds put those to an accept/reject vote of the full panel. Family
// consensus decides (aggregate.ts); everything else goes to human review.
import { cpSync, existsSync, linkSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { caseDirs, loadCase, type Facts, type LoadedCase } from '../schema/case.ts';
import { claudeJudge, codexJudge, extractJson, type JudgeProvider } from '../judge/providers.ts';
import { claudeEffort } from '../agents/claude.ts';
import { reasoningEffort } from '../agents/codex.ts';
import { digest } from '../util/hash.ts';
import { exec } from '../util/exec.ts';
import { buildFactPacket } from '../../scripts/fact-packet.ts';
import type { Draft } from '../../scripts/provenance.ts';
import { aggregateItems, aggregateVotes, numberAdditions, type Member } from './aggregate.ts';
import { plantDefects, scoreCanaries, selectCanaryCases, type Canary, type CanaryScore } from './canaries.ts';
import { clusterPrompt, correctionPrompt, FACT_REVIEW_PROMPT_VERSION, reviewPrompt, rewritePrompt, votePrompt, type RewriteInput } from './prompt.ts';
import {
  applyToCase,
  baseDraft,
  countsOf,
  factsOfDraft,
  resolveRef,
  revisedDraft,
  revisedFacts,
  writeCaseRecord,
  type AdditionDecision,
  type CaseCounts,
  type CaseResult,
  type ItemDecision,
  type VoteRound,
} from './record.ts';
import {
  checkClusters,
  checkReview,
  checkRewrites,
  checkVotes,
  clusterSchema,
  reviewSchema,
  rewriteSchema,
  sheetOf,
  voteSchema,
  type ClusterReply,
  type Proposal,
  type ReviewReply,
  type RewriteReply,
  type SheetItem,
  type VoteReply,
} from './schema.ts';

export const PANEL_ALIASES: Record<string, { provider: 'claude' | 'codex'; model: string }> = {
  opus: { provider: 'claude', model: 'claude-opus-5-5' },
  sol: { provider: 'codex', model: 'gpt-6.1-sol' },
};
export const DEFAULT_PANEL = 'opus:3,sol:3';

export interface PanelGroup {
  name: string;
  provider: 'claude' | 'codex';
  model: string;
  family: string;
  count: number;
}

/** "opus:3,sol:3" or "claude/<model>:3,codex/<model>:3" -> panel groups. */
export function parsePanel(spec: string): PanelGroup[] {
  const groups = spec.split(',').map((part) => {
    const m = /^\s*([^:\s]+):(\d+)\s*$/.exec(part);
    if (!m || Number(m[2]) < 1) throw new Error(`invalid panel entry "${part}": use name:count, e.g. opus:3 or codex/gpt-6.1-sol:3`);
    const [name, count] = [m[1]!, Number(m[2])];
    const alias = PANEL_ALIASES[name];
    const explicit = /^(claude|codex)\/(.+)$/.exec(name);
    if (!alias && !explicit) throw new Error(`unknown panel member "${name}": use ${Object.keys(PANEL_ALIASES).join(', ')}, claude/<model> or codex/<model>`);
    const provider = alias?.provider ?? (explicit![1] as 'claude' | 'codex');
    const model = alias?.model ?? explicit![2]!;
    return { name: alias ? name : model, provider, model, family: provider === 'claude' ? 'anthropic' : 'openai', count };
  });
  if (new Set(groups.map((g) => g.name)).size !== groups.length) throw new Error('each panel member may be listed once');
  return groups;
}

export interface Reviewer extends Member {
  provider: 'claude' | 'codex';
  replicate: number;
  effort: string;
  judge: JudgeProvider;
}

function judgeFor(provider: 'claude' | 'codex', model: string, effort: string): JudgeProvider {
  return provider === 'claude' ? claudeJudge(model, undefined, claudeEffort(effort)) : codexJudge(model, undefined, reasoningEffort(effort));
}

export function reviewersOf(groups: PanelGroup[], effort: string): Reviewer[] {
  return groups.flatMap((g) =>
    Array.from({ length: g.count }, (_, i) => ({ id: `${g.name}-${i + 1}`, family: g.family, model: g.model, provider: g.provider, replicate: i + 1, effort, judge: judgeFor(g.provider, g.model, effort) })),
  );
}

export interface FactReviewOptions {
  cases: string;
  caseIds?: string[];
  panel?: string;
  effort?: string;
  rounds?: number;
  canaries?: number;
  out: string;
  resume?: boolean;
  parallel?: number;
  aggregateOnly?: boolean;
  apply?: boolean;
  /** Where prebuilt fact packets live (scripts/fact-packet.ts); missing ones are built into the run folder. */
  packets?: string;
  log?: (line: string) => void;
}

export interface FactReviewSummary {
  runId: string;
  out: string;
  mode: 'review' | 'canary';
  cases: number;
  skipped: number;
  counts: CaseCounts;
  canary?: CanaryScore;
  calls: number;
  cachedCalls: number;
  costUsd: number;
  applied: number;
}

/** A counting semaphore for concurrent model calls. */
function limiter(n: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    if (active >= n) await new Promise<void>((r) => queue.push(r));
    active++;
    try {
      return await fn();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
}

/** Hard-links a tree (falling back to copies), skipping names `skip` rejects. */
function linkTree(src: string, dst: string, skip: (rel: string) => boolean = () => false, root = src): void {
  mkdirSync(dst, { recursive: true });
  for (const e of readdirSync(src, { withFileTypes: true })) {
    const from = join(src, e.name);
    const to = join(dst, e.name);
    if (skip(relative(root, from))) continue;
    if (e.isDirectory()) linkTree(from, to, skip, root);
    else if (e.isFile()) {
      try {
        linkSync(from, to);
      } catch {
        cpSync(from, to);
      }
    }
  }
}

function filesOf(dir: string, skip: (rel: string) => boolean, root = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    const rel = relative(root, p);
    if (skip(rel)) return [];
    return e.isDirectory() ? filesOf(p, skip, root) : e.isFile() ? [rel] : [];
  });
}

/** A fact sheet or draft anywhere in the packet must never reach a reviewer's evidence. */
const notEvidence = (rel: string) => /^facts([.-]|$)/.test(basename(rel)) || rel === 'facts.draft.json';

interface Evidence {
  dir: string;
  hash: string;
  bare: string;
}

/**
 * The evidence every reviewer of a case sees: the fact packet (never its
 * draft), the raw session transcripts under raw/, and every changed file at
 * base/ and head/. Hashed without repo.git, whose packing varies.
 */
function buildEvidence(loaded: LoadedCase, packet: string): Evidence {
  const dir = mkdtempSync(join(tmpdir(), 'prbench-factreview-evidence-'));
  linkTree(packet, dir, notEvidence);
  for (const s of loaded.case.sessions ?? []) {
    mkdirSync(dirname(join(dir, 'raw', s.file)), { recursive: true });
    cpSync(join(loaded.dir, s.file), join(dir, 'raw', s.file));
  }
  const bare = join(packet, 'repo.git');
  const g = (args: string[]) => exec(['git', '-c', 'core.fsmonitor=false', '--git-dir', bare, ...args]);
  const { base, head } = loaded.case.repo;
  const changed = g(['diff', '--no-ext-diff', '--name-only', '-z', base, head!]).stdout.split('\0').filter(Boolean);
  for (const [side, rev] of [['base', base], ['head', head!]] as const)
    for (const path of changed) {
      const r = Bun.spawnSync(['git', '-c', 'core.fsmonitor=false', '--git-dir', bare, 'show', `${rev}:${path}`], { stdout: 'pipe', stderr: 'pipe' });
      if (r.exitCode !== 0) continue; // added or deleted on this side
      const to = join(dir, side, path);
      if (!resolve(to).startsWith(resolve(dir))) continue;
      mkdirSync(dirname(to), { recursive: true });
      writeFileSync(to, r.stdout);
    }
  const skipGit = (rel: string) => rel === 'repo.git' || rel.startsWith(`repo.git/`) || rel.startsWith('repo.git\\');
  const manifest = filesOf(dir, skipGit)
    .sort()
    .map((rel) => `${rel.replace(/\\/g, '/')} ${digest(readFileSync(join(dir, rel)))}`);
  return { dir, hash: digest(manifest.join('\n')), bare };
}

function packetFor(loaded: LoadedCase, packets: string | undefined, caseOut: string): string {
  const prebuilt = packets ? join(packets, loaded.case.id) : undefined;
  if (prebuilt && existsSync(join(prebuilt, 'diff.patch')) && existsSync(join(prebuilt, 'repo.git'))) return prebuilt;
  const built = join(caseOut, 'packet');
  if (!existsSync(join(built, 'diff.patch'))) buildFactPacket(loaded.dir, built);
  return built;
}

const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';

interface CallStats {
  calls: number;
  cached: number;
  costUsd: number;
}

interface CallSpec<T> {
  kind: 'review' | 'rewrite' | 'cluster' | 'vote';
  round: number;
  reviewer: Reviewer;
  prompt: string;
  schema: object;
  check: (value: unknown) => string[];
  files?: Record<string, unknown>;
  /** Where the per-reviewer copy of the reply goes. */
  saveAs: string;
  _t?: T;
}

export async function factReview(opts: FactReviewOptions): Promise<FactReviewSummary> {
  const log = opts.aggregateOnly ? () => {} : (opts.log ?? ((line: string) => console.error(line)));
  const panelSpec = opts.panel ?? DEFAULT_PANEL;
  const effort = opts.effort ?? 'xhigh';
  const rounds = opts.rounds ?? 2;
  const parallel = opts.parallel ?? 6;
  if (!Number.isInteger(rounds) || rounds < 1) throw new Error('--rounds must be a positive integer');
  if (!Number.isInteger(parallel) || parallel < 1) throw new Error('--parallel must be a positive integer');
  if (opts.canaries !== undefined && (!Number.isInteger(opts.canaries) || opts.canaries < 1)) throw new Error('--canaries must be a positive integer');
  if (opts.canaries !== undefined && opts.apply) throw new Error('--apply cannot be used with --canaries: canary sheets are planted with errors');
  const groups = parsePanel(panelSpec);
  const reviewers = reviewersOf(groups, effort);
  const anthropic = groups.find((g) => g.provider === 'claude');
  const synthGroup = anthropic ?? groups[0]!;
  const synthesizer: Reviewer = { id: 'synthesis', family: synthGroup.family, model: synthGroup.model, provider: synthGroup.provider, replicate: 0, effort, judge: judgeFor(synthGroup.provider, synthGroup.model, effort) };
  const familySizes: Record<string, number> = {};
  for (const r of reviewers) familySizes[r.family] = (familySizes[r.family] ?? 0) + 1;

  const out = resolve(opts.out);
  const runId = basename(out);
  const config = { schema: 'prbench.fact-review-run/v1', promptVersion: FACT_REVIEW_PROMPT_VERSION, panel: groups.map(({ name, provider, model, family, count }) => ({ name, provider, model, family, count })), effort, rounds, canaries: opts.canaries ?? null, synthesizer: synthesizer.model };
  const runFile = join(out, 'run.json');
  if (existsSync(runFile)) {
    if (!opts.resume) throw new Error(`${out} already holds a fact-review run; pass --resume to continue it`);
    const old = JSON.parse(readFileSync(runFile, 'utf8'));
    const same = (k: keyof typeof config) => JSON.stringify(old[k]) === JSON.stringify(config[k]);
    for (const k of ['panel', 'effort', 'rounds', 'canaries'] as const) if (!same(k)) throw new Error(`--resume: ${k} differs from the saved run`);
  }
  mkdirSync(join(out, 'calls'), { recursive: true });
  writeFileSync(runFile, json({ ...config, runId }));

  // Cases with a sheet: the case's facts, else a packet's facts.draft.json.
  const packets = opts.packets ? resolve(opts.packets) : undefined;
  const wanted = opts.caseIds?.length ? new Set(opts.caseIds) : undefined;
  const all: { loaded: LoadedCase; facts: Facts; draft?: Draft; draftFile?: string }[] = [];
  let skipped = 0;
  const loadedIds = new Set<string>();
  for (const dir of caseDirs(resolve(opts.cases))) {
    const loaded = loadCase(dir);
    loadedIds.add(loaded.case.id);
    const draftFile = packets ? join(packets, loaded.case.id, 'facts.draft.json') : undefined;
    const factsFile = loaded.case.facts ? join(dir, loaded.case.facts) : undefined;
    const facts: Facts | undefined = factsFile && existsSync(factsFile) ? JSON.parse(readFileSync(factsFile, 'utf8')) : undefined;
    // A packet draft stands in only when the case has no sheet of its own.
    const draft = baseDraft(dir, facts, facts ? undefined : draftFile);
    const sheet = facts ?? (draft ? factsOfDraft(draft) : undefined);
    if (!sheet) {
      if (!wanted || wanted.has(loaded.case.id)) skipped++;
      continue;
    }
    all.push({ loaded, facts: sheet, draft, draftFile });
  }
  for (const id of wanted ?? []) if (!loadedIds.has(id)) throw new Error(`--case ${id}: no such case under ${opts.cases}`);

  let selected = all.filter((c) => !wanted || wanted.has(c.loaded.case.id));
  const canaries = new Map<string, Canary>();
  if (opts.canaries !== undefined) {
    const ids = selectCanaryCases(selected.map((c) => ({ id: c.loaded.case.id, agent: c.loaded.case.sessions?.[0]?.agent ?? 'unknown' })), opts.canaries);
    const sorted = [...all].sort((a, b) => a.loaded.case.id.localeCompare(b.loaded.case.id));
    for (const id of ids) {
      const c = sorted.find((x) => x.loaded.case.id === id)!;
      const donors = sorted.filter((x) => x.loaded.case.id !== id && x.facts.claims.length);
      const donor = donors.find((x) => x.loaded.case.id > id) ?? donors[0];
      const importance = c.draft ? c.draft.claims.map((f) => f.sources.length) : [];
      canaries.set(id, plantDefects(c.facts, donor?.facts.claims[0], importance));
    }
    selected = ids.map((id) => selected.find((c) => c.loaded.case.id === id)!);
  }

  const stats: CallStats = { calls: 0, cached: 0, costUsd: 0 };
  const limit = limiter(parallel);

  async function call<T>(caseOut: string, ev: Evidence, sheet: SheetItem[], spec: CallSpec<T>): Promise<T> {
    const key = digest(
      JSON.stringify({
        v: FACT_REVIEW_PROMPT_VERSION,
        kind: spec.kind,
        evidence: ev.hash,
        sheet: digest(JSON.stringify(sheet)),
        prompt: digest(spec.prompt),
        provider: spec.reviewer.provider,
        model: spec.reviewer.model,
        effort: spec.reviewer.effort,
        round: spec.round,
        replicate: spec.reviewer.replicate,
      }),
    );
    const cacheFile = join(out, 'calls', `${key}.json`);
    let saved: { reply: T; costUsd?: number } | undefined;
    if (opts.resume && existsSync(cacheFile)) {
      const s = JSON.parse(readFileSync(cacheFile, 'utf8'));
      if (spec.check(s.reply).length === 0) {
        saved = s;
        stats.cached++;
      }
    }
    if (!saved)
      saved = await limit(async () => {
        let prompt = spec.prompt;
        let lastError = '';
        for (let attempt = 1; attempt <= 3; attempt++) {
          const work = mkdtempSync(join(tmpdir(), 'prbench-factreview-'));
          try {
            linkTree(ev.dir, work);
            writeFileSync(join(work, 'sheet.json'), json({ items: sheet.map(({ id, category, text }) => ({ id, category, text })) }));
            for (const [name, value] of Object.entries(spec.files ?? {})) writeFileSync(join(work, name), json(value));
            stats.calls++;
            const reply = await spec.reviewer.judge.ask(prompt, spec.schema, { workDir: work });
            if (reply.costUsd) stats.costUsd += reply.costUsd;
            let parsed: unknown;
            let problems: string[];
            try {
              parsed = extractJson(reply.text);
              problems = spec.check(parsed);
            } catch (error) {
              problems = [String(error)];
            }
            if (!problems.length) {
              const record = { key, kind: spec.kind, round: spec.round, reviewer: spec.reviewer.id, model: spec.reviewer.model, effort: spec.reviewer.effort, attempts: attempt, costUsd: reply.costUsd, at: new Date().toISOString(), reply: parsed as T };
              writeFileSync(cacheFile, json(record));
              return record;
            }
            lastError = problems.join('; ');
            prompt = correctionPrompt(spec.prompt, problems);
          } catch (error) {
            lastError = String(error);
          } finally {
            rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
          }
        }
        throw new Error(`${spec.kind} call by ${spec.reviewer.id} (round ${spec.round}) failed after 3 attempts: ${lastError.slice(0, 600)}`);
      });
    mkdirSync(dirname(join(caseOut, spec.saveAs)), { recursive: true });
    writeFileSync(join(caseOut, spec.saveAs), json({ reviewer: spec.reviewer.id, model: spec.reviewer.model, family: spec.reviewer.family, effort: spec.reviewer.effort, round: spec.round, kind: spec.kind, key, reply: saved.reply }));
    return saved.reply;
  }

  const results: { id: string; result: CaseResult; canary?: Canary; applied: boolean }[] = [];
  const caseLimit = limiter(Math.max(1, Math.ceil(parallel / reviewers.length)) + 1);

  async function reviewCase(c: (typeof selected)[number]): Promise<void> {
    const { loaded } = c;
    const id = loaded.case.id;
    const caseOut = join(out, id);
    mkdirSync(caseOut, { recursive: true });
    const canary = canaries.get(id);
    const facts = canary?.facts ?? c.facts;
    if (canary) writeFileSync(join(caseOut, 'canary.json'), json(canary));
    const sheet = sheetOf(facts);
    writeFileSync(join(caseOut, 'sheet.json'), json({ items: sheet }));
    const packet = packetFor(loaded, packets, caseOut);
    const ev = buildEvidence(loaded, packet);
    try {
      log(`case  ${id}: ${sheet.length} items, ${reviewers.length} reviewers`);
      // Round 1: every reviewer reviews every item.
      const ids = sheet.map((s) => s.id);
      const replies = await Promise.all(
        reviewers.map(async (member) => ({
          member,
          reply: await call<ReviewReply>(caseOut, ev, sheet, { kind: 'review', round: 1, reviewer: member, prompt: reviewPrompt(sheet), schema: reviewSchema(ids), check: (v) => checkReview(v, sheet), saveAs: `round-1/${member.id}.json` }),
        })),
      );
      const round1 = aggregateItems(sheet, replies);
      const proposals = numberAdditions(replies);
      writeFileSync(join(caseOut, 'round-1', 'summary.json'), json({ round: 1, items: round1.map((i) => ({ id: i.id, consensus: i.consensus, trapIsReal: i.trapIsReal })), proposedAdditions: proposals.length }));

      const items: ItemDecision[] = round1.map((r) => {
        const base = { id: r.id, category: r.category, text: r.text, round: 1, round1: r, rewriteRounds: [] as VoteRound[] };
        const c1 = r.consensus;
        if (c1.status === 'disputed') return { ...base, outcome: 'disputed', finalText: r.text, why: c1.why === 'family-split' ? 'a family had no majority verdict' : 'the families disagreed' };
        if (c1.value === 'keep') return { ...base, outcome: 'kept', finalText: r.text, why: 'consensus keep' };
        if (c1.value === 'remove') return { ...base, outcome: 'removed', finalText: null, why: 'consensus remove' };
        return { ...base, outcome: 'disputed', finalText: r.text, why: rounds < 2 ? 'consensus revise, but no vote round was allowed (--rounds 1)' : 'consensus revise; awaiting a vote' };
      });
      const pendingRevisions = new Set(rounds >= 2 ? round1.filter((r) => r.consensus.status === 'settled' && r.consensus.value === 'revise').map((r) => r.id) : []);

      // Additions: one synthesis call clusters them; clusters at least two reviewers proposed go to the vote.
      const additions: AdditionDecision[] = [];
      if (proposals.length && rounds >= 2) {
        const pIds = proposals.map((p) => p.id);
        const view = proposals.map(({ id, category, text, reason, evidenceRefs }) => ({ id, category, text, reason, evidenceRefs }));
        const clusters = await call<ClusterReply>(caseOut, ev, sheet, { kind: 'cluster', round: 2, reviewer: synthesizer, prompt: clusterPrompt(sheet, view), schema: clusterSchema(pIds), check: (v) => checkClusters(v, pIds), files: { 'proposals.json': { additions: view } }, saveAs: 'round-2/synthesis-additions.json' });
        clusters.clusters.forEach((cl, i) => {
          const members = proposals.filter((p) => cl.members.includes(p.id));
          const proposers = [...new Set(members.map((p) => p.reviewer))];
          const single = proposers.length < 2;
          additions.push({ id: `A${i + 1}`, category: cl.category, text: cl.text, members: cl.members, proposers, outcome: single ? 'dropped-single' : 'disputed', round: 2, why: single ? 'proposed by one reviewer only' : 'awaiting a vote', evidenceRefs: cl.evidenceRefs, rounds: [] });
        });
      }
      const pendingAdditions = new Set(additions.filter((a) => a.outcome !== 'dropped-single').map((a) => a.id));

      // Rounds 2..n: synthesize rewrites, then the full panel votes on every open proposal.
      const candidates = new Map<string, { text: string; reason: string; evidenceRefs: string[] }>();
      for (const a of additions) if (pendingAdditions.has(a.id)) candidates.set(a.id, { text: a.text, reason: 'merged from reviewer proposals', evidenceRefs: a.evidenceRefs });
      const objections = new Map<string, string[]>();
      for (let round = 2; round <= rounds && (pendingRevisions.size || pendingAdditions.size); round++) {
        const rewriteInputs: RewriteInput[] = [];
        for (const itemId of pendingRevisions) {
          const r1 = round1.find((r) => r.id === itemId)!;
          const prev = candidates.get(`R:${itemId}`);
          rewriteInputs.push({
            id: `R:${itemId}`,
            category: r1.category,
            original: r1.text,
            rewrites: r1.votes.filter((v) => v.verdict === 'revise' && v.rewrite).map((v) => ({ text: v.rewrite!, reason: v.reason, evidenceRefs: v.evidenceRefs })),
            ...(prev ? { previous: { text: prev.text, objections: objections.get(`R:${itemId}`) ?? [] } } : {}),
          });
        }
        for (const addId of pendingAdditions) {
          if (!objections.has(addId)) continue; // first vote uses the cluster text as is
          const a = additions.find((x) => x.id === addId)!;
          const prev = candidates.get(addId)!;
          const members = proposals.filter((p) => a.members.includes(p.id));
          rewriteInputs.push({ id: addId, category: a.category, original: '(a new fact to add)', rewrites: members.map((p) => ({ text: p.text, reason: p.reason, evidenceRefs: p.evidenceRefs })), previous: { text: prev.text, objections: objections.get(addId)! } });
        }
        if (rewriteInputs.length) {
          const wantedIds = rewriteInputs.map((r) => r.id);
          const synth = await call<RewriteReply>(caseOut, ev, sheet, { kind: 'rewrite', round, reviewer: synthesizer, prompt: rewritePrompt(rewriteInputs), schema: rewriteSchema(wantedIds), check: (v) => checkRewrites(v, wantedIds), files: { 'proposals.json': { items: rewriteInputs } }, saveAs: `round-${round}/synthesis-revisions.json` });
          for (const cand of synth.candidates) candidates.set(cand.id, { text: cand.text, reason: cand.reason, evidenceRefs: cand.evidenceRefs });
        }
        const ballot: Proposal[] = [
          ...[...pendingRevisions].map((itemId) => {
            const item = items.find((i) => i.id === itemId)!;
            const cand = candidates.get(`R:${itemId}`)!;
            return { id: `R:${itemId}`, kind: 'revise' as const, category: item.category, original: item.text, text: cand.text, evidenceRefs: cand.evidenceRefs };
          }),
          ...[...pendingAdditions].map((addId) => {
            const a = additions.find((x) => x.id === addId)!;
            const cand = candidates.get(addId)!;
            return { id: addId, kind: 'add' as const, category: a.category, original: null, text: cand.text, evidenceRefs: cand.evidenceRefs };
          }),
        ];
        const ballotIds = ballot.map((p) => p.id);
        const votes = await Promise.all(
          reviewers.map(async (member) => ({
            member,
            reply: await call<VoteReply>(caseOut, ev, sheet, { kind: 'vote', round, reviewer: member, prompt: votePrompt(sheet, ballot), schema: voteSchema(ballotIds), check: (v) => checkVotes(v, ballot), files: { 'proposals.json': { proposals: ballot } }, saveAs: `round-${round}/${member.id}.json` })
          })),
        );
        const tally = aggregateVotes(ballotIds, votes);
        const last = round === rounds;
        for (const p of ballot) {
          const t = tally.get(p.id)!;
          const vr: VoteRound = { round, candidate: candidates.get(p.id)!, consensus: t.consensus, votes: t.votes };
          const accepted = t.consensus.status === 'settled' && t.consensus.value === 'accept';
          const rejected = t.consensus.status === 'settled' && t.consensus.value === 'reject';
          const disputeWhy = t.consensus.status === 'disputed' ? (t.consensus.why === 'family-split' ? 'a family had no majority vote' : 'the families disagreed') : 'the panel rejected the candidate';
          if (p.kind === 'revise') {
            const item = items.find((i) => i.id === p.id.slice(2))!;
            item.rewriteRounds.push(vr);
            item.round = round;
            if (accepted) Object.assign(item, { outcome: 'revised', finalText: p.text, why: `rewrite accepted by consensus in round ${round}` });
            else item.why = `consensus revise, but no rewrite was accepted (round ${round}: ${disputeWhy})`;
            if (accepted || last) pendingRevisions.delete(item.id);
          } else {
            const a = additions.find((x) => x.id === p.id)!;
            a.rounds.push(vr);
            a.round = round;
            if (accepted) Object.assign(a, { outcome: 'added', text: p.text, evidenceRefs: p.evidenceRefs, why: `accepted by consensus in round ${round}` });
            else if (rejected) Object.assign(a, { outcome: 'rejected', why: `rejected by consensus in round ${round}` });
            else a.why = `no consensus in round ${round}: ${disputeWhy}`;
            if (accepted || rejected || last) pendingAdditions.delete(a.id);
          }
          if (!accepted) objections.set(p.id, t.votes.filter((v) => v.vote === 'reject').map((v) => v.reason));
        }
        writeFileSync(join(caseOut, `round-${round}`, 'summary.json'), json({ round, proposals: ballot.map((p) => ({ id: p.id, kind: p.kind, consensus: tally.get(p.id)!.consensus })) }));
      }

      const result: CaseResult = { caseId: id, sheet, items, additions, proposals, facts: revisedFacts(items, additions) };
      let applied = false;
      if (!canary && c.draft) {
        // Resolve the panel's evidence references now, so the run folder's sheet is exactly what --apply writes.
        const ctx = { caseDir: loaded.dir, bare: ev.bare, base: loaded.case.repo.base, head: loaded.case.repo.head!, sessions: (loaded.case.sessions ?? []).map((s) => s.file) };
        const draft = revisedDraft(c.draft, result, (ref) => resolveRef(ref, ctx));
        result.facts = factsOfDraft(draft);
        if (opts.apply) {
          const counts = countsOf(result);
          applyToCase(loaded.dir, draft, {
            bare: ev.bare,
            reviewedBy: `expert panel ${runId} (${panelSpec} at ${effort})`,
            record: { runId, reviewers: groups.map((g) => ({ model: g.model, family: g.family, effort, count: g.count })), rounds, disputed: counts.disputed + counts.additionsDisputed, revised: counts.revised, removed: counts.removed, added: counts.added },
          });
          applied = true;
        }
      } else if (opts.apply && !canary) {
        writeFileSync(join(loaded.dir, loaded.case.facts ?? 'facts.json'), JSON.stringify(result.facts, null, 2) + '\n');
        applied = true;
      }
      writeCaseRecord(caseOut, result, { runId });
      results.push({ id, result, canary, applied });
      const n = countsOf(result);
      log(`done  ${id}: ${n.settled}/${n.items} settled, ${n.disputed} disputed, ${n.revised} revised, ${n.removed} removed, ${n.added} added${applied ? ', applied' : ''}`);
    } finally {
      rmSync(ev.dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  }

  await Promise.all(selected.map((c) => caseLimit(() => reviewCase(c))));
  results.sort((a, b) => a.id.localeCompare(b.id));

  const counts = results.reduce<CaseCounts>(
    (acc, r) => {
      const n = countsOf(r.result);
      for (const k of Object.keys(acc) as (keyof CaseCounts)[]) acc[k] += n[k];
      return acc;
    },
    { items: 0, settled: 0, kept: 0, disputed: 0, revised: 0, removed: 0, added: 0, additionsDisputed: 0, additionsDropped: 0 },
  );
  const canary = canaries.size ? scoreCanaries(results.map((r) => ({ result: r.result, canary: r.canary!, familySizes, rounds }))) : undefined;
  if (canary) writeFileSync(join(out, 'canary-report.json'), json(canary));
  const summary: FactReviewSummary = { runId, out, mode: canary ? 'canary' : 'review', cases: results.length, skipped, counts, ...(canary ? { canary } : {}), calls: stats.calls, cachedCalls: stats.cached, costUsd: stats.costUsd, applied: results.filter((r) => r.applied).length };
  writeFileSync(join(out, 'summary.json'), json({ ...summary, perCase: results.map((r) => ({ case: r.id, ...countsOf(r.result) })) }));
  return summary;
}

/** The counts-only report: no case names, no fact text. */
export function summaryLines(s: FactReviewSummary): string[] {
  const c = s.counts;
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const lines = [
    `mode ${s.mode}; cases ${s.cases}${s.skipped ? ` (${s.skipped} without a sheet skipped)` : ''}; items ${c.items}`,
    `settled ${c.settled} (kept ${c.kept}, revised ${c.revised}, removed ${c.removed}); disputed ${c.disputed}`,
    `additions: added ${c.added}, disputed ${c.additionsDisputed}, dropped ${c.additionsDropped}`,
    `calls ${s.calls} new, ${s.cachedCalls} reused; reported cost $${s.costUsd.toFixed(2)}${s.applied ? `; applied to ${s.applied} case(s)` : ''}`,
  ];
  if (s.canary) {
    const k = s.canary;
    lines.push(
      `canaries: caught ${k.caught}/${k.planted} (${pct(k.catchRate)}); false alarms ${k.falseAlarms}/${k.unmutated} (${pct(k.falseAlarmRate)})`,
      `canaries by kind: ${Object.entries(k.byKind)
        .map(([kind, v]) => `${kind} ${v.caught}/${v.planted}`)
        .join(', ')}`,
      `canaries per-family recall: ${Object.entries(k.perFamily)
        .map(([f, v]) => `${f} ${pct(v.recall)}`)
        .join(', ')}`,
      `canary bar (>=80% caught, <=10% false alarms): ${k.pass ? 'PASS' : 'FAIL'}`,
    );
  }
  return lines;
}

