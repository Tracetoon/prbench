import { expect, test } from "bun:test";
import {
  accuracyFindings,
  accuracyScoredDrafts,
  qualityGate,
  type AccuracyFinding,
  type Adjudication,
  type ComparisonReport,
} from "../src/gates.ts";
import type { PairResult } from "../src/judge/pairwise.ts";
import type { PRArtifact } from "../src/schema/artifact.ts";
import { stageKey } from "../src/run/cache.ts";
import { artifactDigest } from "../src/schema/artifact.ts";

const CAND = "tracetoon-candidate",
  BASE = "tracetoon-baseline";
const side = (claims: string[]) => ({
  claimAssessments: claims.map((claim) => ({
    claim,
    status: "contradicted",
    evidenceRefs: ["D"],
    reason: "conflicts with the diff",
  })),
});
const pair = (
  kase: string,
  cand: string[],
  base: string[],
  judge = "j1",
): PairResult =>
  ({
    case: kase,
    judge,
    x: BASE,
    y: CAND,
    sides: { [BASE]: [side(base)], [CAND]: [side(cand)] },
  }) as unknown as PairResult;
const artifacts = new Map<string, PRArtifact>();
for (const kase of ["c1", "c2"])
  for (const sys of [CAND, BASE])
    artifacts.set(`1/m/${kase}/${sys}`, {
      title: `${kase} ${sys}`,
    } as unknown as PRArtifact);

// Every non-accuracy criterion passes: coverage improves and consensus wins exceed losses.
const reports: ComparisonReport[] = [
  {
    model: "m",
    replicate: 1,
    comparison: BASE,
    report: {
      splits: {
        test: {
          systems: [
            { system: BASE, claimCoverage: 0.5, contextCoverage: 0.5 },
            { system: CAND, claimCoverage: 0.7, contextCoverage: 0.6 },
          ],
          pairs: [{ judge: "all judges agree", xWins: 0, yWins: 2 }],
        },
      },
    } as unknown as ComparisonReport["report"],
  },
];
const audit = (
  finding: AccuracyFinding,
  outcome: Adjudication["outcome"],
): Adjudication => ({
  finding: finding.id,
  outcome,
  reviewedBy: "r",
  reviewedAt: "2026-11-11T00:00:00Z",
  rationale: "checked",
  sources: [],
});
const run = (pairs: PairResult[]) => {
  const rows = pairs.map((p) => ({ model: "m", replicate: 1, pair: p }));
  return {
    findings: accuracyFindings(rows, artifacts),
    scored: accuracyScoredDrafts(rows),
  };
};
const gate = (
  findings: AccuracyFinding[],
  adjudications: Adjudication[],
  scored: string[],
) => qualityGate(reports, "test", ["m"], findings, adjudications, null, scored);

test("flags are collected on both arms with an arm field", () => {
  const { findings, scored } = run([pair("c1", ["a"], ["b", "c"])]);
  expect(scored).toEqual(["m/c1/r1"]);
  expect(findings.map((f) => [f.arm, f.claim])).toEqual([
    [CAND, "a"],
    [BASE, "b"],
    [BASE, "c"],
  ]);
  expect(findings[0]!.observations[0]!.opponent).toBe(BASE);
});

test("confirmed candidate errors pass when the baseline is worse", () => {
  const { findings, scored } = run([
    pair("c1", ["a"], ["b", "c"]),
    pair("c2", [], ["d"]),
  ]);
  const result = gate(
    findings,
    findings.map((f) => audit(f, "confirmed")),
    scored,
  );
  expect(result.status).toBe("passed");
  expect(result.accuracy).toMatchObject({
    scoredDrafts: 2,
    candidate: { flags: 1, confirmed: 1, rate: 0.5 },
    baseline: { flags: 3, confirmed: 3, rate: 1.5 },
    unresolved: 0,
  });
});

test("accuracy is non-inferiority: the upper 95% bound of candidate minus baseline must stay within the margin", () => {
  // Equal errors in every case: difference 0 with a tight interval, passes.
  const { findings, scored } = run([
    pair("c1", ["a"], ["b"]),
    pair("c2", ["c"], ["d"]),
  ]);
  const equal = gate(
    findings,
    findings.map((f) => audit(f, "confirmed")),
    scored,
  );
  expect(equal.status).toBe("passed");
  expect(equal.accuracy.difference).toMatchObject({
    mean: 0,
    margin: 0.05,
    cases: 2,
  });
  // A higher candidate rate fails, naming both rates and the interval.
  const { findings: f2, scored: s2 } = run([
    pair("c1", ["a", "b"], ["c"]),
    pair("c2", ["e"], ["d"]),
  ]);
  const worse = gate(
    f2,
    f2.map((f) => audit(f, f.claim === "d" ? "false-positive" : "confirmed")),
    s2,
  );
  expect(worse.status).toBe("failed");
  expect(worse.failures).toContain(
    "Candidate confirmed accuracy errors per scored draft 1.500 (3/2) vs baseline 0.500 (1/2): difference 1.000 [1.000, 1.000], upper bound above the non-inferiority margin 0.05",
  );
  // A lower candidate rate passes.
  const better = gate(
    f2,
    f2.map((f) => audit(f, f.arm === CAND ? "false-positive" : "confirmed")),
    s2,
  );
  expect(better.status).toBe("passed");
});

test("an unresolved flag on either arm is inconclusive and names its arm", () => {
  const { findings, scored } = run([pair("c1", ["a"], ["b"])]);
  const cand = findings.find((f) => f.arm === CAND)!,
    base = findings.find((f) => f.arm === BASE)!;
  const missingBase = gate(findings, [audit(cand, "false-positive")], scored);
  expect(missingBase.status).toBe("inconclusive");
  expect(missingBase.unresolvedAccuracy).toEqual([`${base.id} [${BASE}]`]);
  const openCand = gate(
    findings,
    [audit(cand, "unresolved"), audit(base, "confirmed")],
    scored,
  );
  expect(openCand.status).toBe("inconclusive");
  expect(openCand.unresolvedAccuracy).toEqual([`${cand.id} [${CAND}]`]);
});

test("old findings and adjudications without an arm are candidate flags", () => {
  const { findings, scored } = run([pair("c1", ["a"], [])]);
  // Candidate ids keep the pre-baseline key, so old adjudication files still match.
  expect(findings[0]!.id).toBe(
    stageKey("accuracy-finding", {
      model: "m",
      replicate: 1,
      case: "c1",
      artifact: artifactDigest(artifacts.get("1/m/c1/tracetoon-candidate")!),
      claim: "a",
    }),
  );
  const { arm: _arm, ...legacy } = findings[0]!;
  const result = gate([legacy], [audit(findings[0]!, "confirmed")], scored);
  expect(result.status).toBe("failed");
  expect(result.accuracy.candidate).toMatchObject({ flags: 1, confirmed: 1 });
  expect(result.accuracy.baseline).toMatchObject({ flags: 0, confirmed: 0 });
});

test("coverage may drop by at most the guard; a larger drop fails", () => {
  const withCoverage = (claim: number, context: number): ComparisonReport[] => [
    {
      ...reports[0]!,
      report: {
        splits: {
          test: {
            systems: [
              { system: BASE, claimCoverage: 0.5, contextCoverage: 0.33 },
              { system: CAND, claimCoverage: claim, contextCoverage: context },
            ],
            pairs: [{ judge: "all judges agree", xWins: 0, yWins: 2 }],
          },
        },
      } as unknown as ComparisonReport["report"],
    },
  ];
  const { findings, scored } = run([pair("c1", [], [])]);
  const g = (r: ComparisonReport[]) =>
    qualityGate(r, "test", ["m"], findings, [], null, scored);
  // The Codex dev confirmation case: context 0.33 -> 0.32 with claims up.
  expect(g(withCoverage(0.6, 0.32)).status).toBe("passed");
  const failed = g(withCoverage(0.6, 0.27));
  expect(failed.status).toBe("failed");
  expect(failed.failures).toContain(
    "m: contextCoverage regressed against baseline by more than 0.05",
  );
});
