// Imports replay cases listed in a candidates manifest (datasets/expansion/candidates.json).
//
//   bun run scripts/import-cases.ts [--manifest <file>] [--out cases-local] [--only a,b]
//                                   [--with-original] [--report]
//
// Unlike scripts/import-tracetoon-cases.ts, sessions are listed explicitly per
// case (no tool's matcher decides), they may come from any machine once staged
// under $STAGING (default ~/.cache/prbench/staging), and Claude Code subagent
// transcripts are kept beside their parent session. Manifest paths may use
// ~, $STAGING, $HOME and $HOME_SLUG (see fillPlaceholders), so the tracked
// manifest names no home directory.
//
// Each case gets repo.bundle, its sessions cut to the case window (an hour
// before the base commit to ten seconds after the head commit, unless the
// manifest narrows it) with PR-writing records dropped, and case.json.
//
// Fact sheets are written separately, from the diff and sessions only, so by
// default the published PR is not fetched. Run again with --with-original once
// facts exist: it adds original.md and fails if the PR text leaks into a slice.
// A rerun keeps facts.json and facts-provenance.json.
//
// The output holds real session logs: it goes to cases-local/, which git
// ignores. Never commit it (see docs/cases.md).
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { CASE_SCHEMA, type Case, type CaseSession, type Split } from '../src/schema/case.ts';
import { exec, git } from '../src/util/exec.ts';
import { assertNoPublishedPrText, hasUserInput, sliceReplaySession } from '../src/import/session.ts';

export interface CandidateSession {
  agent: 'claude-code' | 'codex';
  path: string;
  /** Index of the parent session in this case's list (Claude Code subagents). */
  subagentOf?: number;
  /** ISO overrides for this session's window. */
  from?: string;
  to?: string;
  /** Several [from, to] ISO windows instead, for work that resumed after unrelated tasks. */
  ranges?: [string, string][];
  /** Record uuids reviewed as free of PR text (see SliceOptions.keep). */
  keep?: string[];
}
export interface Candidate {
  id: string;
  title: string;
  split: Split;
  repo: string;
  license?: string;
  base: string;
  head: string;
  recordedPath: string;
  recordedAliases?: string[];
  task?: string;
  sessions: CandidateSession[];
  pr?: { repo: string; number: number };
  /** ISO overrides for every session's window. */
  from?: string;
  to?: string;
  notes?: string;
}

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const flag = (name: string) => process.argv.includes(name);

const root = resolve(import.meta.dir, '..');
const staging = process.env.STAGING ?? join(homedir(), '.cache', 'prbench', 'staging');
/**
 * Fills the manifest's placeholders, so it names no home directory: $HOME_SLUG
 * is the home path as Claude Code spells it in project directory names
 * (/home/u becomes -home-u), and $HOME is the home path itself, usable
 * anywhere in a string (recorded paths like /var$HOME/repo keep their prefix).
 */
export function fillPlaceholders(p: string, home = homedir()): string {
  return p.replaceAll('$HOME_SLUG', home.replaceAll('/', '-')).replaceAll('$HOME', home);
}
const expand = (p: string) => fillPlaceholders(p).replace(/^~(?=\/|$)/, homedir()).replace(/^\$STAGING(?=\/|$)/, staging);
const manifest = resolve(arg('--manifest', join(root, 'datasets', 'expansion', 'candidates.json'))!);
const out = resolve(arg('--out', join(root, 'cases-local'))!);
const only = arg('--only')?.split(',');
const withOriginal = flag('--with-original');
const report = flag('--report');

/** Extra PR-writing records: draft folders of the tools these sessions used. */
const WRITES_PR_TEXT = [/[\w.-]*\bpr\d*-body\.md\b/i, /\bvex-pr-body\.md\b/, /\bgh\s+api\b[^"]*\/pulls\b/];

const commitTime = (repo: string, ref: string) => Number(git(['show', '-s', '--format=%ct', ref], repo)) * 1000;

/** The first few user requests in a slice, for --report. */
function userRequests(jsonl: string, n = 3): string[] {
  const found: string[] = [];
  for (const line of jsonl.split('\n')) {
    if (!line || found.length >= n) continue;
    const j = JSON.parse(line);
    if (!hasUserInput(j)) continue;
    const content = j.message?.content ?? j.payload?.message ?? j.payload?.content;
    const text = typeof content === 'string' ? content : Array.isArray(content)
      ? content.map((c: any) => c?.text ?? (typeof c?.content === 'string' ? c.content : '')).join(' ') : '';
    found.push(`${j.timestamp} ${text.replace(/\s+/g, ' ').slice(0, 160)}`);
  }
  return found;
}

const { cases } = JSON.parse(readFileSync(manifest, 'utf8')) as { cases: Candidate[] };
for (const c of cases) {
  if (only && !only.includes(c.id)) continue;
  const repo = expand(c.repo);
  const final = join(out, c.id);
  // Build beside the case and swap it in only when the import succeeds, so a
  // failed rerun never leaves a half-written case behind.
  const dir = `${final}.importing`;
  try {
    const base = git(['rev-parse', '--verify', `${c.base}^{commit}`], repo);
    const head = git(['rev-parse', '--verify', `${c.head}^{commit}`], repo);
    // A rerun replaces everything the importer writes and keeps the reviewed facts.
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    for (const f of ['facts.json', 'facts-provenance.json'])
      if (existsSync(join(final, f))) copyFileSync(join(final, f), join(dir, f));

    const ref = `refs/prbench/import-${c.id}`;
    git(['update-ref', ref, head], repo);
    try {
      git(['bundle', 'create', '--quiet', join(dir, 'repo.bundle'), ref], repo);
    } finally {
      git(['update-ref', '-d', ref], repo);
    }

    const defaultFrom = c.from ? Date.parse(c.from) : commitTime(repo, base) - 60 * 60_000;
    const defaultTo = c.to ? Date.parse(c.to) : commitTime(repo, head) + 10_000;
    const sessions: CaseSession[] = [];
    const windows: string[] = [];
    for (const [i, s] of c.sessions.entries()) {
      const raw = readFileSync(expand(s.path), 'utf8');
      const ranges: [number, number][] = s.ranges
        ? s.ranges.map(([a, b]) => [Date.parse(a), Date.parse(b)])
        : [[s.from ? Date.parse(s.from) : defaultFrom, s.to ? Date.parse(s.to) : defaultTo]];
      const parts = ranges.map(([from, to]) => sliceReplaySession(raw, from, to, { writesPrText: WRITES_PR_TEXT, keep: s.keep }));
      // Session metadata is kept by every slice; keep it once.
      const seen = new Set<string>();
      const lines = parts.flatMap((p) => p.text.split('\n').filter(Boolean)).filter((l) => !seen.has(l) && !!seen.add(l));
      const sliced = { text: lines.join('\n') + '\n', kept: lines.length, cwd: parts.find((p) => p.cwd)?.cwd };
      if (sliced.kept === 0 || !sliced.cwd) throw new Error(`session ${i + 1} has no records in its window`);
      const file = s.subagentOf !== undefined ? basename(s.path) : `session-${i + 1}-${s.agent}.jsonl`;
      writeFileSync(join(dir, file), sliced.text);
      // Codex records cwd as a file URL in some turn contexts.
      const cwd = sliced.cwd.replace(/^file:\/\//, '');
      const parent = s.subagentOf !== undefined ? sessions[s.subagentOf] : undefined;
      if (s.subagentOf !== undefined && !parent) throw new Error(`session ${i + 1}: subagentOf must name an earlier session`);
      sessions.push({ agent: s.agent, file, cwd, ...(parent ? { subagentOf: parent.file } : {}) });
      windows.push(`${file}: ${ranges.map(([a, b]) => `${new Date(a).toISOString()} – ${new Date(b).toISOString()}`).join(' and ')}`);
      if (report) {
        console.log(`      ${file}: ${sliced.kept} records, ${(sliced.text.length / 1e6).toFixed(2)} MB`);
        for (const r of userRequests(sliced.text)) console.log(`        > ${r}`);
      }
    }

    let original: Case['original'];
    if (c.pr && withOriginal) {
      const r = exec(['gh', 'pr', 'view', String(c.pr.number), '--repo', c.pr.repo, '--json', 'title,body,url']);
      if (r.code !== 0) throw new Error(`gh pr view ${c.pr.repo}#${c.pr.number}: ${r.stderr.trim()}`);
      const pr = JSON.parse(r.stdout) as { title: string; body: string; url: string };
      writeFileSync(join(dir, 'original.md'), pr.body.replace(/\r\n/g, '\n'));
      original = { title: pr.title, body: 'original.md', url: pr.url };
      const subjects = git(['log', '--format=%s', `${base}..${head}`], repo).split('\n');
      for (const s of sessions)
        assertNoPublishedPrText(readFileSync(join(dir, s.file), 'utf8'), subjects.includes(pr.title) ? '' : pr.title, pr.body);
    }

    const kase: Case = {
      schema: CASE_SCHEMA,
      id: c.id,
      title: c.title,
      split: c.split,
      mode: 'replay',
      repo: {
        bundle: 'repo.bundle',
        base,
        head,
        recordedPath: fillPlaceholders(c.recordedPath),
        ...(c.recordedAliases?.length ? { recordedAliases: c.recordedAliases.map((a) => fillPlaceholders(a)) } : {}),
        baseTime: new Date(commitTime(repo, base)).toISOString(),
      },
      task: c.task ?? `Replay task label: the change that became ${c.pr ? `${c.pr.repo} PR #${c.pr.number}` : `${basename(repo, '.git')} ${head.slice(0, 7)}`}: ${c.title}.`,
      sessions,
      ...(existsSync(join(dir, 'facts.json')) ? { facts: 'facts.json' } : {}),
      ...(original ? { original } : {}),
      provenance: {
        source: `prbench case expansion (datasets/expansion/candidates.json, case ${c.id})`,
        ...(c.license ? { license: c.license } : {}),
        notes: [
          c.task ? '' : 'Task is a descriptive replay label, not a verbatim user request; original requests, where retained, are in the session logs.',
          `Sessions cut to ${windows.join('; ')}.`,
          c.notes ?? '',
          'Real session logs: keep local.',
        ].filter(Boolean).join(' '),
      },
    };
    writeFileSync(join(dir, 'case.json'), JSON.stringify(kase, null, 2) + '\n');
    rmSync(final, { recursive: true, force: true });
    renameSync(dir, final);
    const size = sessions.reduce((n, s) => n + statSync(join(final, s.file)).size, 0);
    console.log(`ok    ${c.id}: ${sessions.length} session(s), ${(size / 1e6).toFixed(1)} MB, split ${c.split}${kase.facts ? '' : ', no facts yet'}`);
  } catch (err) {
    rmSync(dir, { recursive: true, force: true });
    console.log(`FAIL  ${c.id}: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }
}
