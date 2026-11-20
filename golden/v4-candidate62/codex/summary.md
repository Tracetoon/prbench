# dev comparison

Outcome: **failed**. Quality: failed. Efficiency: passed.

Writers: 366/366; order judgments: 732/732.

Failed attempts: 3; failed-attempt time: 172s; current pending cleanup: 0.

| Model | System | Samples | Median writer seconds | Median input tokens | Pending cleanup |
|---|---|---:|---:|---:|---:|
| gpt-6.1-terra@medium | tracetoon-baseline | 183 | 384.28 | 3532088 | 0 |
| gpt-6.1-terra@medium | tracetoon-candidate | 183 | 465.17 | 846558 | 0 |

## Gate findings

- Accuracy (confirmed errors per scored draft, 183 drafts): candidate 0.333 (61 of 81 flags confirmed), baseline 0.164 (30 of 47 flags confirmed); unresolved 0.
- Candidate confirmed accuracy errors per scored draft 0.333 (61/183) vs baseline 0.164 (30/183): difference 0.169 [0.000, 0.361], upper bound above the non-inferiority margin 0.05

## Paired performance

Rule: Pass when the candidate/baseline geometric mean of paired per-draft priced cost (same model, case and replicate; log ratios averaged within each case, then across cases) is at most 1.000. The case-clustered 95% interval is reported, not required. Any paired draft without a priced cost makes the gate inconclusive. Writer wall time and token counts are information, not criteria.

Candidate/baseline geometric mean priced cost ratio (criterion): 0.300 over 183/183 pairs; case-clustered 95% interval: [0.2771187224275102,0.32346828695340824].

Candidate/baseline geometric mean writer ratio (information): 1.065; case-clustered 95% interval: [0.9706660111031403,1.1680078066150237].

- 3 replicate(s) still represent 61 independent cases in this split.
- Writer timing includes service waits and neutral observation overhead; runtime diagnostics may overlap.
- Diagnostic reuse cannot establish a fresh performance improvement.
- Raw judgments are preserved separately from source-backed adjudications.

## Scores

Composite (0-100) = 35·claims + 15·context + 15·uncertainties + 35·rubric (coverage as fractions of the fact sheet, rubric as mean/2) − 15·factual errors − 7·unsupported claims − 10·traps hit, floored at 0. Each draft is averaged over all its judgments; arm means are means of per-case means, with a 95% bootstrap interval over cases. Components are the primary evidence; the composite is a summary.

| Model | System | Drafts | Composite [95% CI] | Claims | Context | Uncert. | Rubric | Errors | Unsupported | Traps | $/draft | Cost covers | Subagents/draft | Input tokens | Queries |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|
| gpt-6.1-terra@medium | tracetoon-baseline | 183 | 72.0 [69.7, 74.2] | 0.72 | 0.28 | 0.99 | 0.84 | 0.10 | 0.01 | 0.01 | 0.447* | all threads | 2.7 | 3970408 | – |
| gpt-6.1-terra@medium | tracetoon-candidate | 183 | 75.3 [73.1, 77.4] | 0.82 | 0.29 | 0.99 | 0.86 | 0.17 | 0.02 | 0.02 | 0.128* | all threads | 0.0 | 1072262 | 1.0 |

Mixed-model writers (subagent threads on another model; each model's tokens are priced at its own rate, and Claude's reported cost already covers every model):

| Model | System | Mixed-model drafts | Models used |
|---|---|---:|---|
| gpt-6.1-terra@medium | tracetoon-candidate | 182/183 | gpt-6-luna, gpt-6.1-terra |

Paired candidate − other system (same model, case and replicate). Leave one case out = lowest and highest composite Δ when each case in turn is dropped:

| Model | Against | Pairs | Composite Δ [95% CI] | Leave one case out | Factual errors Δ |
|---|---|---:|---|---|---:|
| gpt-6.1-terra@medium | tracetoon-baseline | 183 | 3.3 [1.0, 5.5] | 3.0 to 3.7 | 0.07 |

Per-case composite Δ (tracetoon-candidate − tracetoon-baseline, same model; mean over paired replicates, pairs in parentheses):

| Case | gpt-6.1-terra@medium |
|---|---:|
| aifirstcli-book-walk | 11.8 (3) |
| aifirstcli-duckling-wheels | -4.1 (3) |
| aifirstcli-homebrew-maven | 6.0 (3) |
| aifirstcli-hooks-path | -2.2 (3) |
| aifirstcli-javafx-maven | -2.4 (3) |
| aifirstcli-learner-replay-ux | -1.8 (3) |
| aifirstcli-macos-installer | 16.3 (3) |
| aifirstcli-showtail-harness | -15.3 (3) |
| aifirstcli-signpath-release | -3.7 (3) |
| aifirstcli-tui-responsive | -17.4 (3) |
| aifirstcontent-apache | 15.3 (3) |
| aifirstcontent-book-step-verify | 7.4 (3) |
| aifirstcontent-portable-replays | 2.8 (3) |
| aifirstcontent-replay-start-state | 10.4 (3) |
| aifirstextension-apache-license | 9.7 (3) |
| aifirstwebsite-guided-install | 11.9 (3) |
| aifirstwebsite-macos-workaround | 19.3 (3) |
| aifirstwebsite-signing-policy | 19.8 (3) |
| bazzite-stale-portal | -5.1 (3) |
| pr5 | -8.5 (3) |
| pr8 | 5.9 (3) |
| pr9 | -0.1 (3) |
| pr10 | -3.0 (3) |
| pr11 | -19.4 (3) |
| pr12 | 1.2 (3) |
| prbench-aggregate-only | 9.7 (3) |
| prbench-compare-systems | 19.9 (3) |
| prbench-crossjudge | 2.9 (3) |
| prbench-graph-compare-doc | 12.4 (3) |
| prbench-judge-retry | 1.5 (3) |
| prbench-parallel-providers | 3.1 (3) |
| prbench-priced-cost-gate | 16.2 (3) |
| prbench-scoring | 7.8 (3) |
| prbench-shell-bookkeeping | 7.7 (3) |
| showtail-claude-exit-codes | 7.0 (3) |
| showtail-docker-tests | 9.5 (3) |
| showtail-self-upgrade | 5.0 (3) |
| showtail-signpath | 2.7 (3) |
| showtail-transcript-migrator | 5.2 (3) |
| showtail-windows-cmd | 13.0 (3) |
| tracetoon-brief-owners-rows | -10.2 (3) |
| tracetoon-chained-runs | -3.8 (3) |
| tracetoon-cli-guard-tests | 6.8 (3) |
| tracetoon-evidence-graph | -7.8 (3) |
| tracetoon-lean-reviewer | 0.5 (3) |
| tracetoon-neighborhood | 13.2 (3) |
| tracetoon-receipt-quoting | -12.5 (3) |
| tracetoon-render-name-check | 4.8 (3) |
| tracetoon-review-run-all | 0.8 (3) |
| tracetoon-sql-row-order | -9.6 (3) |
| tracetoon-update-command | 11.0 (3) |
| vex-v5-serial-aim-port | 10.4 (3) |
| vexagent-cli-snap | -2.8 (3) |
| vexagent-repl-usb-iface | 9.8 (3) |
| vexagent-replug-runs | -2.8 (3) |
| vexagent-skill | -5.1 (3) |
| vexaim | 0.2 (3) |
| vexaim-workshop-ci | -1.5 (3) |
| vexaim-workshop-norobot | 3.3 (3) |
| winapps-adobe-2026 | 12.5 (3) |
| winapps-sdl-wayland | 4.9 (3) |
| Mean of cases | 3.3 |

Judge reliability (timed-out and transient calls are retried, up to 3 attempts per order judgment; a malformed reply gets one format repair, then fresh requests, up to 5 attempts):

| Judge | Failed attempts | Timed out | Transient | Format | Other |
|---|---:|---:|---:|---:|---:|
| codex:gpt-6.1-sol@medium | 1 | 0 | 0 | 1 | 0 |
| codex:gpt-6.1-terra@medium | 2 | 0 | 0 | 2 | 0 |

## Accuracy

Error rate = share of judgments that found at least one factual error (mean of per-case means, 95% bootstrap interval over cases). Error classes are mean factual errors per judgment by kind of statement.

| Model | System | Drafts | Error rate [95% CI] | Errors | Unsupported | Claims | validation | code structure | attribution | motivation | pipeline | other | $/draft |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| gpt-6.1-terra@medium | tracetoon-baseline | 183 | 0.09 [0.05, 0.13] | 0.10 | 0.01 | 0.72 | 0.04 | 0.00 | 0.01 | 0.01 | 0.00 | 0.05 | 0.447 |
| gpt-6.1-terra@medium | tracetoon-candidate | 183 | 0.15 [0.09, 0.21] | 0.17 | 0.02 | 0.82 | 0.09 | 0.00 | 0.00 | 0.00 | 0.00 | 0.08 | 0.128 |

Candidate arms against baseline arms (any model; shared cases). Deltas are candidate minus baseline over per-case means, with a 95% bootstrap interval over cases. Coverage guard: claim coverage may drop by at most 0.05.

| Candidate | Against baseline | Cases | Error rate Δ [95% CI] | Composite Δ [95% CI] | Claims Δ | Guard | Cost ratio |
|---|---|---:|---|---|---:|---|---:|
| gpt-6.1-terra@medium | gpt-6.1-terra@medium | 61 | 0.06 [-0.00, 0.12] | 3.3 [1.0, 5.5] | 0.10 | ok | 3.5× cheaper |

\* Estimated from token counts and src/report/prices.json (USD per million tokens, short-context list prices for models whose runs report no USD (Codex), as reported by third-party trackers on 2026-11-06 (morphllm.com/openai-api-pricing); verify against the provider's pricing page.).

Cost covers: "all threads" includes every subagent thread the writer spawned (researcher, drafter, reviewer…), from the artifact or, for runs saved before that was recorded, recomputed from the accepted attempt's saved Codex traces ("traces"), with each model response counted once. "Main thread only" omits subagents and understates cost when the skill delegates. $/draft in the accuracy table and its cost ratios use the same figures.

## gpt-6.1-terra@medium, replicate 1: tracetoon-baseline

# prbench report

Rubric v6. Judges: codex:gpt-6.1-sol@medium, codex:gpt-6.1-terra@medium. Generated 2026-11-18T09:28:07.144Z.

Evidence gaps are unverified claims, not errors or fabrication. Fresh evidence coverage is reported per artifact; partial capture may still establish individual results. Inconclusive preferences are excluded from win/tie statistics, intervals and judge agreement.

Completed 122 of 122 expected case/pair/judge results (each requires both orders).

Each pair is judged in both orders; a win needs both orders to agree. An evidence-dependent abstention in either order makes the pair inconclusive; other disagreements are ties (a *flip* when the orders picked opposite systems). "all judges agree" includes only pairs completed by every configured judge, and counts a win only when every judge gave it. With few cases, treat p-values and intervals as a sense of scale, not proof.

## dev split (61 cases)

aifirstcli-book-walk, aifirstcli-duckling-wheels, aifirstcli-homebrew-maven, aifirstcli-hooks-path, aifirstcli-javafx-maven, aifirstcli-learner-replay-ux, aifirstcli-macos-installer, aifirstcli-showtail-harness, aifirstcli-signpath-release, aifirstcli-tui-responsive, aifirstcontent-apache, aifirstcontent-book-step-verify, aifirstcontent-portable-replays, aifirstcontent-replay-start-state, aifirstextension-apache-license, aifirstwebsite-guided-install, aifirstwebsite-macos-workaround, aifirstwebsite-signing-policy, bazzite-stale-portal, pr10, pr11, pr12, pr5, pr8, pr9, prbench-aggregate-only, prbench-compare-systems, prbench-crossjudge, prbench-graph-compare-doc, prbench-judge-retry, prbench-parallel-providers, prbench-priced-cost-gate, prbench-scoring, prbench-shell-bookkeeping, showtail-claude-exit-codes, showtail-docker-tests, showtail-self-upgrade, showtail-signpath, showtail-transcript-migrator, showtail-windows-cmd, tracetoon-brief-owners-rows, tracetoon-chained-runs, tracetoon-cli-guard-tests, tracetoon-evidence-graph, tracetoon-lean-reviewer, tracetoon-neighborhood, tracetoon-receipt-quoting, tracetoon-render-name-check, tracetoon-review-run-all, tracetoon-sql-row-order, tracetoon-update-command, vex-v5-serial-aim-port, vexagent-cli-snap, vexagent-repl-usb-iface, vexagent-replug-runs, vexagent-skill, vexaim, vexaim-workshop-ci, vexaim-workshop-norobot, winapps-adobe-2026, winapps-sdl-wayland

### Head to head

| x vs y | judge | x wins | y wins | ties | flips | inconclusive | x win rate | sign test p | mean (x−y) [95% CI] |
|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline vs tracetoon-candidate | codex:gpt-6.1-sol@medium | 17 | 28 | 16 | 16 | 0 | 38% | 0.14 | -0.18 [-0.38, 0.03] |
| tracetoon-baseline vs tracetoon-candidate | codex:gpt-6.1-terra@medium | 19 | 34 | 8 | 8 | 0 | 36% | 0.05 | -0.25 [-0.46, -0.02] |
| tracetoon-baseline vs tracetoon-candidate | all judges agree | 15 | 23 | 23 | 20 | 0 | 39% | 0.26 | -0.13 [-0.31, 0.07] |

### Per system (means over every judgment of that system)

| system | judgments | factual errors | unsupported overclaims | evidence gaps | claims covered | context covered | uncertainties respected | traps hit | median words | total agent cost |
|---|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline | 244 | 0.08 | 0.01 | 0.93 | 73% | 28% | 99% | 0.00 | 158 | – |
| tracetoon-candidate | 244 | 0.17 | 0.02 | 0.88 | 82% | 30% | 98% | 0.02 | 315 | – |

### Fresh writer evidence coverage (artifact counts)

| system | artifacts | recorded | partial | unavailable |
|---|---|---|---|---|
| tracetoon-baseline | 61 | 15 | 46 | 0 |
| tracetoon-candidate | 61 | 0 | 61 | 0 |

### Rubric (mean of 0–2 scores; n/a items excluded)

| system | problem | rationale | validation | consequences | orientation | entry | economy | feedback | links | scope |
|---|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline | 1.77 | 1.28 | 1.71 | 1.68 | 2.00 | 1.48 | 1.95 | 0.67 | 0.85 | 1.95 |
| tracetoon-candidate | 1.67 | 1.41 | 1.85 | 1.76 | 1.95 | 1.95 | 1.30 | 1.99 | 1.09 | 1.83 |

## Judge agreement

- codex:gpt-6.1-sol@medium vs codex:gpt-6.1-terra@medium: 69% of 61 pair verdicts agree; Cohen's kappa 0.50.

## Warnings

- aifirstcli-book-walk: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-book-walk: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-duckling-wheels: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-duckling-wheels: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-homebrew-maven: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-homebrew-maven: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-hooks-path: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-javafx-maven: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-javafx-maven: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-learner-replay-ux: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-macos-installer: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-macos-installer: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-showtail-harness: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-showtail-harness: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-signpath-release: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-signpath-release: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-tui-responsive: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-tui-responsive: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-apache: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-book-step-verify: tracetoon-baseline: fresh validation evidence partial
- aifirstcontent-book-step-verify: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-portable-replays: tracetoon-baseline: fresh validation evidence partial
- aifirstcontent-portable-replays: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-replay-start-state: tracetoon-baseline: fresh validation evidence partial
- aifirstcontent-replay-start-state: tracetoon-candidate: fresh validation evidence partial
- aifirstextension-apache-license: tracetoon-baseline: fresh validation evidence partial
- aifirstextension-apache-license: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-guided-install: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-macos-workaround: tracetoon-baseline: fresh validation evidence partial
- aifirstwebsite-macos-workaround: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-signing-policy: tracetoon-baseline: fresh validation evidence partial
- aifirstwebsite-signing-policy: tracetoon-candidate: fresh validation evidence partial
- bazzite-stale-portal: tracetoon-candidate: fresh validation evidence partial
- pr10: tracetoon-candidate: fresh validation evidence partial
- pr11: tracetoon-baseline: fresh validation evidence partial
- pr11: tracetoon-candidate: fresh validation evidence partial
- pr12: tracetoon-candidate: fresh validation evidence partial
- pr5: tracetoon-baseline: fresh validation evidence partial
- pr5: tracetoon-candidate: fresh validation evidence partial
- pr8: tracetoon-candidate: fresh validation evidence partial
- pr9: tracetoon-baseline: fresh validation evidence partial
- pr9: tracetoon-candidate: fresh validation evidence partial
- prbench-aggregate-only: tracetoon-baseline: fresh validation evidence partial
- prbench-aggregate-only: tracetoon-candidate: fresh validation evidence partial
- prbench-compare-systems: tracetoon-baseline: fresh validation evidence partial
- prbench-compare-systems: tracetoon-candidate: fresh validation evidence partial
- prbench-crossjudge: tracetoon-baseline: fresh validation evidence partial
- prbench-crossjudge: tracetoon-candidate: fresh validation evidence partial
- prbench-graph-compare-doc: tracetoon-baseline: fresh validation evidence partial
- prbench-graph-compare-doc: tracetoon-candidate: fresh validation evidence partial
- prbench-judge-retry: tracetoon-baseline: fresh validation evidence partial
- prbench-judge-retry: tracetoon-candidate: fresh validation evidence partial
- prbench-parallel-providers: tracetoon-baseline: fresh validation evidence partial
- prbench-parallel-providers: tracetoon-candidate: fresh validation evidence partial
- prbench-priced-cost-gate: tracetoon-baseline: fresh validation evidence partial
- prbench-priced-cost-gate: tracetoon-candidate: fresh validation evidence partial
- prbench-scoring: tracetoon-baseline: fresh validation evidence partial
- prbench-scoring: tracetoon-candidate: fresh validation evidence partial
- prbench-shell-bookkeeping: tracetoon-baseline: fresh validation evidence partial
- prbench-shell-bookkeeping: tracetoon-candidate: fresh validation evidence partial
- showtail-claude-exit-codes: tracetoon-baseline: fresh validation evidence partial
- showtail-claude-exit-codes: tracetoon-candidate: fresh validation evidence partial
- showtail-docker-tests: tracetoon-candidate: fresh validation evidence partial
- showtail-self-upgrade: tracetoon-baseline: fresh validation evidence partial
- showtail-self-upgrade: tracetoon-candidate: fresh validation evidence partial
- showtail-signpath: tracetoon-baseline: fresh validation evidence partial
- showtail-signpath: tracetoon-candidate: fresh validation evidence partial
- showtail-transcript-migrator: tracetoon-baseline: fresh validation evidence partial
- showtail-transcript-migrator: tracetoon-candidate: fresh validation evidence partial
- showtail-windows-cmd: tracetoon-candidate: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-baseline: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-candidate: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-baseline and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-chained-runs: tracetoon-baseline: fresh validation evidence partial
- tracetoon-chained-runs: tracetoon-candidate: fresh validation evidence partial
- tracetoon-cli-guard-tests: tracetoon-baseline: fresh validation evidence partial
- tracetoon-cli-guard-tests: tracetoon-candidate: fresh validation evidence partial
- tracetoon-evidence-graph: tracetoon-baseline: fresh validation evidence partial
- tracetoon-evidence-graph: tracetoon-candidate: fresh validation evidence partial
- tracetoon-lean-reviewer: tracetoon-baseline: fresh validation evidence partial
- tracetoon-lean-reviewer: tracetoon-candidate: fresh validation evidence partial
- tracetoon-lean-reviewer: tracetoon-baseline and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-neighborhood: tracetoon-baseline: fresh validation evidence partial
- tracetoon-neighborhood: tracetoon-candidate: fresh validation evidence partial
- tracetoon-receipt-quoting: tracetoon-baseline: fresh validation evidence partial
- tracetoon-receipt-quoting: tracetoon-candidate: fresh validation evidence partial
- tracetoon-render-name-check: tracetoon-baseline: fresh validation evidence partial
- tracetoon-render-name-check: tracetoon-candidate: fresh validation evidence partial
- tracetoon-render-name-check: tracetoon-baseline and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-review-run-all: tracetoon-baseline: fresh validation evidence partial
- tracetoon-review-run-all: tracetoon-candidate: fresh validation evidence partial
- tracetoon-review-run-all: tracetoon-baseline and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-sql-row-order: tracetoon-baseline: fresh validation evidence partial
- tracetoon-sql-row-order: tracetoon-candidate: fresh validation evidence partial
- tracetoon-sql-row-order: tracetoon-baseline and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-update-command: tracetoon-baseline: fresh validation evidence partial
- tracetoon-update-command: tracetoon-candidate: fresh validation evidence partial
- vex-v5-serial-aim-port: tracetoon-baseline: fresh validation evidence partial
- vex-v5-serial-aim-port: tracetoon-candidate: fresh validation evidence partial
- vexagent-cli-snap: tracetoon-candidate: fresh validation evidence partial
- vexagent-repl-usb-iface: tracetoon-baseline: fresh validation evidence partial
- vexagent-repl-usb-iface: tracetoon-candidate: fresh validation evidence partial
- vexagent-replug-runs: tracetoon-baseline: fresh validation evidence partial
- vexagent-replug-runs: tracetoon-candidate: fresh validation evidence partial
- vexagent-skill: tracetoon-baseline: fresh validation evidence partial
- vexagent-skill: tracetoon-candidate: fresh validation evidence partial
- vexaim: tracetoon-baseline: fresh validation evidence partial
- vexaim: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-ci: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-norobot: tracetoon-candidate: fresh validation evidence partial
- winapps-adobe-2026: tracetoon-candidate: fresh validation evidence partial
- winapps-sdl-wayland: tracetoon-candidate: fresh validation evidence partial

## gpt-6.1-terra@medium, replicate 2: tracetoon-baseline

# prbench report

Rubric v6. Judges: codex:gpt-6.1-sol@medium, codex:gpt-6.1-terra@medium. Generated 2026-11-18T09:28:08.363Z.

Evidence gaps are unverified claims, not errors or fabrication. Fresh evidence coverage is reported per artifact; partial capture may still establish individual results. Inconclusive preferences are excluded from win/tie statistics, intervals and judge agreement.

Completed 122 of 122 expected case/pair/judge results (each requires both orders).

Each pair is judged in both orders; a win needs both orders to agree. An evidence-dependent abstention in either order makes the pair inconclusive; other disagreements are ties (a *flip* when the orders picked opposite systems). "all judges agree" includes only pairs completed by every configured judge, and counts a win only when every judge gave it. With few cases, treat p-values and intervals as a sense of scale, not proof.

## dev split (61 cases)

aifirstcli-book-walk, aifirstcli-duckling-wheels, aifirstcli-homebrew-maven, aifirstcli-hooks-path, aifirstcli-javafx-maven, aifirstcli-learner-replay-ux, aifirstcli-macos-installer, aifirstcli-showtail-harness, aifirstcli-signpath-release, aifirstcli-tui-responsive, aifirstcontent-apache, aifirstcontent-book-step-verify, aifirstcontent-portable-replays, aifirstcontent-replay-start-state, aifirstextension-apache-license, aifirstwebsite-guided-install, aifirstwebsite-macos-workaround, aifirstwebsite-signing-policy, bazzite-stale-portal, pr10, pr11, pr12, pr5, pr8, pr9, prbench-aggregate-only, prbench-compare-systems, prbench-crossjudge, prbench-graph-compare-doc, prbench-judge-retry, prbench-parallel-providers, prbench-priced-cost-gate, prbench-scoring, prbench-shell-bookkeeping, showtail-claude-exit-codes, showtail-docker-tests, showtail-self-upgrade, showtail-signpath, showtail-transcript-migrator, showtail-windows-cmd, tracetoon-brief-owners-rows, tracetoon-chained-runs, tracetoon-cli-guard-tests, tracetoon-evidence-graph, tracetoon-lean-reviewer, tracetoon-neighborhood, tracetoon-receipt-quoting, tracetoon-render-name-check, tracetoon-review-run-all, tracetoon-sql-row-order, tracetoon-update-command, vex-v5-serial-aim-port, vexagent-cli-snap, vexagent-repl-usb-iface, vexagent-replug-runs, vexagent-skill, vexaim, vexaim-workshop-ci, vexaim-workshop-norobot, winapps-adobe-2026, winapps-sdl-wayland

### Head to head

| x vs y | judge | x wins | y wins | ties | flips | inconclusive | x win rate | sign test p | mean (x−y) [95% CI] |
|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline vs tracetoon-candidate | codex:gpt-6.1-sol@medium | 18 | 31 | 12 | 12 | 0 | 37% | 0.09 | -0.21 [-0.43, 0.00] |
| tracetoon-baseline vs tracetoon-candidate | codex:gpt-6.1-terra@medium | 17 | 37 | 5 | 5 | 2 | 31% | 0.01 | -0.34 [-0.56, -0.10] |
| tracetoon-baseline vs tracetoon-candidate | all judges agree | 14 | 27 | 18 | 15 | 2 | 34% | 0.06 | -0.22 [-0.42, -0.02] |

### Per system (means over every judgment of that system)

| system | judgments | factual errors | unsupported overclaims | evidence gaps | claims covered | context covered | uncertainties respected | traps hit | median words | total agent cost |
|---|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline | 244 | 0.08 | 0.01 | 1.00 | 73% | 30% | 99% | 0.00 | 152 | – |
| tracetoon-candidate | 244 | 0.14 | 0.03 | 0.84 | 83% | 30% | 99% | 0.02 | 307 | – |

### Fresh writer evidence coverage (artifact counts)

| system | artifacts | recorded | partial | unavailable |
|---|---|---|---|---|
| tracetoon-baseline | 61 | 16 | 45 | 0 |
| tracetoon-candidate | 61 | 0 | 61 | 0 |

### Rubric (mean of 0–2 scores; n/a items excluded)

| system | problem | rationale | validation | consequences | orientation | entry | economy | feedback | links | scope |
|---|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline | 1.73 | 1.31 | 1.68 | 1.64 | 2.00 | 1.45 | 1.98 | 0.00 | 0.97 | 1.93 |
| tracetoon-candidate | 1.72 | 1.42 | 1.85 | 1.78 | 1.93 | 1.94 | 1.27 | 1.99 | 1.15 | 1.85 |

## Judge agreement

- codex:gpt-6.1-sol@medium vs codex:gpt-6.1-terra@medium: 73% of 59 pair verdicts agree; Cohen's kappa 0.54.

## Warnings

- aifirstcli-book-walk: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-book-walk: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-duckling-wheels: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-duckling-wheels: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-homebrew-maven: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-homebrew-maven: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-hooks-path: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-hooks-path: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-javafx-maven: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-javafx-maven: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-learner-replay-ux: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-learner-replay-ux: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-macos-installer: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-macos-installer: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-showtail-harness: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-showtail-harness: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-signpath-release: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-signpath-release: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-tui-responsive: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-tui-responsive: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-apache: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-book-step-verify: tracetoon-baseline: fresh validation evidence partial
- aifirstcontent-book-step-verify: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-portable-replays: tracetoon-baseline: fresh validation evidence partial
- aifirstcontent-portable-replays: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-replay-start-state: tracetoon-baseline: fresh validation evidence partial
- aifirstcontent-replay-start-state: tracetoon-candidate: fresh validation evidence partial
- aifirstextension-apache-license: tracetoon-baseline: fresh validation evidence partial
- aifirstextension-apache-license: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-guided-install: tracetoon-baseline: fresh validation evidence partial
- aifirstwebsite-guided-install: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-macos-workaround: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-signing-policy: tracetoon-baseline: fresh validation evidence partial
- aifirstwebsite-signing-policy: tracetoon-candidate: fresh validation evidence partial
- bazzite-stale-portal: tracetoon-candidate: fresh validation evidence partial
- pr10: tracetoon-baseline: fresh validation evidence partial
- pr10: tracetoon-candidate: fresh validation evidence partial
- pr11: tracetoon-candidate: fresh validation evidence partial
- pr12: tracetoon-baseline: fresh validation evidence partial
- pr12: tracetoon-candidate: fresh validation evidence partial
- pr5: tracetoon-candidate: fresh validation evidence partial
- pr8: tracetoon-candidate: fresh validation evidence partial
- pr9: tracetoon-candidate: fresh validation evidence partial
- prbench-aggregate-only: tracetoon-baseline: fresh validation evidence partial
- prbench-aggregate-only: tracetoon-candidate: fresh validation evidence partial
- prbench-compare-systems: tracetoon-baseline: fresh validation evidence partial
- prbench-compare-systems: tracetoon-candidate: fresh validation evidence partial
- prbench-crossjudge: tracetoon-baseline: fresh validation evidence partial
- prbench-crossjudge: tracetoon-candidate: fresh validation evidence partial
- prbench-graph-compare-doc: tracetoon-baseline: fresh validation evidence partial
- prbench-graph-compare-doc: tracetoon-candidate: fresh validation evidence partial
- prbench-judge-retry: tracetoon-baseline: fresh validation evidence partial
- prbench-judge-retry: tracetoon-candidate: fresh validation evidence partial
- prbench-parallel-providers: tracetoon-baseline: fresh validation evidence partial
- prbench-parallel-providers: tracetoon-candidate: fresh validation evidence partial
- prbench-priced-cost-gate: tracetoon-baseline: fresh validation evidence partial
- prbench-priced-cost-gate: tracetoon-candidate: fresh validation evidence partial
- prbench-scoring: tracetoon-baseline: fresh validation evidence partial
- prbench-scoring: tracetoon-candidate: fresh validation evidence partial
- prbench-shell-bookkeeping: tracetoon-baseline: fresh validation evidence partial
- prbench-shell-bookkeeping: tracetoon-candidate: fresh validation evidence partial
- showtail-claude-exit-codes: tracetoon-baseline: fresh validation evidence partial
- showtail-claude-exit-codes: tracetoon-candidate: fresh validation evidence partial
- showtail-docker-tests: tracetoon-baseline: fresh validation evidence partial
- showtail-docker-tests: tracetoon-candidate: fresh validation evidence partial
- showtail-self-upgrade: tracetoon-candidate: fresh validation evidence partial
- showtail-signpath: tracetoon-candidate: fresh validation evidence partial
- showtail-transcript-migrator: tracetoon-baseline: fresh validation evidence partial
- showtail-transcript-migrator: tracetoon-candidate: fresh validation evidence partial
- showtail-windows-cmd: tracetoon-baseline: fresh validation evidence partial
- showtail-windows-cmd: tracetoon-candidate: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-baseline: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-candidate: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-baseline and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-chained-runs: tracetoon-baseline: fresh validation evidence partial
- tracetoon-chained-runs: tracetoon-candidate: fresh validation evidence partial
- tracetoon-cli-guard-tests: tracetoon-baseline: fresh validation evidence partial
- tracetoon-cli-guard-tests: tracetoon-candidate: fresh validation evidence partial
- tracetoon-evidence-graph: tracetoon-baseline: fresh validation evidence partial
- tracetoon-evidence-graph: tracetoon-candidate: fresh validation evidence partial
- tracetoon-lean-reviewer: tracetoon-baseline: fresh validation evidence partial
- tracetoon-lean-reviewer: tracetoon-candidate: fresh validation evidence partial
- tracetoon-lean-reviewer: tracetoon-baseline and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-neighborhood: tracetoon-baseline: fresh validation evidence partial
- tracetoon-neighborhood: tracetoon-candidate: fresh validation evidence partial
- tracetoon-receipt-quoting: tracetoon-baseline: fresh validation evidence partial
- tracetoon-receipt-quoting: tracetoon-candidate: fresh validation evidence partial
- tracetoon-receipt-quoting: tracetoon-baseline and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-render-name-check: tracetoon-baseline: fresh validation evidence partial
- tracetoon-render-name-check: tracetoon-candidate: fresh validation evidence partial
- tracetoon-render-name-check: tracetoon-baseline and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-review-run-all: tracetoon-baseline: fresh validation evidence partial
- tracetoon-review-run-all: tracetoon-candidate: fresh validation evidence partial
- tracetoon-review-run-all: tracetoon-baseline and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-sql-row-order: tracetoon-baseline: fresh validation evidence partial
- tracetoon-sql-row-order: tracetoon-candidate: fresh validation evidence partial
- tracetoon-update-command: tracetoon-baseline: fresh validation evidence partial
- tracetoon-update-command: tracetoon-candidate: fresh validation evidence partial
- vex-v5-serial-aim-port: tracetoon-candidate: fresh validation evidence partial
- vexagent-cli-snap: tracetoon-baseline: fresh validation evidence partial
- vexagent-cli-snap: tracetoon-candidate: fresh validation evidence partial
- vexagent-repl-usb-iface: tracetoon-candidate: fresh validation evidence partial
- vexagent-replug-runs: tracetoon-candidate: fresh validation evidence partial
- vexagent-skill: tracetoon-baseline: fresh validation evidence partial
- vexagent-skill: tracetoon-candidate: fresh validation evidence partial
- vexaim: tracetoon-baseline: fresh validation evidence partial
- vexaim: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-ci: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-norobot: tracetoon-candidate: fresh validation evidence partial
- winapps-adobe-2026: tracetoon-candidate: fresh validation evidence partial
- winapps-sdl-wayland: tracetoon-candidate: fresh validation evidence partial

## gpt-6.1-terra@medium, replicate 3: tracetoon-baseline

# prbench report

Rubric v6. Judges: codex:gpt-6.1-sol@medium, codex:gpt-6.1-terra@medium. Generated 2026-11-18T09:28:09.521Z.

Evidence gaps are unverified claims, not errors or fabrication. Fresh evidence coverage is reported per artifact; partial capture may still establish individual results. Inconclusive preferences are excluded from win/tie statistics, intervals and judge agreement.

Completed 122 of 122 expected case/pair/judge results (each requires both orders).

Each pair is judged in both orders; a win needs both orders to agree. An evidence-dependent abstention in either order makes the pair inconclusive; other disagreements are ties (a *flip* when the orders picked opposite systems). "all judges agree" includes only pairs completed by every configured judge, and counts a win only when every judge gave it. With few cases, treat p-values and intervals as a sense of scale, not proof.

## dev split (61 cases)

aifirstcli-book-walk, aifirstcli-duckling-wheels, aifirstcli-homebrew-maven, aifirstcli-hooks-path, aifirstcli-javafx-maven, aifirstcli-learner-replay-ux, aifirstcli-macos-installer, aifirstcli-showtail-harness, aifirstcli-signpath-release, aifirstcli-tui-responsive, aifirstcontent-apache, aifirstcontent-book-step-verify, aifirstcontent-portable-replays, aifirstcontent-replay-start-state, aifirstextension-apache-license, aifirstwebsite-guided-install, aifirstwebsite-macos-workaround, aifirstwebsite-signing-policy, bazzite-stale-portal, pr10, pr11, pr12, pr5, pr8, pr9, prbench-aggregate-only, prbench-compare-systems, prbench-crossjudge, prbench-graph-compare-doc, prbench-judge-retry, prbench-parallel-providers, prbench-priced-cost-gate, prbench-scoring, prbench-shell-bookkeeping, showtail-claude-exit-codes, showtail-docker-tests, showtail-self-upgrade, showtail-signpath, showtail-transcript-migrator, showtail-windows-cmd, tracetoon-brief-owners-rows, tracetoon-chained-runs, tracetoon-cli-guard-tests, tracetoon-evidence-graph, tracetoon-lean-reviewer, tracetoon-neighborhood, tracetoon-receipt-quoting, tracetoon-render-name-check, tracetoon-review-run-all, tracetoon-sql-row-order, tracetoon-update-command, vex-v5-serial-aim-port, vexagent-cli-snap, vexagent-repl-usb-iface, vexagent-replug-runs, vexagent-skill, vexaim, vexaim-workshop-ci, vexaim-workshop-norobot, winapps-adobe-2026, winapps-sdl-wayland

### Head to head

| x vs y | judge | x wins | y wins | ties | flips | inconclusive | x win rate | sign test p | mean (x−y) [95% CI] |
|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline vs tracetoon-candidate | codex:gpt-6.1-sol@medium | 16 | 32 | 13 | 13 | 0 | 33% | 0.03 | -0.26 [-0.48, -0.05] |
| tracetoon-baseline vs tracetoon-candidate | codex:gpt-6.1-terra@medium | 11 | 34 | 15 | 15 | 1 | 24% | 0.00 | -0.38 [-0.58, -0.18] |
| tracetoon-baseline vs tracetoon-candidate | all judges agree | 9 | 29 | 22 | 22 | 1 | 24% | 0.00 | -0.33 [-0.52, -0.15] |

### Per system (means over every judgment of that system)

| system | judgments | factual errors | unsupported overclaims | evidence gaps | claims covered | context covered | uncertainties respected | traps hit | median words | total agent cost |
|---|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline | 244 | 0.15 | 0.02 | 0.99 | 71% | 26% | 98% | 0.02 | 157 | – |
| tracetoon-candidate | 244 | 0.20 | 0.01 | 0.92 | 81% | 27% | 99% | 0.01 | 308 | – |

### Fresh writer evidence coverage (artifact counts)

| system | artifacts | recorded | partial | unavailable |
|---|---|---|---|---|
| tracetoon-baseline | 61 | 17 | 44 | 0 |
| tracetoon-candidate | 61 | 0 | 61 | 0 |

### Rubric (mean of 0–2 scores; n/a items excluded)

| system | problem | rationale | validation | consequences | orientation | entry | economy | feedback | links | scope |
|---|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline | 1.70 | 1.26 | 1.79 | 1.62 | 2.00 | 1.46 | 1.95 | 0.82 | 0.78 | 1.89 |
| tracetoon-candidate | 1.68 | 1.41 | 1.81 | 1.83 | 1.95 | 1.93 | 1.34 | 2.00 | 1.11 | 1.87 |

## Judge agreement

- codex:gpt-6.1-sol@medium vs codex:gpt-6.1-terra@medium: 73% of 60 pair verdicts agree; Cohen's kappa 0.55.

## Warnings

- aifirstcli-book-walk: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-book-walk: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-duckling-wheels: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-duckling-wheels: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-homebrew-maven: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-homebrew-maven: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-hooks-path: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-javafx-maven: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-learner-replay-ux: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-learner-replay-ux: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-macos-installer: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-macos-installer: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-showtail-harness: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-showtail-harness: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-signpath-release: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-tui-responsive: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-tui-responsive: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-apache: tracetoon-baseline: fresh validation evidence partial
- aifirstcontent-apache: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-book-step-verify: tracetoon-baseline: fresh validation evidence partial
- aifirstcontent-book-step-verify: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-portable-replays: tracetoon-baseline: fresh validation evidence partial
- aifirstcontent-portable-replays: tracetoon-candidate: fresh validation evidence partial
- aifirstcontent-replay-start-state: tracetoon-baseline: fresh validation evidence partial
- aifirstcontent-replay-start-state: tracetoon-candidate: fresh validation evidence partial
- aifirstextension-apache-license: tracetoon-baseline: fresh validation evidence partial
- aifirstextension-apache-license: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-guided-install: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-macos-workaround: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-signing-policy: tracetoon-candidate: fresh validation evidence partial
- bazzite-stale-portal: tracetoon-candidate: fresh validation evidence partial
- pr10: tracetoon-candidate: fresh validation evidence partial
- pr11: tracetoon-candidate: fresh validation evidence partial
- pr12: tracetoon-baseline: fresh validation evidence partial
- pr12: tracetoon-candidate: fresh validation evidence partial
- pr5: tracetoon-candidate: fresh validation evidence partial
- pr8: tracetoon-candidate: fresh validation evidence partial
- pr9: tracetoon-candidate: fresh validation evidence partial
- prbench-aggregate-only: tracetoon-baseline: fresh validation evidence partial
- prbench-aggregate-only: tracetoon-candidate: fresh validation evidence partial
- prbench-compare-systems: tracetoon-baseline: fresh validation evidence partial
- prbench-compare-systems: tracetoon-candidate: fresh validation evidence partial
- prbench-crossjudge: tracetoon-baseline: fresh validation evidence partial
- prbench-crossjudge: tracetoon-candidate: fresh validation evidence partial
- prbench-graph-compare-doc: tracetoon-baseline: fresh validation evidence partial
- prbench-graph-compare-doc: tracetoon-candidate: fresh validation evidence partial
- prbench-judge-retry: tracetoon-baseline: fresh validation evidence partial
- prbench-judge-retry: tracetoon-candidate: fresh validation evidence partial
- prbench-parallel-providers: tracetoon-baseline: fresh validation evidence partial
- prbench-parallel-providers: tracetoon-candidate: fresh validation evidence partial
- prbench-priced-cost-gate: tracetoon-baseline: fresh validation evidence partial
- prbench-priced-cost-gate: tracetoon-candidate: fresh validation evidence partial
- prbench-scoring: tracetoon-baseline: fresh validation evidence partial
- prbench-scoring: tracetoon-candidate: fresh validation evidence partial
- prbench-shell-bookkeeping: tracetoon-baseline: fresh validation evidence partial
- prbench-shell-bookkeeping: tracetoon-candidate: fresh validation evidence partial
- showtail-claude-exit-codes: tracetoon-baseline: fresh validation evidence partial
- showtail-claude-exit-codes: tracetoon-candidate: fresh validation evidence partial
- showtail-docker-tests: tracetoon-baseline: fresh validation evidence partial
- showtail-docker-tests: tracetoon-candidate: fresh validation evidence partial
- showtail-self-upgrade: tracetoon-baseline: fresh validation evidence partial
- showtail-self-upgrade: tracetoon-candidate: fresh validation evidence partial
- showtail-signpath: tracetoon-baseline: fresh validation evidence partial
- showtail-signpath: tracetoon-candidate: fresh validation evidence partial
- showtail-transcript-migrator: tracetoon-baseline: fresh validation evidence partial
- showtail-transcript-migrator: tracetoon-candidate: fresh validation evidence partial
- showtail-windows-cmd: tracetoon-candidate: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-baseline: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-candidate: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-baseline and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-chained-runs: tracetoon-baseline: fresh validation evidence partial
- tracetoon-chained-runs: tracetoon-candidate: fresh validation evidence partial
- tracetoon-cli-guard-tests: tracetoon-baseline: fresh validation evidence partial
- tracetoon-cli-guard-tests: tracetoon-candidate: fresh validation evidence partial
- tracetoon-evidence-graph: tracetoon-baseline: fresh validation evidence partial
- tracetoon-evidence-graph: tracetoon-candidate: fresh validation evidence partial
- tracetoon-lean-reviewer: tracetoon-baseline: fresh validation evidence partial
- tracetoon-lean-reviewer: tracetoon-candidate: fresh validation evidence partial
- tracetoon-neighborhood: tracetoon-baseline: fresh validation evidence partial
- tracetoon-neighborhood: tracetoon-candidate: fresh validation evidence partial
- tracetoon-receipt-quoting: tracetoon-baseline: fresh validation evidence partial
- tracetoon-receipt-quoting: tracetoon-candidate: fresh validation evidence partial
- tracetoon-render-name-check: tracetoon-baseline: fresh validation evidence partial
- tracetoon-render-name-check: tracetoon-candidate: fresh validation evidence partial
- tracetoon-render-name-check: tracetoon-baseline and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-review-run-all: tracetoon-baseline: fresh validation evidence partial
- tracetoon-review-run-all: tracetoon-candidate: fresh validation evidence partial
- tracetoon-sql-row-order: tracetoon-baseline: fresh validation evidence partial
- tracetoon-sql-row-order: tracetoon-candidate: fresh validation evidence partial
- tracetoon-sql-row-order: tracetoon-baseline and tracetoon-candidate propose different diffs; each description receives its own proposed diff
- tracetoon-update-command: tracetoon-baseline: fresh validation evidence partial
- tracetoon-update-command: tracetoon-candidate: fresh validation evidence partial
- vex-v5-serial-aim-port: tracetoon-candidate: fresh validation evidence partial
- vexagent-cli-snap: tracetoon-baseline: fresh validation evidence partial
- vexagent-cli-snap: tracetoon-candidate: fresh validation evidence partial
- vexagent-repl-usb-iface: tracetoon-baseline: fresh validation evidence partial
- vexagent-repl-usb-iface: tracetoon-candidate: fresh validation evidence partial
- vexagent-replug-runs: tracetoon-candidate: fresh validation evidence partial
- vexagent-skill: tracetoon-candidate: fresh validation evidence partial
- vexaim: tracetoon-baseline: fresh validation evidence partial
- vexaim: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-ci: tracetoon-baseline: fresh validation evidence partial
- vexaim-workshop-ci: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-norobot: tracetoon-candidate: fresh validation evidence partial
- winapps-adobe-2026: tracetoon-baseline: fresh validation evidence partial
- winapps-adobe-2026: tracetoon-candidate: fresh validation evidence partial
- winapps-sdl-wayland: tracetoon-baseline: fresh validation evidence partial
- winapps-sdl-wayland: tracetoon-candidate: fresh validation evidence partial

