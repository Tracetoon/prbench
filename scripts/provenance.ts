// Turns a reviewed fact draft into facts.json and facts-provenance.json.
//
//   bun run scripts/provenance.ts --case cases-local/<id> --draft <facts.draft.json>
//        --reviewed-by "<who>" [--review-kind automated|human|expert-panel] [--repo <bare git dir>]
//   bun run scripts/provenance.ts --case cases-local/<id> --rehash [--repo <bare git dir>]
//
// --rehash rebuilds the provenance from the case's own facts.json and
// facts-provenance.json after its sources changed in place (redaction keeps
// every session record on its line), keeping the review record. It lists the
// facts whose cited lines now hold an omitted-record marker: re-source or drop
// those before release.
//
// The draft lists each fact with its sources; this script hashes the cited
// content exactly as preflight reads it (src/run/preflight.ts), checks every
// line range, and writes both files into the case. Draft format:
//
//   { "claims" | "context" | "uncertainties" | "traps": [
//       { "text": "...", "rationale": "...",
//         "sources": [{ "kind": "diff" | "commit" | "git" | "session",
//                       "path"?: "...", "revision"?: "<sha>",
//                       "startLine": 1, "endLine": 9 }] } ] }
//
// "git" sources name a file at the case's base or head; "commit" sources a
// commit in base..head; "session" sources a session file of the case.
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { FACTS_SCHEMA, type Facts } from "../src/schema/case.ts";
import type {
  ExpertReviewRecord,
  FactProvenance,
  FactSource,
} from "../src/run/preflight.ts";
import { exec } from "../src/util/exec.ts";
import { digest } from "../src/util/hash.ts";

export type ReviewKind = "automated" | "human" | "expert-panel";
export type DraftSource = Omit<FactSource, "sha256">;
export interface DraftFact {
  text: string;
  rationale: string;
  sources: DraftSource[];
}
export type Draft = Record<
  "claims" | "context" | "uncertainties" | "traps",
  DraftFact[]
>;
const SECTIONS = [
  ["claims", "C"],
  ["context", "X"],
  ["uncertainties", "U"],
  ["traps", "T"],
] as const;

/** Reads a cited source exactly as preflight does (src/run/preflight.ts). */
export function sourceContent(
  caseDir: string,
  bare: string,
  s: DraftSource,
): string {
  const c = JSON.parse(readFileSync(join(caseDir, "case.json"), "utf8"));
  const git = (args: string[]) => {
    const r = exec([
      "git",
      "-c",
      "core.fsmonitor=false",
      "-c",
      "protocol.ext.allow=never",
      "--git-dir",
      bare,
      ...args,
    ]);
    if (r.code)
      throw new Error(`git ${args.join(" ")}: ${r.stderr.slice(-300)}`);
    return r.stdout;
  };
  switch (s.kind) {
    case "diff":
      return git(["diff", "--no-ext-diff", c.repo.base, c.repo.head]);
    case "commit":
      if (!s.revision || !/^[a-f0-9]{40}$/.test(s.revision))
        throw new Error("commit sources need a full revision");
      git(["merge-base", "--is-ancestor", s.revision, c.repo.head]);
      return git(["show", "--no-patch", "--format=fuller", s.revision]);
    case "git":
      if (![c.repo.base, c.repo.head].includes(s.revision) || !s.path)
        throw new Error("git sources need a path at base or head");
      return git(["show", `${s.revision}:${s.path}`]);
    case "session":
      if (
        !s.path ||
        !(c.sessions ?? []).some((x: { file: string }) => x.file === s.path)
      )
        throw new Error(`unknown session file ${s.path}`);
      return readFileSync(join(caseDir, s.path), "utf8");
    case "historical-digest":
      // Judge-side provenance for legacy cases; preflight validates its binding to the case.
      if (s.path !== "fact-sources/digest.json")
        throw new Error(`unsupported historical-digest path ${s.path}`);
      return readFileSync(join(caseDir, s.path), "utf8");
    default:
      throw new Error(`unsupported source kind ${s.kind}`);
  }
}

/** Rebuilds the draft a fact sheet and its provenance came from. */
export function draftOf(facts: Facts, provenance: FactProvenance): Draft {
  const draft = {
    claims: [],
    context: [],
    uncertainties: [],
    traps: [],
  } as Draft;
  for (const [section, prefix] of SECTIONS)
    facts[section].forEach((text, i) => {
      const e = provenance.entries[`${prefix}${i + 1}`];
      if (!e) throw new Error(`${prefix}${i + 1}: no provenance entry`);
      draft[section].push({
        text,
        rationale: e.rationale,
        sources: e.sources.map(({ sha256: _, ...s }) => s),
      });
    });
  return draft;
}

/** Builds the fact sheet and its provenance, hashing sources as preflight does. */
export function buildProvenance(
  caseDir: string,
  draft: Draft,
  opts: {
    bare: string;
    reviewedBy: string;
    reviewKind: ReviewKind;
    reviewedAt?: string;
    expertReview?: ExpertReviewRecord;
  },
): { facts: Facts; provenance: FactProvenance } {
  const contentOf = (s: DraftSource) => sourceContent(caseDir, opts.bare, s);
  const cache = new Map<string, string>();
  const facts: Facts = {
    schema: FACTS_SCHEMA,
    claims: [],
    context: [],
    uncertainties: [],
    traps: [],
  };
  const entries: FactProvenance["entries"] = {};
  for (const [section, prefix] of SECTIONS) {
    for (const [i, f] of (draft[section] ?? []).entries()) {
      const id = `${prefix}${i + 1}`;
      if (!f.text?.trim() || !f.rationale?.trim() || !f.sources?.length)
        throw new Error(`${id}: text, rationale and sources are required`);
      facts[section].push(f.text.trim());
      entries[id] = {
        rationale: f.rationale.trim(),
        sources: f.sources.map((s) => {
          const key = JSON.stringify([s.kind, s.path, s.revision]);
          let content = cache.get(key);
          if (content === undefined) cache.set(key, (content = contentOf(s)));
          const lines = content.split(/\r?\n/).length;
          if (
            !Number.isInteger(s.startLine) ||
            !Number.isInteger(s.endLine) ||
            s.startLine < 1 ||
            s.endLine < s.startLine ||
            s.endLine > lines
          )
            throw new Error(
              `${id}: lines ${s.startLine}-${s.endLine} are outside ${s.kind} ${s.path ?? s.revision ?? ""} (${lines} lines)`,
            );
          return {
            kind: s.kind,
            ...(s.path ? { path: s.path } : {}),
            ...(s.revision ? { revision: s.revision } : {}),
            startLine: s.startLine,
            endLine: s.endLine,
            sha256: digest(content),
          };
        }),
      };
    }
  }
  if (!facts.claims.length)
    throw new Error("a fact sheet needs at least one claim");
  const factsText = JSON.stringify(facts, null, 2) + "\n";
  return {
    facts,
    provenance: {
      schema: "prbench.fact-provenance/v1",
      factsSha256: digest(factsText),
      reviewedBy: opts.reviewedBy,
      reviewedAt: opts.reviewedAt ?? new Date().toISOString(),
      reviewKind: opts.reviewKind,
      ...(opts.expertReview ? { expertReview: opts.expertReview } : {}),
      entries,
    },
  };
}

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

if (import.meta.main) {
  const caseDir = resolve(arg("--case")!);
  const rehash = process.argv.includes("--rehash");
  const c = JSON.parse(readFileSync(join(caseDir, "case.json"), "utf8"));
  let bare = arg("--repo");
  let temp: string | undefined;
  if (!bare) {
    temp = bare = mkdtempSync(join(tmpdir(), "prbench-provenance-"));
    exec(["git", "init", "--quiet", "--bare", bare]);
    const r = exec([
      "git",
      "--git-dir",
      bare,
      "fetch",
      "--quiet",
      "--no-tags",
      join(caseDir, c.repo.bundle),
      "+refs/*:refs/prbench-source/*",
    ]);
    if (r.code) throw new Error(r.stderr);
  }
  try {
    let draft: Draft;
    let review: {
      reviewedBy: string;
      reviewKind: ReviewKind;
      reviewedAt?: string;
      expertReview?: ExpertReviewRecord;
    };
    if (rehash) {
      const old = JSON.parse(
        readFileSync(join(caseDir, "facts-provenance.json"), "utf8"),
      ) as FactProvenance;
      draft = draftOf(
        JSON.parse(readFileSync(join(caseDir, "facts.json"), "utf8")),
        old,
      );
      review = {
        reviewedBy: old.reviewedBy,
        reviewKind: old.reviewKind ?? "automated",
        reviewedAt: old.reviewedAt,
        ...(old.expertReview ? { expertReview: old.expertReview } : {}),
      };
    } else {
      draft = JSON.parse(
        readFileSync(resolve(arg("--draft")!), "utf8"),
      ) as Draft;
      const reviewedBy = arg("--reviewed-by");
      if (!reviewedBy) throw new Error("--reviewed-by is required");
      review = {
        reviewedBy,
        reviewKind: arg("--review-kind", "automated") as ReviewKind,
      };
    }
    const { facts, provenance } = buildProvenance(caseDir, draft, {
      bare,
      ...review,
    });
    writeFileSync(
      join(caseDir, "facts.json"),
      JSON.stringify(facts, null, 2) + "\n",
    );
    writeFileSync(
      join(caseDir, "facts-provenance.json"),
      JSON.stringify(provenance, null, 2) + "\n",
    );
    if (!c.facts) {
      c.facts = "facts.json";
      writeFileSync(
        join(caseDir, "case.json"),
        JSON.stringify(c, null, 2) + "\n",
      );
    }
    const n = Object.keys(provenance.entries).length;
    console.log(
      `ok    ${c.id}: ${facts.claims.length}/${facts.context.length}/${facts.uncertainties.length}/${facts.traps.length} facts, ${n} provenance entries`,
    );
    for (const [id, e] of Object.entries(provenance.entries))
      for (const s of e.sources) {
        if (s.kind !== "session") continue;
        const lines = sourceContent(caseDir, bare, s)
          .split(/\r?\n/)
          .slice(s.startLine - 1, s.endLine);
        const omitted = lines.filter((l) => l.includes("[omitted: ")).length;
        if (omitted)
          console.log(
            `  CHECK ${id}: ${omitted} of ${lines.length} cited line(s) in ${s.path} ${s.startLine}-${s.endLine} were stubbed`,
          );
      }
  } finally {
    if (temp && existsSync(temp))
      rmSync(temp, { recursive: true, force: true });
  }
}
