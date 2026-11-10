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

# prbench real PR replay cases, 2.0.0

Twenty-seven historical replay cases for comparing the accuracy and usefulness of AI-written pull requests. Each case contains:
- an immutable repository bundle;
- time-sliced, redacted work sessions;
- a fact sheet;
- source-bound fact provenance.

No original session files are needed on the receiving machine.

Version 2.0.0 keeps the seven 1.0.0 cases unchanged. It adds twenty cases from nine repository families:
- Tracetoon and prbench (dogfooded work);
- VEX AIM workshop and the vexide `vex-v5-serial` library;
- Showtail;
- the AI First CLI and content repositories;
- the Bazzite desktop login service;
- winapps.

The new cases cover bug fixes, features, documentation, CI, licensing and an upstream contribution, from one-file changes to forty-file features. Their languages are TypeScript, shell/systemd, Rust and prose. Eleven new cases were recorded with Claude Code (three include a subagent transcript) and nine with Codex.

## Access

Install prbench 0.3.0 or newer, then run `prbench datasets fetch real-cases@2.0.0`. Use `--out cases-local` for a project-local installation.

**Requirements:**
- Downloads require no account. Running model evaluations requires the user's own model login.
- Bun 1.3.14+ and Git are required.
- TypeScript cases prepare with `bun install --frozen-lockfile` (see `preparation.json`). Tracetoon cases also pin a sibling Showtail checkout from `.fixtures`.
- Shell, documentation and Rust cases have no preparation step. Cargo is not run for the Rust case.
- Hardware acceptance (VEX AIM) requires a real device and is not implied by this dataset.

`prbench compare --dataset real-cases@2.0.0 --baseline-skill <built-dir> --candidate-skill <built-dir> --out results/comparison --prepare-only` performs no model calls. Remove `--prepare-only` only when you are ready to run the paid or usage-limited evaluation.

## Composition and splits

| Split | Cases | Purpose |
| --- | --- | --- |
| dev | 19: pr5, pr8, pr9, pr11, pr12; aifirstcli-homebrew-maven, aifirstcli-hooks-path, aifirstcli-macos-installer, aifirstcontent-apache, prbench-parallel-providers, prbench-scoring, showtail-self-upgrade, tracetoon-chained-runs, tracetoon-evidence-graph, tracetoon-lean-reviewer, tracetoon-receipt-quoting, vex-v5-serial-aim-port, vexaim-workshop-ci, winapps-sdl-wayland | Tool development and comparison |
| test | 8: pr10, vexaim; aifirstcli-tui-responsive, bazzite-stale-portal, prbench-crossjudge, showtail-windows-cmd, tracetoon-neighborhood, vexaim-workshop-norobot | Evaluation after the development gate |

**How the splits were set:**
- The 1.0.0 splits are unchanged.
- New test cases were chosen before any model run, spread across repository families.
- Public test data is for reproducibility. Do not tune on it and then report untouched held-out validation.

**Overlap:** several cases share one long working session, cut to different time windows: the Tracetoon and prbench cases, and the two VEX AIM workshop cases.

`MANIFEST.md` lists each case's sessions, fact count, review kind, published-PR availability, source license and preparation.

## Collection and provenance

All cases come from open-source work by the session owners, recorded between April and November 2026.

**Importing.** The new cases are imported from an explicit candidate list (`datasets/expansion/candidates.json` in the prbench repository). Imports retain:
- base and head commits;
- session IDs and timestamps;
- tool-call links and record order.

**Slicing.** Each session is cut to the work that produced the change. Records that wrote published PR text are removed, together with the results of those calls. Importing fails if the published title or body survives in a slice. Published PR text, when present, is a separate comparison artifact and never a writer input.

**Fact sheets.** New fact sheets were written from the diff, commits and sessions before the published PR was read. Each fact cites hashed line ranges of its sources. Preflight checks those hashes and ranges.

**Reviews.** Each case's review is recorded in its `facts-provenance.json` and listed in `MANIFEST.md`:
- `automated`: 1.0.0 facts were reviewed by Codex; new facts were drafted by Claude and corrected by an independent Claude review.
- `human`: the session owner reviewed every fact and approved the sheet, on top of the automated draft and review, which had checked each fact against its cited lines. The owner did not re-read every cited line.

**Limits of the facts.** Some facts describe clipped or aggregated historical observations. A missing observation does not mean an event never happened, and fresh, accurate evidence must be judged on its own. Test-run counts do not establish passing checks on the exact final commit.

## Privacy and transformations

**What the review covered:** prompts, embedded file contents, commands, outputs, commit metadata and the published PR text.

**Changes applied to every session:**
- **Personal identifiers:** email addresses in session logs are replaced with placeholders. Home-directory paths, user names in paths and host names are normalized; the recorded checkout paths in `case.json` are rewritten to match.
- **Embedded payloads:** inline image data, encrypted provider reasoning and provider signatures are removed. Their record structure is kept.
- **Out-of-scope content:** records that read or edited code outside a case's public repositories are replaced in place by an `[omitted: …]` stub. This covers a private robot-control repository in the VEX sessions and an internal graph-database repository in one Tracetoon session. Each stub keeps the record's ids, type, tool-call pairing and line, so fact provenance still points at the same records.
- **Secrets:** a fail-closed scanner checks for credential-shaped values, keys and personal data, and every finding was reviewed.

No redaction map, authentication cache or raw session is distributed.

**Left unchanged:** Git author and commit metadata stay in the source bundles, so commit SHAs remain valid. The four Tracetoon cases from the evidence-graph work include a compiled WebAssembly build of the Relate graph engine, which Tracetoon vendors. That build is part of the public Tracetoon history and is redistributed unchanged. Relate was formerly named cypherlite. Session prose and fact sheets use the new name, while file names, code identifiers and repository URLs keep the old one so they match the bundles.

**Integrity:** the registry pins the archive checksum, and `dataset.json` hashes every installed file. Download verification never executes preparation commands. Package managers may need network access when a comparison prepares a checkout.

## Intended use and limitations

Use the cases for paired PR-writing tool comparisons on fixed evidence. Keep the cases, splits, model settings and preparation identical across the tools you compare.

**Limitations:**
- Twenty-seven cases from a few owners' projects are a convenience sample, not a representative measure of general software-engineering ability.
- About a third of the cases come from developing Tracetoon and prbench themselves.
- Some slices come from long multi-task sessions, and some lack a direct user prompt.
- Stubbed records hide part of the work in three cases.

Publishing the data asserts no benchmark result.

## License, attribution and maintenance

Dataset compilation, owner-contributed text and annotations are distributed under Apache-2.0; see LICENSE.

Source repositories keep their own terms: Apache-2.0 for most, MIT for `vex-v5-serial` and AGPL-3.0 for winapps. Dependencies, vendored builds and quoted third-party material also keep their upstream terms. See NOTICE.md and the licenses in each Git history, and attribute Tingsters/prbench and the source projects when redistributing.

**Corrections:**
- Do not replace the assets of an existing version; corrections need a new dataset version and checksum.
- Report accidental disclosure privately, through the repository's private vulnerability reporting or directly to the owner. Never reproduce secrets in public issues.

The release is hosted at https://github.com/Tingsters/prbench/releases/tag/cases-v2.0.0. The harness and the dataset are versioned independently.
