import { afterAll, expect, test } from 'bun:test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { preflightCase } from '../src/run/preflight.ts';
import { loadCase } from '../src/schema/case.ts';
import { exec } from '../src/util/exec.ts';
import { buildProvenance, draftOf, type Draft } from '../scripts/provenance.ts';
import { scan, stripPayloads, stubRecords } from '../scripts/redact-cases.ts';
import { sessionIndex } from '../scripts/fact-packet.ts';
import { cleanupTemps, copyExample, tempDir } from './helpers.ts';
afterAll(cleanupTemps);

function bareOf(dir: string): string {
  const bare = join(tempDir(), 'repo.git');
  exec(['git', 'init', '--quiet', '--bare', bare]);
  exec(['git', '--git-dir', bare, 'fetch', '--quiet', '--no-tags', join(dir, 'repo.bundle'), '+refs/*:refs/prbench-source/*']);
  return bare;
}

test('provenance built from a draft passes preflight', () => {
  const example = copyExample('provenance-draft');
  const c = JSON.parse(readFileSync(join(example.dir, 'case.json'), 'utf8'));
  const src = (kind: string, extra = {}) => [{ kind, startLine: 1, endLine: 2, ...extra }];
  const draft = {
    claims: [{ text: 'greet() defaults its name.', rationale: 'The diff adds the default.', sources: src('diff') }],
    context: [{ text: 'The user asked for a default.', rationale: 'First request.', sources: src('session', { path: c.sessions[0].file }) }],
    uncertainties: [{ text: 'Tests on head are not shown.', rationale: 'Commit only.', sources: src('commit', { revision: c.repo.head }) }],
    traps: [{ text: 'Claiming a CLI flag was added.', rationale: 'Head file has no flag.', sources: src('git', { revision: c.repo.head, path: 'greet.js' }) }],
  } as unknown as Draft;
  const files = exec(['git', '--git-dir', bareOf(example.dir), 'ls-tree', '--name-only', c.repo.head]).stdout.split('\n').filter(Boolean);
  draft.traps[0]!.sources[0]!.path = files[0]!;
  const { facts, provenance } = buildProvenance(example.dir, draft, { bare: bareOf(example.dir), reviewedBy: 'test', reviewKind: 'automated' });
  writeFileSync(join(example.dir, 'facts.json'), JSON.stringify(facts, null, 2) + '\n');
  writeFileSync(join(example.dir, 'facts-provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
  const report = preflightCase(loadCase(example.dir), { cache: tempDir(), requireProvenance: true });
  expect(report.checkedFacts).toBe(4);
});

test('provenance rejects ranges past the end of a source', () => {
  const example = copyExample('provenance-range');
  const draft = { claims: [{ text: 'x', rationale: 'y', sources: [{ kind: 'diff', startLine: 1, endLine: 100000 }] }] } as unknown as Draft;
  expect(() => buildProvenance(example.dir, draft, { bare: bareOf(example.dir), reviewedBy: 't', reviewKind: 'automated' })).toThrow(/outside diff/);
});

test('the redaction scan flags secrets and skips opaque base64 blobs', () => {
  const blob = 'A'.repeat(300);
  const hits = scan(JSON.stringify({ a: 'NEO4J_PASSWORD=hunter2hunter2', b: 'ghp_' + 'x'.repeat(36), encrypted_content: blob + 'sk-ant-abcdefghijk' }));
  expect([...hits.keys()].sort()).toEqual(['github-token', 'password-assignment']);
});

test('session index reads new-format Codex exec calls and patches with their JSONL lines', () => {
  const rec = (payload: unknown) => JSON.stringify({ timestamp: '2026-09-02T13:22:27Z', type: 'response_item', payload });
  const jsonl = [
    rec({ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Fix Maven on Bazzite' }] }),
    rec({ type: 'custom_tool_call', name: 'exec', input: 'const r = await tools.exec_command({"cmd":"bun test","workdir":"/w"})' }),
    rec({ type: 'custom_tool_call', name: 'exec', input: 'const patch = "*** Begin Patch\\n*** Update File: /w/src/a.ts\\n@@"' }),
  ].join('\n');
  const index = sessionIndex(jsonl);
  expect(index[0]).toMatch(/^L1 .* USER: Fix Maven on Bazzite$/);
  expect(index[1]).toMatch(/^L2 .* TOOL exec: bun test$/);
  expect(index[2]).toMatch(/^L3 .* EDIT apply_patch: \/w\/src\/a\.ts$/);
});

test('stubbing keeps every record on its line and also stubs the results of stubbed calls', () => {
  const lines = [
    { type: 'user', uuid: 'u1', cwd: '/private/repo', message: { role: 'user', content: 'Port the probe' } },
    { type: 'assistant', uuid: 'a1', message: { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'cd /private/repo; cat src/probe.rs' } }] } },
    { type: 'user', uuid: 'u2', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'fn secret_protocol() {}' }] }, toolUseResult: { stdout: 'fn secret_protocol() {}' } },
    { type: 'response_item', payload: { type: 'function_call', call_id: 'c1', name: 'exec', arguments: '{"cmd":"cat /private/repo/x"}' } },
    { type: 'response_item', payload: { type: 'function_call_output', call_id: 'c1', output: 'private bytes' } },
    { type: 'assistant', uuid: 'a2', message: { role: 'assistant', content: [{ type: 'text', text: 'Done in the public tree.' }] } },
  ].map((r) => JSON.stringify(r));
  const { text, stubbed } = stubRecords(lines.join('\n'), [{ re: /\/private\/repo/, why: 'private code' }]);
  const out = text.split('\n');
  expect(out).toHaveLength(lines.length);
  // The user record matches only through its cwd, which is metadata.
  expect(out[0]).toBe(lines[0]);
  expect(stubbed).toBe(4);
  expect(text).not.toContain('secret_protocol');
  expect(text).not.toContain('private bytes');
  const result = JSON.parse(out[2]!);
  expect(result.uuid).toBe('u2');
  expect(result.message.content[0]).toEqual({ type: 'tool_result', tool_use_id: 't1', content: '[omitted: private code]' });
  expect(JSON.parse(out[4]!).payload.call_id).toBe('c1');
  expect(out[5]).toBe(lines[5]);
});

test('content detectors ignore metadata paths', () => {
  const rec = JSON.stringify({ type: 'attachment', attachment: { type: 'environment', snapshot: { workingDirectory: '/x/private/repo' } } });
  const read = JSON.stringify({ type: 'user', cwd: '/x/private/repo', message: { content: 'see /x/private/repo/src' } });
  const hits = scan(`${rec}\n${read}`, [['private-repo', /private\/repo\/src/g]]);
  expect([...(hits.get('private-repo')?.keys() ?? [])]).toEqual(['private/repo/src']);
  expect(scan(rec, [['private-repo', /private\/repo/g]]).size).toBe(0);
});

test('provenance rehashed after a session is stubbed in place still passes preflight', () => {
  const example = copyExample('provenance-rehash');
  const c = JSON.parse(readFileSync(join(example.dir, 'case.json'), 'utf8'));
  const file = c.sessions[0].file;
  const draft = {
    claims: [{ text: 'greet() defaults its name.', rationale: 'The diff adds the default.', sources: [{ kind: 'diff', startLine: 1, endLine: 2 }] }],
    context: [{ text: 'The user asked for a default.', rationale: 'First request.', sources: [{ kind: 'session', path: file, startLine: 1, endLine: 2 }] }],
    uncertainties: [], traps: [],
  } as unknown as Draft;
  const bare = bareOf(example.dir);
  const first = buildProvenance(example.dir, draft, { bare, reviewedBy: 'test', reviewKind: 'automated' });
  writeFileSync(join(example.dir, 'facts.json'), JSON.stringify(first.facts, null, 2) + '\n');
  const path = join(example.dir, file);
  const before = readFileSync(path, 'utf8');
  const { text, stubbed } = stubRecords(before, [{ re: /./, why: 'test' }]);
  expect(stubbed).toBeGreaterThan(0);
  expect(text.split('\n')).toHaveLength(before.split('\n').length);
  writeFileSync(path, text);
  const again = buildProvenance(example.dir, draftOf(first.facts, first.provenance), { bare, reviewedBy: 'test', reviewKind: 'automated', reviewedAt: first.provenance.reviewedAt });
  expect(again.provenance.entries.X1!.sources[0]!.sha256).not.toBe(first.provenance.entries.X1!.sources[0]!.sha256);
  writeFileSync(join(example.dir, 'facts-provenance.json'), JSON.stringify(again.provenance, null, 2) + '\n');
  expect(preflightCase(loadCase(example.dir), { cache: tempDir(), requireProvenance: true }).checkedFacts).toBe(2);
});

test('payload stripping blanks images, encrypted reasoning and signatures, leaving other lines byte for byte', () => {
  const img = 'iVBOR' + 'A'.repeat(400);
  const lines = [
    '{"type":"assistant","message":{"content":[{"type":"thinking","thinking":"hm","signature":"EqABCD"}]}}',
    JSON.stringify({ type: 'user', message: { content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: img } }] } }),
    JSON.stringify({ type: 'response_item', payload: { type: 'reasoning', encrypted_content: 'gAAAA' + 'B'.repeat(50) } }),
    '{"type":"user", "message":{"content":"keep my spacing"}}',
  ];
  const { text, changed } = stripPayloads(lines.join('\n'));
  const out = text.split('\n');
  expect(changed).toBe(3);
  expect(JSON.parse(out[0]!).message.content[0]).toEqual({ type: 'thinking', thinking: 'hm', signature: '' });
  expect(JSON.parse(out[1]!).message.content[0].source).toEqual({ type: 'base64', media_type: 'image/png', data: '' });
  expect(JSON.parse(out[2]!).payload.encrypted_content).toBe('');
  expect(out[3]).toBe(lines[3]);
});

test('the Windows user detector sees through JSON escaping', () => {
  const hits = scan(JSON.stringify({ a: JSON.stringify({ p: 'C:\\Users\\alice\\x' }) }));
  expect([...(hits.get('windows-user')?.keys() ?? [])][0]).toMatch(/alice$/);
});
