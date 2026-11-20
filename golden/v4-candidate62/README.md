# Golden run: Tracetoon candidate62 vs the original workflow (v4, 61 cases)

This folder holds the curated record of the run behind the published v4 results: Tracetoon's evidence-graph skill `candidate62` against Tracetoon's original workflow, on all 61 cases of `real-cases@4.0.0`. Each case was run in three replicates, on Codex and on Claude Code. Use it to check the published figures, study individual drafts and verdicts, or rerun the comparison.

It contains no traces, sandboxes, raw sessions, attempt logs or receipts. Local paths are replaced with placeholders such as `<home>`, `<tmp>` and `$PRBENCH`. `tools/build_bundle.py` rebuilds the folder from the raw run and fails if a local path or an unexpected e-mail address remains.

## Headline results

All figures come from `site-data-final.json` and the two `summary.json` files. Intervals are 95% case-clustered bootstrap intervals over the 61 cases.

| | Codex (writer gpt-6.1-terra, medium) | Claude Code (writer claude-sonnet-5-5, medium) |
| --- | --- | --- |
| Judges (each judges every pair in both orders) | gpt-6.1-sol, gpt-6.1-terra | claude-opus-5-5, claude-sonnet-5-5 |
| Consensus picks, candidate–original (both judges agree, both orders) | 79–38 (67.5%, CI 56–79%) | 60–21 (74.1%, CI 62–85%) |
| Composite score delta (0–100 scale) | +3.3 [1.0, 5.5] | +3.5 [0.8, 6.1] |
| Cases where candidate scores higher | 40 of 61 | 43 of 61 |
| Writer cost ratio, candidate / original (geometric mean) | 0.30 [0.28, 0.32] | 0.57 [0.53, 0.62] |
| Writer time ratio | 1.07 [0.97, 1.17] | 1.57 [1.39, 1.78] |
| Confirmed accuracy errors per draft, candidate vs original | 0.33 vs 0.16 (61 vs 30 of 183) | 0.47 vs 0.84 (86 vs 154 of 183) |
| Error difference | +0.17 [0.00, 0.36] | −0.37 [−0.58, −0.15] |
| Strict quality gate (errors non-inferior within 0.05) | fails | passes |

The Codex candidate makes more confirmed accuracy errors than the original. The decisions log (#62, #63) traces most of the Validation-section errors to known render bugs, and the result was published with this disclosed. Results on this pool are in-sample: the pool has no held-out split, and earlier candidates were tuned on the same cases.

## What is here

| Path | Contents |
| --- | --- |
| `codex/`, `claude/` | One folder per provider: |
| `…/manifest.json` | the frozen experiment: skill identities, case hashes, writer and judge contract hashes, settings (models, judges, effort, timeouts, CLI version, toolchain), harness revision |
| `…/summary.json`, `summary.md` | the comparison report and gates. `writerMetrics` is reduced to timing, outcome, tokens and priced cost; `operationalHistory` is omitted |
| `…/scores.csv` | per case × replicate × system: composite, coverage (claims, context, uncertainties), rubric, error rates, traps, cost and tokens (366 rows) |
| `…/verdicts.csv` | pairwise verdicts per case × replicate × judge (both orders combined; `flipped` = the two orders disagreed) |
| `…/accuracy-findings.json` | every claim a judge flagged as contradicted or unsupported, with the judges' reasons |
| `…/adjudications.json` | expert rulings on every flag (Fable 5.1 and GPT-6 Astra; Fable decides splits): the source of "confirmed errors" |
| `…/drafts.jsonl` | title and body of all 366 drafts (61 cases × 3 replicates × 2 systems) |
| `native-showcase/` | the three-way showcase on `prbench-compare-systems` (the provider's native agent, original workflow, candidate62): drafts and summaries |
| `site-data-final.json` | the data behind the published evidence page and report |
| `skills.json` | identities of the two Tracetoon skill bundles |
| `decisions.md` | the working decisions log of the v4 benchmark; #57–#64 cover candidate62 |
| `commands/` | the scripts as they were run: `c62-final.sh` (this run), `c62-chain.sh` and `round-any.sh` (the 61×1 panel that produced replicate 1), and `gather-final.py` (builds `site-data-final.json`) |
| `tools/build_bundle.py` | rebuilds this folder from the raw run directory |

## Systems and inputs

| | |
| --- | --- |
| Cases | `real-cases@4.0.0`: 61 cases, all `dev` (archive sha256 `baaf0630…0bfe`; see `datasets/registry.json`) |
| Baseline (`tracetoon-baseline`) | Tracetoon's original workflow: tag `v1.0.0-rc.24`, commit `9ac29c4`, buildId `dbdff588…9193` |
| Candidate (`tracetoon-candidate`) | Tracetoon evidence-graph skill: tag `candidate62`, commit `8d9783f`, buildId `d9db4725…3f77` |
| Harness | prbench `bench-v4` at `fa3db9c` (manifest `provenance.harnessRevision`); `bench-v4` and this branch contain it |
| Rubric | v6 |
| Writer CLIs | Codex CLI 0.169.0; Claude Code 2.1.319, pinned through `PRBENCH_CLAUDE_COMMAND` |
| Toolchain | Bun 1.3.14, Node 24.3.0, Linux x64 |

**Notes on inputs:**
- **Reused drafts.** The original-workflow drafts were reused from the content-addressed cache of the 2026-11-16 decision run (`pool61-vs-original`). Candidate replicate 1 came from the 61×1 panel (`panel-c62`). prbench reuses a draft only when the writer identity matches exactly: case, skill, model, effort, prompt, CLI and launch environment hash.
- **Preparation.** The run used plain `npm ci` for `aifirstextension-apache-license`. The 4.0.0 dataset ships `npm ci --allow-git=all` for that case, because npm 12 refuses git dependencies without the flag. All other preparation commands are unchanged.
- **Purpose.** `--purpose diagnostic` allows the reuse above and pre-registered judge pairs. A `confirmation` run would draft everything fresh.

## Reproduce

Allow about $620 in Claude usage at API prices (writers about $183, judges $273, accuracy review $167), plus Codex usage. Codex does not report USD costs; its writer cost is estimated at about $105, and its judge calls are not priced. A run from scratch has about 51 writer-hours on Codex and 43 on Claude. At `--parallel 6` that is roughly 7–9 hours per provider, plus judging. The golden run reused cached drafts and took about 4 hours per provider.

```sh
# 1. Harness: the exact revision that produced the run (or this branch, whose
#    later commits only add macOS/Windows fixes and resume options)
git clone https://github.com/Tracetoon/prbench && cd prbench
git checkout fa3db9c            # optional: byte-identical harness
bun install --frozen-lockfile

# 2. Cases
bun run src/cli.ts datasets fetch real-cases@4.0.0 --out cases-v4

# 3. Skills: build both bundles from Tracetoon (see docs/reproduce-graph-vs-base.md)
#    baseline  = tag v1.0.0-rc.24 (9ac29c4) -> skills/baseline
#    candidate = tag candidate62  (8d9783f) -> skills/candidate62
#    Compare the result with skills.json (buildId, binary sha256).

# 4. Writer CLIs and logins
npm install --prefix "$PWD/.cc-2.1.319" @anthropic-ai/claude-code@2.1.319
bun run src/cli.ts auth codex          # dedicated benchmark login
claude setup-token                     # prints a token; then:
bun run src/cli.ts auth claude < token.txt   # reads the token from stdin

# 5. Environment (as in commands/c62-final.sh)
export PRBENCH_CLAUDE_COMMAND="[\"$PWD/.cc-2.1.319/node_modules/.bin/claude\"]"
export PRBENCH_WRITER_TIMEOUT_MS=3600000   # 60 min per writer, frozen in the experiment
export PRBENCH_JUDGE_TIMEOUT_MS=1800000    # 30 min per judge call
export TMPDIR=/var/tmp                     # sandboxes need a disk-backed temp dir

# 6. Run both providers (writers, then both judges in both orders)
for prov in codex claude; do
  if [ $prov = claude ]; then m=claude-sonnet-5-5@medium; j=claude:claude-opus-5-5@medium,claude:claude-sonnet-5-5@medium
  else m=gpt-6.1-terra@medium; j=codex:gpt-6.1-sol@medium,codex:gpt-6.1-terra@medium; fi
  bun run src/cli.ts compare --provider $prov --models $m --judges $j \
    --systems baseline,candidate --replicates 3 --purpose diagnostic \
    --baseline-skill skills/baseline --candidate-skill skills/candidate62 \
    --cases cases-v4 --preparation cases-v4/preparation.json --split dev \
    --cache results/v4-cache/$prov --parallel 6 --out results/v4-golden/$prov
done

# 7. Expert accuracy review of every flagged claim, then rebuild the report
for prov in codex claude; do
  bun run src/cli.ts accuracy-review --run results/v4-golden/$prov --cases cases-v4 \
    --out results/v4-golden/$prov-accuracy --decider claude-fable-5-1 --parallel 6 --write
  bun run src/cli.ts compare <same arguments as step 6> --resume --report-only
done
```

**Running notes:**
- **Judge lists.** `--judges` takes one comma-separated list. Repeating the flag keeps only the last judge (decisions #48).
- **Interrupted runs.** Resume with the same command plus `--resume --recover-lock`. If a crash killed a judge attempt (exit 137), move that `*.attempts` directory aside first (#101).
- **After a reboot.** The writer environment hash covers the whole launching environment, so a resume after a reboot or desktop-session change is refused as "inputs changed". `--resume --accept-environment-change` keeps the recorded hash and logs the change in `environment-overrides.json`. This flag came after the golden run, which did not need it; it was used for the candidate67 run (#98–#100). Pass chain parameters as arguments, not environment variables, so they stay out of that hash.
- **Memory.** The golden run used `--parallel 6` per provider, both providers at once. An earlier run with 16 concurrent writers ran the machine out of memory.
- **Native showcase.** `--systems native,baseline,candidate --replicates 1` on the single case `prbench-compare-systems` (see `commands/c62-final.sh`).

A rerun will not reproduce the drafts word for word, because model sampling varies. Expect the aggregates to fall within the intervals above.

## Rebuilding this folder

```sh
python3 golden/v4-candidate62/tools/build_bundle.py <run-dir> golden/v4-candidate62
```

`<run-dir>` is the raw run folder: `codex/`, `claude/`, `native-*/` and `site-data-final.json`, after the accuracy review and report rebuild.
