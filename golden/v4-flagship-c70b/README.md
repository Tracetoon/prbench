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

You need prbench at this revision, Claude Code 2.1.319 and Codex 0.169.0 signed in, the `real-cases@4.0.0` dataset, and the `candidate70b` skill bundle (Tracetoon tag `candidate70b`). Then, per provider:

```
bun run src/cli.ts compare --provider claude --models claude-opus-5-5@medium \
  --judges claude:claude-opus-5-5@medium,claude:claude-sonnet-5-5@medium \
  --systems native,candidate --replicates 3 --purpose diagnostic \
  --baseline-skill <any skill bundle> --candidate-skill <candidate70b bundle> \
  --cases <real-cases 4.0.0> --preparation <cases>/preparation.json --split dev --out <out>/claude
```

For Codex: `--provider codex --models gpt-6.1-sol@medium --judges codex:gpt-6.1-sol@medium,codex:gpt-6.1-terra@medium`.

Then `accuracy-review` and `python3 tools/flagship-cost.py <out>/<provider>` for the cost model. A fresh run regenerates the native drafts too; expect run-to-run noise of a few composite points.

## Caveats

- **Modelling assumptions:** the 500k carried context and subscription caching, stated above. With a smaller carried session the saving shrinks; with no carried session Tracetoon costs more than native.
- **In-sample:** results are in-sample on this pool. Tracetoon's earlier candidates were tuned on the same cases, though the flagship setup was chosen on one-replicate panels and confirmed here on three replicates.
- **Environment overrides:** after machine reboots, runs were resumed or started with prbench's environment override (`--accept-environment-change`, `--environment-from`), logged in each run's `environment-overrides.json` in the raw results.
- **Harness revisions:**
  - Claude Code writers ran from harness `bench-v4-nobg` (background tasks disabled, a 10-minute Bash timeout and a sandbox login file, so that native Opus doesn't end a run waiting on a background test and nested reviewers can sign in). These apply to every Claude Code system alike.
  - Codex ran from `bench-v4`.
  - Both revisions are in `skills.json` and the manifests.
