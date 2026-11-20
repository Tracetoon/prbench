import { describe, expect, test } from "bun:test";
import { prepareFlags } from "../scripts/brief-replay.ts";

describe("brief-replay prepareFlags", () => {
  test("reads the trailing SKILL.md lines as a writer would", () => {
    const md = [
      "2. **Prepare.** `tracetoon prepare --json --layout <layout>` with the `Brief layout:` line",
      "Reviewer model: cheap.",
      "",
      "Reviewer effort: xhigh.",
      "Review passes: 2.",
      "Review lenses: d.",
      "Reviewer runner: auto.",
      "Review recheck: none.",
      "Brief layout: toon.",
      "Graph search: fulltext.",
    ].join("\n");
    expect(prepareFlags(md)).toEqual([
      "--layout", "toon", "--review-passes", "2", "--review-lenses", "d",
      "--reviewer-model", "cheap", "--reviewer-effort", "xhigh", "--reviewer-runner", "auto",
      "--review-recheck", "none", "--graph-search", "fulltext",
    ]);
  });

  test("omits unnamed options and requires layout and passes", () => {
    expect(prepareFlags("Brief layout: toon.\nReview passes: 1.\nReview lenses: none.\nReviewer model: default.")).toEqual([
      "--layout", "toon", "--review-passes", "1",
    ]);
    expect(() => prepareFlags("Review passes: 1.")).toThrow(/Brief layout/);
  });
});
