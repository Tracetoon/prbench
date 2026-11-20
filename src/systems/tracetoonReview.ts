/** Verify a declared review still describes the files collected for this artifact. */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { digest } from "../util/hash.ts";
const textHash = (text: string) => digest(text.replace(/\r\n/g, "\n"));
const objectHash = (value: unknown) => textHash(JSON.stringify(value));

/** Why a declared review does not describe the collected files; empty when it is current. */
export function tracetoonReviewIssues(root: string, headSha: string): string[] {
  const text = (name: string) => readFileSync(join(root, name), "utf8");
  const read = (name: string) => JSON.parse(text(name));
  const issues: string[] = [];
  try {
    const review = read("review.json"),
      packet = read("review-input.json"),
      result = read("review-result.json");
    // Without contributor guidance Tracetoon reports a matching review as
    // "incomplete" (guidance requirements unassessed), never "current"; the
    // lean reviewed path still counts when nothing else has gone stale.
    const lean = !existsSync(join(root, "guidance.json"));
    if (review.v !== 2) issues.push(`review version ${review.v}`);
    if (!(
      result.status === "current" ||
      (lean && result.status === "incomplete")
    ))
      issues.push(`review status ${result.status}`);
    if (!/^[a-f0-9]{40}$/.test(headSha) || packet.headSha !== headSha)
      issues.push("packet head is not the artifact head");
    if (review.inputFingerprint !== packet.fingerprint)
      issues.push("review fingerprint differs from the packet");
    if (result.inputFingerprint !== packet.fingerprint)
      issues.push("result fingerprint differs from the packet");
    if (result.reportSha256 !== objectHash(review))
      issues.push("review changed after the result was written");
    if (packet.title !== text("title.txt").trim())
      issues.push("title changed after the review");
    if (packet.body !== text("final-body.md"))
      issues.push("body changed after the review");
    // The lean reviewed path collects no contributor guidance: Tracetoon then
    // records an empty guidance hash, and there must be no guidance file.
    const guidance = lean ? "" : textHash(text("guidance.json"));
    if (packet.guidanceSha256 !== guidance)
      issues.push("guidance changed after the review");
    if (
      packet.authorSha256 !==
      textHash(existsSync(join(root, "author.md")) ? text("author.md") : "")
    )
      issues.push("author notes changed after the review");
    for (const [field, file] of [
      ["codeSourcesSha256", "source-evidence.json"],
      ["changeMapSha256", "change-map.json"],
    ])
      if (
        packet[field!] !== undefined &&
        packet[field!] !== objectHash(read(file!))
      )
        issues.push(`${file} changed after the review`);
    for (const [field, file] of [
      ["digestSha256", "digest.json"],
      ["fullDigestSha256", "digest-full.json"],
    ]) {
      if (packet[field!] === undefined) continue;
      const { generatedAt: _time, ...stable } = read(file!);
      if (packet[field!] !== objectHash(stable))
        issues.push(`${file} changed after the review`);
    }
  } catch (error) {
    issues.push(`unreadable review files: ${String(error).slice(0, 120)}`);
  }
  return issues;
}

export function currentTracetoonReview(root: string, headSha: string): boolean {
  return tracetoonReviewIssues(root, headSha).length === 0;
}
