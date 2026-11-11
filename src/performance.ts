import type { DraftCost } from "./report/score.ts";
import { bootstrapMeanCI, mean } from "./stats.ts";
import {
  compareValidationWork,
  type ValidationWork,
} from "./validationWork.ts";
export interface WriterMetric extends ValidationWork {
  model: string;
  case: string;
  system: string;
  replicate: number;
  stageTimings?: Record<string, number>;
  inputTokens?: number;
  cleanup?: string;
  /** Priced cost as `prbench score` computes it (see `draftCost`). */
  pricedCost?: DraftCost;
  writerOutcome?: { isError?: boolean };
  [field: string]: unknown;
}
export const median = (xs: number[]) => {
  const values = xs.filter(Number.isFinite).sort((a, b) => a - b),
    mid = Math.floor(values.length / 2);
  return !values.length
    ? null
    : values.length % 2
      ? values[mid]!
      : (values[mid - 1]! + values[mid]!) / 2;
};
/** Why a draft has no priced cost the gate can use, or null when it has one. */
function unpricedReason(r: WriterMetric | undefined): string | null {
  if (!r) return "missing draft";
  const c = r.pricedCost;
  if (!c || c.costUsd === undefined)
    return "no priced cost (a model has no price, or token counts are missing)";
  if (c.costSource === "estimated" && c.usageScope === "main-thread")
    return "Codex usage covers the main thread only";
  if (!Number.isFinite(c.costUsd) || c.costUsd <= 0)
    return `nonpositive cost ${c.costUsd}`;
  return null;
}

/**
 * The performance gate's rule, stated once for the report and summary.
 * Cost per draft is `prbench score`'s priced cost (reported totals where the
 * agent gives one; otherwise every model at its own price, cached input at
 * its own rate, Codex across all threads). The ratio is a geometric mean of
 * paired candidate/baseline ratios: log ratios are averaged within each case
 * (models and replicates are not independent), then across cases. A ratio
 * of ratios is scale-free, so an expensive model or case cannot outweigh a
 * cheap one, and it matches the writer-time ratio beside it.
 */
export const COST_RULE =
  "Pass when the candidate/baseline geometric mean of paired per-draft priced cost (same model, case and replicate; log ratios averaged within each case, then across cases) is at most 1.000. The case-clustered 95% interval is reported, not required. Any paired draft without a priced cost makes the gate inconclusive. Writer wall time and token counts are information, not criteria.";

export function performanceReport(
  rows: WriterMetric[],
  expectedPairs: number,
  requireWorkEvidence = false,
) {
  const pairs: {
    case: string;
    model: string;
    replicate: number;
    baselineMs?: number;
    candidateMs?: number;
    baselineTokens?: number;
    candidateTokens?: number;
    baselineCostUsd?: number;
    candidateCostUsd?: number;
  }[] = [];
  const unpricedDrafts: {
    case: string;
    model: string;
    replicate: number;
    system: string;
    reason: string;
  }[] = [];
  const baselineOf = (candidate: WriterMetric) =>
    rows.find(
      (r) =>
        r.case === candidate.case &&
        r.model === candidate.model &&
        r.replicate === candidate.replicate &&
        r.system === "tracetoon-baseline",
    );
  const candidates = rows.filter((r) => r.system === "tracetoon-candidate");
  const validationComparability = candidates.map((candidate) => ({
    case: candidate.case,
    model: candidate.model,
    replicate: candidate.replicate,
    ...compareValidationWork(baselineOf(candidate), candidate),
  }));
  const positive = (x: number | undefined) =>
    x !== undefined && x > 0 ? x : undefined;
  for (const candidate of candidates) {
    const baseline = baselineOf(candidate);
    if (!baseline) continue;
    const id = {
      case: candidate.case,
      model: candidate.model,
      replicate: candidate.replicate,
    };
    for (const [system, r] of [
      ["tracetoon-baseline", baseline],
      ["tracetoon-candidate", candidate],
    ] as const) {
      const reason = unpricedReason(r);
      if (reason) unpricedDrafts.push({ ...id, system, reason });
    }
    pairs.push({
      ...id,
      baselineMs: positive(baseline.stageTimings?.writerMs),
      candidateMs: positive(candidate.stageTimings?.writerMs),
      baselineTokens: baseline.inputTokens,
      candidateTokens: candidate.inputTokens,
      ...(unpricedReason(baseline) || unpricedReason(candidate)
        ? {}
        : {
            baselineCostUsd: baseline.pricedCost!.costUsd,
            candidateCostUsd: candidate.pricedCost!.costUsd,
          }),
    });
  }
  // Case-clustered geometric mean of a paired ratio, with its bootstrap interval.
  const clusteredRatio = (
    value: (p: (typeof pairs)[number]) => [number?, number?],
  ) => {
    const usable = pairs.filter((p) => {
      const [b, c] = value(p);
      return b !== undefined && c !== undefined;
    });
    const ids = [...new Set(usable.map((p) => p.case))];
    const logs = ids.map((id) =>
      mean(
        usable
          .filter((p) => p.case === id)
          .map((p) => {
            const [b, c] = value(p);
            return Math.log(c! / b!);
          }),
      ),
    );
    const ci = bootstrapMeanCI(logs, { resamples: 10000, seed: 1 }).map(
      Math.exp,
    );
    return {
      pairs: usable.length,
      cases: ids.length,
      ratio: logs.length ? Math.exp(mean(logs)) : null,
      ci: ci.map((x) => (Number.isFinite(x) ? x : null)),
    };
  };
  const cost = clusteredRatio((p) => [p.baselineCostUsd, p.candidateCostUsd]);
  const writer = clusteredRatio((p) => [p.baselineMs, p.candidateMs]);
  const caseIds = [...new Set(pairs.map((p) => p.case))];
  const models = [...new Set(rows.map((r) => r.model))].map((model) => {
    const selected = pairs.filter((p) => p.model === model);
    const priced = selected.filter((p) => p.candidateCostUsd !== undefined);
    return {
      model,
      pairs: selected.length,
      baselineCostMedianUsd: median(priced.map((p) => p.baselineCostUsd!)),
      candidateCostMedianUsd: median(priced.map((p) => p.candidateCostUsd!)),
      medianPairedDeltaMs: median(
        selected.map((p) =>
          p.baselineMs && p.candidateMs ? p.candidateMs - p.baselineMs : NaN,
        ),
      ),
      baselineInputMedian: median(selected.map((p) => p.baselineTokens ?? NaN)),
      candidateInputMedian: median(
        selected.map((p) => p.candidateTokens ?? NaN),
      ),
      allTokensRecorded: selected.every(
        (p) =>
          p.baselineTokens !== undefined && p.candidateTokens !== undefined,
      ),
    };
  });
  const complete = pairs.length === expectedPairs && caseIds.length >= 2;
  const priced = !unpricedDrafts.length && cost.pairs === pairs.length;
  const failures =
    priced && cost.ratio !== null && cost.ratio > 1
      ? [
          `Candidate priced cost per draft is higher than the baseline's: geometric mean ratio ${cost.ratio.toFixed(3)} > 1.000`,
        ]
      : [];
  const counters = rows
    .filter((r) => r.system === "tracetoon-candidate")
    .map((r) => r.operationCounts as Record<string, number> | undefined);
  const workEvidence = {
    committedSubmissionReuses: counters.reduce(
      (sum, c) => sum + (c?.["submission.reused"] ?? 0),
      0,
    ),
    batchExpansions: counters.reduce(
      (sum, c) => sum + (c?.["evidence.batchExpansions"] ?? 0),
      0,
    ),
    receiptReuses: counters.reduce(
      (sum, c) => sum + (c?.["check.reused"] ?? 0),
      0,
    ),
    unchangedWritesAvoided: counters.reduce(
      (sum, c) => sum + (c?.["artifact.writesReused"] ?? 0),
      0,
    ),
    scope:
      "Self-reported runtime counters, tested separately; never validation outcome evidence.",
  };
  const workObserved =
    workEvidence.committedSubmissionReuses +
      workEvidence.batchExpansions +
      workEvidence.receiptReuses +
      workEvidence.unchangedWritesAvoided >
    0;
  const validationComparable =
    validationComparability.length === expectedPairs &&
    validationComparability.every((p) => p.status === "matched");
  // Neither writer completed any validation in any pair: the sandbox could not
  // run it. That is a limitation shared by both arms, not a difference between
  // them; matched, unmatched and one-sided pairs keep their effect.
  const validationUnavailable =
    !validationComparable &&
    validationComparability.length === expectedPairs &&
    validationComparability.length > 0 &&
    validationComparability.every(
      (p) =>
        p.status === "unknown" &&
        p.baseline.reasons.length > 0 &&
        p.candidate.reasons.length > 0 &&
        !p.baseline.coverage.length &&
        !p.candidate.coverage.length,
    );
  const validationUsable = validationComparable || validationUnavailable;
  const unavailableReasons = [
    ...new Set(
      validationUnavailable
        ? validationComparability.flatMap((p) =>
            p.reasons.map((r) =>
              r.replace(/^(baseline|candidate): (V\d+: )?/, ""),
            ),
          )
        : [],
    ),
  ].sort();
  const validationLimitation = validationUnavailable
    ? `Validation did not complete for either writer in any of the ${validationComparability.length} pairs, so the sandbox could not run it; cost, timing and token results compare writers that both lacked completed validation and say nothing about validation work saved or skipped. Reasons recorded: ${unavailableReasons.join(" | ")}`
    : null;
  const unknown =
    !complete ||
    validationComparability.length !== expectedPairs ||
    !validationUsable ||
    !priced ||
    cost.ratio === null ||
    (requireWorkEvidence && !workObserved);
  return {
    schema: "prbench.performance/v3",
    validationComparability,
    validationComparable,
    validationUnavailable,
    validationLimitation,
    rule: COST_RULE,
    status: !validationUsable || !priced
      ? "inconclusive"
      : failures.length
        ? "failed"
        : unknown
          ? "inconclusive"
          : "passed",
    passed: !failures.length && !unknown,
    failures,
    pairs: pairs.length,
    expectedPairs,
    independentCases: caseIds.length,
    workEvidence,
    unpricedDrafts,
    geometricMeanCostRatio: cost.ratio,
    costRatio95CI: cost.ci,
    pricedPairs: cost.pairs,
    // Information only: writer wall time is not a criterion.
    geometricMeanWriterRatio: writer.ratio,
    writerRatio95CI: writer.ci,
    timedPairs: writer.pairs,
    models,
    limitations: [
      "Case-clustered percentile bootstrap; repeats, models and judges are not independent cases.",
      "Priced cost uses src/report/prices.json list prices (reported totals where the agent gives one); it is not an invoice.",
      "Writer wall time (service waits and observation overhead included) and token counts are reported as information, not criteria.",
      "Noncomparable validation leaves cost, timing and token differences descriptive; it establishes neither a gain nor a regression.",
      ...(validationLimitation ? [validationLimitation] : []),
    ],
  };
}
