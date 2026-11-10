// Builds the packet a fact-sheet author works from, for each imported case.
//
//   bun run scripts/fact-packet.ts [--cases cases-local] [--out results/fact-packets] [--only a,b]
//
// The packet holds only the change and the work that made it, never a
// published PR description, so facts don't inherit that description's framing
// (docs/cases.md). Line numbers match what preflight hashes for provenance:
//
//   diff.patch        `git diff --no-ext-diff <base> <head>`: cite as kind "diff"
//   commits/<sha>.txt `git show --no-patch --format=fuller <sha>`: kind "commit"
//   <session>.md      a readable index of a session; each entry starts with the
//                     JSONL line it came from: cite the JSONL as kind "session"
//   repo.git          a bare clone of the bundle, for `git show <rev>:<path>`
//                     at base or head: kind "git"
//
// Packets live outside the case directories (results/ is git-ignored) so
// nothing in them can reach a writer.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { hasUserInput } from '../src/import/session.ts';
import { exec } from '../src/util/exec.ts';

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const clip = (s: string, n: number) => {
  const one = s.replace(/\s+/g, ' ').trim();
  return one.length > n ? `${one.slice(0, n)} …[${one.length - n} more chars]` : one;
};
const isObject = (x: unknown): x is Record<string, any> => !!x && typeof x === 'object' && !Array.isArray(x);
const textOf = (content: unknown): string =>
  typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content
          .map((c) => (isObject(c) ? (typeof c.text === 'string' ? c.text : typeof c.content === 'string' ? c.content : Array.isArray(c.content) ? textOf(c.content) : '') : ''))
          .join('\n')
      : '';

/** Files a Codex apply_patch touches, from the patch text. */
const patchFiles = (patch: string) => [...patch.matchAll(/\*\*\* (?:Add|Update|Delete) File: ([^\n\\]+)/g)].map((m) => m[1]!.trim());

/** One line per meaningful record: requests, answers, commands, edits and their outcomes. */
export function sessionIndex(jsonl: string): string[] {
  const out: string[] = [];
  jsonl.split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    let j: any;
    try {
      j = JSON.parse(line);
    } catch {
      return;
    }
    const at = `L${i + 1} ${String(j.timestamp ?? '').slice(0, 19)}`;
    const push = (kind: string, text: string, n = 400) => text.trim() && out.push(`${at} ${kind}: ${clip(text, n)}`);
    if (hasUserInput(j)) {
      const content = j.message?.content ?? j.payload?.content ?? j.payload?.message;
      return push('USER', textOf(content), 4000);
    }
    // Claude Code
    if (j.type === 'assistant' && Array.isArray(j.message?.content)) {
      for (const c of j.message.content) {
        if (c.type === 'text') push('ASSISTANT', c.text, 1200);
        else if (c.type === 'tool_use') {
          const inp = c.input ?? {};
          if (inp.command) push(`TOOL ${c.name}`, inp.command, 500);
          else if (inp.file_path) push(`EDIT ${c.name}`, inp.file_path);
          else if (inp.prompt) push(`TOOL ${c.name}`, `${inp.description ?? ''}: ${inp.prompt}`, 1500);
          else push(`TOOL ${c.name}`, JSON.stringify(inp), 300);
        }
      }
      return;
    }
    if (j.type === 'user' && Array.isArray(j.message?.content)) {
      for (const c of j.message.content)
        if (c.type === 'tool_result') push(c.is_error ? 'RESULT(error)' : 'RESULT', textOf(c.content) || String(c.content ?? ''), 300);
      return;
    }
    // Codex
    const p = j.payload;
    if (j.type !== 'response_item' || !isObject(p)) return;
    if (p.type === 'message' && p.role === 'assistant') return push('ASSISTANT', textOf(p.content), 1200);
    if (p.type === 'function_call' || p.type === 'custom_tool_call') {
      const input = String(p.input ?? p.arguments ?? '');
      const files = patchFiles(input.replace(/\\n/g, '\n'));
      if (files.length) push('EDIT apply_patch', files.join(', '));
      const cmds = [...input.matchAll(/"(?:cmd|command)\\?"\s*:\s*\\?"((?:[^"\\]|\\.)*)/g)].map((m) => m[1]!.replace(/\\\\n|\\n/g, '\n'));
      if (cmds.length) for (const cmd of cmds) push(`TOOL ${p.name}`, cmd, 500);
      else if (!files.length) push(`TOOL ${p.name}`, input, 300);
      return;
    }
    if (p.type === 'function_call_output' || p.type === 'custom_tool_call_output') {
      const o = p.output;
      return push('RESULT', typeof o === 'string' ? (() => { try { return textOf(JSON.parse(o)) || o; } catch { return o; } })() : textOf(o), 300);
    }
  });
  return out;
}

if (import.meta.main) {
  const cases = resolve(arg('--cases', 'cases-local')!);
  const outRoot = resolve(arg('--out', 'results/fact-packets')!);
  const only = arg('--only')?.split(',');
  for (const id of readdirSync(cases).sort()) {
    const dir = join(cases, id);
    if (!existsSync(join(dir, 'case.json')) || (only && !only.includes(id))) continue;
    const c = JSON.parse(readFileSync(join(dir, 'case.json'), 'utf8'));
    const out = join(outRoot, id);
    // Rebuilding keeps an author's draft.
    const draftFile = join(out, 'facts.draft.json');
    const draft = existsSync(draftFile) ? readFileSync(draftFile) : undefined;
    rmSync(out, { recursive: true, force: true });
    mkdirSync(join(out, 'commits'), { recursive: true });
    if (draft) writeFileSync(draftFile, draft);
    const bare = join(out, 'repo.git');
    const run = (args: string[]) => {
      const r = exec(['git', ...args]);
      if (r.code) throw new Error(`${id}: git ${args.join(' ')}: ${r.stderr}`);
      return r.stdout;
    };
    run(['init', '--quiet', '--bare', bare]);
    run(['--git-dir', bare, 'fetch', '--quiet', '--no-tags', join(dir, c.repo.bundle), '+refs/*:refs/prbench-source/*']);
    const g = (args: string[]) => run(['-c', 'core.fsmonitor=false', '--git-dir', bare, ...args]);
    writeFileSync(join(out, 'diff.patch'), g(['diff', '--no-ext-diff', c.repo.base, c.repo.head]));
    writeFileSync(join(out, 'diffstat.txt'), g(['diff', '--stat=160', c.repo.base, c.repo.head]));
    const shas = g(['rev-list', '--reverse', `${c.repo.base}..${c.repo.head}`]).split('\n').filter(Boolean);
    for (const sha of shas) writeFileSync(join(out, 'commits', `${sha}.txt`), g(['show', '--no-patch', '--format=fuller', sha]));
    const indexes: string[] = [];
    for (const s of c.sessions) {
      const lines = sessionIndex(readFileSync(join(dir, s.file), 'utf8'));
      const name = `${s.file.replace(/\.jsonl$/, '')}.md`;
      writeFileSync(join(out, name), `# ${s.file} (${s.agent}${s.subagentOf ? `, subagent of ${s.subagentOf}` : ''})\n\nEach entry starts with its line in cases-local/${id}/${s.file}.\n\n${lines.join('\n')}\n`);
      indexes.push(`- ${name}: index of ${s.file} (${lines.length} entries)`);
    }
    writeFileSync(
      join(out, 'README.md'),
      [
        `# Fact packet: ${id}`,
        '',
        `- Title (case label): ${c.title}`,
        `- Repository bundle: cases-local/${id}/${c.repo.bundle}; bare clone here: repo.git`,
        `- Base: ${c.repo.base}`,
        `- Head: ${c.repo.head}`,
        `- Commits (${shas.length}): ${shas.map((s) => s.slice(0, 10)).join(', ')}`,
        `- Session window: ${c.provenance.notes ?? ''}`,
        '',
        '## Files',
        '- diff.patch: the whole change (kind "diff"); diffstat.txt: its summary',
        '- commits/<sha>.txt: commit metadata and messages (kind "commit")',
        ...indexes,
        `- Raw sessions (kind "session"): ${c.sessions.map((s: { file: string }) => `cases-local/${id}/${s.file}`).join(', ')}`,
        '- Files at base or head (kind "git"): `git --git-dir repo.git show <base|head>:<path>`',
        '',
      ].join('\n'),
    );
    console.log(`ok    ${id}: ${shas.length} commit(s), ${c.sessions.length} session index(es)`);
  }
}
