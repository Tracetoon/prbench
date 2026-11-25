# Golden run: Tracetoon vs no Tracetoon on flagship models (v4 flagship, 61 cases)

This folder holds the curated record of the run behind the published "Tracetoon vs no Tracetoon" results.
- **Systems:** the user's own agent writing the PR with no Tracetoon (`native`), against the same agent using Tracetoon `candidate70b`.
- **Cases:** all 61 of `real-cases@4.0.0`, three replicates each.
- **Sessions:** Claude Code on Opus 5.5 and Codex on Sol 6.1.

Unlike `golden/v4-candidate62` (evidence graph vs Tracetoon's original workflow), this is a separate benchmark with no original-workflow arm.

It contains no traces, sandboxes, raw sessions, attempt logs or receipts. Local paths are replaced with placeholders such as `<home>`, `$PRBENCH` and `$TMP`. `tools/build_bundle.py` rebuilds the folder from the raw run and fails if a local path or an unexpected e-mail address remains.

## Headline results

All figures come from `flagship-site-data.json`, the two `summary.json` files and the cost-model files.

| | Claude Code (Opus 5.5 session) | Codex (Sol 6.1 session) |
| --- | --- | --- |
| Judges (each judges every pair in both orders) | claude-opus-5-5, claude-sonnet-5-5 | gpt-6.1-sol, gpt-6.1-terra |
| Composite score, native → Tracetoon (0–100) | 52.8 → 68.3 | 64.1 → 78.1 |
| Composite delta (case-clustered SE) | +15.5 ± 2.0 | +14.0 ± 1.2 |
| Cases where Tracetoon scores higher | 52 of 61 | 57 of 61 |
| Consensus picks, Tracetoon–native (both judges, both orders agree; split = no consensus) | 72–9 (79 split) | 111–19 (45 split) |
| Judge-flagged factual errors per draft, native → Tracetoon | 0.32 → 0.16 | 0.18 → 0.15 |
| Validation rubric item (0–2), native → Tracetoon | 1.79 → 1.61 | 1.72 → 1.60 |
| Cost per PR with a 500k-token warm session, native → Tracetoon | $1.29 → $0.93 (0.72×) | $3.50 → $0.93 (0.27×) |
| Main-thread model requests per PR, native → Tracetoon | 10.2 → 4.0 | 30.0 → 5.8 |

Splitting out the 8 cases used for early smoke tests (hard cases chosen from an earlier regression), the other 53 cases give:
- Claude: +13.9, 60–9.
- Codex: +14.8, 98–16.

## How the systems ran

- **Native:** the provider's agent (Claude Code 2.1.319 on `claude-opus-5-5`, effort medium; Codex 0.169.0 on `gpt-6.1-sol`, effort medium) is asked to open a PR for the branch, with no skill installed.
- **Tracetoon (`candidate70b`)** runs in the same session:
  - The session's own agent is only a coordinator (about 4–6 requests). It runs `tracetoon prepare` once, starts one fresh drafter, and relays the PR URL.
  - The drafter runs on the session's model at low effort (Claude Code subagent; Codex `spawn_agent` with `reasoning_effort: "low"`). It reads the evidence brief, drafts, runs the repository's checks through `tracetoon check`, has the draft reviewed, applies one correction pass and publishes.
  - Reviewers are two fresh passes (a completeness lens plus a general pass) started by `tracetoon review run`: `claude -p` on claude-haiku-5-5 (Claude Code) and `codex exec` on gpt-6-luna (Codex), at effort xhigh.

## Cost model (`tools/flagship-cost.py`, `*/cost-model*.json`)

Every model request in the retained writer traces is repriced at list prices (USD per M tokens):

| Model | Cached read | Input | Output | Cache write |
|---|---|---|---|---|
| Opus 5.5 | 0.20 | 4 | 20 | 5 (5-min), 8 (1-h) |
| Sonnet 5.5 | 0.10 | 2 | 10 | 2.50, 4 |
| Sol 6.1, above 272K input | 0.20 | 4 | 15 | 5 |
| Terra 6.1, above 272K input | 0.10 | 2 | 7.50 | 2.50 |

Haiku 5.5 and Luna are at their list rates (Haiku's cache rates by the standard multipliers).

The method:
- **Carried session:** the user's session is assumed to carry 500k tokens of warm context. Every main-thread request pays to read it.
- **Cache expiry:** if the gap between main-thread request starts exceeds the cache TTL, that request pays to write it again instead.
- **TTLs:**
  - Claude Code uses subscription caching: main thread 1 hour, subagents 5 minutes.
  - Codex uses 30 minutes, and every Sol request above 272K input is priced at the high tier.
- **Delegated threads** (drafter, reviewers) carry no session context.
- **Native costs:** native drafts were reused from the earlier flagship run (`pool61-flagship-c69il`), whose traces hold their usage; `cost-model-native.json` is computed from there.

Raw costs (no carried session) are in the same files. Without a carried session Tracetoon costs more than native (Claude $0.53 vs $0.27, Codex $0.30 vs $0.26): the saving comes from keeping the user's long session out of the drafting work.

## What is here

| Path | Contents |
| --- | --- |
| `claude/`, `codex/` | One folder per provider: |
| `…/manifest.json` | the frozen experiment: skill identities, case hashes, writer and judge contract hashes, settings, harness revision |
| `…/summary.json`, `summary.md` | the comparison report. `writerMetrics` reduced; `operationalHistory` omitted. The quality gate shows "failed" only because this run has no original-workflow (baseline) arm. |
| `…/scores.csv` | per case × replicate × system: composite, coverage, rubric, error rates, tokens (366 rows) |
| `…/verdicts.csv` | pairwise verdicts (Tracetoon vs native) per case × replicate × judge |
| `…/accuracy-findings.json`, `adjudications.json` | judge-flagged claims in Tracetoon's drafts and the expert rulings (native drafts were not audited; the headline error figures are the judges' raw counts for both sides) |
| `…/drafts.jsonl` | title and body of all 366 drafts |
| `…/cost-model.json`, `cost-model-native.json` | per-draft and mean costs, raw and with the 500k carried session |
| `flagship-site-data.json` | the data behind the published pages |
| `skills.json` | identity of the `candidate70b` skill bundle and the harness revisions |
| `commands/` | the scripts that ran the panels and the full run, and gathered the results (paths replaced) |
| `decisions.md` | the working decisions log; #116–#129 cover this benchmark (the flagship setups, the cost model, the fixes and the panels) |

## Rerunning

Everything this run used is public. A rerun writes and judges every draft afresh, so expect the same picture with run-to-run noise of a few composite points, not identical numbers. These steps were checked from a clean clone: the rebuilt bundle is byte-identical to the one the run used, and the experiment frozen against the published dataset has the run's writer and judge contracts, preparation and bundle identity (see "What will differ" below).

### 1. Tools

- [Bun](https://bun.sh) 1.3.14 (the compiled Tracetoon binary is reproducible only with the same Bun).
- Claude Code 2.1.319, for example `npm install --prefix ~/cc-2.1.319 @anthropic-ai/claude-code@2.1.319`, then point prbench at it with `PRBENCH_CLAUDE_COMMAND='["<prefix>/node_modules/.bin/claude"]'`.
- Codex CLI 0.169.0 on your `PATH`.
- Accounts that can run `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5` and `claude-fable-5-1` (the accuracy-review decider), and `gpt-6.1-sol`, `gpt-6.1-terra` and `gpt-6-luna`.

### 2. The harness

Each provider ran from its own tagged prbench revision (also recorded in `skills.json` and the manifests):

| Provider | Tag | Commit |
|---|---|---|
| Claude Code | `bench-v4-flagship-claude` | `1a9de82` |
| Codex | `bench-v4-flagship-codex` | `189bd5f` |

```sh
mkdir flagship && cd flagship          # everything below lives here
git clone https://github.com/Tracetoon/prbench.git
(cd prbench && bun install --frozen-lockfile)
cd prbench
git worktree add ../prbench-claude bench-v4-flagship-claude
git worktree add ../prbench-codex  bench-v4-flagship-codex
(cd ../prbench-claude && bun install --frozen-lockfile)
(cd ../prbench-codex  && bun install --frozen-lockfile)
```

The Claude tag adds one setting to the Codex one: background tasks are disabled for Claude Code writers. prbench `main` contains both, plus two portability fixes (macOS process-group cleanup and Windows path matching). It runs the same benchmark, but its frozen writer contract hash differs, so use the tags to match the published manifests.

Sign the sandboxes in once (they get their own `HOME`; your interactive login is never copied):

```sh
bun run prbench auth codex
claude setup-token > token.txt && bun run prbench auth claude < token.txt
```

### 3. The dataset

Fetch it from the `main` checkout (`flagship/prbench`): the two tags predate the registry entry for 4.0.0.

```sh
bun run prbench datasets fetch real-cases@4.0.0 --out ../cases-v4
```

The archive (`cases-v4.0.0` release, 433 MB) is checked against the registry's SHA-256 values. It contains `preparation.json`.

### 4. The skill bundles

Build `candidate70b` from its Tracetoon tag, then add the one setting the run used that the tag doesn't ship (`Drafter effort: low.`):

```sh
cd ..                                          # back in flagship/
git clone https://github.com/Tracetoon/tracetoon.git tt && cd tt
git checkout candidate70b                      # b9597b0
bun install --frozen-lockfile
bun run dependencies:prepare                   # pinned Showtail checkout
bun run bundle
bun run build --outfile plugin/skills/tracetoon/bin/tracetoon-linux-x64
python3 - <<'EOF'
p = "plugin/skills/tracetoon/SKILL.md"
s = open(p).read()
s = s.replace("Drafter model: inherit.\n\n", "Drafter model: inherit.\n\nDrafter effort: low.\n\n", 1)
open(p, "w").write(s)
EOF
mkdir -p ../skills && cp -r plugin/skills/tracetoon ../skills/candidate70b
```

Check it against the run (`treeSha256` in `skills.json`):

```sh
cd ../skills/candidate70b && find . -type f | sed 's#^\./##' \
  | while read f; do printf '%s  %s\n' "$(sha256sum "$f" | cut -d' ' -f1)" "$f"; done \
  | LC_ALL=C sort | sha256sum            # 38b6a94e8315a4631723e3e3cd94293924d6e06be0f697230c77bbbe37aa75c2
```

`bin/tracetoon-linux-x64.build.json` should show build id `1bb8725e…` and binary SHA-256 `aac760e9…`, as in the manifests.

`--baseline-skill` is required but unused here: no baseline drafts are written with `--systems native,candidate`. The run passed the `candidate62` bundle (Tracetoon tag `candidate62`, built as in [docs/reproduce-graph-vs-base.md](../../docs/reproduce-graph-vs-base.md#build-the-two-skill-bundles)); copy it to `flagship/skills/candidate62`. Any bundle works, but only `candidate62` reproduces the manifests' baseline entry.

### 5. Run

The run's timeouts are environment settings, and they are part of the frozen settings:

```sh
export PRBENCH_WRITER_TIMEOUT_MS=3600000 PRBENCH_JUDGE_TIMEOUT_MS=1800000
```

Claude Code, from `flagship/prbench-claude` (with `PRBENCH_CLAUDE_COMMAND` set as above):

```sh
bun run src/cli.ts compare --provider claude --models claude-opus-5-5@medium \
  --judges claude:claude-opus-5-5@medium,claude:claude-sonnet-5-5@medium \
  --systems native,candidate --replicates 3 --purpose diagnostic \
  --baseline-skill ../skills/candidate62 --candidate-skill ../skills/candidate70b \
  --cases ../cases-v4 --preparation ../cases-v4/preparation.json --split dev \
  --parallel 6 --out results/flagship/claude
```

Codex, from `flagship/prbench-codex`:

```sh
bun run src/cli.ts compare --provider codex --models gpt-6.1-sol@medium \
  --judges codex:gpt-6.1-sol@medium,codex:gpt-6.1-terra@medium \
  --systems native,candidate --replicates 3 --purpose diagnostic \
  --baseline-skill ../skills/candidate62 --candidate-skill ../skills/candidate70b \
  --cases ../cases-v4 --preparation ../cases-v4/preparation.json --split dev \
  --parallel 6 --out results/flagship/codex
```

Add `--prepare-only` first, then `--resume --plan`, to freeze and inspect the experiment without model calls. Each run writes 366 drafts and judges each Tracetoon/native pair with both judges in both orders.

### 6. Accuracy review, report and cost

```sh
bun run src/cli.ts accuracy-review --run results/flagship/claude --cases ../cases-v4 \
  --out results/flagship/claude-accuracy --decider claude-fable-5-1 --parallel 6 --write
bun run src/cli.ts compare <same arguments as the run> --resume --report-only
python3 ../prbench/golden/v4-flagship-c70b/tools/flagship-cost.py results/flagship/claude --json results/flagship/claude-cost.json
```

The same for Codex. The cost script reprices every model request in the run's writer traces (method above) and reports native and Tracetoon side by side. The published run reused its native drafts from an earlier run with identical native settings; a fresh run writes them itself.

### What will differ

- **Model output:** every draft and verdict is a fresh sample.
- **Four case hashes:** the four `vexagent-*` cases were history-rewritten before the dataset was published (an e-mail address and a local path scrubbed; see the [dataset card](../../datasets/DATASET_CARD.md)). Their commit SHAs, and so their case hashes, differ from the manifests. The trees the writers see are unchanged. The other 57 case hashes match.
- **Machine identity:** `settings.agentCommandHash` and `settings.toolchain.environmentHash` depend on local paths and installs, so they differ on every machine. prbench uses them to keep one machine's results from silently mixing with another's.

## Caveats

- **Modelling assumptions:** the 500k carried context and subscription caching, stated above. With a smaller carried session the saving shrinks; with no carried session Tracetoon costs more than native.
- **In-sample:** results are in-sample on this pool. Tracetoon's earlier candidates were tuned on the same cases, though the flagship setup was chosen on one-replicate panels and confirmed here on three replicates.
- **Environment overrides:** after machine reboots, runs were resumed or started with prbench's environment override (`--accept-environment-change`, `--environment-from`), logged in each run's `environment-overrides.json` in the raw results.
- **Harness revisions:**
  - Claude Code writers ran from harness `bench-v4-nobg` (background tasks disabled, a 10-minute Bash timeout and a sandbox login file, so that native Opus doesn't end a run waiting on a background test and nested reviewers can sign in). These apply to every Claude Code system alike.
  - Codex ran from `bench-v4`.
  - Both revisions are in `skills.json` and the manifests.
