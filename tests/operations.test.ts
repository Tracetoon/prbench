import { afterAll, expect, test } from "bun:test";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  renameSync,
  realpathSync,
} from "node:fs";
import { join, dirname } from "node:path";
import {
  directoryDigest,
  assertResume,
  prepareCase,
  operationSummary,
} from "../src/compare.ts";
import {
  cleanupExperiment,
  cleanupOwned,
  ownSandbox,
} from "../src/run/cleanup.ts";
import { runCase } from "../src/run/runner.ts";
import { original } from "../src/systems/original.ts";
import { loadCase } from "../src/schema/case.ts";
import { createSandbox } from "../src/run/sandbox.ts";
import { tracetoonDraft, tracetoonTimings } from "../src/systems/tracetoon.ts";
import { cleanupTemps, tempDir, EXAMPLE } from "./helpers.ts";
afterAll(cleanupTemps);

test("internal stage timers are retained only for this invocation and invalid records stay explicit", () => {
  const git = tempDir(),
    root = join(git, "tracetoon", "runs"),
    start = Date.now();
  for (const [id, owner] of [
    ["20260101-000000", "/work"],
    ["20260101-000001", "/other"],
  ]) {
    const dir = join(root, id!);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "task.json"),
      JSON.stringify({
        root: owner,
        branch: "feature",
        startedAt: new Date(start + 1).toISOString(),
      }),
    );
    writeFileSync(
      join(dir, "timings.json"),
      JSON.stringify([
        { stage: "digest", durationMs: 12 },
        { stage: "context", durationMs: 3 },
        { stage: "check", durationMs: -1 },
      ]),
    );
  }
  const timing = tracetoonTimings(git, {
    root: "/work",
    branch: "feature",
    startedAt: start,
  });
  expect(timing.entries).toEqual([
    { stage: "digest", durationMs: 12 },
    { stage: "context", durationMs: 3 },
  ]);
  expect(timing.gaps).toContain("An invalid runtime timing was excluded.");
  // Another checkout's runs never count; the branch alone does not exclude a
  // run in this checkout (a writer may switch branches mid-task).
  expect(
    tracetoonTimings(git, {
      root: "/elsewhere",
      branch: "feature",
      startedAt: start,
    }).entries,
  ).toEqual([]);
  expect(
    tracetoonTimings(git, { root: "/work", branch: "other", startedAt: start })
      .entries,
  ).toHaveLength(2);
  const rows = operationSummary([
    {
      model: "writer",
      system: "candidate",
      toolTimings: timing.entries,
      toolTimingGaps: timing.gaps,
    },
  ]);
  expect(rows[0]).toMatchObject({
    toolTimingCases: 1,
    toolTimingGapCases: 1,
    toolStages: { digest: { records: 1, totalMs: 12, medianMs: 12 } },
  });
});

test("operational medians separate queue waits, unknown usage and cleanup warnings", () => {
  const summary = operationSummary([
    {
      model: "writer",
      system: "candidate",
      stageTimings: { writerMs: 10, authWaitMs: 1000 },
      inputTokens: 30,
      cleanup: "pending",
    },
    {
      model: "writer",
      system: "candidate",
      stageTimings: { writerMs: 30, authWaitMs: 2000 },
      inputTokens: 10,
    },
  ]);
  expect(summary[0]).toMatchObject({
    writerMedianMs: 20,
    authWaitMedianMs: 1500,
    inputTokenMedian: 20,
    outputTokenMedian: null,
    pendingCleanup: 1,
  });
});

test("resume identity changes with input bytes, including nested skill files", () => {
  const root = tempDir();
  mkdirSync(join(root, "references"));
  writeFileSync(join(root, "references", "guide.md"), "first");
  const before = directoryDigest(root);
  writeFileSync(join(root, "references", "guide.md"), "second");
  expect(() => assertResume(before, directoryDigest(root))).toThrow(
    "inputs changed",
  );
  expect(() => assertResume(before, before)).not.toThrow();
});

test("a cleanup failure preserves a valid artifact and can be retried by its owner", async () => {
  const out = tempDir(),
    parent = tempDir();
  const result = await runCase(loadCase(EXAMPLE), original, {
    outDir: out,
    sandboxParent: parent,
    dispose: () => {
      throw new Error("EBUSY");
    },
  });
  expect(result.cleanup).toBe("pending");
  expect(JSON.parse(readFileSync(result.path!, "utf8")).title).toBe(
    result.artifact.title,
  );
  const status = JSON.parse(
    readFileSync(result.path!.replace(/\.json$/, ".status.json"), "utf8"),
  );
  expect(status.artifact).toBe("saved");
  expect(status.cleanup.error).toBe("EBUSY");
  expect(cleanupExperiment(out)).toEqual({ removed: 1, pending: 0 });
  expect(existsSync(status.cleanup.owner.root)).toBe(false);
  expect(existsSync(result.path!)).toBe(true);
});

test("cleanup remains recoverable after a partial removal deletes its marker", () => {
  const root = tempDir(),
    owner = ownSandbox(root);
  writeFileSync(join(root, "partial"), "temporary");
  expect(() =>
    cleanupOwned(owner, () => {
      unlinkSync(join(root, ".prbench-owner.json"));
      unlinkSync(join(root, "partial"));
      throw new Error("EBUSY after partial deletion");
    }),
  ).toThrow("EBUSY after partial deletion");
  expect(
    JSON.parse(readFileSync(join(root, ".prbench-owner.json"), "utf8")),
  ).toEqual(owner);
  cleanupOwned(owner);
  expect(existsSync(root)).toBe(false);
});

test("failed cleanup does not adopt a replacement directory", () => {
  const parent = realpathSync(tempDir()),
    root = join(parent, "owned"),
    moved = join(parent, "previous");
  mkdirSync(root);
  const owner = ownSandbox(root);
  expect(() =>
    cleanupOwned(owner, () => {
      if (dirname(root) !== parent || dirname(moved) !== parent)
        throw new Error("Test move escaped its parent");
      renameSync(root, moved);
      mkdirSync(root);
      throw new Error("replaced root");
    }),
  ).toThrow("replaced root");
  expect(existsSync(join(root, ".prbench-owner.json"))).toBe(false);
  expect(existsSync(join(moved, ".prbench-owner.json"))).toBe(true);
});

test("cleanup refuses a forged token and leaves unrelated directories intact", () => {
  const root = tempDir(),
    owner = ownSandbox(root),
    other = tempDir();
  writeFileSync(join(other, "keep"), "unrelated");
  expect(() => cleanupOwned({ ...owner, token: "wrong" })).toThrow("ownership");
  expect(() => cleanupOwned({ ...owner, root: other })).toThrow();
  expect(existsSync(join(other, "keep"))).toBe(true);
});

test("preparation failure prevents writer execution and preserves its primary error", async () => {
  let called = false;
  const fake = {
    ...original,
    id: "spy",
    run: async () => {
      called = true;
      throw new Error("writer ran");
    },
  };
  await expect(
    runCase(loadCase(EXAMPLE), fake, {
      prepare: () => {
        throw new Error("fixture unavailable");
      },
      dispose: () => {
        throw new Error("EBUSY");
      },
    }),
  ).rejects.toThrow("fixture unavailable");
  expect(called).toBe(false);
});

test("preparation commands that alter tracked case content are rejected", () => {
  const sandbox = createSandbox(loadCase(EXAMPLE), { parent: tempDir() });
  try {
    expect(() =>
      prepareCase(sandbox, "example-greet-default", {
        cases: {
          "example-greet-default": {
            commands: [
              [
                process.execPath,
                "-e",
                'require("fs").writeFileSync("greet.js", "changed")',
              ],
            ],
          },
        },
      }),
    ).toThrow("tracked case content");
  } finally {
    sandbox.dispose();
  }
});

test("draft fallback is restricted to this checkout and picks the active run", () => {
  const git = tempDir(),
    runs = join(git, "tracetoon", "runs"),
    startedAt = Date.now();
  const make = (id: string, root: string, offset = 1) => {
    const run = join(runs, id);
    mkdirSync(run, { recursive: true });
    writeFileSync(join(run, "title.txt"), "Draft");
    writeFileSync(join(run, "body.md"), "Body");
    writeFileSync(
      join(run, "task.json"),
      JSON.stringify({
        root,
        branch: "feature",
        startedAt: new Date(startedAt + offset).toISOString(),
      }),
    );
  };
  make("20260101-000000", "/other");
  make("20260101-000001", "/work");
  writeFileSync(join(runs, "latest"), "empty");
  const invocation = { root: "/work", branch: "feature", startedAt };
  expect(tracetoonDraft(git, invocation)?.run).toBe("20260101-000001");
  // Several runs in this checkout: the most recently started one, unless
  // Tracetoon's latest pointer names another qualifying run.
  make("20260101-000002", "/work", 2);
  expect(tracetoonDraft(git, invocation)?.run).toBe("20260101-000002");
  writeFileSync(join(runs, "latest"), "20260101-000001");
  expect(tracetoonDraft(git, invocation)?.run).toBe("20260101-000001");
});

test("the workflow record carries the stored review plan and reviewer passes", () => {
  const git = tempDir(),
    dir = join(git, "tracetoon", "runs", "20260101-000000"),
    start = Date.now();
  mkdirSync(dir, { recursive: true });
  const write = (name: string, value: unknown) =>
    writeFileSync(join(dir, name), JSON.stringify(value));
  write("task.json", {
    root: "/work",
    branch: "feature",
    startedAt: new Date(start + 1).toISOString(),
  });
  write("guidance.json", { v: 1 });
  write("review-input.json", {});
  write("review-result.json", {});
  write("review.json", {
    v: 2,
    reviewer: { mode: "delegated", agentId: "r2" },
    passes: [
      {
        pass: 1,
        agentId: "r1",
        lens: "a",
        model: "sonnet",
        effort: "high",
        findings: 2,
        importedAt: "x",
      },
      {
        pass: 2,
        agentId: "r2",
        lens: "b",
        model: "sonnet",
        effort: "high",
        findings: 0,
        importedAt: "y",
        source: "tracetoon-run",
        verifiedModel: null,
      },
    ],
  });
  write("review-plan.json", {
    v: 1,
    passes: 2,
    lenses: ["a", "b"],
    reviewerModel: "sonnet",
    reviewerEffort: "high",
  });
  const { workflow } = tracetoonTimings(git, {
    root: "/work",
    branch: "feature",
    startedAt: start,
  });
  expect(workflow).toMatchObject({
    reviewVersion: 2,
    reviewPlan: {
      passes: 2,
      lenses: ["a", "b"],
      reviewerModel: "sonnet",
      reviewerEffort: "high",
    },
    reviewPasses: [
      { agentId: "r1", lens: "a", model: "sonnet", effort: "high" },
      {
        agentId: "r2",
        lens: "b",
        model: "sonnet",
        effort: "high",
        source: "tracetoon-run",
        verifiedModel: null,
      },
    ],
  });
  // Not current: the packet does not describe this head, so the gate still refuses it.
  expect(workflow!.reviewCurrent).toBe(false);
  write("review-plan.json", { v: 1, passes: 0 });
  expect(
    tracetoonTimings(git, {
      root: "/work",
      branch: "feature",
      startedAt: start,
    }).workflow!.reviewPlan,
  ).toBeUndefined();
});

test("the lean reviewed path records a workflow without guidance.json", () => {
  const git = tempDir(),
    dir = join(git, "tracetoon", "runs", "20260101-000000"),
    start = Date.now();
  mkdirSync(dir, { recursive: true });
  const write = (name: string, value: unknown) =>
    writeFileSync(join(dir, name), JSON.stringify(value));
  write("task.json", {
    root: "/work",
    branch: "feature",
    startedAt: new Date(start + 1).toISOString(),
  });
  write("review-input.json", {});
  write("review-result.json", {});
  write("review.json", {
    v: 2,
    drafter: { mode: "inline" },
    reviewer: { mode: "delegated", agentId: "r1" },
    passes: [
      {
        pass: 1,
        agentId: "r1",
        lens: "general",
        model: "haiku",
        effort: "xhigh",
        findings: 1,
        importedAt: "x",
      },
    ],
  });
  write("review-plan.json", {
    v: 1,
    passes: 2,
    lenses: ["d"],
    reviewerModel: "haiku",
    reviewerEffort: "xhigh",
  });
  const { workflow } = tracetoonTimings(git, {
    root: "/work",
    branch: "feature",
    startedAt: start,
  });
  expect(workflow).toMatchObject({
    reviewVersion: 2,
    declaredIndependentRoles: 1,
    reviewPlan: { passes: 2, lenses: ["d"] },
  });
  expect(workflow!.reviewPasses).toHaveLength(1);
});

test("after a branch switch the workflow record comes from the run the writer finished on", () => {
  const git = tempDir(),
    start = Date.now();
  const run = (id: string, branch: string, offset: number, passes: number) => {
    const dir = join(git, "tracetoon", "runs", id);
    mkdirSync(dir, { recursive: true });
    const write = (name: string, value: unknown) =>
      writeFileSync(join(dir, name), JSON.stringify(value));
    write("task.json", {
      root: "/work",
      branch,
      startedAt: new Date(start + offset).toISOString(),
    });
    write("review-input.json", {});
    write("review-result.json", {});
    write("review.json", {
      v: 2,
      reviewer: { mode: "delegated", agentId: "r" },
      passes: Array.from({ length: passes }, (_, i) => ({
        pass: i + 1,
        agentId: `r${i}`,
        lens: i ? "d" : "general",
        model: "luna",
        effort: "xhigh",
        findings: 0,
        importedAt: "x",
      })),
    });
  };
  run("20260101-000000", "feature", 1, 1);
  run("20260101-000001", "feature-private-trail", 5, 2);
  const { workflow } = tracetoonTimings(git, {
    root: "/work",
    branch: "feature",
    startedAt: start,
  });
  expect(workflow!.reviewPasses).toHaveLength(2);
});
