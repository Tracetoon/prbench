---
pretty_name: prbench real PR replay cases
language:
- en
license: apache-2.0
tags:
- software-engineering
- agent-traces
- evaluation
size_categories:
- n<1K
---

# prbench real PR replay cases, 4.0.0

Sixty-one historical replay cases for comparing the accuracy and usefulness of AI-written pull requests. Each case contains:
- an immutable repository bundle;
- time-sliced, redacted work sessions;
- a fact sheet reviewed by an expert model panel;
- source-bound fact provenance.

No original session files are needed on the receiving machine.

Version 4.0.0 is the pool used for the v4 benchmark (the Tracetoon `candidate62` golden run; see `golden/v4-candidate62/` in the prbench repository). It contains:
- the 27 cases of 2.0.0, with the same sessions and bundles;
- 16 cases added in the 3.0.0 review (never published on their own);
- 18 cases from the November 2026 expansion.

The cases come from thirteen repositories:
- Tracetoon (17 cases) and prbench (9), dogfooded work;
- the AI First CLI (10), content (4), website (3) and editor extension (1) repositories;
- Showtail (6);
- VEX AIM: the workshop (2), the AIM CLI (1), a VEX AIM agent repository (4) and the vexide `vex-v5-serial` library (1);
- winapps (2) and the Bazzite desktop login service (1).

They cover bug fixes, features, documentation, CI, release engineering, licensing and an upstream contribution, from one-file changes to forty-file features, in TypeScript, Python, shell/systemd, Rust and prose. Thirty-three cases were recorded with Claude Code and twenty-eight with Codex; twenty include more than one session file (a subagent transcript or a second session). In total the sessions hold 60,844 records, and the fact sheets 1,397 facts.

## Access

Use a prbench build whose registry lists 4.0.0 (the harness from this repository once the release is published), then run `prbench datasets fetch real-cases@4.0.0`. Use `--out cases-local` for a project-local installation.

**Requirements:**
- Downloads require no account. Running model evaluations requires the user's own model login.
- Bun 1.3.14+ and Git are required.
- Most TypeScript cases prepare with `bun install --frozen-lockfile` (see `preparation.json`). Tracetoon cases also pin a sibling Showtail checkout from `.fixtures`. `aifirstextension-apache-license` prepares with `npm ci --allow-git=all`: npm 12 refuses git dependencies without that flag. The v4 golden run used plain `npm ci` (npm 11) for that case.
- Shell, documentation, Python and Rust cases have no preparation step. Cargo is not run.
- Hardware acceptance (VEX AIM, VEX V5) requires a real device and is not implied by this dataset.

`prbench compare --dataset real-cases@4.0.0 --baseline-skill <built-dir> --candidate-skill <built-dir> --out results/comparison --prepare-only` performs no model calls. Remove `--prepare-only` only when you are ready to run the paid or usage-limited evaluation.

## Composition and splits

There is one pool and no held-out split: every case is in `dev`. The maintainers decided on 2026-11-15 to use the whole pool both for development and for confirmation runs, and to grow it rather than seal part of it. Treat any result on these cases as an in-sample result. Do not describe it as validation on untouched data.

**Overlap:** several cases share one long working session, cut to different time windows: most Tracetoon and prbench cases, the AI First CLI cases, and the two VEX AIM workshop cases.

`MANIFEST.md` lists each case's sessions, fact count, review kind, published-PR availability, source license and preparation.

## Collection and provenance

All cases come from work by the session owners, recorded between March and November 2026. Every repository is public except the VEX AIM agent repository (see Privacy).

**Importing.** Cases are imported from an explicit candidate list (`datasets/expansion/candidates.json` and `scripts/discover-cases.ts` in the prbench repository). Imports retain:
- base and head commits;
- session IDs and timestamps;
- tool-call links and record order.

**Slicing.** Each session is cut to the work that produced the change. Records that wrote published PR text are removed, together with the results of those calls. Importing fails if the published title or body survives in a slice. Published PR text, when present, is a separate comparison artifact and never a writer input.

**Fact sheets.** Fact sheets were drafted from the diff, commits and sessions before the published PR was read. Each fact cites hashed line ranges of its sources. Preflight checks those hashes and ranges.

**Reviews.** Every 4.0.0 fact sheet was reviewed by the expert panel (`prbench fact-review`, see `docs/fact-review.md`) and its `facts-provenance.json` has `reviewKind: "expert-panel"`. Claude Opus and Codex Sol reviewers at xhigh effort checked each fact against the raw evidence over several rounds. A change was accepted only when both model families agreed. Disputed items went to a debate, then to two judges (Claude Fable and Codex Astra); Fable decided splits. Earlier owner (`human`) and `automated` reviews of the 2.0.0 cases were the starting point for their panel review.

**Limits of the facts.** Some facts describe clipped or aggregated historical observations. A missing observation does not mean an event never happened, and fresh, accurate evidence must be judged on its own. Test-run counts do not establish passing checks on the exact final commit.

## Privacy and transformations

**What the review covered:** prompts, embedded file contents, commands, outputs, commit metadata and the published PR text.

**Changes applied to every session:**
- **Personal identifiers:** email addresses in session logs are replaced with placeholders. Home-directory paths, user names in paths and host names are normalized; the recorded checkout paths in `case.json` are rewritten to match.
- **Embedded payloads:** inline image data, encrypted provider reasoning and provider signatures are removed. Their record structure is kept.
- **Out-of-scope content:** records that read or edited code outside a case's repositories are replaced in place by an `[omitted: …]` stub. This covers a private robot-control repository in the VEX library session and reads of an internal graph-database checkout in Tracetoon and prbench sessions (`vex-v5-serial-aim-port`, `tracetoon-evidence-graph`, `prbench-aggregate-only`, `prbench-graph-compare-doc`). Each stub keeps the record's ids, type, tool-call pairing and line, so fact provenance still points at the same records.
- **Secrets:** a fail-closed scanner (`scripts/redact-cases.ts`) checks for credential-shaped values, keys and personal data, and every finding was reviewed. For 4.0.0 the scan was rerun over the staged release: it ends with no unreviewed hits, and re-applying the rules changes nothing beyond the reviewed exceptions listed below.

No redaction map, authentication cache or raw session is distributed.

**Left unchanged:** Git author and commit metadata stay in the source bundles, so commit SHAs remain valid. The four `vexagent-*` cases publish the history of the VEX AIM agent repository, which has no public remote and no license file; the owner approved its release with this dataset. One committed build file in that history contains a local home path. Four Tracetoon sessions first published in 1.0.0 (`pr9`–`pr12`) keep a Windows 8.3 temp path with a shortened collaborator account name, and two fact sheets (`tracetoon-evidence-graph`, `tracetoon-sql-row-order`) use the engine's former name, cypherlite. Both are kept byte-identical to the inputs of the v4 golden run. The four Tracetoon cases from the evidence-graph work include a compiled WebAssembly build of the Relate graph engine, which Tracetoon vendors. That build is part of the public Tracetoon history and is redistributed unchanged. Relate was formerly named cypherlite. Session prose and fact sheets use the new name, while file names, code identifiers and repository URLs keep the old one so they match the bundles.

**Integrity:** the registry pins the archive checksum, and `dataset.json` hashes every installed file. Download verification never executes preparation commands. Package managers may need network access when a comparison prepares a checkout.

## Intended use and limitations

Use the cases for paired PR-writing tool comparisons on fixed evidence. Keep the cases, splits, model settings and preparation identical across the tools you compare.

**Limitations:**
- Sixty-one cases from a few owners' projects are a convenience sample, not a representative measure of general software-engineering ability.
- Almost half of the cases (26) come from developing Tracetoon and prbench themselves.
- There is no held-out split; results on this pool are in-sample.
- Some slices come from long multi-task sessions, and some lack a direct user prompt.
- Stubbed records hide part of the work in four cases.

Publishing the data asserts no benchmark result.

## License, attribution and maintenance

Dataset compilation, owner-contributed text and annotations are distributed under Apache-2.0; see LICENSE.

Source repositories keep their own terms: Apache-2.0 for most, MIT for `vex-v5-serial` and AGPL-3.0 for winapps. The VEX AIM agent repository has no license file; its history is redistributed with the owner's permission, for benchmarking only. Dependencies, vendored builds and quoted third-party material also keep their upstream terms. See NOTICE.md and the licenses in each Git history, and attribute Tracetoon/prbench and the source projects when redistributing.

**Corrections:**
- Do not replace the assets of an existing version; corrections need a new dataset version and checksum.
- Report accidental disclosure privately, through the repository's private vulnerability reporting or directly to the owner. Never reproduce secrets in public issues.

The release is hosted at https://github.com/Tracetoon/prbench/releases/tag/cases-v4.0.0 (earlier versions keep their own tags). The harness and the dataset are versioned independently.
