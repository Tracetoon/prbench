import { expect, test } from "bun:test";
import { adoptionGate } from "../src/gates.ts";
const input = {
  complete: true,
  purpose: "confirmation",
  quality: "passed",
  performance: "passed",
  policyCurrent: true,
  pendingCleanup: 0,
  writers: [
    {
      case: "c",
      model: "m",
      system: "tracetoon-candidate",
      replicate: 1,
      workflow: {
        declaredIndependentRoles: 3,
        reviewCurrent: true,
        reviewVersion: 2,
      },
    },
  ],
};
test("adoption requires complete quality, efficiency and independent current review evidence", () => {
  expect(adoptionGate(input)).toMatchObject({
    passed: true,
    status: "passed",
    exitCode: 0,
  });
  expect(adoptionGate({ ...input, quality: "failed" })).toMatchObject({
    passed: false,
    status: "failed",
    exitCode: 1,
  });
  expect(
    adoptionGate({ ...input, complete: false, quality: "failed" }),
  ).toMatchObject({ passed: false, status: "incomplete", exitCode: 2 });
  for (const change of [
    { purpose: "diagnostic" },
    { policyCurrent: false },
    { pendingCleanup: 1 },
    { performance: "inconclusive" },
    { quality: "unknown" },
    { writers: [] },
  ])
    expect(adoptionGate({ ...input, ...change })).toMatchObject({
      passed: false,
      status: "inconclusive",
      exitCode: 3,
    });
  expect(
    adoptionGate({
      ...input,
      writers: [
        {
          ...input.writers[0]!,
          workflow: { ...input.writers[0]!.workflow, reviewVersion: 1 },
        },
      ],
    }).passed,
  ).toBe(false);
  expect(
    adoptionGate({
      ...input,
      writers: [
        {
          ...input.writers[0]!,
          workflow: {
            ...input.writers[0]!.workflow,
            declaredIndependentRoles: 2,
          },
        },
      ],
    }).passed,
  ).toBe(false);
});

const lean = (workflow: Record<string, unknown>) =>
  adoptionGate({
    ...input,
    writers: [
      {
        ...input.writers[0]!,
        workflow: {
          declaredIndependentRoles: 1,
          reviewCurrent: true,
          reviewVersion: 2,
          reviewPlan: {
            passes: 2,
            lenses: ["a", "b"],
            reviewerModel: "sonnet",
            reviewerEffort: "high",
          },
          reviewPasses: [
            { agentId: "r1", lens: "a", model: "sonnet", effort: "high" },
            { agentId: "r2", lens: "b", model: "sonnet", effort: "high" },
          ],
          limitations: [],
          ...workflow,
        },
      },
    ],
  });

test("the lean reviewed path is accepted when its current v2 review met the plan", () => {
  expect(lean({})).toMatchObject({ passed: true, workflowGaps: [] });
  expect(
    lean({
      reviewPlan: { passes: 1, lenses: [] },
      reviewPasses: [{ agentId: "r1" }],
    }).passed,
  ).toBe(true);
});

test("lean reviewed path gaps name the requirement that failed", () => {
  const gaps = (workflow: Record<string, unknown>) =>
    lean(workflow).workflowGaps.join("\n");
  const cases: [Record<string, unknown>, string][] = [
    [{ reviewVersion: 1 }, "review version is 1, not 2"],
    [{ reviewCurrent: false }, "review is not current"],
    [{ reviewPlan: undefined }, "no review plan recorded"],
    [{ reviewPasses: undefined }, "no reviewer passes recorded"],
    [
      {
        reviewPasses: [
          { agentId: "r1", lens: "a", model: "sonnet", effort: "high" },
          { agentId: "r1", lens: "b", model: "sonnet", effort: "high" },
        ],
      },
      "1 of 2 planned passes from distinct reviewer agent ids",
    ],
    [
      {
        reviewPasses: [
          { agentId: "r1", lens: "a", model: "sonnet", effort: "high" },
          { agentId: "r2", lens: "a", model: "sonnet", effort: "high" },
        ],
      },
      "planned lens b has no pass from its own reviewer",
    ],
    [
      {
        reviewPasses: [
          { agentId: "r1", lens: "a", model: "haiku", effort: "high" },
          { agentId: "r2", lens: "b", model: "sonnet", effort: "high" },
        ],
      },
      "planned reviewer model sonnet, but 1 pass(es) recorded haiku",
    ],
    [
      {
        reviewPasses: [
          { agentId: "r1", lens: "a", model: "sonnet" },
          { agentId: "r2", lens: "b", model: "sonnet", effort: "high" },
        ],
      },
      "planned reviewer effort high, but 1 pass(es) recorded none",
    ],
    [
      {
        reviewPasses: [
          { agentId: "", lens: "a", model: "sonnet", effort: "high" },
          { agentId: "r2", lens: "b", model: "sonnet", effort: "high" },
        ],
      },
      "1 pass(es) have no reviewer agent id",
    ],
    [
      {
        reviewPlan: { passes: 1, lenses: [], reviewerModel: "luna", runner: "tracetoon" },
        reviewPasses: [{ agentId: "s1", model: "luna", source: "tracetoon-run", verifiedModel: null }],
      },
      "not tool-run with a verified model",
    ],
  ];
  for (const [change, message] of cases) {
    const result = lean(change);
    expect(result.passed).toBe(false);
    expect(result.status).toBe("inconclusive");
    expect(gaps(change)).toContain(message);
    expect(gaps(change)).toContain("three-role path: 1 of 3 independent roles declared");
  }
  expect(
    lean({
      reviewPlan: { passes: 1, lenses: [], reviewerModel: "luna", runner: "tracetoon" },
      reviewPasses: [
        { agentId: "s1", model: "luna", source: "tracetoon-run", verifiedModel: "gpt-6-luna" },
      ],
    }).passed,
  ).toBe(true);
});
