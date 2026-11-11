import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stageKey } from "./run/cache.ts";
import type { AdjudicationSource } from "./run/adjudication.ts";
import type { PairResult } from "./judge/pairwise.ts";
import type { Report } from "./report.ts";
import type { PRArtifact, WorkflowRecord } from "./schema/artifact.ts";
import { artifactDigest } from "./schema/artifact.ts";
import type { WriterMetric } from "./performance.ts";

/** What the lean reviewed path still lacks: empty when the record shows its review plan met. */
export function leanReviewGaps(workflow: WorkflowRecord | undefined): string[] {
  if (!workflow) return ["no workflow record"];
  const gaps: string[] = [];
  if (workflow.reviewVersion !== 2)
    gaps.push(`review version is ${workflow.reviewVersion ?? "unrecorded"}, not 2`);
  if (!workflow.reviewCurrent) gaps.push("review is not current");
  const plan = workflow.reviewPlan,
    passes = workflow.reviewPasses;
  if (!plan) gaps.push("no review plan recorded");
  if (!passes) gaps.push("no reviewer passes recorded");
  if (!plan || !passes) return gaps;
  const required = Math.max(plan.passes, plan.lenses.length);
  const named = passes.filter((p) => p.agentId.trim());
  if (named.length < passes.length)
    gaps.push(`${passes.length - named.length} pass(es) have no reviewer agent id`);
  const agents = new Set(named.map((p) => p.agentId));
  if (agents.size < required)
    gaps.push(
      `${agents.size} of ${required} planned passes from distinct reviewer agent ids`,
    );
  const lensAgents = new Set<string>();
  for (const lens of plan.lenses) {
    const pass = named.find(
      (p) => p.lens === lens && !lensAgents.has(p.agentId),
    );
    if (pass) lensAgents.add(pass.agentId);
    else gaps.push(`planned lens ${lens} has no pass from its own reviewer`);
  }
  for (const [key, want] of [
    ["model", plan.reviewerModel],
    ["effort", plan.reviewerEffort],
  ] as const) {
    if (!want) continue;
    const off = passes.filter((p) => p[key] !== want);
    if (off.length)
      gaps.push(
        `planned reviewer ${key} ${want}, but ${off.length} pass(es) recorded ${[...new Set(off.map((p) => p[key] ?? "none"))].join(", ")}`,
      );
  }
  if (plan.runner === "tracetoon") {
    const off = passes.filter(
      (p) => p.source !== "tracetoon-run" || !p.verifiedModel,
    );
    if (off.length)
      gaps.push(
        `planned tool-run reviewers, but ${off.length} pass(es) were not tool-run with a verified model`,
      );
  }
  return gaps;
}

/** Accept either three declared independent roles with a current v2 review, or the lean reviewed path. */
export function candidateWorkflowGaps(workflow: WorkflowRecord | undefined): string[] {
  const roles: string[] = [];
  if (workflow?.declaredIndependentRoles !== 3)
    roles.push(
      `${workflow?.declaredIndependentRoles ?? 0} of 3 independent roles declared`,
    );
  if (workflow?.reviewVersion !== 2)
    roles.push(`review version is ${workflow?.reviewVersion ?? "unrecorded"}, not 2`);
  if (!workflow?.reviewCurrent) roles.push("review is not current");
  if (!roles.length) return [];
  const lean = leanReviewGaps(workflow);
  if (!lean.length) return [];
  return [
    `three-role path: ${roles.join(", ")}`,
    `lean reviewed path: ${lean.join(", ")}`,
  ];
}

/** Keep every adoption criterion inside the frozen policy dependency closure. */
export function adoptionGate(input: {
  complete: boolean;
  purpose: string;
  quality: string;
  performance: string;
  policyCurrent: boolean;
  pendingCleanup: number;
  writers: WriterMetric[];
}) {
  const candidates = input.writers.filter(
    (m) => m.system === "tracetoon-candidate",
  );
  const workflowGaps = candidates.flatMap((m) => {
    const gaps = candidateWorkflowGaps(m.workflow as WorkflowRecord | undefined);
    return gaps.length
      ? [`${m.model}/${m.case}/r${m.replicate}: ${gaps.join("; ")}`]
      : [];
  });
  if (!candidates.length)
    workflowGaps.push("Candidate workflow records are unavailable");
  const failed = input.quality === "failed" || input.performance === "failed";
  const inconclusive =
    !input.policyCurrent ||
    input.purpose !== "confirmation" ||
    input.quality !== "passed" ||
    input.performance !== "passed" ||
    input.pendingCleanup > 0 ||
    workflowGaps.length > 0;
  const status = !input.complete
    ? "incomplete"
    : failed
      ? "failed"
      : inconclusive
        ? "inconclusive"
        : "passed";
  return {
    passed: status === "passed",
    status,
    workflowGaps,
    policyCurrent: input.policyCurrent,
    exitCode:
      status === "incomplete"
        ? 2
        : status === "failed"
          ? 1
          : status === "inconclusive"
            ? 3
            : 0,
  };
}

export interface ComparisonReport {
  model: string;
  replicate: number;
  comparison: string;
  report: Report;
}
/** The two arms whose drafts are checked for accuracy flags. */
export const ACCURACY_ARMS = ["tracetoon-candidate", "tracetoon-baseline"] as const;
export type AccuracyArm = (typeof ACCURACY_ARMS)[number];
export interface AccuracyFinding {
  id: string;
  /** Missing in findings written before baseline flags were collected: those are candidate flags. */
  arm?: AccuracyArm;
  model: string;
  replicate: number;
  case: string;
  artifactDigest: string;
  claim: string;
  statuses: string[];
  observations: {
    judge: string;
    /** The other system in the pair that raised the flag. */
    opponent?: string;
    evidenceRefs: string[];
    reason: string;
  }[];
}
export function findingArm(finding: { arm?: string }): AccuracyArm {
  return finding.arm === "tracetoon-baseline"
    ? "tracetoon-baseline"
    : "tracetoon-candidate";
}
const draftKey = (model: string, replicate: number, kase: string) =>
  `${model}/${kase}/r${replicate}`;
/** Drafts scored in a candidate-vs-baseline pair: the shared denominator of both accuracy rates. */
export function accuracyScoredDrafts(
  pairs: { model: string; replicate: number; pair: PairResult }[],
): string[] {
  const keys = new Set<string>();
  for (const { model, replicate, pair } of pairs)
    if (ACCURACY_ARMS.every((arm) => pair.sides[arm]?.length))
      keys.add(draftKey(model, replicate, pair.case));
  return [...keys].sort();
}
export function accuracyFindings(
  pairs: { model: string; replicate: number; pair: PairResult }[],
  artifacts: Map<string, PRArtifact>,
): AccuracyFinding[] {
  const all = new Map<string, AccuracyFinding>();
  for (const { model, replicate, pair } of pairs)
    for (const arm of ACCURACY_ARMS) {
      const sides = pair.sides[arm];
      if (!sides?.length) continue;
      const artifact = artifacts.get(`${replicate}/${model}/${pair.case}/${arm}`);
      if (!artifact)
        throw new Error(`Accuracy gate is missing its ${arm} artifact.`);
      const sha = artifactDigest(artifact);
      const opponent = [pair.x, pair.y].find((s) => s !== arm);
      for (const side of sides)
        for (const assessment of side.claimAssessments) {
          if (!["contradicted", "unsupported"].includes(assessment.status))
            continue;
          // Candidate ids keep their original key so existing adjudications still match.
          const id = stageKey("accuracy-finding", {
            model,
            replicate,
            case: pair.case,
            artifact: sha,
            claim: assessment.claim,
            ...(arm === "tracetoon-candidate" ? {} : { arm }),
          });
          const finding = all.get(id) ?? {
            id,
            arm,
            model,
            replicate,
            case: pair.case,
            artifactDigest: sha,
            claim: assessment.claim,
            statuses: [],
            observations: [],
          };
          if (!finding.statuses.includes(assessment.status))
            finding.statuses.push(assessment.status);
          finding.observations.push({
            judge: pair.judge,
            ...(opponent ? { opponent } : {}),
            evidenceRefs: assessment.evidenceRefs,
            reason: assessment.reason,
          });
          all.set(id, finding);
        }
    }
  return [...all.values()];
}
export interface Adjudication {
  finding: string;
  /** Optional; when present it must match the finding's arm. Old entries omit it. */
  arm?: AccuracyArm;
  outcome: "confirmed" | "false-positive" | "unresolved";
  reviewedBy: string;
  reviewedAt: string;
  rationale: string;
  sources: AdjudicationSource[];
}
export interface AccuracyComparison {
  /** Drafts scored in candidate-vs-baseline pairs; each arm's rate divides by this. */
  scoredDrafts: number;
  candidate: { flags: number; confirmed: number; rate: number | null };
  baseline: { flags: number; confirmed: number; rate: number | null };
  /** Confirmed flags on drafts outside the shared pairs: adjudicated but not counted. */
  uncountedConfirmed: number;
  unresolved: number;
}
export function qualityGate(
  reports: ComparisonReport[],
  split: string,
  models: string[],
  findings: AccuracyFinding[],
  adjudications: Adjudication[] = [],
  /** The provider's no-Tracetoon writer (`codex-native`, `claude-native`); null when the run had none. */
  native: string | null = "codex-native",
  /** Draft keys (`model/case/rN`) scored in candidate-vs-baseline pairs; see accuracyScoredDrafts. */
  scoredDrafts: string[] = [],
) {
  const failures: string[] = [],
    unresolved: string[] = [];
  const shared = new Set(scoredDrafts);
  const accuracy: AccuracyComparison = {
    scoredDrafts: shared.size,
    candidate: { flags: 0, confirmed: 0, rate: null },
    baseline: { flags: 0, confirmed: 0, rate: null },
    uncountedConfirmed: 0,
    unresolved: 0,
  };
  for (const finding of findings) {
    const arm = findingArm(finding);
    const tally = arm === "tracetoon-candidate" ? accuracy.candidate : accuracy.baseline;
    tally.flags++;
    const audit = adjudications.find((a) => a.finding === finding.id);
    if (!audit || audit.outcome === "unresolved") {
      accuracy.unresolved++;
      unresolved.push(`${finding.id} [${arm}]`);
    } else if (audit.outcome === "confirmed") {
      if (shared.has(draftKey(finding.model, finding.replicate, finding.case)))
        tally.confirmed++;
      else accuracy.uncountedConfirmed++;
    }
  }
  if (shared.size) {
    accuracy.candidate.rate = accuracy.candidate.confirmed / shared.size;
    accuracy.baseline.rate = accuracy.baseline.confirmed / shared.size;
  } else if (findings.length)
    unresolved.push("accuracy: no drafts scored in candidate-vs-baseline pairs");
  const rate = (t: { confirmed: number; rate: number | null }) =>
    `${t.rate!.toFixed(3)} (${t.confirmed}/${shared.size})`;
  // Compare only once every flag on both arms is adjudicated.
  if (
    !accuracy.unresolved &&
    shared.size &&
    accuracy.candidate.rate! > accuracy.baseline.rate! + 1e-9
  )
    failures.push(
      `Candidate confirmed accuracy errors per scored draft ${rate(accuracy.candidate)} exceed baseline ${rate(accuracy.baseline)}`,
    );
  let improved = false,
    totalWins = 0,
    totalLosses = 0;
  for (const model of models) {
    const selected = reports.filter(
      (r) => r.model === model && r.comparison === "tracetoon-baseline",
    );
    const avg = (system: string, key: "claimCoverage" | "contextCoverage") => {
      const values = selected
        .map(
          (r) =>
            r.report.splits[split]?.systems.find((s) => s.system === system)?.[
              key
            ],
        )
        .filter((v): v is number => v !== undefined && Number.isFinite(v));
      return values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null;
    };
    for (const key of ["claimCoverage", "contextCoverage"] as const) {
      const b = avg("tracetoon-baseline", key),
        c = avg("tracetoon-candidate", key);
      if (b === null || c === null) {
        unresolved.push(`${model}: ${key} unavailable`);
        continue;
      }
      if (c + 1e-9 < b)
        failures.push(`${model}: ${key} regressed against baseline`);
      if (c > b + 1e-9) improved = true;
    }
    // Consensus rows have a stable public shape; no individual judge vote can hide a flagged claim.
    for (const comparison of ["tracetoon-baseline", native].filter(
      (c): c is string => c !== null,
    )) {
      let wins = 0,
        losses = 0;
      for (const report of reports.filter(
        (r) => r.model === model && r.comparison === comparison,
      )) {
        const summary = report.report.splits[split]?.pairs.find(
          (h) => h.judge === "all judges agree",
        );
        if (summary) {
          wins += summary.yWins;
          losses += summary.xWins;
        }
      }
      if (wins < losses)
        failures.push(
          `${model}: consensus losses exceed wins against ${comparison}`,
        );
      if (comparison === "tracetoon-baseline") {
        totalWins += wins;
        totalLosses += losses;
      }
    }
  }
  if (!improved)
    failures.push(
      "No measured claim/context coverage improvement against baseline",
    );
  if (totalWins <= totalLosses)
    failures.push(
      "Aggregate consensus wins must exceed losses against baseline",
    );
  return {
    passed: !failures.length && !unresolved.length,
    status: failures.length
      ? "failed"
      : unresolved.length
        ? "inconclusive"
        : "passed",
    failures,
    unresolvedAccuracy: unresolved,
    consensusWins: totalWins,
    consensusLosses: totalLosses,
    accuracy,
    note: "Raw judgments remain unchanged. Source adjudication is a separate audit; every candidate and baseline flag must be adjudicated, and the candidate's confirmed errors per scored draft may not exceed the baseline's.",
  };
}
