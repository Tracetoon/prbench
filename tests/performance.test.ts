import { expect, test } from "bun:test";
import {
  COST_RULE,
  performanceReport,
  type WriterMetric,
} from "../src/performance.ts";
import { completedWork } from "./fixtures/validation-work.ts";
// `ratio` scales candidate cost; `timeRatio` scales candidate writer time.
const rows = (ratio: number, timeRatio = ratio) =>
  ["one", "two", "three"].flatMap((id, i) =>
    ["sol", "terra"].flatMap((model) =>
      [1, 2, 3].flatMap((replicate) => [
        {
          ...completedWork(),
          case: id,
          model,
          replicate,
          system: "tracetoon-baseline",
          stageTimings: { writerMs: 1000 + i * 100 },
          inputTokens: 100,
          pricedCost: { costUsd: 0.1 + i * 0.01, costSource: "reported" },
        },
        {
          ...completedWork(),
          case: id,
          model,
          replicate,
          system: "tracetoon-candidate",
          stageTimings: { writerMs: (1000 + i * 100) * timeRatio },
          inputTokens: 90,
          pricedCost: {
            costUsd: (0.1 + i * 0.01) * ratio,
            costSource: "estimated",
            usageScope: "all-threads",
          },
        },
      ]),
    ),
  ) as WriterMetric[];
test("performance clusters repeats by case and gates on paired priced cost", () => {
  const report = performanceReport(rows(0.8), 18);
  expect(report).toMatchObject({
    status: "passed",
    pairs: 18,
    pricedPairs: 18,
    independentCases: 3,
    unpricedDrafts: [],
  });
  expect(report.geometricMeanCostRatio!).toBeCloseTo(0.8, 6);
  expect(report.costRatio95CI[1]!).toBeLessThan(1);
  expect(report.rule).toBe(COST_RULE);
  expect(performanceReport(rows(1.1), 18).status).toBe("failed");
  expect(performanceReport(rows(0.8).slice(2), 18).status).toBe("inconclusive");
  // Equal cost passes: the rule is ratio <= 1.
  expect(performanceReport(rows(1), 18).status).toBe("passed");
  const interrupted = rows(0.5);
  interrupted.find(
    (r) => r.system === "tracetoon-candidate",
  )!.validation!.commands[0]!.outcome = "interrupted";
  expect(performanceReport(interrupted, 18).status).toBe("inconclusive");
  const slowerInterrupted = rows(1.2);
  slowerInterrupted.find(
    (r) => r.system === "tracetoon-candidate",
  )!.validation!.commands[0]!.outcome = "interrupted";
  expect(performanceReport(slowerInterrupted, 18).status).toBe("inconclusive");
});

const noValidation = (ratio: number): WriterMetric[] =>
  rows(ratio).map((r) => ({ ...r, validation: undefined }));
test("validation unavailable to both writers in every pair is a stated limitation, not a blocker", () => {
  const report = performanceReport(noValidation(0.8), 18);
  expect(report).toMatchObject({
    status: "passed",
    validationComparable: false,
    validationUnavailable: true,
  });
  expect(report.validationLimitation).toContain(
    "Validation did not complete for either writer in any of the 18 pairs",
  );
  expect(report.limitations).toContain(report.validationLimitation!);
  // Cost still decides once validation is equally unavailable.
  expect(performanceReport(noValidation(1.1), 18).status).toBe("failed");
  // One-sided unknown keeps blocking.
  const oneSided = rows(0.8).map((r) =>
    r.system === "tracetoon-candidate" ? { ...r, validation: undefined } : r,
  );
  expect(performanceReport(oneSided, 18)).toMatchObject({
    status: "inconclusive",
    validationUnavailable: false,
    validationLimitation: null,
  });
  // A mix of matched and both-unknown pairs keeps blocking.
  const mixed = rows(0.8).map((r) =>
    r.case === "one" ? { ...r, validation: undefined } : r,
  );
  expect(performanceReport(mixed, 18)).toMatchObject({
    status: "inconclusive",
    validationUnavailable: false,
  });
  // A pair where one writer completed some validation is not "unavailable".
  const partial = noValidation(0.8);
  partial[0] = rows(0.8)[0]!;
  expect(performanceReport(partial, 18).status).toBe("inconclusive");
  // Unmatched coverage keeps blocking.
  const unmatched = rows(0.8).map((r) =>
    r.system === "tracetoon-candidate"
      ? {
          ...r,
          validation: {
            ...r.validation!,
            commands: r.validation!.commands.map((c) => ({
              ...c,
              check: { ...c.check!, argv: ["other"] },
            })),
          },
        }
      : r,
  );
  const unmatchedReport = performanceReport(unmatched, 18);
  expect(unmatchedReport).toMatchObject({
    status: "inconclusive",
    validationUnavailable: false,
  });
  expect(unmatchedReport.validationComparability[0]!.status).toBe("unmatched");
});

test("cheaper but slower and with more input tokens passes; time and tokens are information", () => {
  const slower = rows(0.9, 1.5).map((r) =>
    r.system === "tracetoon-candidate" ? { ...r, inputTokens: 500 } : r,
  );
  const report = performanceReport(slower, 18);
  expect(report.status).toBe("passed");
  expect(report.failures).toEqual([]);
  expect(report.geometricMeanWriterRatio!).toBeCloseTo(1.5, 6);
  expect(report.models[0]!.candidateInputMedian).toBe(500);
});

test("pricier but faster fails and names the cost ratio", () => {
  const report = performanceReport(rows(1.2, 0.5), 18);
  expect(report.status).toBe("failed");
  expect(report.passed).toBe(false);
  expect(report.failures).toEqual([
    "Candidate priced cost per draft is higher than the baseline's: geometric mean ratio 1.200 > 1.000",
  ]);
});

test("a paired draft without a priced cost makes the gate inconclusive and is listed", () => {
  const missing = rows(0.5);
  missing[1] = { ...missing[1]!, pricedCost: { inputTokens: 10 } };
  const mainThread = rows(2);
  mainThread[0] = {
    ...mainThread[0]!,
    pricedCost: { costUsd: 0.1, costSource: "estimated", usageScope: "main-thread" },
  };
  const report = performanceReport(missing, 18);
  expect(report.status).toBe("inconclusive");
  expect(report.passed).toBe(false);
  expect(report.pricedPairs).toBe(17);
  expect(report.unpricedDrafts).toEqual([
    {
      case: "one",
      model: "sol",
      replicate: 1,
      system: "tracetoon-candidate",
      reason: "no priced cost (a model has no price, or token counts are missing)",
    },
  ]);
  // Even a pricier candidate is inconclusive, not failed, while a draft is unpriced.
  const mainReport = performanceReport(mainThread, 18);
  expect(mainReport.status).toBe("inconclusive");
  expect(mainReport.failures).toEqual([]);
  expect(mainReport.unpricedDrafts[0]).toMatchObject({
    system: "tracetoon-baseline",
    reason: "Codex usage covers the main thread only",
  });
});

test("the stated rule names the criterion and threshold", () => {
  expect(COST_RULE).toContain("geometric mean of paired per-draft priced cost");
  expect(COST_RULE).toContain("at most 1.000");
  expect(COST_RULE).toContain("inconclusive");
  expect(COST_RULE).toContain("Writer wall time and token counts are information, not criteria");
});
