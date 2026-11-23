# dev comparison

Outcome: **failed**. Quality: failed. Efficiency: inconclusive.

Writers: 366/366; order judgments: 732/732.

Failed attempts: 1; failed-attempt time: 28s; current pending cleanup: 0.

| Model | System | Samples | Median writer seconds | Median input tokens | Pending cleanup |
|---|---|---:|---:|---:|---:|
| claude-opus-5-5@medium | claude-native | 183 | 211.62 | 230464 | 0 |
| claude-opus-5-5@medium | tracetoon-candidate | 183 | 405.11 | 94948 | 0 |

## Gate findings

- Accuracy (confirmed errors per scored draft, 0 drafts): candidate unknown (0 of 144 flags confirmed), baseline unknown (0 of 0 flags confirmed); unresolved 0.
- No measured claim/context coverage improvement against baseline
- Aggregate consensus wins must exceed losses against baseline
- Unresolved: accuracy: no drafts scored in candidate-vs-baseline pairs
- Unresolved: claude-opus-5-5@medium: claimCoverage unavailable
- Unresolved: claude-opus-5-5@medium: contextCoverage unavailable

## Paired performance

Rule: Pass when the candidate/baseline geometric mean of paired per-draft priced cost (same model, case and replicate; log ratios averaged within each case, then across cases) is at most 1.000. The case-clustered 95% interval is reported, not required. Any paired draft without a priced cost makes the gate inconclusive. Writer wall time and token counts are information, not criteria.

Candidate/baseline geometric mean priced cost ratio (criterion): unknown over 0/0 pairs; case-clustered 95% interval: [null,null].

Candidate/baseline geometric mean writer ratio (information): unknown; case-clustered 95% interval: [null,null].

- 3 replicate(s) still represent 61 independent cases in this split.
- Writer timing includes service waits and neutral observation overhead; runtime diagnostics may overlap.
- Diagnostic reuse cannot establish a fresh performance improvement.
- Raw judgments are preserved separately from source-backed adjudications.
- Validation did not complete for either writer in any of the 183 pairs, so the sandbox could not run it; cost, timing and token results compare writers that both lacked completed validation and say nothing about validation work saved or skipped. Reasons recorded: Final code identity or content observation is unavailable. | No canonical validation execution is available. | Validation directory is unknown.

## Scores

Composite (0-100) = 35·claims + 15·context + 15·uncertainties + 35·rubric (coverage as fractions of the fact sheet, rubric as mean/2) − 15·factual errors − 7·unsupported claims − 10·traps hit, floored at 0. Each draft is averaged over all its judgments; arm means are means of per-case means, with a 95% bootstrap interval over cases. Components are the primary evidence; the composite is a summary.

| Model | System | Drafts | Composite [95% CI] | Claims | Context | Uncert. | Rubric | Errors | Unsupported | Traps | $/draft | Cost covers | Subagents/draft | Input tokens | Queries |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|
| claude-opus-5-5@medium | claude-native | 183 | 52.8 [48.4, 56.7] | 0.73 | 0.19 | 0.54 | 0.69 | 0.32 | 0.32 | 0.12 | 0.265 | reported total | – | 281499 | – |
| claude-opus-5-5@medium | tracetoon-candidate | 183 | 68.3 [65.7, 70.8] | 0.81 | 0.39 | 0.59 | 0.83 | 0.16 | 0.16 | 0.04 | 0.498 | reported total | – | 95106 | – |

Paired candidate − other system (same model, case and replicate). Leave one case out = lowest and highest composite Δ when each case in turn is dropped:

| Model | Against | Pairs | Composite Δ [95% CI] | Leave one case out | Factual errors Δ |
|---|---|---:|---|---|---:|
| claude-opus-5-5@medium | claude-native | 183 | 15.5 [11.9, 19.6] | 14.6 to 15.9 | -0.16 |

Judge reliability (timed-out and transient calls are retried, up to 3 attempts per order judgment; a malformed reply gets one format repair, then fresh requests, up to 5 attempts):

| Judge | Failed attempts | Timed out | Transient | Format | Other |
|---|---:|---:|---:|---:|---:|
| claude:claude-sonnet-5-5@medium | 1 | 0 | 0 | 1 | 0 |

## Accuracy

Error rate = share of judgments that found at least one factual error (mean of per-case means, 95% bootstrap interval over cases). Error classes are mean factual errors per judgment by kind of statement.

| Model | System | Drafts | Error rate [95% CI] | Errors | Unsupported | Claims | validation | code structure | attribution | motivation | pipeline | other | $/draft |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| claude-opus-5-5@medium | claude-native | 183 | 0.27 [0.20, 0.35] | 0.32 | 0.32 | 0.73 | 0.13 | 0.00 | 0.03 | 0.00 | 0.01 | 0.14 | 0.265 |
| claude-opus-5-5@medium | tracetoon-candidate | 183 | 0.14 [0.09, 0.18] | 0.16 | 0.16 | 0.81 | 0.06 | 0.00 | 0.02 | 0.00 | 0.00 | 0.08 | 0.498 |

## claude-opus-5-5@medium, replicate 1: claude-native

# prbench report

Rubric v6. Judges: claude:claude-opus-5-5@medium, claude:claude-sonnet-5-5@medium. Generated 2026-11-23T16:43:50.558Z.

Evidence gaps are unverified claims, not errors or fabrication. Fresh evidence coverage is reported per artifact; partial capture may still establish individual results. Inconclusive preferences are excluded from win/tie statistics, intervals and judge agreement.

Completed 122 of 122 expected case/pair/judge results (each requires both orders).

Each pair is judged in both orders; a win needs both orders to agree. An evidence-dependent abstention in either order makes the pair inconclusive; other disagreements are ties (a *flip* when the orders picked opposite systems). "all judges agree" includes only pairs completed by every configured judge, and counts a win only when every judge gave it. With few cases, treat p-values and intervals as a sense of scale, not proof.

## dev split (61 cases)

aifirstcli-book-walk, aifirstcli-duckling-wheels, aifirstcli-homebrew-maven, aifirstcli-hooks-path, aifirstcli-javafx-maven, aifirstcli-learner-replay-ux, aifirstcli-macos-installer, aifirstcli-showtail-harness, aifirstcli-signpath-release, aifirstcli-tui-responsive, aifirstcontent-apache, aifirstcontent-book-step-verify, aifirstcontent-portable-replays, aifirstcontent-replay-start-state, aifirstextension-apache-license, aifirstwebsite-guided-install, aifirstwebsite-macos-workaround, aifirstwebsite-signing-policy, bazzite-stale-portal, pr10, pr11, pr12, pr5, pr8, pr9, prbench-aggregate-only, prbench-compare-systems, prbench-crossjudge, prbench-graph-compare-doc, prbench-judge-retry, prbench-parallel-providers, prbench-priced-cost-gate, prbench-scoring, prbench-shell-bookkeeping, showtail-claude-exit-codes, showtail-docker-tests, showtail-self-upgrade, showtail-signpath, showtail-transcript-migrator, showtail-windows-cmd, tracetoon-brief-owners-rows, tracetoon-chained-runs, tracetoon-cli-guard-tests, tracetoon-evidence-graph, tracetoon-lean-reviewer, tracetoon-neighborhood, tracetoon-receipt-quoting, tracetoon-render-name-check, tracetoon-review-run-all, tracetoon-sql-row-order, tracetoon-update-command, vex-v5-serial-aim-port, vexagent-cli-snap, vexagent-repl-usb-iface, vexagent-replug-runs, vexagent-skill, vexaim, vexaim-workshop-ci, vexaim-workshop-norobot, winapps-adobe-2026, winapps-sdl-wayland

### Head to head

| x vs y | judge | x wins | y wins | ties | flips | inconclusive | x win rate | sign test p | mean (x−y) [95% CI] |
|---|---|---|---|---|---|---|---|---|---|
| claude-native vs tracetoon-candidate | claude:claude-opus-5-5@medium | 14 | 37 | 9 | 9 | 1 | 27% | 0.00 | -0.38 [-0.58, -0.17] |
| claude-native vs tracetoon-candidate | claude:claude-sonnet-5-5@medium | 4 | 31 | 26 | 24 | 0 | 11% | 0.00 | -0.44 [-0.59, -0.28] |
| claude-native vs tracetoon-candidate | all judges agree | 3 | 26 | 31 | 27 | 1 | 10% | 0.00 | -0.38 [-0.53, -0.23] |

### Per system (means over every judgment of that system)

| system | judgments | factual errors | unsupported overclaims | evidence gaps | claims covered | context covered | uncertainties respected | traps hit | median words | total agent cost |
|---|---|---|---|---|---|---|---|---|---|---|
| claude-native | 244 | 0.31 | 0.31 | 0.78 | 73% | 19% | 54% | 0.09 | 297 | $16.67 |
| tracetoon-candidate | 244 | 0.13 | 0.18 | 0.49 | 82% | 39% | 60% | 0.02 | 453 | $31.94 |

### Fresh writer evidence coverage (artifact counts)

| system | artifacts | recorded | partial | unavailable |
|---|---|---|---|---|
| claude-native | 61 | 0 | 61 | 0 |
| tracetoon-candidate | 61 | 0 | 61 | 0 |

### Rubric (mean of 0–2 scores; n/a items excluded)

| system | problem | rationale | validation | consequences | orientation | entry | economy | feedback | links | scope |
|---|---|---|---|---|---|---|---|---|---|---|
| claude-native | 1.41 | 0.95 | 1.76 | 1.10 | 1.84 | 0.55 | 1.89 | 0.78 | 1.04 | 1.76 |
| tracetoon-candidate | 1.84 | 1.46 | 1.55 | 1.55 | 1.83 | 1.93 | 1.25 | 1.99 | 0.98 | 1.75 |

## Judge agreement

- claude:claude-opus-5-5@medium vs claude:claude-sonnet-5-5@medium: 58% of 60 pair verdicts agree; Cohen's kappa 0.31.

## Warnings

- aifirstcli-book-walk: claude-native: fresh validation evidence partial
- aifirstcli-book-walk: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-duckling-wheels: claude-native: fresh validation evidence partial
- aifirstcli-duckling-wheels: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-homebrew-maven: claude-native: fresh validation evidence partial
- aifirstcli-homebrew-maven: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-homebrew-maven: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- aifirstcli-hooks-path: claude-native: fresh validation evidence partial
- aifirstcli-hooks-path: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-javafx-maven: claude-native: fresh validation evidence partial
- aifirstcli-javafx-maven: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-learner-replay-ux: claude-native: fresh validation evidence partial
- aifirstcli-learner-replay-ux: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-macos-installer: claude-native: fresh validation evidence partial
- aifirstcli-macos-installer: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-showtail-harness: claude-native: fresh validation evidence partial
- aifirstcli-showtail-harness: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-signpath-release: claude-native: fresh validation evidence partial
- aifirstcli-signpath-release: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-tui-responsive: claude-native: fresh validation evidence partial
- aifirstcli-tui-responsive: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-apache: claude-native: fresh validation evidence partial
- aifirstcontent-apache: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-book-step-verify: claude-native: fresh validation evidence partial
- aifirstcontent-book-step-verify: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-portable-replays: claude-native: fresh validation evidence partial
- aifirstcontent-portable-replays: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-replay-start-state: claude-native: fresh validation evidence partial
- aifirstcontent-replay-start-state: tracetoon-candidate: fresh validation evidence partial
- aifirstextension-apache-license: claude-native: fresh validation evidence partial
- aifirstextension-apache-license: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-guided-install: claude-native: fresh validation evidence partial
- aifirstwebsite-guided-install: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-macos-workaround: claude-native: fresh validation evidence partial
- aifirstwebsite-macos-workaround: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-signing-policy: claude-native: fresh validation evidence partial
- aifirstwebsite-signing-policy: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-signing-policy: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- bazzite-stale-portal: claude-native: fresh validation evidence partial
- bazzite-stale-portal: tracetoon-candidate: fresh validation evidence partial
- pr10: claude-native: fresh validation evidence partial
- pr10: tracetoon-candidate: fresh validation evidence partial
- pr11: claude-native: fresh validation evidence partial
- pr11: tracetoon-candidate: fresh validation evidence partial
- pr12: claude-native: fresh validation evidence partial
- pr12: tracetoon-candidate: fresh validation evidence partial
- pr5: claude-native: fresh validation evidence partial
- pr5: tracetoon-candidate: fresh validation evidence partial
- pr8: claude-native: fresh validation evidence partial
- pr8: tracetoon-candidate: fresh validation evidence partial
- pr9: claude-native: fresh validation evidence partial
- pr9: tracetoon-candidate: fresh validation evidence partial
- prbench-aggregate-only: claude-native: fresh validation evidence partial
- prbench-aggregate-only: tracetoon-candidate: fresh validation evidence partial
- prbench-compare-systems: claude-native: fresh validation evidence partial
- prbench-compare-systems: tracetoon-candidate: fresh validation evidence partial
- prbench-crossjudge: claude-native: fresh validation evidence partial
- prbench-crossjudge: tracetoon-candidate: fresh validation evidence partial
- prbench-graph-compare-doc: claude-native: fresh validation evidence partial
- prbench-graph-compare-doc: tracetoon-candidate: fresh validation evidence partial
- prbench-judge-retry: claude-native: fresh validation evidence partial
- prbench-judge-retry: tracetoon-candidate: fresh validation evidence partial
- prbench-parallel-providers: claude-native: fresh validation evidence partial
- prbench-parallel-providers: tracetoon-candidate: fresh validation evidence partial
- prbench-priced-cost-gate: claude-native: fresh validation evidence partial
- prbench-priced-cost-gate: tracetoon-candidate: fresh validation evidence partial
- prbench-scoring: claude-native: fresh validation evidence partial
- prbench-scoring: tracetoon-candidate: fresh validation evidence partial
- prbench-shell-bookkeeping: claude-native: fresh validation evidence partial
- prbench-shell-bookkeeping: tracetoon-candidate: fresh validation evidence partial
- showtail-claude-exit-codes: claude-native: fresh validation evidence partial
- showtail-claude-exit-codes: tracetoon-candidate: fresh validation evidence partial
- showtail-docker-tests: claude-native: fresh validation evidence partial
- showtail-docker-tests: tracetoon-candidate: fresh validation evidence partial
- showtail-self-upgrade: claude-native: fresh validation evidence partial
- showtail-self-upgrade: tracetoon-candidate: fresh validation evidence partial
- showtail-signpath: claude-native: fresh validation evidence partial
- showtail-signpath: tracetoon-candidate: fresh validation evidence partial
- showtail-transcript-migrator: claude-native: fresh validation evidence partial
- showtail-transcript-migrator: tracetoon-candidate: fresh validation evidence partial
- showtail-transcript-migrator: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- showtail-windows-cmd: claude-native: fresh validation evidence partial
- showtail-windows-cmd: tracetoon-candidate: fresh validation evidence partial
- tracetoon-brief-owners-rows: claude-native: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-candidate: fresh validation evidence partial
- tracetoon-chained-runs: claude-native: fresh validation evidence partial
- tracetoon-chained-runs: tracetoon-candidate: fresh validation evidence partial
- tracetoon-chained-runs: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-cli-guard-tests: claude-native: fresh validation evidence partial
- tracetoon-cli-guard-tests: tracetoon-candidate: fresh validation evidence partial
- tracetoon-evidence-graph: claude-native: fresh validation evidence partial
- tracetoon-evidence-graph: tracetoon-candidate: fresh validation evidence partial
- tracetoon-evidence-graph: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-lean-reviewer: claude-native: fresh validation evidence partial
- tracetoon-lean-reviewer: tracetoon-candidate: fresh validation evidence partial
- tracetoon-lean-reviewer: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-neighborhood: claude-native: fresh validation evidence partial
- tracetoon-neighborhood: tracetoon-candidate: fresh validation evidence partial
- tracetoon-receipt-quoting: claude-native: fresh validation evidence partial
- tracetoon-receipt-quoting: tracetoon-candidate: fresh validation evidence partial
- tracetoon-render-name-check: claude-native: fresh validation evidence partial
- tracetoon-render-name-check: tracetoon-candidate: fresh validation evidence partial
- tracetoon-render-name-check: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-review-run-all: claude-native: fresh validation evidence partial
- tracetoon-review-run-all: tracetoon-candidate: fresh validation evidence partial
- tracetoon-review-run-all: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-sql-row-order: claude-native: fresh validation evidence partial
- tracetoon-sql-row-order: tracetoon-candidate: fresh validation evidence partial
- tracetoon-update-command: claude-native: fresh validation evidence partial
- tracetoon-update-command: tracetoon-candidate: fresh validation evidence partial
- vex-v5-serial-aim-port: claude-native: fresh validation evidence partial
- vex-v5-serial-aim-port: tracetoon-candidate: fresh validation evidence partial
- vexagent-cli-snap: claude-native: fresh validation evidence partial
- vexagent-cli-snap: tracetoon-candidate: fresh validation evidence partial
- vexagent-repl-usb-iface: claude-native: fresh validation evidence partial
- vexagent-repl-usb-iface: tracetoon-candidate: fresh validation evidence partial
- vexagent-replug-runs: claude-native: fresh validation evidence partial
- vexagent-replug-runs: tracetoon-candidate: fresh validation evidence partial
- vexagent-skill: claude-native: fresh validation evidence partial
- vexagent-skill: tracetoon-candidate: fresh validation evidence partial
- vexaim: claude-native: fresh validation evidence partial
- vexaim: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-ci: claude-native: fresh validation evidence partial
- vexaim-workshop-ci: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-norobot: claude-native: fresh validation evidence partial
- vexaim-workshop-norobot: tracetoon-candidate: fresh validation evidence partial
- winapps-adobe-2026: claude-native: fresh validation evidence partial
- winapps-adobe-2026: tracetoon-candidate: fresh validation evidence partial
- winapps-sdl-wayland: claude-native: fresh validation evidence partial
- winapps-sdl-wayland: tracetoon-candidate: fresh validation evidence partial

## claude-opus-5-5@medium, replicate 2: claude-native

# prbench report

Rubric v6. Judges: claude:claude-opus-5-5@medium, claude:claude-sonnet-5-5@medium. Generated 2026-11-23T16:43:51.261Z.

Evidence gaps are unverified claims, not errors or fabrication. Fresh evidence coverage is reported per artifact; partial capture may still establish individual results. Inconclusive preferences are excluded from win/tie statistics, intervals and judge agreement.

Completed 122 of 122 expected case/pair/judge results (each requires both orders).

Each pair is judged in both orders; a win needs both orders to agree. An evidence-dependent abstention in either order makes the pair inconclusive; other disagreements are ties (a *flip* when the orders picked opposite systems). "all judges agree" includes only pairs completed by every configured judge, and counts a win only when every judge gave it. With few cases, treat p-values and intervals as a sense of scale, not proof.

## dev split (61 cases)

aifirstcli-book-walk, aifirstcli-duckling-wheels, aifirstcli-homebrew-maven, aifirstcli-hooks-path, aifirstcli-javafx-maven, aifirstcli-learner-replay-ux, aifirstcli-macos-installer, aifirstcli-showtail-harness, aifirstcli-signpath-release, aifirstcli-tui-responsive, aifirstcontent-apache, aifirstcontent-book-step-verify, aifirstcontent-portable-replays, aifirstcontent-replay-start-state, aifirstextension-apache-license, aifirstwebsite-guided-install, aifirstwebsite-macos-workaround, aifirstwebsite-signing-policy, bazzite-stale-portal, pr10, pr11, pr12, pr5, pr8, pr9, prbench-aggregate-only, prbench-compare-systems, prbench-crossjudge, prbench-graph-compare-doc, prbench-judge-retry, prbench-parallel-providers, prbench-priced-cost-gate, prbench-scoring, prbench-shell-bookkeeping, showtail-claude-exit-codes, showtail-docker-tests, showtail-self-upgrade, showtail-signpath, showtail-transcript-migrator, showtail-windows-cmd, tracetoon-brief-owners-rows, tracetoon-chained-runs, tracetoon-cli-guard-tests, tracetoon-evidence-graph, tracetoon-lean-reviewer, tracetoon-neighborhood, tracetoon-receipt-quoting, tracetoon-render-name-check, tracetoon-review-run-all, tracetoon-sql-row-order, tracetoon-update-command, vex-v5-serial-aim-port, vexagent-cli-snap, vexagent-repl-usb-iface, vexagent-replug-runs, vexagent-skill, vexaim, vexaim-workshop-ci, vexaim-workshop-norobot, winapps-adobe-2026, winapps-sdl-wayland

### Head to head

| x vs y | judge | x wins | y wins | ties | flips | inconclusive | x win rate | sign test p | mean (x−y) [95% CI] |
|---|---|---|---|---|---|---|---|---|---|
| claude-native vs tracetoon-candidate | claude:claude-opus-5-5@medium | 12 | 39 | 10 | 10 | 0 | 24% | 0.00 | -0.44 [-0.64, -0.23] |
| claude-native vs tracetoon-candidate | claude:claude-sonnet-5-5@medium | 3 | 23 | 35 | 32 | 0 | 12% | 0.00 | -0.33 [-0.46, -0.18] |
| claude-native vs tracetoon-candidate | all judges agree | 2 | 22 | 37 | 34 | 0 | 8% | 0.00 | -0.33 [-0.46, -0.20] |

### Per system (means over every judgment of that system)

| system | judgments | factual errors | unsupported overclaims | evidence gaps | claims covered | context covered | uncertainties respected | traps hit | median words | total agent cost |
|---|---|---|---|---|---|---|---|---|---|---|
| claude-native | 244 | 0.32 | 0.31 | 0.70 | 74% | 19% | 52% | 0.13 | 303 | $16.65 |
| tracetoon-candidate | 244 | 0.22 | 0.14 | 0.36 | 81% | 38% | 58% | 0.07 | 455 | $29.01 |

### Fresh writer evidence coverage (artifact counts)

| system | artifacts | recorded | partial | unavailable |
|---|---|---|---|---|
| claude-native | 61 | 0 | 61 | 0 |
| tracetoon-candidate | 61 | 0 | 61 | 0 |

### Rubric (mean of 0–2 scores; n/a items excluded)

| system | problem | rationale | validation | consequences | orientation | entry | economy | feedback | links | scope |
|---|---|---|---|---|---|---|---|---|---|---|
| claude-native | 1.45 | 1.03 | 1.83 | 1.17 | 1.83 | 0.55 | 1.91 | 0.78 | 1.05 | 1.77 |
| tracetoon-candidate | 1.79 | 1.49 | 1.62 | 1.51 | 1.81 | 1.94 | 1.25 | 1.99 | 0.73 | 1.75 |

## Judge agreement

- claude:claude-opus-5-5@medium vs claude:claude-sonnet-5-5@medium: 54% of 61 pair verdicts agree; Cohen's kappa 0.30.

## Warnings

- aifirstcli-book-walk: claude-native: fresh validation evidence partial
- aifirstcli-book-walk: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-duckling-wheels: claude-native: fresh validation evidence partial
- aifirstcli-duckling-wheels: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-homebrew-maven: claude-native: fresh validation evidence partial
- aifirstcli-homebrew-maven: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-homebrew-maven: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- aifirstcli-hooks-path: claude-native: fresh validation evidence partial
- aifirstcli-hooks-path: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-javafx-maven: claude-native: fresh validation evidence partial
- aifirstcli-javafx-maven: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-learner-replay-ux: claude-native: fresh validation evidence partial
- aifirstcli-learner-replay-ux: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-macos-installer: claude-native: fresh validation evidence partial
- aifirstcli-macos-installer: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-showtail-harness: claude-native: fresh validation evidence partial
- aifirstcli-showtail-harness: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-signpath-release: claude-native: fresh validation evidence partial
- aifirstcli-signpath-release: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-tui-responsive: claude-native: fresh validation evidence partial
- aifirstcli-tui-responsive: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-apache: claude-native: fresh validation evidence partial
- aifirstcontent-apache: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-book-step-verify: claude-native: fresh validation evidence partial
- aifirstcontent-book-step-verify: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-portable-replays: claude-native: fresh validation evidence partial
- aifirstcontent-portable-replays: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-replay-start-state: claude-native: fresh validation evidence partial
- aifirstcontent-replay-start-state: tracetoon-candidate: fresh validation evidence partial
- aifirstextension-apache-license: claude-native: fresh validation evidence partial
- aifirstextension-apache-license: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-guided-install: claude-native: fresh validation evidence partial
- aifirstwebsite-guided-install: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-macos-workaround: claude-native: fresh validation evidence partial
- aifirstwebsite-macos-workaround: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-signing-policy: claude-native: fresh validation evidence partial
- aifirstwebsite-signing-policy: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-signing-policy: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- bazzite-stale-portal: claude-native: fresh validation evidence partial
- bazzite-stale-portal: tracetoon-candidate: fresh validation evidence partial
- pr10: claude-native: fresh validation evidence partial
- pr10: tracetoon-candidate: fresh validation evidence partial
- pr11: claude-native: fresh validation evidence partial
- pr11: tracetoon-candidate: fresh validation evidence partial
- pr12: claude-native: fresh validation evidence partial
- pr12: tracetoon-candidate: fresh validation evidence partial
- pr5: claude-native: fresh validation evidence partial
- pr5: tracetoon-candidate: fresh validation evidence partial
- pr8: claude-native: fresh validation evidence partial
- pr8: tracetoon-candidate: fresh validation evidence partial
- pr9: claude-native: fresh validation evidence partial
- pr9: tracetoon-candidate: fresh validation evidence partial
- prbench-aggregate-only: claude-native: fresh validation evidence partial
- prbench-aggregate-only: tracetoon-candidate: fresh validation evidence partial
- prbench-compare-systems: claude-native: fresh validation evidence partial
- prbench-compare-systems: tracetoon-candidate: fresh validation evidence partial
- prbench-crossjudge: claude-native: fresh validation evidence partial
- prbench-crossjudge: tracetoon-candidate: fresh validation evidence partial
- prbench-graph-compare-doc: claude-native: fresh validation evidence partial
- prbench-graph-compare-doc: tracetoon-candidate: fresh validation evidence partial
- prbench-judge-retry: claude-native: fresh validation evidence partial
- prbench-judge-retry: tracetoon-candidate: fresh validation evidence partial
- prbench-parallel-providers: claude-native: fresh validation evidence partial
- prbench-parallel-providers: tracetoon-candidate: fresh validation evidence partial
- prbench-priced-cost-gate: claude-native: fresh validation evidence partial
- prbench-priced-cost-gate: tracetoon-candidate: fresh validation evidence partial
- prbench-scoring: claude-native: fresh validation evidence partial
- prbench-scoring: tracetoon-candidate: fresh validation evidence partial
- prbench-shell-bookkeeping: claude-native: fresh validation evidence partial
- prbench-shell-bookkeeping: tracetoon-candidate: fresh validation evidence partial
- showtail-claude-exit-codes: claude-native: fresh validation evidence partial
- showtail-claude-exit-codes: tracetoon-candidate: fresh validation evidence partial
- showtail-docker-tests: claude-native: fresh validation evidence partial
- showtail-docker-tests: tracetoon-candidate: fresh validation evidence partial
- showtail-self-upgrade: claude-native: fresh validation evidence partial
- showtail-self-upgrade: tracetoon-candidate: fresh validation evidence partial
- showtail-signpath: claude-native: fresh validation evidence partial
- showtail-signpath: tracetoon-candidate: fresh validation evidence partial
- showtail-transcript-migrator: claude-native: fresh validation evidence partial
- showtail-transcript-migrator: tracetoon-candidate: fresh validation evidence partial
- showtail-transcript-migrator: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- showtail-windows-cmd: claude-native: fresh validation evidence partial
- showtail-windows-cmd: tracetoon-candidate: fresh validation evidence partial
- tracetoon-brief-owners-rows: claude-native: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-candidate: fresh validation evidence partial
- tracetoon-chained-runs: claude-native: fresh validation evidence partial
- tracetoon-chained-runs: tracetoon-candidate: fresh validation evidence partial
- tracetoon-chained-runs: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-cli-guard-tests: claude-native: fresh validation evidence partial
- tracetoon-cli-guard-tests: tracetoon-candidate: fresh validation evidence partial
- tracetoon-evidence-graph: claude-native: fresh validation evidence partial
- tracetoon-evidence-graph: tracetoon-candidate: fresh validation evidence partial
- tracetoon-evidence-graph: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-lean-reviewer: claude-native: fresh validation evidence partial
- tracetoon-lean-reviewer: tracetoon-candidate: fresh validation evidence partial
- tracetoon-lean-reviewer: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-neighborhood: claude-native: fresh validation evidence partial
- tracetoon-neighborhood: tracetoon-candidate: fresh validation evidence partial
- tracetoon-receipt-quoting: claude-native: fresh validation evidence partial
- tracetoon-receipt-quoting: tracetoon-candidate: fresh validation evidence partial
- tracetoon-render-name-check: claude-native: fresh validation evidence partial
- tracetoon-render-name-check: tracetoon-candidate: fresh validation evidence partial
- tracetoon-review-run-all: claude-native: fresh validation evidence partial
- tracetoon-review-run-all: tracetoon-candidate: fresh validation evidence partial
- tracetoon-review-run-all: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-sql-row-order: claude-native: fresh validation evidence partial
- tracetoon-sql-row-order: tracetoon-candidate: fresh validation evidence partial
- tracetoon-sql-row-order: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-update-command: claude-native: fresh validation evidence partial
- tracetoon-update-command: tracetoon-candidate: fresh validation evidence partial
- vex-v5-serial-aim-port: claude-native: fresh validation evidence partial
- vex-v5-serial-aim-port: tracetoon-candidate: fresh validation evidence partial
- vexagent-cli-snap: claude-native: fresh validation evidence partial
- vexagent-cli-snap: tracetoon-candidate: fresh validation evidence partial
- vexagent-repl-usb-iface: claude-native: fresh validation evidence partial
- vexagent-repl-usb-iface: tracetoon-candidate: fresh validation evidence partial
- vexagent-replug-runs: claude-native: fresh validation evidence partial
- vexagent-replug-runs: tracetoon-candidate: fresh validation evidence partial
- vexagent-skill: claude-native: fresh validation evidence partial
- vexagent-skill: tracetoon-candidate: fresh validation evidence partial
- vexaim: claude-native: fresh validation evidence partial
- vexaim: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-ci: claude-native: fresh validation evidence partial
- vexaim-workshop-ci: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-norobot: claude-native: fresh validation evidence partial
- vexaim-workshop-norobot: tracetoon-candidate: fresh validation evidence partial
- winapps-adobe-2026: claude-native: fresh validation evidence partial
- winapps-adobe-2026: tracetoon-candidate: fresh validation evidence partial
- winapps-sdl-wayland: claude-native: fresh validation evidence partial
- winapps-sdl-wayland: tracetoon-candidate: fresh validation evidence partial

## claude-opus-5-5@medium, replicate 3: claude-native

# prbench report

Rubric v6. Judges: claude:claude-opus-5-5@medium, claude:claude-sonnet-5-5@medium. Generated 2026-11-23T16:43:51.938Z.

Evidence gaps are unverified claims, not errors or fabrication. Fresh evidence coverage is reported per artifact; partial capture may still establish individual results. Inconclusive preferences are excluded from win/tie statistics, intervals and judge agreement.

Completed 122 of 122 expected case/pair/judge results (each requires both orders).

Each pair is judged in both orders; a win needs both orders to agree. An evidence-dependent abstention in either order makes the pair inconclusive; other disagreements are ties (a *flip* when the orders picked opposite systems). "all judges agree" includes only pairs completed by every configured judge, and counts a win only when every judge gave it. With few cases, treat p-values and intervals as a sense of scale, not proof.

## dev split (61 cases)

aifirstcli-book-walk, aifirstcli-duckling-wheels, aifirstcli-homebrew-maven, aifirstcli-hooks-path, aifirstcli-javafx-maven, aifirstcli-learner-replay-ux, aifirstcli-macos-installer, aifirstcli-showtail-harness, aifirstcli-signpath-release, aifirstcli-tui-responsive, aifirstcontent-apache, aifirstcontent-book-step-verify, aifirstcontent-portable-replays, aifirstcontent-replay-start-state, aifirstextension-apache-license, aifirstwebsite-guided-install, aifirstwebsite-macos-workaround, aifirstwebsite-signing-policy, bazzite-stale-portal, pr10, pr11, pr12, pr5, pr8, pr9, prbench-aggregate-only, prbench-compare-systems, prbench-crossjudge, prbench-graph-compare-doc, prbench-judge-retry, prbench-parallel-providers, prbench-priced-cost-gate, prbench-scoring, prbench-shell-bookkeeping, showtail-claude-exit-codes, showtail-docker-tests, showtail-self-upgrade, showtail-signpath, showtail-transcript-migrator, showtail-windows-cmd, tracetoon-brief-owners-rows, tracetoon-chained-runs, tracetoon-cli-guard-tests, tracetoon-evidence-graph, tracetoon-lean-reviewer, tracetoon-neighborhood, tracetoon-receipt-quoting, tracetoon-render-name-check, tracetoon-review-run-all, tracetoon-sql-row-order, tracetoon-update-command, vex-v5-serial-aim-port, vexagent-cli-snap, vexagent-repl-usb-iface, vexagent-replug-runs, vexagent-skill, vexaim, vexaim-workshop-ci, vexaim-workshop-norobot, winapps-adobe-2026, winapps-sdl-wayland

### Head to head

| x vs y | judge | x wins | y wins | ties | flips | inconclusive | x win rate | sign test p | mean (x−y) [95% CI] |
|---|---|---|---|---|---|---|---|---|---|
| claude-native vs tracetoon-candidate | claude:claude-opus-5-5@medium | 13 | 39 | 9 | 9 | 0 | 25% | 0.00 | -0.43 [-0.62, -0.21] |
| claude-native vs tracetoon-candidate | claude:claude-sonnet-5-5@medium | 8 | 25 | 28 | 27 | 0 | 24% | 0.00 | -0.28 [-0.44, -0.10] |
| claude-native vs tracetoon-candidate | all judges agree | 4 | 24 | 33 | 28 | 0 | 14% | 0.00 | -0.33 [-0.48, -0.18] |

### Per system (means over every judgment of that system)

| system | judgments | factual errors | unsupported overclaims | evidence gaps | claims covered | context covered | uncertainties respected | traps hit | median words | total agent cost |
|---|---|---|---|---|---|---|---|---|---|---|
| claude-native | 244 | 0.34 | 0.35 | 0.64 | 73% | 18% | 55% | 0.13 | 294 | $15.16 |
| tracetoon-candidate | 244 | 0.14 | 0.16 | 0.43 | 81% | 39% | 60% | 0.03 | 458 | $30.17 |

### Fresh writer evidence coverage (artifact counts)

| system | artifacts | recorded | partial | unavailable |
|---|---|---|---|---|
| claude-native | 61 | 0 | 61 | 0 |
| tracetoon-candidate | 61 | 0 | 61 | 0 |

### Rubric (mean of 0–2 scores; n/a items excluded)

| system | problem | rationale | validation | consequences | orientation | entry | economy | feedback | links | scope |
|---|---|---|---|---|---|---|---|---|---|---|
| claude-native | 1.41 | 0.94 | 1.77 | 1.20 | 1.81 | 0.51 | 1.94 | 0.89 | 1.02 | 1.76 |
| tracetoon-candidate | 1.82 | 1.42 | 1.65 | 1.52 | 1.80 | 1.93 | 1.23 | 1.99 | 1.02 | 1.80 |

## Judge agreement

- claude:claude-opus-5-5@medium vs claude:claude-sonnet-5-5@medium: 59% of 61 pair verdicts agree; Cohen's kappa 0.36.

## Warnings

- aifirstcli-book-walk: claude-native: fresh validation evidence partial
- aifirstcli-book-walk: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-duckling-wheels: claude-native: fresh validation evidence partial
- aifirstcli-duckling-wheels: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-homebrew-maven: claude-native: fresh validation evidence partial
- aifirstcli-homebrew-maven: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-homebrew-maven: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- aifirstcli-hooks-path: claude-native: fresh validation evidence partial
- aifirstcli-hooks-path: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-javafx-maven: claude-native: fresh validation evidence partial
- aifirstcli-javafx-maven: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-learner-replay-ux: claude-native: fresh validation evidence partial
- aifirstcli-learner-replay-ux: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-macos-installer: claude-native: fresh validation evidence partial
- aifirstcli-macos-installer: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-showtail-harness: claude-native: fresh validation evidence partial
- aifirstcli-showtail-harness: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-signpath-release: claude-native: fresh validation evidence partial
- aifirstcli-signpath-release: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-tui-responsive: claude-native: fresh validation evidence partial
- aifirstcli-tui-responsive: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-apache: claude-native: fresh validation evidence partial
- aifirstcontent-apache: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-book-step-verify: claude-native: fresh validation evidence partial
- aifirstcontent-book-step-verify: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-portable-replays: claude-native: fresh validation evidence partial
- aifirstcontent-portable-replays: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-replay-start-state: claude-native: fresh validation evidence partial
- aifirstcontent-replay-start-state: tracetoon-candidate: fresh validation evidence partial
- aifirstextension-apache-license: claude-native: fresh validation evidence partial
- aifirstextension-apache-license: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-guided-install: claude-native: fresh validation evidence partial
- aifirstwebsite-guided-install: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-macos-workaround: claude-native: fresh validation evidence partial
- aifirstwebsite-macos-workaround: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-signing-policy: claude-native: fresh validation evidence partial
- aifirstwebsite-signing-policy: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-signing-policy: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- bazzite-stale-portal: claude-native: fresh validation evidence partial
- bazzite-stale-portal: tracetoon-candidate: fresh validation evidence partial
- pr10: claude-native: fresh validation evidence partial
- pr10: tracetoon-candidate: fresh validation evidence partial
- pr11: claude-native: fresh validation evidence partial
- pr11: tracetoon-candidate: fresh validation evidence partial
- pr12: claude-native: fresh validation evidence partial
- pr12: tracetoon-candidate: fresh validation evidence partial
- pr5: claude-native: fresh validation evidence partial
- pr5: tracetoon-candidate: fresh validation evidence partial
- pr8: claude-native: fresh validation evidence partial
- pr8: tracetoon-candidate: fresh validation evidence partial
- pr9: claude-native: fresh validation evidence partial
- pr9: tracetoon-candidate: fresh validation evidence partial
- prbench-aggregate-only: claude-native: fresh validation evidence partial
- prbench-aggregate-only: tracetoon-candidate: fresh validation evidence partial
- prbench-compare-systems: claude-native: fresh validation evidence partial
- prbench-compare-systems: tracetoon-candidate: fresh validation evidence partial
- prbench-crossjudge: claude-native: fresh validation evidence partial
- prbench-crossjudge: tracetoon-candidate: fresh validation evidence partial
- prbench-graph-compare-doc: claude-native: fresh validation evidence partial
- prbench-graph-compare-doc: tracetoon-candidate: fresh validation evidence partial
- prbench-judge-retry: claude-native: fresh validation evidence partial
- prbench-judge-retry: tracetoon-candidate: fresh validation evidence partial
- prbench-parallel-providers: claude-native: fresh validation evidence partial
- prbench-parallel-providers: tracetoon-candidate: fresh validation evidence partial
- prbench-priced-cost-gate: claude-native: fresh validation evidence partial
- prbench-priced-cost-gate: tracetoon-candidate: fresh validation evidence partial
- prbench-scoring: claude-native: fresh validation evidence partial
- prbench-scoring: tracetoon-candidate: fresh validation evidence partial
- prbench-shell-bookkeeping: claude-native: fresh validation evidence partial
- prbench-shell-bookkeeping: tracetoon-candidate: fresh validation evidence partial
- showtail-claude-exit-codes: claude-native: fresh validation evidence partial
- showtail-claude-exit-codes: tracetoon-candidate: fresh validation evidence partial
- showtail-docker-tests: claude-native: fresh validation evidence partial
- showtail-docker-tests: tracetoon-candidate: fresh validation evidence partial
- showtail-self-upgrade: claude-native: fresh validation evidence partial
- showtail-self-upgrade: tracetoon-candidate: fresh validation evidence partial
- showtail-signpath: claude-native: fresh validation evidence partial
- showtail-signpath: tracetoon-candidate: fresh validation evidence partial
- showtail-transcript-migrator: claude-native: fresh validation evidence partial
- showtail-transcript-migrator: tracetoon-candidate: fresh validation evidence partial
- showtail-transcript-migrator: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- showtail-windows-cmd: claude-native: fresh validation evidence partial
- showtail-windows-cmd: tracetoon-candidate: fresh validation evidence partial
- tracetoon-brief-owners-rows: claude-native: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-candidate: fresh validation evidence partial
- tracetoon-chained-runs: claude-native: fresh validation evidence partial
- tracetoon-chained-runs: tracetoon-candidate: fresh validation evidence partial
- tracetoon-chained-runs: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-cli-guard-tests: claude-native: fresh validation evidence partial
- tracetoon-cli-guard-tests: tracetoon-candidate: fresh validation evidence partial
- tracetoon-evidence-graph: claude-native: fresh validation evidence partial
- tracetoon-evidence-graph: tracetoon-candidate: fresh validation evidence partial
- tracetoon-evidence-graph: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-lean-reviewer: claude-native: fresh validation evidence partial
- tracetoon-lean-reviewer: tracetoon-candidate: fresh validation evidence partial
- tracetoon-lean-reviewer: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-neighborhood: claude-native: fresh validation evidence partial
- tracetoon-neighborhood: tracetoon-candidate: fresh validation evidence partial
- tracetoon-receipt-quoting: claude-native: fresh validation evidence partial
- tracetoon-receipt-quoting: tracetoon-candidate: fresh validation evidence partial
- tracetoon-render-name-check: claude-native: fresh validation evidence partial
- tracetoon-render-name-check: tracetoon-candidate: fresh validation evidence partial
- tracetoon-render-name-check: claude-native and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-review-run-all: claude-native: fresh validation evidence partial
- tracetoon-review-run-all: tracetoon-candidate: fresh validation evidence partial
- tracetoon-sql-row-order: claude-native: fresh validation evidence partial
- tracetoon-sql-row-order: tracetoon-candidate: fresh validation evidence partial
- tracetoon-update-command: claude-native: fresh validation evidence partial
- tracetoon-update-command: tracetoon-candidate: fresh validation evidence partial
- vex-v5-serial-aim-port: claude-native: fresh validation evidence partial
- vex-v5-serial-aim-port: tracetoon-candidate: fresh validation evidence partial
- vexagent-cli-snap: claude-native: fresh validation evidence partial
- vexagent-cli-snap: tracetoon-candidate: fresh validation evidence partial
- vexagent-repl-usb-iface: claude-native: fresh validation evidence partial
- vexagent-repl-usb-iface: tracetoon-candidate: fresh validation evidence partial
- vexagent-replug-runs: claude-native: fresh validation evidence partial
- vexagent-replug-runs: tracetoon-candidate: fresh validation evidence partial
- vexagent-skill: claude-native: fresh validation evidence partial
- vexagent-skill: tracetoon-candidate: fresh validation evidence partial
- vexaim: claude-native: fresh validation evidence partial
- vexaim: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-ci: claude-native: fresh validation evidence partial
- vexaim-workshop-ci: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-norobot: claude-native: fresh validation evidence partial
- vexaim-workshop-norobot: tracetoon-candidate: fresh validation evidence partial
- winapps-adobe-2026: claude-native: fresh validation evidence partial
- winapps-adobe-2026: tracetoon-candidate: fresh validation evidence partial
- winapps-sdl-wayland: claude-native: fresh validation evidence partial
- winapps-sdl-wayland: tracetoon-candidate: fresh validation evidence partial

