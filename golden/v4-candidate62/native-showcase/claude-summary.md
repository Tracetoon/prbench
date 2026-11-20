# dev comparison

Outcome: **inconclusive**. Quality: passed. Efficiency: inconclusive.

Writers: 3/3; order judgments: 8/8.

Failed attempts: 0; failed-attempt time: 0s; current pending cleanup: 0.

| Model | System | Samples | Median writer seconds | Median input tokens | Pending cleanup |
|---|---|---:|---:|---:|---:|
| claude-sonnet-5-5@medium | claude-native | 1 | 10.32 | 79319 | 0 |
| claude-sonnet-5-5@medium | tracetoon-baseline | 1 | 264.67 | 98280 | 0 |
| claude-sonnet-5-5@medium | tracetoon-candidate | 1 | 1001.86 | 715116 | 0 |

## Gate findings

- Accuracy (confirmed errors per scored draft, 1 drafts): candidate 0.000 (0 of 0 flags confirmed), baseline 0.000 (0 of 0 flags confirmed); unresolved 0.

## Paired performance

Rule: Pass when the candidate/baseline geometric mean of paired per-draft priced cost (same model, case and replicate; log ratios averaged within each case, then across cases) is at most 1.000. The case-clustered 95% interval is reported, not required. Any paired draft without a priced cost makes the gate inconclusive. Writer wall time and token counts are information, not criteria.

Candidate/baseline geometric mean priced cost ratio (criterion): 0.703 over 1/1 pairs; case-clustered 95% interval: [0.7029439878147392,0.7029439878147392].

Candidate/baseline geometric mean writer ratio (information): 3.785; case-clustered 95% interval: [3.785348066954107,3.785348066954107].

- 1 replicate(s) still represent 1 independent cases in this split.
- Writer timing includes service waits and neutral observation overhead; runtime diagnostics may overlap.
- Diagnostic reuse cannot establish a fresh performance improvement.
- Raw judgments are preserved separately from source-backed adjudications.
- Validation did not complete for either writer in any of the 1 pairs, so the sandbox could not run it; cost, timing and token results compare writers that both lacked completed validation and say nothing about validation work saved or skipped. Reasons recorded: No canonical validation execution is available.

## Scores

Composite (0-100) = 35·claims + 15·context + 15·uncertainties + 35·rubric (coverage as fractions of the fact sheet, rubric as mean/2) − 15·factual errors − 7·unsupported claims − 10·traps hit, floored at 0. Each draft is averaged over all its judgments; arm means are means of per-case means, with a 95% bootstrap interval over cases. Components are the primary evidence; the composite is a summary.

| Model | System | Drafts | Composite [95% CI] | Claims | Context | Uncert. | Rubric | Errors | Unsupported | Traps | $/draft | Cost covers | Subagents/draft | Input tokens | Queries |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|
| claude-sonnet-5-5@medium | claude-native | 1 | 53.0 [–, –] | 0.75 | 0.00 | 0.58 | 0.52 | 0.00 | 0.00 | 0.00 | 0.043 | reported total | – | 79319 | – |
| claude-sonnet-5-5@medium | tracetoon-baseline | 1 | 55.9 [–, –] | 0.69 | 0.00 | 0.92 | 0.52 | 0.00 | 0.00 | 0.00 | 0.483 | reported total | – | 98280 | – |
| claude-sonnet-5-5@medium | tracetoon-candidate | 1 | 69.3 [–, –] | 0.80 | 0.19 | 0.58 | 0.85 | 0.00 | 0.00 | 0.00 | 0.339 | reported total | – | 715116 | – |

Mixed-model writers (subagent threads on another model; each model's tokens are priced at its own rate, and Claude's reported cost already covers every model):

| Model | System | Mixed-model drafts | Models used |
|---|---|---:|---|
| claude-sonnet-5-5@medium | tracetoon-candidate | 1/1 | claude-haiku-5-5, claude-sonnet-5-5 |

Paired candidate − other system (same model, case and replicate). Leave one case out = lowest and highest composite Δ when each case in turn is dropped:

| Model | Against | Pairs | Composite Δ [95% CI] | Leave one case out | Factual errors Δ |
|---|---|---:|---|---|---:|
| claude-sonnet-5-5@medium | claude-native | 1 | 16.3 [–, –] | – | 0.00 |
| claude-sonnet-5-5@medium | tracetoon-baseline | 1 | 13.5 [–, –] | – | 0.00 |

Per-case composite Δ (tracetoon-candidate − tracetoon-baseline, same model; mean over paired replicates, pairs in parentheses):

| Case | claude-sonnet-5-5@medium |
|---|---:|
| prbench-compare-systems | 13.5 (1) |
| Mean of cases | 13.5 |

## Accuracy

Error rate = share of judgments that found at least one factual error (mean of per-case means, 95% bootstrap interval over cases). Error classes are mean factual errors per judgment by kind of statement.

| Model | System | Drafts | Error rate [95% CI] | Errors | Unsupported | Claims | validation | code structure | attribution | motivation | pipeline | other | $/draft |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| claude-sonnet-5-5@medium | claude-native | 1 | 0.00 [–, –] | 0.00 | 0.00 | 0.75 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.043 |
| claude-sonnet-5-5@medium | tracetoon-baseline | 1 | 0.00 [–, –] | 0.00 | 0.00 | 0.69 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.483 |
| claude-sonnet-5-5@medium | tracetoon-candidate | 1 | 0.00 [–, –] | 0.00 | 0.00 | 0.80 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.339 |

Candidate arms against baseline arms (any model; shared cases). Deltas are candidate minus baseline over per-case means, with a 95% bootstrap interval over cases. Coverage guard: claim coverage may drop by at most 0.05.

| Candidate | Against baseline | Cases | Error rate Δ [95% CI] | Composite Δ [95% CI] | Claims Δ | Guard | Cost ratio |
|---|---|---:|---|---|---:|---|---:|
| claude-sonnet-5-5@medium | claude-sonnet-5-5@medium | 1 | 0.00 [–, –] | 13.5 [–, –] | 0.11 | ok | 1.4× cheaper |

## claude-sonnet-5-5@medium, replicate 1: tracetoon-baseline

# prbench report

Rubric v6. Judges: claude:claude-opus-5-5@medium, claude:claude-sonnet-5-5@medium. Generated 2026-11-18T10:28:01.023Z.

Evidence gaps are unverified claims, not errors or fabrication. Fresh evidence coverage is reported per artifact; partial capture may still establish individual results. Inconclusive preferences are excluded from win/tie statistics, intervals and judge agreement.

Completed 2 of 2 expected case/pair/judge results (each requires both orders).

Each pair is judged in both orders; a win needs both orders to agree. An evidence-dependent abstention in either order makes the pair inconclusive; other disagreements are ties (a *flip* when the orders picked opposite systems). "all judges agree" includes only pairs completed by every configured judge, and counts a win only when every judge gave it. With few cases, treat p-values and intervals as a sense of scale, not proof.

## dev split (1 case)

prbench-compare-systems

### Head to head

| x vs y | judge | x wins | y wins | ties | flips | inconclusive | x win rate | sign test p | mean (x−y) [95% CI] |
|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline vs tracetoon-candidate | claude:claude-opus-5-5@medium | 0 | 1 | 0 | 0 | 0 | 0% | 1.00 | -1.00 [-1.00, -1.00] |
| tracetoon-baseline vs tracetoon-candidate | claude:claude-sonnet-5-5@medium | 0 | 1 | 0 | 0 | 0 | 0% | 1.00 | -1.00 [-1.00, -1.00] |
| tracetoon-baseline vs tracetoon-candidate | all judges agree | 0 | 1 | 0 | 0 | 0 | 0% | 1.00 | -1.00 [-1.00, -1.00] |

### Per system (means over every judgment of that system)

| system | judgments | factual errors | unsupported overclaims | evidence gaps | claims covered | context covered | uncertainties respected | traps hit | median words | total agent cost |
|---|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline | 4 | 0.00 | 0.00 | 0.75 | 69% | 0% | 92% | 0.00 | 151 | $0.48 |
| tracetoon-candidate | 4 | 0.00 | 0.00 | 0.00 | 81% | 19% | 67% | 0.00 | 289 | $0.34 |

### Fresh writer evidence coverage (artifact counts)

| system | artifacts | recorded | partial | unavailable |
|---|---|---|---|---|
| tracetoon-baseline | 1 | 0 | 1 | 0 |
| tracetoon-candidate | 1 | 0 | 1 | 0 |

### Rubric (mean of 0–2 scores; n/a items excluded)

| system | problem | rationale | validation | consequences | orientation | entry | economy | feedback | links | scope |
|---|---|---|---|---|---|---|---|---|---|---|
| tracetoon-baseline | 1.00 | 0.00 | 1.00 | 1.25 | 1.50 | 0.00 | 1.75 | – | – | 1.75 |
| tracetoon-candidate | 2.00 | 1.00 | 2.00 | 1.50 | 2.00 | 2.00 | 1.00 | 2.00 | – | 2.00 |

## Judge agreement

- claude:claude-opus-5-5@medium vs claude:claude-sonnet-5-5@medium: 100% of 1 pair verdicts agree; Cohen's kappa 1.00.

## Warnings

- prbench-compare-systems: tracetoon-baseline: fresh validation evidence partial
- prbench-compare-systems: tracetoon-candidate: fresh validation evidence partial

## claude-sonnet-5-5@medium, replicate 1: claude-native

# prbench report

Rubric v6. Judges: claude:claude-opus-5-5@medium, claude:claude-sonnet-5-5@medium. Generated 2026-11-18T10:28:01.028Z.

Evidence gaps are unverified claims, not errors or fabrication. Fresh evidence coverage is reported per artifact; partial capture may still establish individual results. Inconclusive preferences are excluded from win/tie statistics, intervals and judge agreement.

Completed 2 of 2 expected case/pair/judge results (each requires both orders).

Each pair is judged in both orders; a win needs both orders to agree. An evidence-dependent abstention in either order makes the pair inconclusive; other disagreements are ties (a *flip* when the orders picked opposite systems). "all judges agree" includes only pairs completed by every configured judge, and counts a win only when every judge gave it. With few cases, treat p-values and intervals as a sense of scale, not proof.

## dev split (1 case)

prbench-compare-systems

### Head to head

| x vs y | judge | x wins | y wins | ties | flips | inconclusive | x win rate | sign test p | mean (x−y) [95% CI] |
|---|---|---|---|---|---|---|---|---|---|
| claude-native vs tracetoon-candidate | claude:claude-opus-5-5@medium | 0 | 1 | 0 | 0 | 0 | 0% | 1.00 | -1.00 [-1.00, -1.00] |
| claude-native vs tracetoon-candidate | claude:claude-sonnet-5-5@medium | 0 | 1 | 0 | 0 | 0 | 0% | 1.00 | -1.00 [-1.00, -1.00] |
| claude-native vs tracetoon-candidate | all judges agree | 0 | 1 | 0 | 0 | 0 | 0% | 1.00 | -1.00 [-1.00, -1.00] |

### Per system (means over every judgment of that system)

| system | judgments | factual errors | unsupported overclaims | evidence gaps | claims covered | context covered | uncertainties respected | traps hit | median words | total agent cost |
|---|---|---|---|---|---|---|---|---|---|---|
| claude-native | 4 | 0.00 | 0.00 | 0.00 | 75% | 0% | 58% | 0.00 | 111 | $0.04 |
| tracetoon-candidate | 4 | 0.00 | 0.00 | 0.00 | 78% | 19% | 50% | 0.00 | 289 | $0.34 |

### Fresh writer evidence coverage (artifact counts)

| system | artifacts | recorded | partial | unavailable |
|---|---|---|---|---|
| claude-native | 1 | 0 | 1 | 0 |
| tracetoon-candidate | 1 | 0 | 1 | 0 |

### Rubric (mean of 0–2 scores; n/a items excluded)

| system | problem | rationale | validation | consequences | orientation | entry | economy | feedback | links | scope |
|---|---|---|---|---|---|---|---|---|---|---|
| claude-native | 1.00 | 0.00 | 1.00 | 1.25 | 1.50 | 0.00 | 2.00 | – | – | 1.50 |
| tracetoon-candidate | 2.00 | 1.00 | 2.00 | 1.25 | 1.75 | 2.00 | 1.25 | 2.00 | – | 2.00 |

## Judge agreement

- claude:claude-opus-5-5@medium vs claude:claude-sonnet-5-5@medium: 100% of 1 pair verdicts agree; Cohen's kappa 1.00.

## Warnings

- prbench-compare-systems: claude-native: fresh validation evidence partial
- prbench-compare-systems: tracetoon-candidate: fresh validation evidence partial

