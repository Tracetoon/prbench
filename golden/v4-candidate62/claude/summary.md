# dev comparison

Outcome: **inconclusive**. Quality: passed. Efficiency: passed.

Writers: 366/366; order judgments: 732/732.

Failed attempts: 1; failed-attempt time: 72s; current pending cleanup: 0.

| Model | System | Samples | Median writer seconds | Median input tokens | Pending cleanup |
|---|---|---:|---:|---:|---:|
| claude-sonnet-5-5@medium | tracetoon-baseline | 183 | 276.01 | 101590 | 0 |
| claude-sonnet-5-5@medium | tracetoon-candidate | 183 | 418.38 | 621315 | 0 |

## Gate findings

- Accuracy (confirmed errors per scored draft, 183 drafts): candidate 0.470 (86 of 119 flags confirmed), baseline 0.842 (154 of 187 flags confirmed); unresolved 0.

## Paired performance

Rule: Pass when the candidate/baseline geometric mean of paired per-draft priced cost (same model, case and replicate; log ratios averaged within each case, then across cases) is at most 1.000. The case-clustered 95% interval is reported, not required. Any paired draft without a priced cost makes the gate inconclusive. Writer wall time and token counts are information, not criteria.

Candidate/baseline geometric mean priced cost ratio (criterion): 0.573 over 183/183 pairs; case-clustered 95% interval: [0.530239237680951,0.6195689118380039].

Candidate/baseline geometric mean writer ratio (information): 1.567; case-clustered 95% interval: [1.3921860181299635,1.778008359984165].

- 3 replicate(s) still represent 61 independent cases in this split.
- Writer timing includes service waits and neutral observation overhead; runtime diagnostics may overlap.
- Diagnostic reuse cannot establish a fresh performance improvement.
- Raw judgments are preserved separately from source-backed adjudications.
- Validation did not complete for either writer in any of the 183 pairs, so the sandbox could not run it; cost, timing and token results compare writers that both lacked completed validation and say nothing about validation work saved or skipped. Reasons recorded: No canonical validation execution is available. | Validation command contains shell expressions or redirections. | Validation directory is unknown.

## Scores

Composite (0-100) = 35·claims + 15·context + 15·uncertainties + 35·rubric (coverage as fractions of the fact sheet, rubric as mean/2) − 15·factual errors − 7·unsupported claims − 10·traps hit, floored at 0. Each draft is averaged over all its judgments; arm means are means of per-case means, with a 95% bootstrap interval over cases. Components are the primary evidence; the composite is a summary.

| Model | System | Drafts | Composite [95% CI] | Claims | Context | Uncert. | Rubric | Errors | Unsupported | Traps | $/draft | Cost covers | Subagents/draft | Input tokens | Queries |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|
| claude-sonnet-5-5@medium | tracetoon-baseline | 183 | 59.8 [57.5, 62.0] | 0.77 | 0.27 | 0.66 | 0.69 | 0.29 | 0.12 | 0.04 | 0.654 | reported total | – | 211684 | – |
| claude-sonnet-5-5@medium | tracetoon-candidate | 183 | 63.2 [60.3, 66.1] | 0.73 | 0.31 | 0.57 | 0.79 | 0.14 | 0.12 | 0.05 | 0.344 | reported total | – | 638572 | 1.1 |

Mixed-model writers (subagent threads on another model; each model's tokens are priced at its own rate, and Claude's reported cost already covers every model):

| Model | System | Mixed-model drafts | Models used |
|---|---|---:|---|
| claude-sonnet-5-5@medium | tracetoon-candidate | 183/183 | claude-haiku-5-5, claude-sonnet-5-5 |

Paired candidate − other system (same model, case and replicate). Leave one case out = lowest and highest composite Δ when each case in turn is dropped:

| Model | Against | Pairs | Composite Δ [95% CI] | Leave one case out | Factual errors Δ |
|---|---|---:|---|---|---:|
| claude-sonnet-5-5@medium | tracetoon-baseline | 183 | 3.5 [0.8, 6.1] | 3.2 to 3.9 | -0.15 |

Per-case composite Δ (tracetoon-candidate − tracetoon-baseline, same model; mean over paired replicates, pairs in parentheses):

| Case | claude-sonnet-5-5@medium |
|---|---:|
| aifirstcli-book-walk | 3.3 (3) |
| aifirstcli-duckling-wheels | 1.5 (3) |
| aifirstcli-homebrew-maven | 16.3 (3) |
| aifirstcli-hooks-path | 1.9 (3) |
| aifirstcli-javafx-maven | 19.6 (3) |
| aifirstcli-learner-replay-ux | 0.4 (3) |
| aifirstcli-macos-installer | 11.4 (3) |
| aifirstcli-showtail-harness | 13.0 (3) |
| aifirstcli-signpath-release | -3.7 (3) |
| aifirstcli-tui-responsive | -10.9 (3) |
| aifirstcontent-apache | 21.3 (3) |
| aifirstcontent-book-step-verify | -18.7 (3) |
| aifirstcontent-portable-replays | 2.3 (3) |
| aifirstcontent-replay-start-state | 9.1 (3) |
| aifirstextension-apache-license | 21.3 (3) |
| aifirstwebsite-guided-install | 8.7 (3) |
| aifirstwebsite-macos-workaround | 17.0 (3) |
| aifirstwebsite-signing-policy | 7.5 (3) |
| bazzite-stale-portal | -17.0 (3) |
| pr5 | 2.1 (3) |
| pr8 | 18.9 (3) |
| pr9 | 5.2 (3) |
| pr10 | 4.7 (3) |
| pr11 | 8.0 (3) |
| pr12 | -9.5 (3) |
| prbench-aggregate-only | 0.4 (3) |
| prbench-compare-systems | 17.0 (3) |
| prbench-crossjudge | 5.7 (3) |
| prbench-graph-compare-doc | -11.8 (3) |
| prbench-judge-retry | 5.6 (3) |
| prbench-parallel-providers | -7.0 (3) |
| prbench-priced-cost-gate | 1.5 (3) |
| prbench-scoring | 13.1 (3) |
| prbench-shell-bookkeeping | -2.2 (3) |
| showtail-claude-exit-codes | 3.4 (3) |
| showtail-docker-tests | 6.7 (3) |
| showtail-self-upgrade | -6.5 (3) |
| showtail-signpath | 0.0 (3) |
| showtail-transcript-migrator | 1.5 (3) |
| showtail-windows-cmd | 0.7 (3) |
| tracetoon-brief-owners-rows | 18.8 (3) |
| tracetoon-chained-runs | 4.9 (3) |
| tracetoon-cli-guard-tests | 1.0 (3) |
| tracetoon-evidence-graph | 9.4 (3) |
| tracetoon-lean-reviewer | 4.9 (3) |
| tracetoon-neighborhood | -2.9 (3) |
| tracetoon-receipt-quoting | -12.7 (3) |
| tracetoon-render-name-check | 14.1 (3) |
| tracetoon-review-run-all | 13.7 (3) |
| tracetoon-sql-row-order | -0.9 (3) |
| tracetoon-update-command | 5.5 (3) |
| vex-v5-serial-aim-port | 17.8 (3) |
| vexagent-cli-snap | 11.2 (3) |
| vexagent-repl-usb-iface | -2.4 (3) |
| vexagent-replug-runs | -4.2 (3) |
| vexagent-skill | -6.7 (3) |
| vexaim | -25.4 (3) |
| vexaim-workshop-ci | -9.3 (3) |
| vexaim-workshop-norobot | -7.9 (3) |
| winapps-adobe-2026 | 6.4 (3) |
| winapps-sdl-wayland | 13.0 (3) |
| Mean of cases | 3.5 |

Judge reliability (timed-out and transient calls are retried, up to 3 attempts per order judgment; a malformed reply gets one format repair, then fresh requests, up to 5 attempts):

| Judge | Failed attempts | Timed out | Transient | Format | Other |
|---|---:|---:|---:|---:|---:|
| claude:claude-opus-5-5@medium | 1 | 0 | 0 | 1 | 0 |

## Accuracy

Error rate = share of judgments that found at least one factual error (mean of per-case means, 95% bootstrap interval over cases). Error classes are mean factual errors per judgment by kind of statement.

| Model | System | Drafts | Error rate [95% CI] | Errors | Unsupported | Claims | validation | code structure | attribution | motivation | pipeline | other | $/draft |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| claude-sonnet-5-5@medium | tracetoon-baseline | 183 | 0.24 [0.18, 0.30] | 0.29 | 0.12 | 0.77 | 0.19 | 0.01 | 0.01 | 0.00 | 0.01 | 0.07 | 0.654 |
| claude-sonnet-5-5@medium | tracetoon-candidate | 183 | 0.12 [0.07, 0.17] | 0.14 | 0.12 | 0.73 | 0.07 | 0.00 | 0.01 | 0.00 | 0.00 | 0.05 | 0.344 |

Candidate arms against baseline arms (any model; shared cases). Deltas are candidate minus baseline over per-case means, with a 95% bootstrap interval over cases. Coverage guard: claim coverage may drop by at most 0.05.

| Candidate | Against baseline | Cases | Error rate Δ [95% CI] | Composite Δ [95% CI] | Claims Δ | Guard | Cost ratio |
|---|---|---:|---|---|---:|---|---:|
| claude-sonnet-5-5@medium | claude-sonnet-5-5@medium | 61 | -0.12 [-0.18, -0.07] | 3.5 [0.8, 6.1] | -0.04 | ok | 1.9× cheaper |

## claude-sonnet-5-5@medium, replicate 1: tracetoon-baseline

# prbench report

Rubric v6. Judges: claude:claude-opus-5-5@medium, claude:claude-sonnet-5-5@medium. Generated 2026-11-18T10:24:26.961Z.

Evidence gaps are unverified claims, not errors or fabrication. Fresh evidence coverage is reported per artifact; partial capture may still establish individual results. Inconclusive preferences are excluded from win/tie statistics, intervals and judge agreement.

Completed 122 of 122 expected case/pair/judge results (each requires both orders).

Each pair is judged in both orders; a win needs both orders to agree. An evidence-dependent abstention in either order makes the pair inconclusive; other disagreements are ties (a *flip* when the orders picked opposite systems). "all judges agree" includes only pairs completed by every configured judge, and counts a win only when every judge gave it. With few cases, treat p-values and intervals as a sense of scale, not proof.

## dev split (61 cases)

aifirstcli-book-walk, aifirstcli-duckling-wheels, aifirstcli-homebrew-maven, aifirstcli-hooks-path, aifirstcli-javafx-maven, aifirstcli-learner-replay-ux, aifirstcli-macos-installer, aifirstcli-showtail-harness, aifirstcli-signpath-release, aifirstcli-tui-responsive, aifirstcontent-apache, aifirstcontent-book-step-verify, aifirstcontent-portable-replays, aifirstcontent-replay-start-state, aifirstextension-apache-license, aifirstwebsite-guided-install, aifirstwebsite-macos-workaround, aifirstwebsite-signing-policy, bazzite-stale-portal, pr10, pr11, pr12, pr5, pr8, pr9, prbench-aggregate-only, prbench-compare-systems, prbench-crossjudge, prbench-graph-compare-doc, prbench-judge-retry, prbench-parallel-providers, prbench-priced-cost-gate, prbench-scoring, prbench-shell-bookkeeping, showtail-claude-exit-codes, showtail-docker-tests, showtail-self-upgrade, showtail-signpath, showtail-transcript-migrator, showtail-windows-cmd, tracetoon-brief-owners-rows, tracetoon-chained-runs, tracetoon-cli-guard-tests, tracetoon-evidence-graph, tracetoon-lean-reviewer, tracetoon-neighborhood, tracetoon-receipt-quoting, tracetoon-render-name-check, tracetoon-review-run-all, tracetoon-sql-row-order, tracetoon-update-command, vex-v5-serial-aim-port, vexagent-cli-snap, vexagent-repl-usb-iface, vexagent-replug-runs, vexagent-skill, vexaim, vexaim-workshop-ci, vexaim-workshop-norobot, winapps-adobe-2026, winapps-sdl-wayland

### Head to head

| x vs y | judge | x wins | y wins | ties | flips | inconclusive | x win rate | sign test p | mean (x−y) [95% CI] |
|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline vs tracetoon-candidate | claude:claude-opus-5-5@medium | 17 | 39 | 5 | 5 | 0 | 30% | 0.00 | -0.36 [-0.57, -0.13] |
| tracetoon-baseline vs tracetoon-candidate | claude:claude-sonnet-5-5@medium | 11 | 25 | 25 | 25 | 0 | 31% | 0.03 | -0.23 [-0.41, -0.05] |
| tracetoon-baseline vs tracetoon-candidate | all judges agree | 8 | 22 | 31 | 28 | 0 | 27% | 0.02 | -0.23 [-0.39, -0.07] |

### Per system (means over every judgment of that system)

| system | judgments | factual errors | unsupported overclaims | evidence gaps | claims covered | context covered | uncertainties respected | traps hit | median words | total agent cost |
|---|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline | 244 | 0.25 | 0.07 | 0.72 | 78% | 25% | 69% | 0.02 | 328 | $43.83 |
| tracetoon-candidate | 244 | 0.14 | 0.14 | 0.41 | 74% | 31% | 57% | 0.05 | 313 | $21.16 |

### Fresh writer evidence coverage (artifact counts)

| system | artifacts | recorded | partial | unavailable |
|---|---|---|---|---|
| tracetoon-baseline | 61 | 0 | 61 | 0 |
| tracetoon-candidate | 61 | 0 | 61 | 0 |

### Rubric (mean of 0–2 scores; n/a items excluded)

| system | problem | rationale | validation | consequences | orientation | entry | economy | feedback | links | scope |
|---|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline | 1.63 | 1.15 | 1.24 | 1.41 | 1.82 | 0.82 | 1.51 | 0.52 | 1.11 | 1.90 |
| tracetoon-candidate | 1.61 | 1.14 | 1.62 | 1.08 | 1.68 | 1.91 | 1.70 | 1.98 | 1.00 | 1.73 |

## Judge agreement

- claude:claude-opus-5-5@medium vs claude:claude-sonnet-5-5@medium: 52% of 61 pair verdicts agree; Cohen's kappa 0.27.

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
- aifirstwebsite-guided-install: tracetoon-baseline: fresh validation evidence partial
- aifirstwebsite-guided-install: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-macos-workaround: tracetoon-baseline: fresh validation evidence partial
- aifirstwebsite-macos-workaround: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-signing-policy: tracetoon-baseline: fresh validation evidence partial
- aifirstwebsite-signing-policy: tracetoon-candidate: fresh validation evidence partial
- bazzite-stale-portal: tracetoon-baseline: fresh validation evidence partial
- bazzite-stale-portal: tracetoon-candidate: fresh validation evidence partial
- pr10: tracetoon-baseline: fresh validation evidence partial
- pr10: tracetoon-candidate: fresh validation evidence partial
- pr11: tracetoon-baseline: fresh validation evidence partial
- pr11: tracetoon-candidate: fresh validation evidence partial
- pr12: tracetoon-baseline: fresh validation evidence partial
- pr12: tracetoon-candidate: fresh validation evidence partial
- pr5: tracetoon-baseline: fresh validation evidence partial
- pr5: tracetoon-candidate: fresh validation evidence partial
- pr8: tracetoon-baseline: fresh validation evidence partial
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
- showtail-docker-tests: tracetoon-baseline: fresh validation evidence partial
- showtail-docker-tests: tracetoon-candidate: fresh validation evidence partial
- showtail-self-upgrade: tracetoon-baseline: fresh validation evidence partial
- showtail-self-upgrade: tracetoon-candidate: fresh validation evidence partial
- showtail-signpath: tracetoon-baseline: fresh validation evidence partial
- showtail-signpath: tracetoon-candidate: fresh validation evidence partial
- showtail-transcript-migrator: tracetoon-baseline: fresh validation evidence partial
- showtail-transcript-migrator: tracetoon-candidate: fresh validation evidence partial
- showtail-windows-cmd: tracetoon-baseline: fresh validation evidence partial
- showtail-windows-cmd: tracetoon-candidate: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-baseline: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-candidate: fresh validation evidence partial
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
- tracetoon-review-run-all: tracetoon-baseline: fresh validation evidence partial
- tracetoon-review-run-all: tracetoon-candidate: fresh validation evidence partial
- tracetoon-sql-row-order: tracetoon-baseline: fresh validation evidence partial
- tracetoon-sql-row-order: tracetoon-candidate: fresh validation evidence partial
- tracetoon-update-command: tracetoon-baseline: fresh validation evidence partial
- tracetoon-update-command: tracetoon-candidate: fresh validation evidence partial
- vex-v5-serial-aim-port: tracetoon-baseline: fresh validation evidence partial
- vex-v5-serial-aim-port: tracetoon-candidate: fresh validation evidence partial
- vexagent-cli-snap: tracetoon-baseline: fresh validation evidence partial
- vexagent-cli-snap: tracetoon-candidate: fresh validation evidence partial
- vexagent-repl-usb-iface: tracetoon-baseline: fresh validation evidence partial
- vexagent-repl-usb-iface: tracetoon-candidate: fresh validation evidence partial
- vexagent-replug-runs: tracetoon-baseline: fresh validation evidence partial
- vexagent-replug-runs: tracetoon-candidate: fresh validation evidence partial
- vexagent-skill: tracetoon-baseline: fresh validation evidence partial
- vexagent-skill: tracetoon-candidate: fresh validation evidence partial
- vexaim: tracetoon-baseline: fresh validation evidence partial
- vexaim: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-ci: tracetoon-baseline: fresh validation evidence partial
- vexaim-workshop-ci: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-norobot: tracetoon-baseline: fresh validation evidence partial
- vexaim-workshop-norobot: tracetoon-candidate: fresh validation evidence partial
- winapps-adobe-2026: tracetoon-baseline: fresh validation evidence partial
- winapps-adobe-2026: tracetoon-candidate: fresh validation evidence partial
- winapps-sdl-wayland: tracetoon-baseline: fresh validation evidence partial
- winapps-sdl-wayland: tracetoon-candidate: fresh validation evidence partial

## claude-sonnet-5-5@medium, replicate 2: tracetoon-baseline

# prbench report

Rubric v6. Judges: claude:claude-opus-5-5@medium, claude:claude-sonnet-5-5@medium. Generated 2026-11-18T10:24:28.099Z.

Evidence gaps are unverified claims, not errors or fabrication. Fresh evidence coverage is reported per artifact; partial capture may still establish individual results. Inconclusive preferences are excluded from win/tie statistics, intervals and judge agreement.

Completed 122 of 122 expected case/pair/judge results (each requires both orders).

Each pair is judged in both orders; a win needs both orders to agree. An evidence-dependent abstention in either order makes the pair inconclusive; other disagreements are ties (a *flip* when the orders picked opposite systems). "all judges agree" includes only pairs completed by every configured judge, and counts a win only when every judge gave it. With few cases, treat p-values and intervals as a sense of scale, not proof.

## dev split (61 cases)

aifirstcli-book-walk, aifirstcli-duckling-wheels, aifirstcli-homebrew-maven, aifirstcli-hooks-path, aifirstcli-javafx-maven, aifirstcli-learner-replay-ux, aifirstcli-macos-installer, aifirstcli-showtail-harness, aifirstcli-signpath-release, aifirstcli-tui-responsive, aifirstcontent-apache, aifirstcontent-book-step-verify, aifirstcontent-portable-replays, aifirstcontent-replay-start-state, aifirstextension-apache-license, aifirstwebsite-guided-install, aifirstwebsite-macos-workaround, aifirstwebsite-signing-policy, bazzite-stale-portal, pr10, pr11, pr12, pr5, pr8, pr9, prbench-aggregate-only, prbench-compare-systems, prbench-crossjudge, prbench-graph-compare-doc, prbench-judge-retry, prbench-parallel-providers, prbench-priced-cost-gate, prbench-scoring, prbench-shell-bookkeeping, showtail-claude-exit-codes, showtail-docker-tests, showtail-self-upgrade, showtail-signpath, showtail-transcript-migrator, showtail-windows-cmd, tracetoon-brief-owners-rows, tracetoon-chained-runs, tracetoon-cli-guard-tests, tracetoon-evidence-graph, tracetoon-lean-reviewer, tracetoon-neighborhood, tracetoon-receipt-quoting, tracetoon-render-name-check, tracetoon-review-run-all, tracetoon-sql-row-order, tracetoon-update-command, vex-v5-serial-aim-port, vexagent-cli-snap, vexagent-repl-usb-iface, vexagent-replug-runs, vexagent-skill, vexaim, vexaim-workshop-ci, vexaim-workshop-norobot, winapps-adobe-2026, winapps-sdl-wayland

### Head to head

| x vs y | judge | x wins | y wins | ties | flips | inconclusive | x win rate | sign test p | mean (x−y) [95% CI] |
|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline vs tracetoon-candidate | claude:claude-opus-5-5@medium | 18 | 35 | 8 | 8 | 0 | 34% | 0.03 | -0.28 [-0.49, -0.05] |
| tracetoon-baseline vs tracetoon-candidate | claude:claude-sonnet-5-5@medium | 6 | 25 | 30 | 30 | 0 | 19% | 0.00 | -0.31 [-0.48, -0.15] |
| tracetoon-baseline vs tracetoon-candidate | all judges agree | 5 | 23 | 33 | 33 | 0 | 18% | 0.00 | -0.30 [-0.44, -0.15] |

### Per system (means over every judgment of that system)

| system | judgments | factual errors | unsupported overclaims | evidence gaps | claims covered | context covered | uncertainties respected | traps hit | median words | total agent cost |
|---|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline | 244 | 0.36 | 0.18 | 0.65 | 76% | 26% | 65% | 0.06 | 327 | $37.76 |
| tracetoon-candidate | 244 | 0.18 | 0.09 | 0.34 | 74% | 32% | 57% | 0.04 | 311 | $21.18 |

### Fresh writer evidence coverage (artifact counts)

| system | artifacts | recorded | partial | unavailable |
|---|---|---|---|---|
| tracetoon-baseline | 61 | 0 | 61 | 0 |
| tracetoon-candidate | 61 | 0 | 61 | 0 |

### Rubric (mean of 0–2 scores; n/a items excluded)

| system | problem | rationale | validation | consequences | orientation | entry | economy | feedback | links | scope |
|---|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline | 1.59 | 1.07 | 1.17 | 1.29 | 1.83 | 0.83 | 1.55 | 0.51 | 1.06 | 1.84 |
| tracetoon-candidate | 1.60 | 1.16 | 1.61 | 1.11 | 1.68 | 1.88 | 1.64 | 1.95 | 0.93 | 1.75 |

## Judge agreement

- claude:claude-opus-5-5@medium vs claude:claude-sonnet-5-5@medium: 54% of 61 pair verdicts agree; Cohen's kappa 0.32.

## Warnings

- aifirstcli-book-walk: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-book-walk: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-duckling-wheels: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-duckling-wheels: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-homebrew-maven: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-homebrew-maven: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-homebrew-maven: tracetoon-baseline and tracetoon-candidate propose different diffs; each description receives its own proposed diff
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
- aifirstwebsite-guided-install: tracetoon-baseline: fresh validation evidence partial
- aifirstwebsite-guided-install: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-macos-workaround: tracetoon-baseline: fresh validation evidence partial
- aifirstwebsite-macos-workaround: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-signing-policy: tracetoon-baseline: fresh validation evidence partial
- aifirstwebsite-signing-policy: tracetoon-candidate: fresh validation evidence partial
- bazzite-stale-portal: tracetoon-baseline: fresh validation evidence partial
- bazzite-stale-portal: tracetoon-candidate: fresh validation evidence partial
- pr10: tracetoon-baseline: fresh validation evidence partial
- pr10: tracetoon-candidate: fresh validation evidence partial
- pr11: tracetoon-baseline: fresh validation evidence partial
- pr11: tracetoon-candidate: fresh validation evidence partial
- pr12: tracetoon-baseline: fresh validation evidence partial
- pr12: tracetoon-candidate: fresh validation evidence partial
- pr5: tracetoon-baseline: fresh validation evidence partial
- pr5: tracetoon-candidate: fresh validation evidence partial
- pr8: tracetoon-baseline: fresh validation evidence partial
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
- showtail-docker-tests: tracetoon-baseline: fresh validation evidence partial
- showtail-docker-tests: tracetoon-candidate: fresh validation evidence partial
- showtail-self-upgrade: tracetoon-baseline: fresh validation evidence partial
- showtail-self-upgrade: tracetoon-candidate: fresh validation evidence partial
- showtail-signpath: tracetoon-baseline: fresh validation evidence partial
- showtail-signpath: tracetoon-candidate: fresh validation evidence partial
- showtail-transcript-migrator: tracetoon-baseline: fresh validation evidence partial
- showtail-transcript-migrator: tracetoon-candidate: fresh validation evidence partial
- showtail-windows-cmd: tracetoon-baseline: fresh validation evidence partial
- showtail-windows-cmd: tracetoon-candidate: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-baseline: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-candidate: fresh validation evidence partial
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
- tracetoon-review-run-all: tracetoon-baseline: fresh validation evidence partial
- tracetoon-review-run-all: tracetoon-candidate: fresh validation evidence partial
- tracetoon-sql-row-order: tracetoon-baseline: fresh validation evidence partial
- tracetoon-sql-row-order: tracetoon-candidate: fresh validation evidence partial
- tracetoon-update-command: tracetoon-baseline: fresh validation evidence partial
- tracetoon-update-command: tracetoon-candidate: fresh validation evidence partial
- vex-v5-serial-aim-port: tracetoon-baseline: fresh validation evidence partial
- vex-v5-serial-aim-port: tracetoon-candidate: fresh validation evidence partial
- vexagent-cli-snap: tracetoon-baseline: fresh validation evidence partial
- vexagent-cli-snap: tracetoon-candidate: fresh validation evidence partial
- vexagent-repl-usb-iface: tracetoon-baseline: fresh validation evidence partial
- vexagent-repl-usb-iface: tracetoon-candidate: fresh validation evidence partial
- vexagent-replug-runs: tracetoon-baseline: fresh validation evidence partial
- vexagent-replug-runs: tracetoon-candidate: fresh validation evidence partial
- vexagent-skill: tracetoon-baseline: fresh validation evidence partial
- vexagent-skill: tracetoon-candidate: fresh validation evidence partial
- vexaim: tracetoon-baseline: fresh validation evidence partial
- vexaim: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-ci: tracetoon-baseline: fresh validation evidence partial
- vexaim-workshop-ci: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-norobot: tracetoon-baseline: fresh validation evidence partial
- vexaim-workshop-norobot: tracetoon-candidate: fresh validation evidence partial
- winapps-adobe-2026: tracetoon-baseline: fresh validation evidence partial
- winapps-adobe-2026: tracetoon-candidate: fresh validation evidence partial
- winapps-sdl-wayland: tracetoon-baseline: fresh validation evidence partial
- winapps-sdl-wayland: tracetoon-candidate: fresh validation evidence partial

## claude-sonnet-5-5@medium, replicate 3: tracetoon-baseline

# prbench report

Rubric v6. Judges: claude:claude-opus-5-5@medium, claude:claude-sonnet-5-5@medium. Generated 2026-11-18T10:24:29.254Z.

Evidence gaps are unverified claims, not errors or fabrication. Fresh evidence coverage is reported per artifact; partial capture may still establish individual results. Inconclusive preferences are excluded from win/tie statistics, intervals and judge agreement.

Completed 122 of 122 expected case/pair/judge results (each requires both orders).

Each pair is judged in both orders; a win needs both orders to agree. An evidence-dependent abstention in either order makes the pair inconclusive; other disagreements are ties (a *flip* when the orders picked opposite systems). "all judges agree" includes only pairs completed by every configured judge, and counts a win only when every judge gave it. With few cases, treat p-values and intervals as a sense of scale, not proof.

## dev split (61 cases)

aifirstcli-book-walk, aifirstcli-duckling-wheels, aifirstcli-homebrew-maven, aifirstcli-hooks-path, aifirstcli-javafx-maven, aifirstcli-learner-replay-ux, aifirstcli-macos-installer, aifirstcli-showtail-harness, aifirstcli-signpath-release, aifirstcli-tui-responsive, aifirstcontent-apache, aifirstcontent-book-step-verify, aifirstcontent-portable-replays, aifirstcontent-replay-start-state, aifirstextension-apache-license, aifirstwebsite-guided-install, aifirstwebsite-macos-workaround, aifirstwebsite-signing-policy, bazzite-stale-portal, pr10, pr11, pr12, pr5, pr8, pr9, prbench-aggregate-only, prbench-compare-systems, prbench-crossjudge, prbench-graph-compare-doc, prbench-judge-retry, prbench-parallel-providers, prbench-priced-cost-gate, prbench-scoring, prbench-shell-bookkeeping, showtail-claude-exit-codes, showtail-docker-tests, showtail-self-upgrade, showtail-signpath, showtail-transcript-migrator, showtail-windows-cmd, tracetoon-brief-owners-rows, tracetoon-chained-runs, tracetoon-cli-guard-tests, tracetoon-evidence-graph, tracetoon-lean-reviewer, tracetoon-neighborhood, tracetoon-receipt-quoting, tracetoon-render-name-check, tracetoon-review-run-all, tracetoon-sql-row-order, tracetoon-update-command, vex-v5-serial-aim-port, vexagent-cli-snap, vexagent-repl-usb-iface, vexagent-replug-runs, vexagent-skill, vexaim, vexaim-workshop-ci, vexaim-workshop-norobot, winapps-adobe-2026, winapps-sdl-wayland

### Head to head

| x vs y | judge | x wins | y wins | ties | flips | inconclusive | x win rate | sign test p | mean (x−y) [95% CI] |
|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline vs tracetoon-candidate | claude:claude-opus-5-5@medium | 17 | 32 | 12 | 12 | 0 | 35% | 0.04 | -0.25 [-0.46, -0.02] |
| tracetoon-baseline vs tracetoon-candidate | claude:claude-sonnet-5-5@medium | 10 | 18 | 33 | 32 | 0 | 36% | 0.18 | -0.13 [-0.30, 0.03] |
| tracetoon-baseline vs tracetoon-candidate | all judges agree | 8 | 15 | 38 | 36 | 0 | 35% | 0.21 | -0.11 [-0.26, 0.03] |

### Per system (means over every judgment of that system)

| system | judgments | factual errors | unsupported overclaims | evidence gaps | claims covered | context covered | uncertainties respected | traps hit | median words | total agent cost |
|---|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline | 244 | 0.25 | 0.11 | 0.73 | 78% | 29% | 66% | 0.02 | 323 | $38.13 |
| tracetoon-candidate | 244 | 0.09 | 0.14 | 0.32 | 72% | 30% | 56% | 0.06 | 309 | $20.67 |

### Fresh writer evidence coverage (artifact counts)

| system | artifacts | recorded | partial | unavailable |
|---|---|---|---|---|
| tracetoon-baseline | 61 | 0 | 61 | 0 |
| tracetoon-candidate | 61 | 0 | 61 | 0 |

### Rubric (mean of 0–2 scores; n/a items excluded)

| system | problem | rationale | validation | consequences | orientation | entry | economy | feedback | links | scope |
|---|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline | 1.70 | 1.19 | 1.18 | 1.27 | 1.87 | 0.91 | 1.57 | 0.35 | 0.94 | 1.92 |
| tracetoon-candidate | 1.58 | 1.14 | 1.57 | 1.11 | 1.67 | 1.89 | 1.65 | 1.98 | 0.81 | 1.68 |

## Judge agreement

- claude:claude-opus-5-5@medium vs claude:claude-sonnet-5-5@medium: 51% of 61 pair verdicts agree; Cohen's kappa 0.29.

## Warnings

- aifirstcli-book-walk: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-book-walk: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-duckling-wheels: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-duckling-wheels: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-homebrew-maven: tracetoon-baseline: fresh validation evidence partial
- aifirstcli-homebrew-maven: tracetoon-candidate: fresh validation evidence partial
- aifirstcli-homebrew-maven: tracetoon-baseline and tracetoon-candidate propose different diffs; each description receives its own proposed diff
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
- aifirstwebsite-guided-install: tracetoon-baseline: fresh validation evidence partial
- aifirstwebsite-guided-install: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-macos-workaround: tracetoon-baseline: fresh validation evidence partial
- aifirstwebsite-macos-workaround: tracetoon-candidate: fresh validation evidence partial
- aifirstwebsite-signing-policy: tracetoon-baseline: fresh validation evidence partial
- aifirstwebsite-signing-policy: tracetoon-candidate: fresh validation evidence partial
- bazzite-stale-portal: tracetoon-baseline: fresh validation evidence partial
- bazzite-stale-portal: tracetoon-candidate: fresh validation evidence partial
- pr10: tracetoon-baseline: fresh validation evidence partial
- pr10: tracetoon-candidate: fresh validation evidence partial
- pr11: tracetoon-baseline: fresh validation evidence partial
- pr11: tracetoon-candidate: fresh validation evidence partial
- pr12: tracetoon-baseline: fresh validation evidence partial
- pr12: tracetoon-candidate: fresh validation evidence partial
- pr5: tracetoon-baseline: fresh validation evidence partial
- pr5: tracetoon-candidate: fresh validation evidence partial
- pr8: tracetoon-baseline: fresh validation evidence partial
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
- showtail-docker-tests: tracetoon-baseline: fresh validation evidence partial
- showtail-docker-tests: tracetoon-candidate: fresh validation evidence partial
- showtail-self-upgrade: tracetoon-baseline: fresh validation evidence partial
- showtail-self-upgrade: tracetoon-candidate: fresh validation evidence partial
- showtail-signpath: tracetoon-baseline: fresh validation evidence partial
- showtail-signpath: tracetoon-candidate: fresh validation evidence partial
- showtail-transcript-migrator: tracetoon-baseline: fresh validation evidence partial
- showtail-transcript-migrator: tracetoon-candidate: fresh validation evidence partial
- showtail-windows-cmd: tracetoon-baseline: fresh validation evidence partial
- showtail-windows-cmd: tracetoon-candidate: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-baseline: fresh validation evidence partial
- tracetoon-brief-owners-rows: tracetoon-candidate: fresh validation evidence partial
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
- tracetoon-review-run-all: tracetoon-baseline: fresh validation evidence partial
- tracetoon-review-run-all: tracetoon-candidate: fresh validation evidence partial
- tracetoon-sql-row-order: tracetoon-baseline: fresh validation evidence partial
- tracetoon-sql-row-order: tracetoon-candidate: fresh validation evidence partial
- tracetoon-update-command: tracetoon-baseline: fresh validation evidence partial
- tracetoon-update-command: tracetoon-candidate: fresh validation evidence partial
- vex-v5-serial-aim-port: tracetoon-baseline: fresh validation evidence partial
- vex-v5-serial-aim-port: tracetoon-candidate: fresh validation evidence partial
- vexagent-cli-snap: tracetoon-baseline: fresh validation evidence partial
- vexagent-cli-snap: tracetoon-candidate: fresh validation evidence partial
- vexagent-repl-usb-iface: tracetoon-baseline: fresh validation evidence partial
- vexagent-repl-usb-iface: tracetoon-candidate: fresh validation evidence partial
- vexagent-replug-runs: tracetoon-baseline: fresh validation evidence partial
- vexagent-replug-runs: tracetoon-candidate: fresh validation evidence partial
- vexagent-skill: tracetoon-baseline: fresh validation evidence partial
- vexagent-skill: tracetoon-candidate: fresh validation evidence partial
- vexaim: tracetoon-baseline: fresh validation evidence partial
- vexaim: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-ci: tracetoon-baseline: fresh validation evidence partial
- vexaim-workshop-ci: tracetoon-candidate: fresh validation evidence partial
- vexaim-workshop-norobot: tracetoon-baseline: fresh validation evidence partial
- vexaim-workshop-norobot: tracetoon-candidate: fresh validation evidence partial
- winapps-adobe-2026: tracetoon-baseline: fresh validation evidence partial
- winapps-adobe-2026: tracetoon-candidate: fresh validation evidence partial
- winapps-sdl-wayland: tracetoon-baseline: fresh validation evidence partial
- winapps-sdl-wayland: tracetoon-candidate: fresh validation evidence partial

