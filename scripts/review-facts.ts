// Writes a page per case for a person reviewing its fact sheet.
//
//   bun run scripts/review-facts.ts [--cases cases-local] [--out results/fact-review] [--only a,b]
//
// Each fact is shown with its rationale and the lines it cites, read the way
// preflight reads them, with a checkbox and a notes line. Session lines are
// shown through the fact-packet index (scripts/fact-packet.ts) rather than as
// raw JSONL. The pages live under results/ (git-ignored) because they quote
// real session logs.
//
// After review, edit the case's draft (results/fact-packets/<id>/facts.draft.json,
// or rebuild one from facts.json with --write-drafts) and record the review:
//   bun run scripts/provenance.ts --case cases-local/<id> --draft <draft>
//        --review-kind human --reviewed-by "<name>"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { FactProvenance } from '../src/run/preflight.ts';
import { exec } from '../src/util/exec.ts';
import { sessionIndex } from './fact-packet.ts';
import { draftOf, sourceContent, type DraftSource } from './provenance.ts';

const SECTIONS = [['claims', 'C', 'Claims'], ['context', 'X', 'Context'], ['uncertainties', 'U', 'Uncertainties'], ['traps', 'T', 'Traps']] as const;
const MAX_LINES = 40;

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const fence = (text: string) => {
  const ticks = '`'.repeat(Math.max(3, ...[...text.matchAll(/`+/g)].map((m) => m[0].length + 1)));
  return `${ticks}\n${text}\n${ticks}`;
};

/** The cited lines of one source, as a reviewer should read them. */
export function excerpt(content: string, s: DraftSource): string {
  const all = content.split(/\r?\n/);
  if (s.kind === 'session') {
    // Index entries start with their JSONL line; keep the ones in range.
    const entries = sessionIndex(content).filter((e) => {
      const n = Number(/^L(\d+)/.exec(e)?.[1]);
      return n >= s.startLine && n <= s.endLine;
    });
    const stubbed = all.slice(s.startLine - 1, s.endLine).filter((l) => l.includes('[omitted: ')).length;
    const shown = entries.length > MAX_LINES ? [...entries.slice(0, MAX_LINES), `… ${entries.length - MAX_LINES} more entries`] : entries;
    return (stubbed ? `> ${stubbed} cited record(s) were stubbed by redaction.\n\n` : '') + fence(shown.join('\n') || '(no indexed entries in range: metadata records only)');
  }
  const lines = all.slice(s.startLine - 1, s.endLine);
  const shown = lines.length > MAX_LINES ? [...lines.slice(0, MAX_LINES), `… ${lines.length - MAX_LINES} more lines`] : lines;
  return fence(shown.join('\n'));
}

const label = (s: DraftSource) =>
  s.kind === 'diff' ? 'diff' : s.kind === 'commit' ? `commit ${s.revision?.slice(0, 10)}` : s.kind === 'git' ? `${s.path} at ${s.revision?.slice(0, 10)}` : s.path;

if (import.meta.main) {
  const cases = resolve(arg('--cases', 'cases-local')!);
  const outRoot = resolve(arg('--out', 'results/fact-review')!);
  const only = arg('--only')?.split(',');
  const writeDrafts = process.argv.includes('--write-drafts');
  mkdirSync(outRoot, { recursive: true });
  const index: string[] = [];
  for (const id of readdirSync(cases).sort()) {
    const dir = join(cases, id);
    if (!existsSync(join(dir, 'case.json')) || !existsSync(join(dir, 'facts-provenance.json')) || (only && !only.includes(id))) continue;
    const c = JSON.parse(readFileSync(join(dir, 'case.json'), 'utf8'));
    const facts = JSON.parse(readFileSync(join(dir, 'facts.json'), 'utf8'));
    const provenance = JSON.parse(readFileSync(join(dir, 'facts-provenance.json'), 'utf8')) as FactProvenance & { reviewKind?: string };
    const bare = mkdtempSync(join(tmpdir(), 'prbench-review-'));
    try {
      exec(['git', 'init', '--quiet', '--bare', bare]);
      const r = exec(['git', '--git-dir', bare, 'fetch', '--quiet', '--no-tags', join(dir, c.repo.bundle), '+refs/*:refs/prbench-source/*']);
      if (r.code) throw new Error(`${id}: ${r.stderr}`);
      const cache = new Map<string, string>();
      const read = (s: DraftSource) => {
        const key = JSON.stringify([s.kind, s.path, s.revision]);
        if (!cache.has(key)) cache.set(key, sourceContent(dir, bare, s));
        return cache.get(key)!;
      };
      const out = [
        `# Fact review: ${id}`,
        '',
        `- Title: ${c.title}`,
        `- Split: ${c.split}; base ${c.repo.base.slice(0, 10)}, head ${c.repo.head.slice(0, 10)}`,
        `- Current review: ${provenance.reviewKind ?? 'automated'} by ${provenance.reviewedBy} at ${provenance.reviewedAt}`,
        `- Fact packet (diff, commits, session indexes): results/fact-packets/${id}/`,
        '',
        'For each fact, check that the cited lines support it, that it is not contradicted elsewhere, and that it is worth judging.',
        'Mark **ok**, or note the fix (reword, re-source, drop). Traps are statements a draft must NOT make.',
        '',
      ];
      let n = 0;
      for (const [section, prefix, title] of SECTIONS) {
        out.push(`## ${title}`, '');
        (facts[section] as string[]).forEach((text, i) => {
          const fid = `${prefix}${i + 1}`;
          const e = provenance.entries[fid]!;
          n++;
          out.push(`### ${fid}`, '', `> ${text}`, '', `**Rationale:** ${e.rationale}`, '');
          for (const s of e.sources) out.push(`**Source:** ${label(s)}, lines ${s.startLine}-${s.endLine}`, '', excerpt(read(s), s), '');
          out.push('- [ ] ok', '- Notes: ', '');
        });
      }
      writeFileSync(join(outRoot, `${id}.md`), out.join('\n'));
      if (writeDrafts) {
        const packet = join('results', 'fact-packets', id);
        mkdirSync(packet, { recursive: true });
        writeFileSync(join(packet, 'facts.draft.json'), JSON.stringify(draftOf(facts, provenance), null, 2) + '\n');
      }
      index.push(`- [ ] [${id}](${id}.md): ${n} facts (${c.split})`);
      console.log(`ok    ${id}: ${n} facts`);
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  }
  writeFileSync(
    join(outRoot, 'README.md'),
    ['# Fact review', '', 'One page per case. Tick a case when every fact on its page is ok or fixed and its provenance is rebuilt with `--review-kind human`.', '', ...index, ''].join('\n'),
  );
}
