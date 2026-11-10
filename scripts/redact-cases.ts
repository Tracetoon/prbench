// Scans imported cases for secrets and personal data, and applies reviewed replacements.
//
//   bun run scripts/redact-cases.ts [--cases cases-local] [--only a,b] [--rules <file>] [--apply]
//
// Every hit is reported per case and rule. A hit passes only when a rule in
// the rules file covers it: `replace` rewrites it (with --apply), `allow`
// records that it was reviewed and may stay (a test-fixture token, say).
// Without --apply nothing is written; the exit status is 1 while any hit is
// neither replaced nor allowed, so imports fail closed.
//
// With --apply, embedded payloads (inline images, encrypted reasoning, provider
// signatures) are also blanked in session logs, and `replace` rules are applied
// to case.json and facts.json too, so a rewritten home path stays consistent with
// the case's recordedPath and session cwds.
//
// Rules file (JSON, keep it out of git when it names real people or private repos):
//   { "replace":     [{ "pattern": "regex", "with": "text", "cases"?: ["id"] }],
//     "allow":       [{ "pattern": "regex", "why": "text", "cases"?: ["id"] }],
//     "detectors":   [{ "name": "private-repo", "pattern": "regex" }],
//     "dropRecords": [{ "pattern": "regex", "why": "text", "cases"?: ["id"], "keep"?: ["record uuid"] }] }
//
// `detectors` adds case-specific detectors (a private repository's paths, say)
// that match only a record's content, not its metadata such as cwd.
// `dropRecords` stubs whole records whose content matches (see stubRecord),
// and the results of any tool call it stubs, keeping each record on its line
// (`keep` lists records reviewed as safe to leave, which content detectors skip too)
// so facts-provenance.json line ranges still point at the same records. Rehash
// provenance afterwards: `bun run scripts/provenance.ts --case <dir> --rehash`.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

interface Rule { pattern: string; with?: string; why?: string; cases?: string[]; keep?: string[] }
interface Detector { name: string; pattern: string }
export interface Rules { replace?: Rule[]; allow?: Rule[]; detectors?: Detector[]; dropRecords?: Rule[] }

/** What a reviewer must look at. Deliberately broad: false positives are cheap here. */
export const DETECTORS: [name: string, re: RegExp][] = [
  ['anthropic-key', /sk-ant-[A-Za-z0-9_-]{8,}/g],
  ['openai-key', /\bsk-(?:proj-)?[A-Za-z0-9]{20,}/g],
  ['github-token', /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{16,}/g],
  ['aws-key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['private-key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
  ['password-assignment', /\b[A-Z0-9_]*(?:PASSWORD|PASSWD|SECRET|TOKEN|API_KEY)\b\s*[=:]\s*["']?[^\s"'$<>{}]{6,}/g],
  ['neo4j-uri', /neo4j(?:\+s|\+ssc)?:\/\/[^\s"'\\]+/g],
  ['email', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g],
  ['windows-user', /C:(?:\\+|\/)Users(?:\\+|\/)[A-Za-z0-9._-]+/g],
  ['ssh-config', /\bssh\s+(?:-\S+\s+)*[A-Za-z0-9._-]+@[A-Za-z0-9._-]+/g],
  ['credentials-file', /\.credentials\.json|\.netrc|id_(?:rsa|ed25519)\b/g],
];

/** Encrypted reasoning blobs and inline images are opaque base64, where any detector match is noise. */
const OPAQUE = /"(?:encrypted_content|data)"\s*:\s*"[A-Za-z0-9+/=_-]{200,}"/g;

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

/** Detector hits by detector and value. `contentDetectors` see only record content (contentText). */
export function scan(text: string, contentDetectors: [name: string, re: RegExp][] = [], keep: string[] = []): Map<string, Map<string, number>> {
  const hits = new Map<string, Map<string, number>>();
  const count = (name: string, re: RegExp, visible: string) => {
    for (const m of visible.matchAll(re)) {
      const byValue = hits.get(name) ?? new Map<string, number>();
      byValue.set(m[0], (byValue.get(m[0]) ?? 0) + 1);
      hits.set(name, byValue);
    }
  };
  const visible = text.replace(OPAQUE, '""');
  for (const [name, re] of DETECTORS) count(name, re, visible);
  if (contentDetectors.length) {
    const kept = (line: string) => keep.length > 0 && keep.some((uuid) => line.includes(`"uuid":"${uuid}"`));
    const content = text.split('\n').map((l) => (kept(l) ? '' : contentText(l))).join('\n').replace(OPAQUE, '""');
    for (const [name, re] of contentDetectors) count(name, re, content);
  }
  return hits;
}

/** Metadata that names where work ran, not what it read or said. */
const METADATA_KEYS = new Set(['cwd', 'live_cwd', 'workingDirectory', 'root', 'realParentDir', 'gitBranch']);
/** Keys a stub keeps so tools still pair calls with results and order records. */
const STRUCTURAL_KEYS = new Set([
  'type', 'id', 'uuid', 'parentUuid', 'tool_use_id', 'call_id', 'name', 'role', 'timestamp', 'sessionId', 'session_id',
  'cwd', 'is_error', 'isSidechain', 'userType', 'entrypoint', 'version', 'gitBranch', 'model', 'stop_reason',
]);

/** The parts of a session record that carry what an agent read, ran or said. */
export function contentParts(record: any): unknown[] {
  switch (record?.type) {
    case 'user':
    case 'assistant':
      return [record.message, record.toolUseResult];
    case 'attachment':
      return record.attachment?.type === 'environment' ? [] : [record.attachment];
    case 'api-request':
    case 'session_meta':
    case 'turn_context':
      return [];
    case 'response_item':
    case 'event_msg':
      return [record.payload];
    default:
      return [record];
  }
}

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) if (!METADATA_KEYS.has(k)) strings(v, out);
  return out;
}

/** A record's content as text, one string per line; metadata such as cwd is left out. */
export function contentText(line: string): string {
  try {
    return strings(contentParts(JSON.parse(line))).join('\n');
  } catch {
    return line;
  }
}

function blank(value: unknown, marker: string, key?: string): unknown {
  if (typeof value === 'string') return key && STRUCTURAL_KEYS.has(key) ? value : marker;
  if (Array.isArray(value)) return value.map((v) => blank(v, marker));
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, blank(v, marker, k)]));
  return value;
}

/** Replaces a record's content with a marker, keeping its ids, type and place. */
export function stubRecord(record: any, why: string): any {
  const marker = `[omitted: ${why}]`;
  const out = { ...record };
  switch (record.type) {
    case 'user':
    case 'assistant':
      if (record.message) out.message = blank(record.message, marker);
      if ('toolUseResult' in record) out.toolUseResult = blank(record.toolUseResult, marker);
      return out;
    case 'attachment':
      out.attachment = blank(record.attachment, marker);
      return out;
    case 'response_item':
    case 'event_msg':
      out.payload = blank(record.payload, marker);
      return out;
    default:
      return blank(record, marker);
  }
}

const callIds = (record: any): string[] => [
  ...(Array.isArray(record?.message?.content) ? record.message.content.filter((c: any) => c?.type === 'tool_use').map((c: any) => c.id) : []),
  ...(record?.type === 'response_item' && /_call$/.test(record.payload?.type ?? '') && record.payload.call_id ? [record.payload.call_id] : []),
];
const resultIds = (record: any): string[] => [
  ...(Array.isArray(record?.message?.content) ? record.message.content.filter((c: any) => c?.type === 'tool_result').map((c: any) => c.tool_use_id) : []),
  ...(record?.type === 'response_item' && /_output$/.test(record.payload?.type ?? '') && record.payload.call_id ? [record.payload.call_id] : []),
];

/** Stubs every record whose content matches a rule, and the results of the calls it stubs. */
export function stubRecords(jsonl: string, rules: { re: RegExp; why: string; keep?: string[] }[]): { text: string; stubbed: number } {
  const lines = jsonl.split('\n');
  const dropped = new Map<string, string>();
  let stubbed = 0;
  const out = lines.map((line) => {
    if (!line.trim()) return line;
    const content = contentText(line);
    let record: any;
    try {
      record = JSON.parse(line);
    } catch {
      return line;
    }
    const rule = rules.find((r) => !r.keep?.includes(record.uuid) && r.re.test(content));
    const why = rule?.why ?? resultIds(record).map((id) => dropped.get(id)).find(Boolean);
    if (!why) return line;
    for (const id of callIds(record)) dropped.set(id, why);
    stubbed++;
    return JSON.stringify(stubRecord(record, why));
  });
  return { text: out.join('\n'), stubbed };
}

const applies = (r: { cases?: string[] }, id: string) => !r.cases || r.cases.includes(id);

const PAYLOAD_KEYS = new Set(['signature', 'encrypted_content']);
const PAYLOAD = /^(?:data:[\w/+.-]*(?:;[\w=-]+)*,)?[A-Za-z0-9+/=_-]{200,}$/;

function blankPayloads(value: unknown, key?: string): unknown {
  if (typeof value === 'string') return value && (PAYLOAD_KEYS.has(key ?? '') || PAYLOAD.test(value)) ? '' : value;
  if (Array.isArray(value)) return value.map((v) => blankPayloads(v));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, blankPayloads(v, k)]));
  return value;
}

/** Blanks inline images, encrypted reasoning and signatures; other lines are left byte for byte. */
export function stripPayloads(jsonl: string): { text: string; changed: number } {
  let changed = 0;
  const text = jsonl
    .split('\n')
    .map((line) => {
      if (!line.trim()) return line;
      let record: unknown;
      try {
        record = JSON.parse(line);
      } catch {
        return line;
      }
      const out = JSON.stringify(blankPayloads(record));
      if (out === JSON.stringify(record)) return line;
      changed++;
      return out;
    })
    .join('\n');
  return { text, changed };
}

if (import.meta.main) {
  const cases = resolve(arg('--cases', 'cases-local')!);
  const only = arg('--only')?.split(',');
  const rulesFile = arg('--rules', join(cases, 'redaction-rules.json'))!;
  const rules: Rules = existsSync(rulesFile) ? JSON.parse(readFileSync(rulesFile, 'utf8')) : {};
  const apply = process.argv.includes('--apply');
  const contentDetectors: [string, RegExp][] = (rules.detectors ?? []).map((d) => [d.name, new RegExp(d.pattern, 'g')]);
  let open = 0;
  for (const id of readdirSync(cases).sort()) {
    const dir = join(cases, id);
    if (!existsSync(join(dir, 'case.json')) || (only && !only.includes(id))) continue;
    if (apply)
      for (const meta of ['case.json', 'facts.json']) {
        const path = join(dir, meta);
        if (!existsSync(path)) continue;
        const text = readFileSync(path, 'utf8');
        let changed = text;
        for (const r of (rules.replace ?? []).filter((r) => applies(r, id))) changed = changed.replace(new RegExp(r.pattern, 'g'), r.with ?? '[redacted]');
        if (changed !== text) {
          JSON.parse(changed);
          writeFileSync(path, changed);
          console.log(`${id}/${meta}\trewritten by replace rules`);
        }
      }
    const kase = JSON.parse(readFileSync(join(dir, 'case.json'), 'utf8'));
    const files: string[] = [...(kase.sessions ?? []).map((s: { file: string }) => s.file), ...(kase.original ? [kase.original.body] : [])];
    for (const file of files) {
      const path = join(dir, file);
      let text = readFileSync(path, 'utf8');
      if (apply) {
        let changed = text;
        for (const r of (rules.replace ?? []).filter((r) => applies(r, id))) changed = changed.replace(new RegExp(r.pattern, 'g'), r.with ?? '[redacted]');
        const drops = (rules.dropRecords ?? []).filter((r) => applies(r, id)).map((r) => ({ re: new RegExp(r.pattern), why: r.why ?? 'not part of this release', keep: r.keep }));
        if (file.endsWith('.jsonl')) {
          const { text: stripped, changed: n } = stripPayloads(changed);
          if (n) console.log(`${id}/${file}\tblanked payloads in ${n} record(s)`);
          changed = stripped;
        }
        if (drops.length && file.endsWith('.jsonl')) {
          const { text: stubbed, stubbed: n } = stubRecords(changed, drops);
          if (n) console.log(`${id}/${file}\tstubbed ${n} record(s)`);
          changed = stubbed;
        }
        if (changed !== text) writeFileSync(path, (text = changed));
      }
      const keep = (rules.dropRecords ?? []).filter((r) => applies(r, id)).flatMap((r) => r.keep ?? []);
      for (const [name, values] of scan(text, contentDetectors, keep)) {
        for (const [value, n] of values) {
          const covered = [...(rules.replace ?? []), ...(rules.allow ?? [])].some((r) => applies(r, id) && new RegExp(r.pattern).test(value));
          if (covered) continue;
          open++;
          console.log(`${id}/${file}\t${name}\t${n}×\t${value.slice(0, 100)}`);
        }
      }
    }
  }
  console.log(open ? `${open} unreviewed hit(s)` : 'no unreviewed hits');
  if (open) process.exitCode = 1;
}
