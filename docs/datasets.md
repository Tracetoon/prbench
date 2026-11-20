# Public case libraries

prbench distributes curated replay data as separate, versioned GitHub release assets. The source repository contains the registry, dataset card and packaging tools, never the real transcripts. This follows the separation of harness and downloadable data used by [SWE-bench](https://www.swebench.com/SWE-bench/guides/datasets/), and the named, versioned CLI dataset workflow described by [Terminal-Bench](https://www.tbench.ai/news/registry-and-adapters). The [dataset card](../datasets/DATASET_CARD.md) records composition, consent, transformations, license and limitations, following the [Hugging Face dataset-card convention](https://huggingface.co/docs/hub/en/datasets-cards).

## Download and run

| Version | Cases | Splits | Status |
| --- | --- | --- | --- |
| `real-cases@4.0.0` | 61 | one pool, all `dev` | the v4 benchmark pool and golden run; archive staged for release `cases-v4.0.0` |
| `real-cases@2.0.0` | 27 | 19 dev, 8 test | published |
| `real-cases@1.0.0` | 7 | 5 dev, 2 test | published; the CLI's default |

From a checkout of this repository (Bun 1.3.14+ and Git):

```sh
bun install --frozen-lockfile
bun run prbench datasets list
bun run prbench datasets fetch real-cases@4.0.0
bun run prbench preflight --dataset real-cases@4.0.0
```

The packaged CLI (`bun install --global https://github.com/Tracetoon/prbench/releases/download/v0.3.0/prbench-0.3.0.tgz`) knows only 1.0.0 and 2.0.0: each CLI ships its own registry.

No account is required to download. `datasets fetch` verifies the archive and every installed file, then installs into a version-specific cache under `~/.cache/prbench/datasets` (or `$XDG_CACHE_HOME/prbench/datasets`). A verified cache works offline. `--out cases-local` installs into an empty project-local directory instead; existing user data is never replaced. If an installed dataset fails integrity checks, move it aside and fetch it again.

If `prbench` is not found after a global installation, add the directory printed by `bun pm bin --global` to PATH and reopen the terminal. If Bun reports a dependency loop while upgrading an older URL installation, run `bun remove --global prbench` once before installing the new release. Comparisons also need the Codex CLI or Claude Code; downloading and preflight do not.

For a frozen comparison, supply the baseline and candidate skills with their matching platform binaries:

```sh
bun run prbench compare --dataset real-cases@4.0.0 \
  --baseline-skill path/to/baseline-skill \
  --candidate-skill path/to/candidate-skill \
  --out results/my-comparison --prepare-only
```

With neither `--cases` nor `--dataset`, compare uses the CLI's pinned default dataset (`real-cases@1.0.0`). Its preparation profile is selected automatically. `--cases` keeps the local-case workflow; pair it with `--preparation <file>` as needed. Do not combine `--cases` and `--dataset`.

`--prepare-only`, `--plan` and dataset installation make no model calls. After preparation, use the same command with `--plan --resume` to inspect the schedule. Running the evaluation needs `prbench auth codex` or `prbench auth claude` and your own model quota; remove `--prepare-only` and add `--resume` to proceed. Both arm skills are still supplied by the researcher. The download does not install, build or approve a candidate tool.

**Splits.** 4.0.0 has no held-out split. The maintainers decided on 2026-11-15 to use one growing pool for both development and confirmation runs, so results on it are in-sample. In 1.0.0 and 2.0.0, `test` cases stay behind compare's passing-development gate: do not tune on public test facts and then report them as untouched validation.

## Reproducibility and boundaries

The tracked registry pins exact version URLs, archive SHA-256, manifest SHA-256, archive length and split IDs. `dataset.json` hashes all other files. No mutable `latest` download is used. Download verification never executes setup, follows archive links or merges with an existing directory. Setup needs ordinary package-registry access and is recorded separately from writer validation. Installed CLI packages record a null Git revision and bind their source bytes by hash; they do not require a Git checkout or borrow the revision of an enclosing project.

Historical fact-authoring digests live in `fact-sources/digest.json`, wrapped with case revisions and a hash of the source packet. Provenance identifies their exact ranges and labels the new review as automated. Preflight checks identity and hashes. These artifacts are judge-side source records, not replay sessions, and are never copied into writer sandboxes or writer cache identities. They document the old extractor's observations, including limitations; they cannot attest exact-head tests or disprove newer evidence.

## Releasing a correction

1. Import or curate copies in ignored `cases-local/`. Preserve split assignments, repository identity and factual uncertainty. Obtain consent for public redistribution and review prompts, file contents, command output, added fact-source artifacts and bundled source histories for private data.
2. Supply genuine per-fact provenance. Do not invent reviewers, fabricate executions or use whole-diff references as a substitute for source review. The local importer produces raw cases, not automatically publishable releases.
3. Record the privacy review and owner consent in an ignored `prbench.publication/v1` JSON record, including the dataset id/version, `publicRedistribution: true`, reviewer/date, case IDs and SHA-256 fingerprints of every case input. Keep raw scanner reports and mappings private.
4. Stage the release: `stage-release.ts` copies the cases and their fixture bundles, merges `preparation.json`, copies `DATASET_CARD.md` and `LICENSE`, and generates `MANIFEST.md` and `NOTICE.md`. Pin fixtures in self-contained bundles. Then scan and package:

   ```sh
   bun run scripts/stage-release.ts --version 4.0.1 --out results/release-4.0.1/cases \
     --from <case library> --splits datasets/real-cases-4.0.0.draft.json \
     --record results/publication-4.0.1.json --reviewed-by "<who>" --consent-confirmed
   bun run scripts/redact-cases.ts --cases results/release-4.0.1/cases --rules <private rules>   # must end with no unreviewed hits
   bun run scripts/package-dataset.ts --cases results/release-4.0.1/cases \
     --out results/dataset-release --version 4.0.1 \
     --publication results/publication-4.0.1.json
   ```

   Without `--apply`, the scanner passes a hit that a `replace` rule covers even if the value is still present. Also run it with `--apply` on a scratch copy of the staged tree and diff the copy: any change is content that was never redacted, and must be applied, or reviewed and kept on purpose, before the record is made.

5. The packager requires provenance, applies preflight, rejects changed post-review inputs, excludes excluded cases and allowlists archive files. It never calls writers or judges. Verify the output through the installer and run a prepare-only/plan smoke with a built skill.
6. Publish the archive, `dataset-release.json`, `SHA256SUMS.txt`, manifest and dataset card as a new `cases-vX.Y.Z` release. Add its descriptor to `datasets/registry.json` and ship the CLI registry update. Never replace an existing dataset version's assets. Facts may be corrected only from evidence and with a documented new version.

Release assets are downloadable without authentication. GitHub can mark releases immutable; checksum pinning additionally rejects replaced bytes on clients. The project makes no cryptographic claim that GitHub assets are impossible for maintainers to replace. Retain old versions and checksums so historical experiments remain reproducible.
