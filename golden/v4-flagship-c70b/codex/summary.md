# dev comparison

Outcome: **failed**. Quality: failed. Efficiency: inconclusive.

Writers: 366/366; order judgments: 732/732.

Failed attempts: 4; failed-attempt time: 868s; current pending cleanup: 0.

| Model | System | Samples | Median writer seconds | Median input tokens | Pending cleanup |
|---|---|---:|---:|---:|---:|
| gpt-6.1-sol@medium | codex-native | 183 | 281.73 | 1021342 | 0 |
| gpt-6.1-sol@medium | tracetoon-candidate | 183 | 453.18 | 942041 | 0 |

## Gate findings

- Accuracy (confirmed errors per scored draft, 0 drafts): candidate unknown (0 of 78 flags confirmed), baseline unknown (0 of 0 flags confirmed); unresolved 0.
- No measured claim/context coverage improvement against baseline
- Aggregate consensus wins must exceed losses against baseline
- Unresolved: accuracy: no drafts scored in candidate-vs-baseline pairs
- Unresolved: gpt-6.1-sol@medium: claimCoverage unavailable
- Unresolved: gpt-6.1-sol@medium: contextCoverage unavailable

## Paired performance

Rule: Pass when the candidate/baseline geometric mean of paired per-draft priced cost (same model, case and replicate; log ratios averaged within each case, then across cases) is at most 1.000. The case-clustered 95% interval is reported, not required. Any paired draft without a priced cost makes the gate inconclusive. Writer wall time and token counts are information, not criteria.

Candidate/baseline geometric mean priced cost ratio (criterion): unknown over 0/0 pairs; case-clustered 95% interval: [null,null].

Candidate/baseline geometric mean writer ratio (information): unknown; case-clustered 95% interval: [null,null].

- 3 replicate(s) still represent 61 independent cases in this split.
- Writer timing includes service waits and neutral observation overhead; runtime diagnostics may overlap.
- Diagnostic reuse cannot establish a fresh performance improvement.
- Raw judgments are preserved separately from source-backed adjudications.
- Validation did not complete for either writer in any of the 183 pairs, so the sandbox could not run it; cost, timing and token results compare writers that both lacked completed validation and say nothing about validation work saved or skipped. Reasons recorded: Final code identity or content observation is unavailable. | No canonical validation execution is available.

## Scores

Composite (0-100) = 35·claims + 15·context + 15·uncertainties + 35·rubric (coverage as fractions of the fact sheet, rubric as mean/2) − 15·factual errors − 7·unsupported claims − 10·traps hit, floored at 0. Each draft is averaged over all its judgments; arm means are means of per-case means, with a 95% bootstrap interval over cases. Components are the primary evidence; the composite is a summary.

| Model | System | Drafts | Composite [95% CI] | Claims | Context | Uncert. | Rubric | Errors | Unsupported | Traps | $/draft | Cost covers | Subagents/draft | Input tokens | Queries |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|
| gpt-6.1-sol@medium | codex-native | 183 | 64.1 [62.1, 66.1] | 0.73 | 0.12 | 0.95 | 0.73 | 0.18 | 0.03 | 0.02 | 0.236* | all threads | 0.0 | 1159563 | – |
| gpt-6.1-sol@medium | tracetoon-candidate | 183 | 78.1 [76.2, 79.9] | 0.86 | 0.40 | 0.95 | 0.87 | 0.15 | 0.03 | 0.01 | 0.265* | all threads | 1.0 | 1053439 | – |

Mixed-model writers (subagent threads on another model; each model's tokens are priced at its own rate, and Claude's reported cost already covers every model):

| Model | System | Mixed-model drafts | Models used |
|---|---|---:|---|
| gpt-6.1-sol@medium | tracetoon-candidate | 183/183 | gpt-6-luna, gpt-6.1-sol |

Paired candidate − other system (same model, case and replicate). Leave one case out = lowest and highest composite Δ when each case in turn is dropped:

| Model | Against | Pairs | Composite Δ [95% CI] | Leave one case out | Factual errors Δ |
|---|---|---:|---|---|---:|
| gpt-6.1-sol@medium | codex-native | 183 | 14.0 [11.7, 16.4] | 13.7 to 14.4 | -0.03 |

Writer reliability (failed attempts are retried, up to 3 per draft; scored drafts count accepted attempts):

| Model | System | Scored drafts | No-draft attempts | Scope-rejected attempts | Timed-out attempts | Other failed attempts |
|---|---|---:|---:|---:|---:|---:|
| gpt-6.1-sol@medium | tracetoon-candidate | 183 | 0 | 1 | 0 | 0 |

Judge reliability (timed-out and transient calls are retried, up to 3 attempts per order judgment; a malformed reply gets one format repair, then fresh requests, up to 5 attempts):

| Judge | Failed attempts | Timed out | Transient | Format | Other |
|---|---:|---:|---:|---:|---:|
| codex:gpt-6.1-sol@medium | 3 | 0 | 0 | 3 | 0 |

## Accuracy

Error rate = share of judgments that found at least one factual error (mean of per-case means, 95% bootstrap interval over cases). Error classes are mean factual errors per judgment by kind of statement.

| Model | System | Drafts | Error rate [95% CI] | Errors | Unsupported | Claims | validation | code structure | attribution | motivation | pipeline | other | $/draft |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| gpt-6.1-sol@medium | codex-native | 183 | 0.16 [0.11, 0.20] | 0.18 | 0.03 | 0.73 | 0.12 | 0.00 | 0.00 | 0.00 | 0.00 | 0.06 | 0.236 |
| gpt-6.1-sol@medium | tracetoon-candidate | 183 | 0.14 [0.09, 0.20] | 0.15 | 0.03 | 0.86 | 0.07 | 0.01 | 0.01 | 0.00 | 0.00 | 0.07 | 0.265 |

\* Estimated from token counts and src/report/prices.json (USD per million tokens, short-context list prices for models whose runs report no USD (Codex), as reported by third-party trackers on 2026-11-06 (morphllm.com/openai-api-pricing); verify against the provider's pricing page.).

Cost covers: "all threads" includes every subagent thread the writer spawned (researcher, drafter, reviewer…), from the artifact or, for runs saved before that was recorded, recomputed from the accepted attempt's saved Codex traces ("traces"), with each model response counted once. "Main thread only" omits subagents and understates cost when the skill delegates. $/draft in the accuracy table and its cost ratios use the same figures.

## gpt-6.1-sol@medium, replicate 1: codex-native

# prbench report

Rubric v6. Judges: codex:gpt-6.1-sol@medium, codex:gpt-6.1-terra@medium. Generated 2026-11-23T16:10:03.568Z.

Evidence gaps are unverified claims, not errors or fabrication. Fresh evidence coverage is reported per artifact; partial capture may still establish individual results. Inconclusive preferences are excluded from win/tie statistics, intervals and judge agreement.

Completed 122 of 122 expected case/pair/judge results (each requires both orders).

Each pair is judged in both orders; a win needs both orders to agree. An evidence-dependent abstention in either order makes the pair inconclusive; other disagreements are ties (a *flip* when the orders picked opposite systems). "all judges agree" includes only pairs completed by every configured judge, and counts a win only when every judge gave it. With few cases, treat p-values and intervals as a sense of scale, not proof.

## dev split (61 cases)

aifirstcli-book-walk, aifirstcli-duckling-wheels, aifirstcli-homebrew-maven, aifirstcli-hooks-path, aifirstcli-javafx-maven, aifirstcli-learner-replay-ux, aifirstcli-macos-installer, aifirstcli-showtail-harness, aifirstcli-signpath-release, aifirstcli-tui-responsive, aifirstcontent-apache, aifirstcontent-book-step-verify, aifirstcontent-portable-replays, aifirstcontent-replay-start-state, aifirstextension-apache-license, aifirstwebsite-guided-install, aifirstwebsite-macos-workaround, aifirstwebsite-signing-policy, bazzite-stale-portal, pr10, pr11, pr12, pr5, pr8, pr9, prbench-aggregate-only, prbench-compare-systems, prbench-crossjudge, prbench-graph-compare-doc, prbench-judge-retry, prbench-parallel-providers, prbench-priced-cost-gate, prbench-scoring, prbench-shell-bookkeeping, showtail-claude-exit-codes, showtail-docker-tests, showtail-self-upgrade, showtail-signpath, showtail-transcript-migrator, showtail-windows-cmd, tracetoon-brief-owners-rows, tracetoon-chained-runs, tracetoon-cli-guard-tests, tracetoon-evidence-graph, tracetoon-lean-reviewer, tracetoon-neighborhood, tracetoon-receipt-quoting, tracetoon-render-name-check, tracetoon-review-run-all, tracetoon-sql-row-order, tracetoon-update-command, vex-v5-serial-aim-port, vexagent-cli-snap, vexagent-repl-usb-iface, vexagent-replug-runs, vexagent-skill, vexaim, vexaim-workshop-ci, vexaim-workshop-norobot, winapps-adobe-2026, winapps-sdl-wayland

### Head to head

| x vs y | judge | x wins | y wins | ties | flips | inconclusive | x win rate | sign test p | mean (x−y) [95% CI] |
|---|---|---|---|---|---|---|---|---|---|
| codex-native vs tracetoon-candidate | codex:gpt-6.1-sol@medium | 6 | 41 | 14 | 14 | 0 | 13% | 0.00 | -0.57 [-0.72, -0.41] |
| codex-native vs tracetoon-candidate | codex:gpt-6.1-terra@medium | 7 | 44 | 7 | 7 | 3 | 14% | 0.00 | -0.64 [-0.81, -0.45] |
| codex-native vs tracetoon-candidate | all judges agree | 5 | 34 | 19 | 19 | 3 | 13% | 0.00 | -0.50 [-0.66, -0.33] |

### Per system (means over every judgment of that system)

| system | judgments | factual errors | unsupported overclaims | evidence gaps | claims covered | context covered | uncertainties respected | traps hit | median words | total agent cost |
|---|---|---|---|---|---|---|---|---|---|---|
| codex-native | 244 | 0.21 | 0.03 | 4.52 | 71% | 13% | 95% | 0.02 | 167 | – |
| tracetoon-candidate | 244 | 0.17 | 0.02 | 3.33 | 86% | 39% | 95% | 0.02 | 382 | – |

### Fresh writer evidence coverage (artifact counts)

| system | artifacts | recorded | partial | unavailable |
|---|---|---|---|---|
| codex-native | 61 | 0 | 61 | 0 |
| tracetoon-candidate | 61 | 0 | 61 | 0 |

### Rubric (mean of 0–2 scores; n/a items excluded)

| system | problem | rationale | validation | consequences | orientation | entry | economy | feedback | links | scope |
|---|---|---|---|---|---|---|---|---|---|---|
| codex-native | 1.37 | 1.00 | 1.75 | 1.42 | 2.00 | 0.73 | 1.94 | 2.00 | 0.63 | 1.85 |
| tracetoon-candidate | 1.77 | 1.63 | 1.57 | 1.86 | 1.98 | 1.99 | 1.14 | 1.97 | 1.18 | 1.86 |

## Judge agreement

- codex:gpt-6.1-sol@medium vs codex:gpt-6.1-terra@medium: 71% of 58 pair verdicts agree; Cohen's kappa 0.35.

## Warnings

- aifirstcli-book-walk: codex-native: fresh validation evidence partial
- aifirstcli-book-walk: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-duckling-wheels: codex-native: fresh validation evidence partial
- aifirstcli-duckling-wheels: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-homebrew-maven: codex-native: fresh validation evidence partial
- aifirstcli-homebrew-maven: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-hooks-path: codex-native: fresh validation evidence partial
- aifirstcli-hooks-path: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-javafx-maven: codex-native: fresh validation evidence partial
- aifirstcli-javafx-maven: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-learner-replay-ux: codex-native: fresh validation evidence partial
- aifirstcli-learner-replay-ux: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-macos-installer: codex-native: fresh validation evidence partial
- aifirstcli-macos-installer: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-showtail-harness: codex-native: fresh validation evidence partial
- aifirstcli-showtail-harness: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-signpath-release: codex-native: fresh validation evidence partial
- aifirstcli-signpath-release: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-tui-responsive: codex-native: fresh validation evidence partial
- aifirstcli-tui-responsive: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-apache: codex-native: fresh validation evidence partial
- aifirstcontent-apache: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-book-step-verify: codex-native: fresh validation evidence partial
- aifirstcontent-book-step-verify: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-portable-replays: codex-native: fresh validation evidence partial
- aifirstcontent-portable-replays: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-replay-start-state: codex-native: fresh validation evidence partial
- aifirstcontent-replay-start-state: tracetoon-candidate: fresh validation evidence partial
- aifirstextension-apache-license: codex-native: fresh validation evidence partial
- aifirstextension-apache-license: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-guided-install: codex-native: fresh validation evidence partial
- aifirstwebsite-guided-install: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-macos-workaround: codex-native: fresh validation evidence partial
- aifirstwebsite-macos-workaround: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-signing-policy: codex-native: fresh validation evidence partial
- aifirstwebsite-signing-policy: tracetoon-candidate: fresh validation evidence partial
- bazzite-stale-portal: codex-native: fresh validation evidence partial
- bazzite-stale-portal: tracetoon-candidate: fresh validation evidence partial
- pr10: codex-native: fresh validation evidence partial
- pr10: tracetoon-candidate: fresh validation evidence partial
- pr11: codex-native: fresh validation evidence partial
- pr11: tracetoon-candidate: fresh validation evidence partial
- pr12: codex-native: fresh validation evidence partial
- pr12: tracetoon-candidate: fresh validation evidence partial
- pr5: codex-native: fresh validation evidence partial
- pr5: tracetoon-candidate: fresh validation evidence partial
- pr8: codex-native: fresh validation evidence partial
- pr8: tracetoon-candidate: fresh validation evidence partial
- pr9: codex-native: fresh validation evidence partial
- pr9: tracetoon-candidate: fresh validation evidence partial
- prbench-aggregate-only: codex-native: fresh validation evidence partial
- prbench-aggregate-only: tracetoon-candidate: fresh validation evidence partial
- prbench-compare-systems: codex-native: fresh validation evidence partial
- prbench-compare-systems: tracetoon-candidate: fresh validation evidence partial
- prbench-crossjudge: codex-native: fresh validation evidence partial
- prbench-crossjudge: tracetoon-candidate: fresh validation evidence partial
- prbench-graph-compare-doc: codex-native: fresh validation evidence partial
- prbench-graph-compare-doc: tracetoon-candidate: fresh validation evidence partial
- prbench-judge-retry: codex-native: fresh validation evidence partial
- prbench-judge-retry: tracetoon-candidate: fresh validation evidence partial
- prbench-parallel-providers: codex-native: fresh validation evidence partial
- prbench-parallel-providers: tracetoon-candidate: fresh validation evidence partial
- prbench-priced-cost-gate: codex-native: fresh validation evidence partial
- prbench-priced-cost-gate: tracetoon-candidate: fresh validation evidence partial
- prbench-scoring: codex-native: fresh validation evidence partial
- prbench-scoring: tracetoon-candidate: fresh validation evidence partial
- prbench-shell-bookkeeping: codex-native: fresh validation evidence partial
- prbench-shell-bookkeeping: tracetoon-candidate: fresh validation evidence partial
- showtail-claude-exit-codes: codex-native: fresh validation evidence partial
- showtail-claude-exit-codes: tracetoon-candidate: fresh validation evidence partial
- showtail-docker-tests: codex-native: fresh validation evidence partial
- showtail-docker-tests: tracetoon-candidate: fresh validation evidence partial
- showtail-docker-tests: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- showtail-self-upgrade: codex-native: fresh validation evidence partial
- showtail-self-upgrade: tracetoon-candidate: fresh validation evidence partial
- showtail-signpath: codex-native: fresh validation evidence partial
- showtail-signpath: tracetoon-candidate: fresh validation evidence partial
- showtail-transcript-migrator: codex-native: fresh validation evidence partial
- showtail-transcript-migrator: tracetoon-candidate: fresh validation evidence partial
- showtail-windows-cmd: codex-native: fresh validation evidence partial
- showtail-windows-cmd: tracetoon-candidate: fresh validation evidence partial
- tracetoon-brief-owners-rows: codex-native: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-candidate: fresh validation evidence partial
- tracetoon-brief-owners-rows: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-chained-runs: codex-native: fresh validation evidence partial
- tracetoon-chained-runs: tracetoon-candidate: fresh validation evidence partial
- tracetoon-chained-runs: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-cli-guard-tests: codex-native: fresh validation evidence partial
- tracetoon-cli-guard-tests: tracetoon-candidate: fresh validation evidence partial
- tracetoon-evidence-graph: codex-native: fresh validation evidence partial
- tracetoon-evidence-graph: tracetoon-candidate: fresh validation evidence partial
- tracetoon-evidence-graph: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-lean-reviewer: codex-native: fresh validation evidence partial
- tracetoon-lean-reviewer: tracetoon-candidate: fresh validation evidence partial
- tracetoon-lean-reviewer: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-neighborhood: codex-native: fresh validation evidence partial
- tracetoon-neighborhood: tracetoon-candidate: fresh validation evidence partial
- tracetoon-receipt-quoting: codex-native: fresh validation evidence partial
- tracetoon-receipt-quoting: tracetoon-candidate: fresh validation evidence partial
- tracetoon-receipt-quoting: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-render-name-check: codex-native: fresh validation evidence partial
- tracetoon-render-name-check: tracetoon-candidate: fresh validation evidence partial
- tracetoon-render-name-check: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-review-run-all: codex-native: fresh validation evidence partial
- tracetoon-review-run-all: tracetoon-candidate: fresh validation evidence partial
- tracetoon-review-run-all: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-sql-row-order: codex-native: fresh validation evidence partial
- tracetoon-sql-row-order: tracetoon-candidate: fresh validation evidence partial
- tracetoon-sql-row-order: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-update-command: codex-native: fresh validation evidence partial
- tracetoon-update-command: tracetoon-candidate: fresh validation evidence partial
- vex-v5-serial-aim-port: codex-native: fresh validation evidence partial
- vex-v5-serial-aim-port: tracetoon-candidate: fresh validation evidence partial
- vexagent-cli-snap: codex-native: fresh validation evidence partial
- vexagent-cli-snap: tracetoon-candidate: fresh validation evidence partial
- vexagent-repl-usb-iface: codex-native: fresh validation evidence partial
- vexagent-repl-usb-iface: tracetoon-candidate: fresh validation evidence partial
- vexagent-replug-runs: codex-native: fresh validation evidence partial
- vexagent-replug-runs: tracetoon-candidate: fresh validation evidence partial
- vexagent-skill: codex-native: fresh validation evidence partial
- vexagent-skill: tracetoon-candidate: fresh validation evidence partial
- vexaim: codex-native: fresh validation evidence partial
- vexaim: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-ci: codex-native: fresh validation evidence partial
- vexaim-workshop-ci: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-norobot: codex-native: fresh validation evidence partial
- vexaim-workshop-norobot: tracetoon-candidate: fresh validation evidence partial
- winapps-adobe-2026: codex-native: fresh validation evidence partial
- winapps-adobe-2026: tracetoon-candidate: fresh validation evidence partial
- winapps-sdl-wayland: codex-native: fresh validation evidence partial
- winapps-sdl-wayland: tracetoon-candidate: fresh validation evidence partial

## gpt-6.1-sol@medium, replicate 2: codex-native

# prbench report

Rubric v6. Judges: codex:gpt-6.1-sol@medium, codex:gpt-6.1-terra@medium. Generated 2026-11-23T16:10:04.380Z.

Evidence gaps are unverified claims, not errors or fabrication. Fresh evidence coverage is reported per artifact; partial capture may still establish individual results. Inconclusive preferences are excluded from win/tie statistics, intervals and judge agreement.

Completed 122 of 122 expected case/pair/judge results (each requires both orders).

Each pair is judged in both orders; a win needs both orders to agree. An evidence-dependent abstention in either order makes the pair inconclusive; other disagreements are ties (a *flip* when the orders picked opposite systems). "all judges agree" includes only pairs completed by every configured judge, and counts a win only when every judge gave it. With few cases, treat p-values and intervals as a sense of scale, not proof.

## dev split (61 cases)

aifirstcli-book-walk, aifirstcli-duckling-wheels, aifirstcli-homebrew-maven, aifirstcli-hooks-path, aifirstcli-javafx-maven, aifirstcli-learner-replay-ux, aifirstcli-macos-installer, aifirstcli-showtail-harness, aifirstcli-signpath-release, aifirstcli-tui-responsive, aifirstcontent-apache, aifirstcontent-book-step-verify, aifirstcontent-portable-replays, aifirstcontent-replay-start-state, aifirstextension-apache-license, aifirstwebsite-guided-install, aifirstwebsite-macos-workaround, aifirstwebsite-signing-policy, bazzite-stale-portal, pr10, pr11, pr12, pr5, pr8, pr9, prbench-aggregate-only, prbench-compare-systems, prbench-crossjudge, prbench-graph-compare-doc, prbench-judge-retry, prbench-parallel-providers, prbench-priced-cost-gate, prbench-scoring, prbench-shell-bookkeeping, showtail-claude-exit-codes, showtail-docker-tests, showtail-self-upgrade, showtail-signpath, showtail-transcript-migrator, showtail-windows-cmd, tracetoon-brief-owners-rows, tracetoon-chained-runs, tracetoon-cli-guard-tests, tracetoon-evidence-graph, tracetoon-lean-reviewer, tracetoon-neighborhood, tracetoon-receipt-quoting, tracetoon-render-name-check, tracetoon-review-run-all, tracetoon-sql-row-order, tracetoon-update-command, vex-v5-serial-aim-port, vexagent-cli-snap, vexagent-repl-usb-iface, vexagent-replug-runs, vexagent-skill, vexaim, vexaim-workshop-ci, vexaim-workshop-norobot, winapps-adobe-2026, winapps-sdl-wayland

### Head to head

| x vs y | judge | x wins | y wins | ties | flips | inconclusive | x win rate | sign test p | mean (x−y) [95% CI] |
|---|---|---|---|---|---|---|---|---|---|
| codex-native vs tracetoon-candidate | codex:gpt-6.1-sol@medium | 9 | 44 | 8 | 8 | 0 | 17% | 0.00 | -0.57 [-0.75, -0.38] |
| codex-native vs tracetoon-candidate | codex:gpt-6.1-terra@medium | 9 | 43 | 4 | 4 | 5 | 17% | 0.00 | -0.61 [-0.79, -0.39] |
| codex-native vs tracetoon-candidate | all judges agree | 8 | 39 | 9 | 11 | 5 | 17% | 0.00 | -0.55 [-0.73, -0.36] |

### Per system (means over every judgment of that system)

| system | judgments | factual errors | unsupported overclaims | evidence gaps | claims covered | context covered | uncertainties respected | traps hit | median words | total agent cost |
|---|---|---|---|---|---|---|---|---|---|---|
| codex-native | 244 | 0.11 | 0.03 | 4.60 | 74% | 12% | 96% | 0.00 | 163 | – |
| tracetoon-candidate | 244 | 0.14 | 0.02 | 3.11 | 86% | 40% | 95% | 0.01 | 384 | – |

### Fresh writer evidence coverage (artifact counts)

| system | artifacts | recorded | partial | unavailable |
|---|---|---|---|---|
| codex-native | 61 | 0 | 61 | 0 |
| tracetoon-candidate | 61 | 0 | 61 | 0 |

### Rubric (mean of 0–2 scores; n/a items excluded)

| system | problem | rationale | validation | consequences | orientation | entry | economy | feedback | links | scope |
|---|---|---|---|---|---|---|---|---|---|---|
| codex-native | 1.38 | 0.99 | 1.75 | 1.48 | 2.00 | 0.80 | 1.90 | – | 0.50 | 1.95 |
| tracetoon-candidate | 1.79 | 1.70 | 1.59 | 1.88 | 1.94 | 2.00 | 1.11 | 1.99 | 1.19 | 1.93 |

## Judge agreement

- codex:gpt-6.1-sol@medium vs codex:gpt-6.1-terra@medium: 86% of 56 pair verdicts agree; Cohen's kappa 0.65.

## Warnings

- aifirstcli-book-walk: codex-native: fresh validation evidence partial
- aifirstcli-book-walk: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-duckling-wheels: codex-native: fresh validation evidence partial
- aifirstcli-duckling-wheels: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-homebrew-maven: codex-native: fresh validation evidence partial
- aifirstcli-homebrew-maven: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-hooks-path: codex-native: fresh validation evidence partial
- aifirstcli-hooks-path: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-javafx-maven: codex-native: fresh validation evidence partial
- aifirstcli-javafx-maven: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-learner-replay-ux: codex-native: fresh validation evidence partial
- aifirstcli-learner-replay-ux: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-macos-installer: codex-native: fresh validation evidence partial
- aifirstcli-macos-installer: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-showtail-harness: codex-native: fresh validation evidence partial
- aifirstcli-showtail-harness: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-signpath-release: codex-native: fresh validation evidence partial
- aifirstcli-signpath-release: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-tui-responsive: codex-native: fresh validation evidence partial
- aifirstcli-tui-responsive: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-apache: codex-native: fresh validation evidence partial
- aifirstcontent-apache: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-book-step-verify: codex-native: fresh validation evidence partial
- aifirstcontent-book-step-verify: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-portable-replays: codex-native: fresh validation evidence partial
- aifirstcontent-portable-replays: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-replay-start-state: codex-native: fresh validation evidence partial
- aifirstcontent-replay-start-state: tracetoon-candidate: fresh validation evidence partial
- aifirstextension-apache-license: codex-native: fresh validation evidence partial
- aifirstextension-apache-license: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-guided-install: codex-native: fresh validation evidence partial
- aifirstwebsite-guided-install: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-macos-workaround: codex-native: fresh validation evidence partial
- aifirstwebsite-macos-workaround: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-signing-policy: codex-native: fresh validation evidence partial
- aifirstwebsite-signing-policy: tracetoon-candidate: fresh validation evidence partial
- bazzite-stale-portal: codex-native: fresh validation evidence partial
- bazzite-stale-portal: tracetoon-candidate: fresh validation evidence partial
- pr10: codex-native: fresh validation evidence partial
- pr10: tracetoon-candidate: fresh validation evidence partial
- pr11: codex-native: fresh validation evidence partial
- pr11: tracetoon-candidate: fresh validation evidence partial
- pr12: codex-native: fresh validation evidence partial
- pr12: tracetoon-candidate: fresh validation evidence partial
- pr5: codex-native: fresh validation evidence partial
- pr5: tracetoon-candidate: fresh validation evidence partial
- pr8: codex-native: fresh validation evidence partial
- pr8: tracetoon-candidate: fresh validation evidence partial
- pr9: codex-native: fresh validation evidence partial
- pr9: tracetoon-candidate: fresh validation evidence partial
- prbench-aggregate-only: codex-native: fresh validation evidence partial
- prbench-aggregate-only: tracetoon-candidate: fresh validation evidence partial
- prbench-compare-systems: codex-native: fresh validation evidence partial
- prbench-compare-systems: tracetoon-candidate: fresh validation evidence partial
- prbench-crossjudge: codex-native: fresh validation evidence partial
- prbench-crossjudge: tracetoon-candidate: fresh validation evidence partial
- prbench-graph-compare-doc: codex-native: fresh validation evidence partial
- prbench-graph-compare-doc: tracetoon-candidate: fresh validation evidence partial
- prbench-judge-retry: codex-native: fresh validation evidence partial
- prbench-judge-retry: tracetoon-candidate: fresh validation evidence partial
- prbench-parallel-providers: codex-native: fresh validation evidence partial
- prbench-parallel-providers: tracetoon-candidate: fresh validation evidence partial
- prbench-priced-cost-gate: codex-native: fresh validation evidence partial
- prbench-priced-cost-gate: tracetoon-candidate: fresh validation evidence partial
- prbench-scoring: codex-native: fresh validation evidence partial
- prbench-scoring: tracetoon-candidate: fresh validation evidence partial
- prbench-shell-bookkeeping: codex-native: fresh validation evidence partial
- prbench-shell-bookkeeping: tracetoon-candidate: fresh validation evidence partial
- showtail-claude-exit-codes: codex-native: fresh validation evidence partial
- showtail-claude-exit-codes: tracetoon-candidate: fresh validation evidence partial
- showtail-docker-tests: codex-native: fresh validation evidence partial
- showtail-docker-tests: tracetoon-candidate: fresh validation evidence partial
- showtail-docker-tests: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- showtail-self-upgrade: codex-native: fresh validation evidence partial
- showtail-self-upgrade: tracetoon-candidate: fresh validation evidence partial
- showtail-signpath: codex-native: fresh validation evidence partial
- showtail-signpath: tracetoon-candidate: fresh validation evidence partial
- showtail-transcript-migrator: codex-native: fresh validation evidence partial
- showtail-transcript-migrator: tracetoon-candidate: fresh validation evidence partial
- showtail-windows-cmd: codex-native: fresh validation evidence partial
- showtail-windows-cmd: tracetoon-candidate: fresh validation evidence partial
- tracetoon-brief-owners-rows: codex-native: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-candidate: fresh validation evidence partial
- tracetoon-brief-owners-rows: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-chained-runs: codex-native: fresh validation evidence partial
- tracetoon-chained-runs: tracetoon-candidate: fresh validation evidence partial
- tracetoon-chained-runs: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-cli-guard-tests: codex-native: fresh validation evidence partial
- tracetoon-cli-guard-tests: tracetoon-candidate: fresh validation evidence partial
- tracetoon-evidence-graph: codex-native: fresh validation evidence partial
- tracetoon-evidence-graph: tracetoon-candidate: fresh validation evidence partial
- tracetoon-evidence-graph: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-lean-reviewer: codex-native: fresh validation evidence partial
- tracetoon-lean-reviewer: tracetoon-candidate: fresh validation evidence partial
- tracetoon-lean-reviewer: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-neighborhood: codex-native: fresh validation evidence partial
- tracetoon-neighborhood: tracetoon-candidate: fresh validation evidence partial
- tracetoon-receipt-quoting: codex-native: fresh validation evidence partial
- tracetoon-receipt-quoting: tracetoon-candidate: fresh validation evidence partial
- tracetoon-receipt-quoting: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-render-name-check: codex-native: fresh validation evidence partial
- tracetoon-render-name-check: tracetoon-candidate: fresh validation evidence partial
- tracetoon-render-name-check: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-review-run-all: codex-native: fresh validation evidence partial
- tracetoon-review-run-all: tracetoon-candidate: fresh validation evidence partial
- tracetoon-review-run-all: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-sql-row-order: codex-native: fresh validation evidence partial
- tracetoon-sql-row-order: tracetoon-candidate: fresh validation evidence partial
- tracetoon-sql-row-order: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-update-command: codex-native: fresh validation evidence partial
- tracetoon-update-command: tracetoon-candidate: fresh validation evidence partial
- vex-v5-serial-aim-port: codex-native: fresh validation evidence partial
- vex-v5-serial-aim-port: tracetoon-candidate: fresh validation evidence partial
- vexagent-cli-snap: codex-native: fresh validation evidence partial
- vexagent-cli-snap: tracetoon-candidate: fresh validation evidence partial
- vexagent-repl-usb-iface: codex-native: fresh validation evidence partial
- vexagent-repl-usb-iface: tracetoon-candidate: fresh validation evidence partial
- vexagent-replug-runs: codex-native: fresh validation evidence partial
- vexagent-replug-runs: tracetoon-candidate: fresh validation evidence partial
- vexagent-skill: codex-native: fresh validation evidence partial
- vexagent-skill: tracetoon-candidate: fresh validation evidence partial
- vexaim: codex-native: fresh validation evidence partial
- vexaim: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-ci: codex-native: fresh validation evidence partial
- vexaim-workshop-ci: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-norobot: codex-native: fresh validation evidence partial
- vexaim-workshop-norobot: tracetoon-candidate: fresh validation evidence partial
- winapps-adobe-2026: codex-native: fresh validation evidence partial
- winapps-adobe-2026: tracetoon-candidate: fresh validation evidence partial
- winapps-sdl-wayland: codex-native: fresh validation evidence partial
- winapps-sdl-wayland: tracetoon-candidate: fresh validation evidence partial

## gpt-6.1-sol@medium, replicate 3: codex-native

# prbench report

Rubric v6. Judges: codex:gpt-6.1-sol@medium, codex:gpt-6.1-terra@medium. Generated 2026-11-23T16:10:05.174Z.

Evidence gaps are unverified claims, not errors or fabrication. Fresh evidence coverage is reported per artifact; partial capture may still establish individual results. Inconclusive preferences are excluded from win/tie statistics, intervals and judge agreement.

Completed 122 of 122 expected case/pair/judge results (each requires both orders).

Each pair is judged in both orders; a win needs both orders to agree. An evidence-dependent abstention in either order makes the pair inconclusive; other disagreements are ties (a *flip* when the orders picked opposite systems). "all judges agree" includes only pairs completed by every configured judge, and counts a win only when every judge gave it. With few cases, treat p-values and intervals as a sense of scale, not proof.

## dev split (61 cases)

aifirstcli-book-walk, aifirstcli-duckling-wheels, aifirstcli-homebrew-maven, aifirstcli-hooks-path, aifirstcli-javafx-maven, aifirstcli-learner-replay-ux, aifirstcli-macos-installer, aifirstcli-showtail-harness, aifirstcli-signpath-release, aifirstcli-tui-responsive, aifirstcontent-apache, aifirstcontent-book-step-verify, aifirstcontent-portable-replays, aifirstcontent-replay-start-state, aifirstextension-apache-license, aifirstwebsite-guided-install, aifirstwebsite-macos-workaround, aifirstwebsite-signing-policy, bazzite-stale-portal, pr10, pr11, pr12, pr5, pr8, pr9, prbench-aggregate-only, prbench-compare-systems, prbench-crossjudge, prbench-graph-compare-doc, prbench-judge-retry, prbench-parallel-providers, prbench-priced-cost-gate, prbench-scoring, prbench-shell-bookkeeping, showtail-claude-exit-codes, showtail-docker-tests, showtail-self-upgrade, showtail-signpath, showtail-transcript-migrator, showtail-windows-cmd, tracetoon-brief-owners-rows, tracetoon-chained-runs, tracetoon-cli-guard-tests, tracetoon-evidence-graph, tracetoon-lean-reviewer, tracetoon-neighborhood, tracetoon-receipt-quoting, tracetoon-render-name-check, tracetoon-review-run-all, tracetoon-sql-row-order, tracetoon-update-command, vex-v5-serial-aim-port, vexagent-cli-snap, vexagent-repl-usb-iface, vexagent-replug-runs, vexagent-skill, vexaim, vexaim-workshop-ci, vexaim-workshop-norobot, winapps-adobe-2026, winapps-sdl-wayland

### Head to head

| x vs y | judge | x wins | y wins | ties | flips | inconclusive | x win rate | sign test p | mean (x−y) [95% CI] |
|---|---|---|---|---|---|---|---|---|---|
| codex-native vs tracetoon-candidate | codex:gpt-6.1-sol@medium | 12 | 41 | 8 | 8 | 0 | 23% | 0.00 | -0.48 [-0.67, -0.26] |
| codex-native vs tracetoon-candidate | codex:gpt-6.1-terra@medium | 6 | 42 | 8 | 8 | 5 | 13% | 0.00 | -0.64 [-0.80, -0.45] |
| codex-native vs tracetoon-candidate | all judges agree | 6 | 38 | 12 | 11 | 5 | 14% | 0.00 | -0.57 [-0.75, -0.38] |

### Per system (means over every judgment of that system)

| system | judgments | factual errors | unsupported overclaims | evidence gaps | claims covered | context covered | uncertainties respected | traps hit | median words | total agent cost |
|---|---|---|---|---|---|---|---|---|---|---|
| codex-native | 244 | 0.21 | 0.04 | 4.74 | 72% | 11% | 96% | 0.05 | 180 | – |
| tracetoon-candidate | 244 | 0.15 | 0.05 | 3.34 | 85% | 40% | 94% | 0.00 | 379 | – |

### Fresh writer evidence coverage (artifact counts)

| system | artifacts | recorded | partial | unavailable |
|---|---|---|---|---|
| codex-native | 61 | 0 | 61 | 0 |
| tracetoon-candidate | 61 | 0 | 61 | 0 |

### Rubric (mean of 0–2 scores; n/a items excluded)

| system | problem | rationale | validation | consequences | orientation | entry | economy | feedback | links | scope |
|---|---|---|---|---|---|---|---|---|---|---|
| codex-native | 1.35 | 1.02 | 1.67 | 1.50 | 2.00 | 0.77 | 1.94 | 1.25 | 0.65 | 1.89 |
| tracetoon-candidate | 1.79 | 1.67 | 1.65 | 1.84 | 1.92 | 1.99 | 1.12 | 1.98 | 1.11 | 1.86 |

## Judge agreement

- codex:gpt-6.1-sol@medium vs codex:gpt-6.1-terra@medium: 88% of 56 pair verdicts agree; Cohen's kappa 0.72.

## Warnings

- aifirstcli-book-walk: codex-native: fresh validation evidence partial
- aifirstcli-book-walk: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-duckling-wheels: codex-native: fresh validation evidence partial
- aifirstcli-duckling-wheels: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-homebrew-maven: codex-native: fresh validation evidence partial
- aifirstcli-homebrew-maven: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-hooks-path: codex-native: fresh validation evidence partial
- aifirstcli-hooks-path: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-javafx-maven: codex-native: fresh validation evidence partial
- aifirstcli-javafx-maven: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-learner-replay-ux: codex-native: fresh validation evidence partial
- aifirstcli-learner-replay-ux: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-macos-installer: codex-native: fresh validation evidence partial
- aifirstcli-macos-installer: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-showtail-harness: codex-native: fresh validation evidence partial
- aifirstcli-showtail-harness: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-signpath-release: codex-native: fresh validation evidence partial
- aifirstcli-signpath-release: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-tui-responsive: codex-native: fresh validation evidence partial
- aifirstcli-tui-responsive: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-apache: codex-native: fresh validation evidence partial
- aifirstcontent-apache: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-book-step-verify: codex-native: fresh validation evidence partial
- aifirstcontent-book-step-verify: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-portable-replays: codex-native: fresh validation evidence partial
- aifirstcontent-portable-replays: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-replay-start-state: codex-native: fresh validation evidence partial
- aifirstcontent-replay-start-state: tracetoon-candidate: fresh validation evidence partial
- aifirstextension-apache-license: codex-native: fresh validation evidence partial
- aifirstextension-apache-license: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-guided-install: codex-native: fresh validation evidence partial
- aifirstwebsite-guided-install: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-macos-workaround: codex-native: fresh validation evidence partial
- aifirstwebsite-macos-workaround: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-signing-policy: codex-native: fresh validation evidence partial
- aifirstwebsite-signing-policy: tracetoon-candidate: fresh validation evidence partial
- bazzite-stale-portal: codex-native: fresh validation evidence partial
- bazzite-stale-portal: tracetoon-candidate: fresh validation evidence partial
- pr10: codex-native: fresh validation evidence partial
- pr10: tracetoon-candidate: fresh validation evidence partial
- pr11: codex-native: fresh validation evidence partial
- pr11: tracetoon-candidate: fresh validation evidence partial
- pr12: codex-native: fresh validation evidence partial
- pr12: tracetoon-candidate: fresh validation evidence partial
- pr5: codex-native: fresh validation evidence partial
- pr5: tracetoon-candidate: fresh validation evidence partial
- pr8: codex-native: fresh validation evidence partial
- pr8: tracetoon-candidate: fresh validation evidence partial
- pr9: codex-native: fresh validation evidence partial
- pr9: tracetoon-candidate: fresh validation evidence partial
- prbench-aggregate-only: codex-native: fresh validation evidence partial
- prbench-aggregate-only: tracetoon-candidate: fresh validation evidence partial
- prbench-compare-systems: codex-native: fresh validation evidence partial
- prbench-compare-systems: tracetoon-candidate: fresh validation evidence partial
- prbench-crossjudge: codex-native: fresh validation evidence partial
- prbench-crossjudge: tracetoon-candidate: fresh validation evidence partial
- prbench-graph-compare-doc: codex-native: fresh validation evidence partial
- prbench-graph-compare-doc: tracetoon-candidate: fresh validation evidence partial
- prbench-judge-retry: codex-native: fresh validation evidence partial
- prbench-judge-retry: tracetoon-candidate: fresh validation evidence partial
- prbench-parallel-providers: codex-native: fresh validation evidence partial
- prbench-parallel-providers: tracetoon-candidate: fresh validation evidence partial
- prbench-priced-cost-gate: codex-native: fresh validation evidence partial
- prbench-priced-cost-gate: tracetoon-candidate: fresh validation evidence partial
- prbench-scoring: codex-native: fresh validation evidence partial
- prbench-scoring: tracetoon-candidate: fresh validation evidence partial
- prbench-shell-bookkeeping: codex-native: fresh validation evidence partial
- prbench-shell-bookkeeping: tracetoon-candidate: fresh validation evidence partial
- showtail-claude-exit-codes: codex-native: fresh validation evidence partial
- showtail-claude-exit-codes: tracetoon-candidate: fresh validation evidence partial
- showtail-docker-tests: codex-native: fresh validation evidence partial
- showtail-docker-tests: tracetoon-candidate: fresh validation evidence partial
- showtail-docker-tests: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- showtail-self-upgrade: codex-native: fresh validation evidence partial
- showtail-self-upgrade: tracetoon-candidate: fresh validation evidence partial
- showtail-signpath: codex-native: fresh validation evidence partial
- showtail-signpath: tracetoon-candidate: fresh validation evidence partial
- showtail-transcript-migrator: codex-native: fresh validation evidence partial
- showtail-transcript-migrator: tracetoon-candidate: fresh validation evidence partial
- showtail-windows-cmd: codex-native: fresh validation evidence partial
- showtail-windows-cmd: tracetoon-candidate: fresh validation evidence partial
- tracetoon-brief-owners-rows: codex-native: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-candidate: fresh validation evidence partial
- tracetoon-brief-owners-rows: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-chained-runs: codex-native: fresh validation evidence partial
- tracetoon-chained-runs: tracetoon-candidate: fresh validation evidence partial
- tracetoon-chained-runs: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-cli-guard-tests: codex-native: fresh validation evidence partial
- tracetoon-cli-guard-tests: tracetoon-candidate: fresh validation evidence partial
- tracetoon-evidence-graph: codex-native: fresh validation evidence partial
- tracetoon-evidence-graph: tracetoon-candidate: fresh validation evidence partial
- tracetoon-evidence-graph: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-lean-reviewer: codex-native: fresh validation evidence partial
- tracetoon-lean-reviewer: tracetoon-candidate: fresh validation evidence partial
- tracetoon-lean-reviewer: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-neighborhood: codex-native: fresh validation evidence partial
- tracetoon-neighborhood: tracetoon-candidate: fresh validation evidence partial
- tracetoon-receipt-quoting: codex-native: fresh validation evidence partial
- tracetoon-receipt-quoting: tracetoon-candidate: fresh validation evidence partial
- tracetoon-receipt-quoting: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-render-name-check: codex-native: fresh validation evidence partial
- tracetoon-render-name-check: tracetoon-candidate: fresh validation evidence partial
- tracetoon-render-name-check: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-review-run-all: codex-native: fresh validation evidence partial
- tracetoon-review-run-all: tracetoon-candidate: fresh validation evidence partial
- tracetoon-review-run-all: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-sql-row-order: codex-native: fresh validation evidence partial
- tracetoon-sql-row-order: tracetoon-candidate: fresh validation evidence partial
- tracetoon-sql-row-order: codex-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-update-command: codex-native: fresh validation evidence partial
- tracetoon-update-command: tracetoon-candidate: fresh validation evidence partial
- vex-v5-serial-aim-port: codex-native: fresh validation evidence partial
- vex-v5-serial-aim-port: tracetoon-candidate: fresh validation evidence partial
- vexagent-cli-snap: codex-native: fresh validation evidence partial
- vexagent-cli-snap: tracetoon-candidate: fresh validation evidence partial
- vexagent-repl-usb-iface: codex-native: fresh validation evidence partial
- vexagent-repl-usb-iface: tracetoon-candidate: fresh validation evidence partial
- vexagent-replug-runs: codex-native: fresh validation evidence partial
- vexagent-replug-runs: tracetoon-candidate: fresh validation evidence partial
- vexagent-skill: codex-native: fresh validation evidence partial
- vexagent-skill: tracetoon-candidate: fresh validation evidence partial
- vexaim: codex-native: fresh validation evidence partial
- vexaim: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-ci: codex-native: fresh validation evidence partial
- vexaim-workshop-ci: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-norobot: codex-native: fresh validation evidence partial
- vexaim-workshop-norobot: tracetoon-candidate: fresh validation evidence partial
- winapps-adobe-2026: codex-native: fresh validation evidence partial
- winapps-adobe-2026: tracetoon-candidate: fresh validation evidence partial
- winapps-sdl-wayland: codex-native: fresh validation evidence partial
- winapps-sdl-wayland: tracetoon-candidate: fresh validation evidence partial

