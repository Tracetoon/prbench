# dev comparison

Outcome: **inconclusive**. Quality: passed. Efficiency: inconclusive.

Writers: 3/3; order judgments: 8/8.

Failed attempts: 0; failed-attempt time: 0s; current pending cleanup: 0.

| Model | System | Samples | Median writer seconds | Median input tokens | Pending cleanup |
|---|---|---:|---:|---:|---:|
| gpt-6.1-terra@medium | codex-native | 1 | 276.97 | 485441 | 0 |
| gpt-6.1-terra@medium | tracetoon-baseline | 1 | 1142.92 | 4970949 | 0 |
| gpt-6.1-terra@medium | tracetoon-candidate | 1 | 1114.98 | 2040566 | 0 |

## Gate findings

- Accuracy (confirmed errors per scored draft, 1 drafts): candidate 0.000 (0 of 0 flags confirmed), baseline 0.000 (0 of 0 flags confirmed); unresolved 0.

## Paired performance

Rule: Pass when the candidate/baseline geometric mean of paired per-draft priced cost (same model, case and replicate; log ratios averaged within each case, then across cases) is at most 1.000. The case-clustered 95% interval is reported, not required. Any paired draft without a priced cost makes the gate inconclusive. Writer wall time and token counts are information, not criteria.

Candidate/baseline geometric mean priced cost ratio (criterion): 0.378 over 1/1 pairs; case-clustered 95% interval: [0.37812741178129905,0.37812741178129905].

Candidate/baseline geometric mean writer ratio (information): 0.976; case-clustered 95% interval: [0.9755520166889637,0.9755520166889637].

- 1 replicate(s) still represent 1 independent cases in this split.
- Writer timing includes service waits and neutral observation overhead; runtime diagnostics may overlap.
- Diagnostic reuse cannot establish a fresh performance improvement.
- Raw judgments are preserved separately from source-backed adjudications.

## Scores

Composite (0-100) = 35·claims + 15·context + 15·uncertainties + 35·rubric (coverage as fractions of the fact sheet, rubric as mean/2) − 15·factual errors − 7·unsupported claims − 10·traps hit, floored at 0. Each draft is averaged over all its judgments; arm means are means of per-case means, with a 95% bootstrap interval over cases. Components are the primary evidence; the composite is a summary.

| Model | System | Drafts | Composite [95% CI] | Claims | Context | Uncert. | Rubric | Errors | Unsupported | Traps | $/draft | Cost covers | Subagents/draft | Input tokens | Queries |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|
| gpt-6.1-terra@medium | codex-native | 1 | 33.8 [–, –] | 0.31 | 0.00 | 1.00 | 0.55 | 0.75 | 0.00 | 0.00 | 0.108* | all threads | 0.0 | 485441 | – |
| gpt-6.1-terra@medium | tracetoon-baseline | 1 | 72.3 [–, –] | 0.75 | 0.06 | 1.00 | 0.86 | 0.00 | 0.00 | 0.00 | 0.505* | all threads | 3.0 | 4970949 | – |
| gpt-6.1-terra@medium | tracetoon-candidate | 1 | 90.9 [–, –] | 0.92 | 0.59 | 1.00 | 0.99 | 0.00 | 0.00 | 0.00 | 0.191* | all threads | 0.0 | 2040566 | – |

Mixed-model writers (subagent threads on another model; each model's tokens are priced at its own rate, and Claude's reported cost already covers every model):

| Model | System | Mixed-model drafts | Models used |
|---|---|---:|---|
| gpt-6.1-terra@medium | tracetoon-candidate | 1/1 | gpt-6-luna, gpt-6.1-terra |

Paired candidate − other system (same model, case and replicate). Leave one case out = lowest and highest composite Δ when each case in turn is dropped:

| Model | Against | Pairs | Composite Δ [95% CI] | Leave one case out | Factual errors Δ |
|---|---|---:|---|---|---:|
| gpt-6.1-terra@medium | codex-native | 1 | 57.1 [–, –] | – | -0.75 |
| gpt-6.1-terra@medium | tracetoon-baseline | 1 | 18.7 [–, –] | – | 0.00 |

Per-case composite Δ (tracetoon-candidate − tracetoon-baseline, same model; mean over paired replicates, pairs in parentheses):

| Case | gpt-6.1-terra@medium |
|---|---:|
| prbench-compare-systems | 18.7 (1) |
| Mean of cases | 18.7 |

## Accuracy

Error rate = share of judgments that found at least one factual error (mean of per-case means, 95% bootstrap interval over cases). Error classes are mean factual errors per judgment by kind of statement.

| Model | System | Drafts | Error rate [95% CI] | Errors | Unsupported | Claims | validation | code structure | attribution | motivation | pipeline | other | $/draft |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| gpt-6.1-terra@medium | codex-native | 1 | 0.75 [–, –] | 0.75 | 0.00 | 0.31 | 0.75 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.108 |
| gpt-6.1-terra@medium | tracetoon-baseline | 1 | 0.00 [–, –] | 0.00 | 0.00 | 0.75 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.505 |
| gpt-6.1-terra@medium | tracetoon-candidate | 1 | 0.00 [–, –] | 0.00 | 0.00 | 0.92 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.191 |

Candidate arms against baseline arms (any model; shared cases). Deltas are candidate minus baseline over per-case means, with a 95% bootstrap interval over cases. Coverage guard: claim coverage may drop by at most 0.05.

| Candidate | Against baseline | Cases | Error rate Δ [95% CI] | Composite Δ [95% CI] | Claims Δ | Guard | Cost ratio |
|---|---|---:|---|---|---:|---|---:|
| gpt-6.1-terra@medium | gpt-6.1-terra@medium | 1 | 0.00 [–, –] | 18.7 [–, –] | 0.17 | ok | 2.6× cheaper |

\* Estimated from token counts and src/report/prices.json (USD per million tokens, short-context list prices for models whose runs report no USD (Codex), as reported by third-party trackers on 2026-11-06 (morphllm.com/openai-api-pricing); verify against the provider's pricing page.).

Cost covers: "all threads" includes every subagent thread the writer spawned (researcher, drafter, reviewer…), from the artifact or, for runs saved before that was recorded, recomputed from the accepted attempt's saved Codex traces ("traces"), with each model response counted once. "Main thread only" omits subagents and understates cost when the skill delegates. $/draft in the accuracy table and its cost ratios use the same figures.

## gpt-6.1-terra@medium, replicate 1: tracetoon-baseline

# prbench report

Rubric v6. Judges: codex:gpt-6.1-sol@medium, codex:gpt-6.1-terra@medium. Generated 2026-11-18T10:26:59.242Z.

Evidence gaps are unverified claims, not errors or fabrication. Fresh evidence coverage is reported per artifact; partial capture may still establish individual results. Inconclusive preferences are excluded from win/tie statistics, intervals and judge agreement.

Completed 2 of 2 expected case/pair/judge results (each requires both orders).

Each pair is judged in both orders; a win needs both orders to agree. An evidence-dependent abstention in either order makes the pair inconclusive; other disagreements are ties (a *flip* when the orders picked opposite systems). "all judges agree" includes only pairs completed by every configured judge, and counts a win only when every judge gave it. With few cases, treat p-values and intervals as a sense of scale, not proof.

## dev split (1 case)

prbench-compare-systems

### Head to head

| x vs y | judge | x wins | y wins | ties | flips | inconclusive | x win rate | sign test p | mean (x−y) [95% CI] |
|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline vs tracetoon-candidate | codex:gpt-6.1-sol@medium | 0 | 1 | 0 | 0 | 0 | 0% | 1.00 | -1.00 [-1.00, -1.00] |
| tracetoon-baseline vs tracetoon-candidate | codex:gpt-6.1-terra@medium | 0 | 1 | 0 | 0 | 0 | 0% | 1.00 | -1.00 [-1.00, -1.00] |
| tracetoon-baseline vs tracetoon-candidate | all judges agree | 0 | 1 | 0 | 0 | 0 | 0% | 1.00 | -1.00 [-1.00, -1.00] |

### Per system (means over every judgment of that system)

| system | judgments | factual errors | unsupported overclaims | evidence gaps | claims covered | context covered | uncertainties respected | traps hit | median words | total agent cost |
|---|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline | 4 | 0.00 | 0.00 | 0.00 | 75% | 6% | 100% | 0.00 | 177 | – |
| tracetoon-candidate | 4 | 0.00 | 0.00 | 0.00 | 91% | 50% | 100% | 0.00 | 253 | – |

### Fresh writer evidence coverage (artifact counts)

| system | artifacts | recorded | partial | unavailable |
|---|---|---|---|---|
| tracetoon-baseline | 1 | 0 | 1 | 0 |
| tracetoon-candidate | 1 | 0 | 1 | 0 |

### Rubric (mean of 0–2 scores; n/a items excluded)

| system | problem | rationale | validation | consequences | orientation | entry | economy | feedback | links | scope |
|---|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline | 1.75 | 0.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | – | – | 2.00 |
| tracetoon-candidate | 2.00 | 1.75 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | – | 2.00 |

## Judge agreement

- codex:gpt-6.1-sol@medium vs codex:gpt-6.1-terra@medium: 100% of 1 pair verdicts agree; Cohen's kappa 1.00.

## Warnings

- prbench-compare-systems: tracetoon-baseline: fresh validation evidence partial
- prbench-compare-systems: tracetoon-candidate: fresh validation evidence partial

## gpt-6.1-terra@medium, replicate 1: codex-native

# prbench report

Rubric v6. Judges: codex:gpt-6.1-sol@medium, codex:gpt-6.1-terra@medium. Generated 2026-11-18T10:26:59.247Z.

Evidence gaps are unverified claims, not errors or fabrication. Fresh evidence coverage is reported per artifact; partial capture may still establish individual results. Inconclusive preferences are excluded from win/tie statistics, intervals and judge agreement.

Completed 2 of 2 expected case/pair/judge results (each requires both orders).

Each pair is judged in both orders; a win needs both orders to agree. An evidence-dependent abstention in either order makes the pair inconclusive; other disagreements are ties (a *flip* when the orders picked opposite systems). "all judges agree" includes only pairs completed by every configured judge, and counts a win only when every judge gave it. With few cases, treat p-values and intervals as a sense of scale, not proof.

## dev split (1 case)

prbench-compare-systems

### Head to head

| x vs y | judge | x wins | y wins | ties | flips | inconclusive | x win rate | sign test p | mean (x−y) [95% CI] |
|---|---|---|---|---|---|---|---|---|---|
| codex-native vs tracetoon-candidate | codex:gpt-6.1-sol@medium | 0 | 1 | 0 | 0 | 0 | 0% | 1.00 | -1.00 [-1.00, -1.00] |
| codex-native vs tracetoon-candidate | codex:gpt-6.1-terra@medium | 0 | 1 | 0 | 0 | 0 | 0% | 1.00 | -1.00 [-1.00, -1.00] |
| codex-native vs tracetoon-candidate | all judges agree | 0 | 1 | 0 | 0 | 0 | 0% | 1.00 | -1.00 [-1.00, -1.00] |

### Per system (means over every judgment of that system)

| system | judgments | factual errors | unsupported overclaims | evidence gaps | claims covered | context covered | uncertainties respected | traps hit | median words | total agent cost |
|---|---|---|---|---|---|---|---|---|---|---|
| codex-native | 4 | 0.75 | 0.00 | 0.00 | 31% | 0% | 100% | 0.00 | 57 | – |
| tracetoon-candidate | 4 | 0.00 | 0.00 | 0.00 | 94% | 69% | 100% | 0.00 | 253 | – |

### Fresh writer evidence coverage (artifact counts)

| system | artifacts | recorded | partial | unavailable |
|---|---|---|---|---|
| codex-native | 1 | 0 | 1 | 0 |
| tracetoon-candidate | 1 | 0 | 1 | 0 |

### Rubric (mean of 0–2 scores; n/a items excluded)

| system | problem | rationale | validation | consequences | orientation | entry | economy | feedback | links | scope |
|---|---|---|---|---|---|---|---|---|---|---|
| codex-native | 1.00 | 0.00 | 0.75 | 1.00 | 2.00 | 0.00 | 2.00 | – | – | 2.00 |
| tracetoon-candidate | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.00 | – | 2.00 |

## Judge agreement

- codex:gpt-6.1-sol@medium vs codex:gpt-6.1-terra@medium: 100% of 1 pair verdicts agree; Cohen's kappa 1.00.

## Warnings

- prbench-compare-systems: codex-native: fresh validation evidence partial
- prbench-compare-systems: tracetoon-candidate: fresh validation evidence partial

