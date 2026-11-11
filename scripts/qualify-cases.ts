/**
 * Qualification report for a dataset from finished `compare` runs: is each case
 * usable as a discriminating test case?
 *
 * Per case, over every given run (each a candidate-vs-baseline comparison):
 * - drafts scored per system vs expected (writer failures: no draft, scope);
 * - judge agreement: share of pairs where every judge agrees in both orders
 *   (consensus), order flips, and judge-vs-judge verdict disagreement;
 * - composite mean and replicate SD per system; ceiling (both > 95) and floor
 *   (both < 30) flags;
 * - factual errors on both systems of the same replicate (a hint at a fact-sheet
 *   problem when it repeats).
 *
 * Usage: bun run scripts/qualify-cases.ts <run>... [--dataset id@version | --cases dir] [--json] [--aggregate-only]
 *
 * `--aggregate-only` (sealed runs) prints the dataset-wide summary only: no case is named.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { modelRoot, type ComparisonManifest } from "../src/comparison.ts";
import { resolveDatasetInputs } from "../src/datasets.ts";
import type { PairResult } from "../src/judge/pairwise.ts";
import { caseClustered, collectDraftScores, type ItemCounts } from "../src/report/score.ts";
import { caseDirs, loadCase, loadFacts } from "../src/schema/case.ts";
import { BASELINE, CANDIDATE, consensusOutcome } from "./paired-delta.ts";

interface CaseRow {
  case: string;
  runs: number;
  expected: number;
  drafts: { baseline: number; candidate: number };
  pairs: number;
  consensusShare: number;
  flipShare: number;
  judgeDisagreeShare: number;
  mean: { baseline: number; candidate: number };
  sd: { baseline: number; candidate: number };
  bothErrors: number;
  flags: string[];
}

const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
const sd = (xs: number[]) => {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
};

export function qualify(
  runs: string[],
  factsFor: (id: string) => ItemCounts | undefined,
): CaseRow[] {
  const acc = new Map<
    string,
    {
      runs: Set<string>;
      expected: number;
      drafts: { baseline: number; candidate: number };
      pairs: number;
      consensus: number;
      flips: number;
      judgeSlots: number;
      disagree: number;
      scores: { baseline: number[]; candidate: number[] };
      bothErrors: number;
    }
  >();
  const get = (c: string) => {
    let a = acc.get(c);
    if (!a) {
      a = {
        runs: new Set(),
        expected: 0,
        drafts: { baseline: 0, candidate: 0 },
        pairs: 0,
        consensus: 0,
        flips: 0,
        judgeSlots: 0,
        disagree: 0,
        scores: { baseline: [], candidate: [] },
        bothErrors: 0,
      };
      acc.set(c, a);
    }
    return a;
  };
  for (const dir of runs) {
    const root = resolve(dir);
    const m = JSON.parse(
      readFileSync(join(root, "manifest.json"), "utf8"),
    ) as ComparisonManifest;
    const judges = m.settings.judges;
    const drafts = collectDraftScores(root, factsFor);
    for (const model of m.settings.models) {
      for (let r = 1; r <= m.settings.replicates; r++) {
        const file = join(modelRoot(root, r, model), BASELINE, "pairs.json");
        const results: PairResult[] = existsSync(file)
          ? JSON.parse(readFileSync(file, "utf8"))
          : [];
        const cases = new Set([
          ...results.map((p) => p.case),
          ...drafts
            .filter((d) => d.model === model && d.replicate === r)
            .map((d) => d.case),
        ]);
        for (const c of cases) {
          const a = get(c);
          a.runs.add(root);
          a.expected++;
          const b = drafts.find(
            (d) =>
              d.model === model &&
              d.replicate === r &&
              d.case === c &&
              d.system === BASELINE,
          );
          const k = drafts.find(
            (d) =>
              d.model === model &&
              d.replicate === r &&
              d.case === c &&
              d.system === CANDIDATE,
          );
          if (b) {
            a.drafts.baseline++;
            a.scores.baseline.push(b.composite);
          }
          if (k) {
            a.drafts.candidate++;
            a.scores.candidate.push(k.composite);
          }
          if (b && k && b.factualErrors > 0 && k.factualErrors > 0)
            a.bothErrors++;
          const rs = results.filter((p) => p.case === c);
          if (!rs.length) continue;
          a.pairs++;
          if (consensusOutcome(rs, judges) !== 0) a.consensus++;
          a.flips += rs.filter((p) => p.flipped).length / rs.length;
          const verdicts = new Set(rs.map((p) => p.verdict));
          a.judgeSlots++;
          if (verdicts.size > 1) a.disagree++;
        }
      }
    }
  }
  return [...acc.entries()]
    .sort(([x], [y]) => x.localeCompare(y))
    .map(([c, a]) => {
      const mb = mean(a.scores.baseline),
        mc = mean(a.scores.candidate);
      const flags: string[] = [];
      if (a.drafts.baseline < a.expected || a.drafts.candidate < a.expected)
        flags.push("missing drafts");
      if (mb > 95 && mc > 95) flags.push("ceiling");
      if (mb < 30 && mc < 30) flags.push("floor");
      if (a.pairs && a.disagree / a.judgeSlots > 0.6)
        flags.push("judges disagree");
      if (a.bothErrors >= Math.max(2, a.expected / 2))
        flags.push("errors on both systems: check facts");
      if (Math.max(sd(a.scores.baseline), sd(a.scores.candidate)) > 15)
        flags.push("high replicate spread");
      return {
        case: c,
        runs: a.runs.size,
        expected: a.expected,
        drafts: a.drafts,
        pairs: a.pairs,
        consensusShare: a.pairs ? a.consensus / a.pairs : NaN,
        flipShare: a.pairs ? a.flips / a.pairs : NaN,
        judgeDisagreeShare: a.judgeSlots ? a.disagree / a.judgeSlots : NaN,
        mean: { baseline: mb, candidate: mc },
        sd: {
          baseline: sd(a.scores.baseline),
          candidate: sd(a.scores.candidate),
        },
        bothErrors: a.bothErrors,
        flags,
      };
    });
}

const f = (x: number, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : "–");
const pct = (x: number) =>
  Number.isFinite(x) ? `${Math.round(x * 100)}%` : "–";

export function qualifyMarkdown(rows: CaseRow[]): string {
  const out = [
    "| Case | Drafts base/cand of expected | Consensus | Order flips | Judges differ | Base mean (SD) | Cand mean (SD) | Errors on both | Verdict |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const r of rows) {
    const verdict = r.flags.length
      ? `suspect: ${r.flags.join("; ")}`
      : "qualified";
    out.push(
      `| ${r.case} | ${r.drafts.baseline}/${r.drafts.candidate} of ${r.expected} | ${pct(r.consensusShare)} | ${pct(r.flipShare)} | ${pct(r.judgeDisagreeShare)} | ${f(r.mean.baseline)} (${f(r.sd.baseline)}) | ${f(r.mean.candidate)} (${f(r.sd.candidate)}) | ${r.bothErrors} | ${verdict} |`,
    );
  }
  return out.join("\n");
}

/**
 * The dataset-wide summary with no case named (sealed runs, `--aggregate-only`):
 * totals and pooled shares, composite means of per-case means with a bootstrap
 * interval over cases, and how many cases carry each flag.
 */
export function qualifyAggregate(rows: CaseRow[]) {
  const sum = (v: (r: CaseRow) => number) => rows.reduce((a, r) => a + v(r), 0);
  const pairs = sum((r) => r.pairs);
  const pooled = (v: (r: CaseRow) => number) =>
    pairs ? sum((r) => (r.pairs && Number.isFinite(v(r)) ? v(r) * r.pairs : 0)) / pairs : NaN;
  const composite = (side: "baseline" | "candidate") =>
    caseClustered(rows.map((r) => ({ case: r.case, value: r.mean[side] })));
  const flags: Record<string, number> = {};
  for (const r of rows) for (const flag of r.flags) flags[flag] = (flags[flag] ?? 0) + 1;
  return {
    cases: rows.length,
    qualified: rows.filter((r) => !r.flags.length).length,
    suspect: rows.filter((r) => r.flags.length).length,
    flags,
    expected: sum((r) => r.expected),
    drafts: { baseline: sum((r) => r.drafts.baseline), candidate: sum((r) => r.drafts.candidate) },
    pairs,
    consensusShare: pooled((r) => r.consensusShare),
    flipShare: pooled((r) => r.flipShare),
    judgeDisagreeShare: pooled((r) => r.judgeDisagreeShare),
    composite: { baseline: composite("baseline"), candidate: composite("candidate") },
    bothErrors: sum((r) => r.bothErrors),
  };
}

export function qualifyAggregateMarkdown(a: ReturnType<typeof qualifyAggregate>): string {
  const ci = (c: { mean: number; ci: [number, number] }) => `${f(c.mean)} [${f(c.ci[0])}, ${f(c.ci[1])}]`;
  const flags = Object.entries(a.flags).sort(([x], [y]) => x.localeCompare(y));
  return [
    "Aggregate only: per-case rows are sealed.",
    "",
    "| Cases | Qualified | Suspect | Drafts base/cand of expected | Consensus | Order flips | Judges differ | Base composite [95% CI] | Cand composite [95% CI] | Errors on both |",
    "|---|---|---|---|---|---|---|---|---|---|",
    `| ${a.cases} | ${a.qualified} | ${a.suspect} | ${a.drafts.baseline}/${a.drafts.candidate} of ${a.expected} | ${pct(a.consensusShare)} | ${pct(a.flipShare)} | ${pct(a.judgeDisagreeShare)} | ${ci(a.composite.baseline)} | ${ci(a.composite.candidate)} | ${a.bothErrors} |`,
    ...(flags.length
      ? ["", "| Flag | Cases |", "|---|---|", ...flags.map(([flag, n]) => `| ${flag} | ${n} |`)]
      : []),
  ].join("\n");
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const opt = (n: string) => {
    const i = argv.indexOf(n);
    return i >= 0 ? argv.splice(i, 2)[1] : undefined;
  };
  const json = argv.includes("--json");
  const aggregateOnly = argv.includes("--aggregate-only");
  const dataset = opt("--dataset");
  const casesDir = opt("--cases");
  const runs = argv.filter((a) => a !== "--json" && a !== "--aggregate-only");
  if (!runs.length) {
    console.error(
      "usage: qualify-cases.ts <run>... [--dataset id@version | --cases dir] [--json] [--aggregate-only]",
    );
    process.exit(2);
  }
  const inputs = await resolveDatasetInputs({ cases: casesDir, dataset });
  const facts = new Map<string, ItemCounts>();
  for (const d of caseDirs(resolve(inputs.cases))) {
    try {
      const l = loadCase(d);
      const fs = loadFacts(l);
      if (fs) facts.set(l.case.id, fs);
    } catch {
      // Cases that fail to load are not scored, as in `prbench score`.
    }
  }
  const rows = qualify(runs, (id) => facts.get(id));
  if (aggregateOnly) {
    const aggregate = qualifyAggregate(rows);
    console.log(json ? JSON.stringify(aggregate, null, 2) : qualifyAggregateMarkdown(aggregate));
  } else console.log(json ? JSON.stringify(rows, null, 2) : qualifyMarkdown(rows));
}
