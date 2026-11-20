// Assembles a dataset release tree from one or more case libraries and
// fingerprints it for the publication record that scripts/package-dataset.ts checks.
//
//   bun run scripts/stage-release.ts --version 2.0.0 --out results/release-2.0.0/cases
//        --from ~/.cache/prbench/datasets/real-cases/1.0.0 --from cases-local
//        --record cases-local/publication-2.0.0.json --reviewed-by "<who>"
//        [--consent-confirmed] [--note "<consent and review notes>"] [--splits <file>]
//
// Each --from is a case library with its own preparation.json; later sources
// win on a case id clash (refused unless --replace). The tree gets every case
// directory, a merged preparation.json with its fixture bundles, LICENSE (from
// the first source that has one), DATASET_CARD.md from datasets/, and a
// generated MANIFEST.md and NOTICE.md.
//
// --splits <file> reassigns splits in the staged copies, from a release entry's
// cases.dev and cases.test (a registry entry, or a draft such as
// datasets/real-cases-3.0.0.draft.json under "release"); every staged case
// must be listed, and every listed case staged. Sources are never edited.
//
// The record lists every case and the SHA-256 of each input the packager
// reads. publicRedistribution stays false until --consent-confirmed: set it
// only when the owners' consent and the privacy review are actually recorded.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { caseDirs, loadCase } from '../src/schema/case.ts';

const args = process.argv.slice(2);
const all = (name: string) => args.flatMap((a, i) => (a === name ? [args[i + 1]!] : []));
const one = (name: string, fallback?: string) => all(name)[0] ?? fallback;
const expand = (p: string) => resolve(p.replace(/^~(?=\/|$)/, homedir()));

const version = one('--version');
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) throw new Error('--version x.y.z is required');
const id = one('--id', 'real-cases')!;
const sources = all('--from').map(expand);
if (!sources.length) throw new Error('at least one --from is required');
const out = expand(one('--out', `results/release-${version}/cases`)!);
if (existsSync(out) && readdirSync(out).length) throw new Error(`${out} is not empty`);
mkdirSync(out, { recursive: true });

const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const preparation: { cases: Record<string, any> } = { cases: {} };
const origin = new Map<string, string>();
for (const src of sources) {
  const prep = existsSync(join(src, 'preparation.json')) ? JSON.parse(readFileSync(join(src, 'preparation.json'), 'utf8')) : { cases: {} };
  for (const dir of caseDirs(src)) {
    const c = loadCase(dir).case;
    if (c.excluded) continue;
    if (origin.has(c.id) && !args.includes('--replace')) throw new Error(`case ${c.id} is in both ${origin.get(c.id)} and ${src}`);
    origin.set(c.id, src);
    cpSync(dir, join(out, c.id), { recursive: true });
    const entry = prep.cases?.[c.id];
    if (entry) {
      preparation.cases[c.id] = entry;
      for (const f of entry.fixtures ?? []) {
        const target = join(out, f.bundle);
        const bytes = readFileSync(join(src, f.bundle));
        if (existsSync(target) && sha(readFileSync(target)) !== sha(bytes)) throw new Error(`fixture ${f.bundle} differs between sources`);
        mkdirSync(join(target, '..'), { recursive: true });
        writeFileSync(target, bytes);
      }
    }
  }
}
const license = sources.map((s) => join(s, 'LICENSE')).find(existsSync);
if (!license) throw new Error('no source has a LICENSE');
cpSync(license, join(out, 'LICENSE'));
cpSync(resolve(import.meta.dir, '..', 'datasets', 'DATASET_CARD.md'), join(out, 'DATASET_CARD.md'));
writeFileSync(join(out, 'preparation.json'), JSON.stringify(preparation, null, 2) + '\n');

const splitsFile = one('--splits');
if (splitsFile) {
  const doc = JSON.parse(readFileSync(expand(splitsFile), 'utf8'));
  const { dev = [], test = [] } = (doc.release ?? doc).cases as { dev?: string[]; test?: string[] };
  const want = new Map<string, 'dev' | 'test'>([...dev.map((c) => [c, 'dev'] as const), ...test.map((c) => [c, 'test'] as const)]);
  if (want.size !== dev.length + test.length) throw new Error(`${splitsFile} lists a case twice`);
  const staged = [...origin.keys()];
  const missing = [...want.keys()].filter((c) => !origin.has(c));
  const unlisted = staged.filter((c) => !want.has(c));
  if (missing.length || unlisted.length)
    throw new Error(`${splitsFile} does not match the staged cases (not staged: ${missing.join(', ') || 'none'}; not listed: ${unlisted.join(', ') || 'none'})`);
  for (const c of staged) {
    const path = join(out, c, 'case.json');
    const kase = JSON.parse(readFileSync(path, 'utf8'));
    if (kase.split === want.get(c)) continue;
    kase.split = want.get(c);
    writeFileSync(path, JSON.stringify(kase, null, 2) + '\n');
  }
}

// MANIFEST.md and NOTICE.md describe exactly what was staged.
const loaded = caseDirs(out).map(loadCase).filter((l) => !l.case.excluded);
const ids = { dev: [] as string[], test: [] as string[] };
const rows: string[] = [];
let records = 0;
const licenses = new Set<string>();
for (const l of loaded.sort((a, b) => a.case.split.localeCompare(b.case.split) || a.case.id.localeCompare(b.case.id))) {
  const c = l.case;
  ids[c.split].push(c.id);
  const agents = new Map<string, number>();
  for (const s of c.sessions ?? []) {
    agents.set(s.agent, (agents.get(s.agent) ?? 0) + 1);
    records += readFileSync(join(l.dir, s.file), 'utf8').split('\n').filter((x) => x.trim()).length;
  }
  if (c.provenance.license) licenses.add(c.provenance.license);
  const prov = existsSync(join(l.dir, 'facts-provenance.json')) ? JSON.parse(readFileSync(join(l.dir, 'facts-provenance.json'), 'utf8')) : undefined;
  rows.push(
    `| ${c.id} | ${c.split} | ${c.repo.base} | ${c.repo.head} | ${[...agents].map(([a, n]) => `${a}: ${n}`).join(', ')} | ${prov ? `${Object.keys(prov.entries).length} (${prov.reviewKind ?? 'automated'})` : 'none'} | ${c.original ? 'yes' : 'no'} | ${c.provenance.license ?? 'see bundle'} | ${preparation.cases[c.id]?.commands?.length ? 'yes' : 'none'} |`,
  );
}
writeFileSync(
  join(out, 'MANIFEST.md'),
  [
    `# prbench real-case library ${version}`,
    '',
    `${loaded.length} replay cases (${ids.dev.length} dev, ${ids.test.length} test) with ${records.toLocaleString('en-US')} session records. Dataset and harness versions are independent. See DATASET_CARD.md for scope, consent, transformations, limitations and license.`,
    '',
    '| Case | Split | Base SHA | Head SHA | Sessions by agent | Facts (review) | Published PR | Source license | Preparation |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
    'Use preparation.json for dependency preparation; fixture bundles under .fixtures pin sibling checkouts. Download verification never executes preparation commands. Keep this data out of Git.',
    '',
  ].join('\n'),
);
writeFileSync(
  join(out, 'NOTICE.md'),
  [
    '# Attribution and redistribution',
    '',
    `prbench dataset ${version}. Dataset compilation, owner-contributed text and annotations: Tracetoon/prbench contributors, 2026, Apache-2.0. Source work retains its own terms (${[...licenses].sort().join('; ')}), as declared in each case's provenance and the licenses in its Git history. Preserve upstream copyright, author and license notices in the supplied bundles. Dependencies, vendored builds and third-party quotations retain their upstream terms. The root license does not override third-party rights.`,
    '',
    'Session owners authorized public redistribution of the reviewed, redacted cases. See DATASET_CARD.md for the transformations applied and the review status of each fact sheet.',
    '',
  ].join('\n'),
);

const recordPath = one('--record');
if (recordPath) {
  const reviewedBy = one('--reviewed-by');
  if (!reviewedBy) throw new Error('--reviewed-by is required with --record');
  const caseInputs: Record<string, Record<string, string>> = {};
  for (const l of loaded) {
    const c = l.case;
    const names = ['case.json', c.repo.bundle!, c.facts!, 'facts-provenance.json', ...(c.sessions ?? []).map((s) => s.file), ...(c.original ? [c.original.body] : [])];
    const prov = JSON.parse(readFileSync(join(l.dir, 'facts-provenance.json'), 'utf8'));
    for (const e of Object.values(prov.entries) as any[]) for (const s of e.sources) if (s.kind === 'historical-digest') names.push(s.path);
    caseInputs[c.id] = Object.fromEntries([...new Set(names)].map((n) => [n, sha(readFileSync(join(l.dir, n)))]));
  }
  const globals = ['preparation.json', 'MANIFEST.md', 'DATASET_CARD.md', 'LICENSE', 'NOTICE.md', ...Object.values(preparation.cases).flatMap((c: any) => (c.fixtures ?? []).map((f: any) => f.bundle))];
  const record = {
    schema: 'prbench.publication/v1',
    id,
    version,
    publicRedistribution: args.includes('--consent-confirmed'),
    reviewedBy,
    reviewedAt: new Date().toISOString(),
    notes: one('--note', ''),
    cases: [...ids.dev, ...ids.test].sort(),
    caseInputs,
    globalInputs: Object.fromEntries([...new Set(globals)].map((n) => [n, sha(readFileSync(join(out, n)))])),
  };
  writeFileSync(expand(recordPath), JSON.stringify(record, null, 2) + '\n');
}
console.log(JSON.stringify({ out, cases: ids, records, sources: sources.length, record: recordPath ?? null }));
