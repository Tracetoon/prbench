import { expect, test } from "bun:test";
import { performanceReport, type WriterMetric } from "../src/performance.ts";
import { completedWork } from "./fixtures/validation-work.ts";
const rows = (ratio: number) =>
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
        },
        {
          ...completedWork(),
          case: id,
          model,
          replicate,
          system: "tracetoon-candidate",
          stageTimings: { writerMs: (1000 + i * 100) * ratio },
          inputTokens: 90,
        },
      ]),
    ),
  ) as WriterMetric[];
test("performance clusters repeats by case and requires paired time and token gains", () => {
  const report = performanceReport(rows(0.8), 18);
  expect(report).toMatchObject({
    status: "passed",
    pairs: 18,
    independentCases: 3,
  });
  expect(report.writerRatio95CI[1]!).toBeLessThan(1);
  expect(performanceReport(rows(1.1), 18).status).toBe("failed");
  expect(performanceReport(rows(0.8).slice(2), 18).status).toBe("inconclusive");
  const increased = rows(0.8).map((r) =>
    r.system === "tracetoon-candidate" ? { ...r, inputTokens: 110 } : r,
  );
  expect(performanceReport(increased, 18).status).toBe("failed");
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
  // Timing still decides once validation is equally unavailable.
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
