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

test("equal rates pass; a higher candidate rate fails with both rates", () => {
  const { findings, scored } = run([
    pair("c1", ["a", "b"], ["c"]),
    pair("c2", [], ["d"]),
  ]);
  expect(
    gate(findings, findings.map((f) => audit(f, "confirmed")), scored).status,
  ).toBe("passed");
  const result = gate(
    findings,
    findings.map((f) =>
      audit(f, f.claim === "d" ? "false-positive" : "confirmed"),
    ),
    scored,
  );
  expect(result.status).toBe("failed");
  expect(result.failures).toContain(
    "Candidate confirmed accuracy errors per scored draft 1.000 (2/2) exceed baseline 0.500 (1/2)",
  );
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
