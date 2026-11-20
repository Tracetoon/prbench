# Expert fact review

Every draft is scored against its case's fact sheet, so a wrong, unsupported or missing fact biases every comparison. `prbench fact-review` has a panel of models review each sheet against the raw evidence. It accepts a change only when the model families agree, and lists everything else for a person to decide. It can be rerun: each model call is cached by its inputs.

```sh
# Calibrate on 6 sheets with planted defects first (prints PASS/FAIL against the bar)
bun run prbench fact-review --cases cases-local --canaries 6 --out results/fact-review-expert/canary-1

# Review the dev sheets and write the results into the case directories
bun run prbench fact-review --cases cases-local --out results/fact-review-expert/dev-1 --apply

# Review sealed sheets: the terminal shows counts only
bun run prbench fact-review --cases sealed --out results/fact-review-expert/sealed-1 --aggregate-only

# Continue an interrupted run, reusing every finished call
bun run prbench fact-review --cases cases-local --out results/fact-review-expert/dev-1 --resume
```

| Option | Default | Meaning |
| --- | --- | --- |
| `--cases <dir>` | `cases-local` | cases directory |
| `--case <id>` | all | only this case (repeatable) |
| `--panel <spec>` | `opus:3,sol:3` | reviewers: `opus` (Claude `claude-opus-5-5`), `sol` (Codex `gpt-6.1-sol`), `claude/<model>` or `codex/<model>`, each with a count |
| `--effort <e>` | `xhigh` | reasoning effort for every reviewer and synthesis call |
| `--rounds <n>` | `2` | round 1 reviews, rounds 2..n vote |
| `--canaries <n>` | off | calibration mode on n cases (see below) |
| `--out <dir>` | `results/fact-review-expert/<timestamp>` | run folder; its name is the run id |
| `--packets <dir>` | `results/fact-packets` | prebuilt fact packets; missing ones are built into the run folder |
| `--resume` | off | reuse finished calls in `--out` (an existing run folder is refused without it) |
| `--parallel <n>` | `6` | concurrent model calls |
| `--aggregate-only` | off | print counts only: no case names and no fact text, errors go to `<out>/error.log` |
| `--apply` | off | write the revised sheet and its provenance into each case directory |
| `--cross-exam` | off | after round 1, every reviewer sees all arguments on each disputed item and makes a final choice (see below) |
| `--focus-run <dir>` | off | re-review only the items not on that earlier run's sheet for the case (rewritten or added since); the rest of the sheet is context |

## What a reviewer sees

Each call is a fresh agentic session with read-only tools, started in its own temporary copy of the case's evidence:

- the fact packet (`scripts/fact-packet.ts`): `diff.patch`, `diffstat.txt`, `commits/`, the session indexes, `repo.git` and `README.md`. A packet's `facts.draft.json` and any other `facts*` file are never copied;
- `raw/<session file>`: the raw transcripts that the index line numbers point into;
- `base/<path>` and `head/<path>`: every changed file before and after the change;
- `sheet.json`: the sheet under review (IDs and texts only), and `proposals.json` for synthesis and vote calls.

The prompt doesn't say who drafted the sheet, gives no hint that it is probably right, and doesn't show the drafter's citations or rationales. Canary sheets therefore look exactly like real ones. Reviewers cite evidence as `diff.patch:L120-L140`, `commits/<sha>.txt:L1-L12`, `head/<path>:L5-L9` or `raw/<session file>:L23-L40`.

The runners are prbench's judge providers (`src/judge/providers.ts`) in their isolated mode (`model@effort`), with a work directory:

- **Claude:** `--tools Read,Grep,Glob --allowedTools Read,Grep,Glob --disallowedTools Bash,Edit,Write,NotebookEdit,WebFetch,WebSearch,Task,Agent --permission-mode default`. These come on top of the judge isolation flags: no setting sources, an empty strict MCP config, no slash commands, no session persistence and hooks off. Each call also gets a temporary HOME and only the benchmark credentials.
- **Codex:** `exec --ephemeral -s read-only -C <work dir> -c approval_policy="never"` with the judge's flags (no user config, hooks, memories, multi-agent, apps, browser, computer use, plugins or web search). The shell tool stays on so the session can read and grep, and the read-only sandbox blocks writes and network access. It runs on the benchmark Codex login (`prbench auth codex`).

Replies are checked against a JSON schema passed to the CLI (`--json-schema` or `--output-schema`) and then for consistency. Every item must be reviewed exactly once, a `revise` needs a rewrite, and a trap needs `trapIsReal`. An invalid reply gets a correction request, and a failed call is retried, for up to 3 attempts.

## How decisions are made

1. **Round 1.** Each reviewer gives every item (claims, context, uncertainties, traps) a verdict: `keep`, `revise` (with a rewrite) or `remove` (unsupported, contradicted, trivial or duplicate). Each verdict comes with a reason and evidence references, plus `trapIsReal` for traps. Reviewers can also propose missing facts.
2. **Family consensus.** A family's verdict is the majority of its reviewers. An item is settled when every family's verdict matches. A family without a majority (a 1–1–1 split) or families that disagree make the item *disputed*. Three runs of one model share its blind spots, so replicates never outvote the other family.
3. **Rewrites.** When the families agree on `revise`, one synthesis call (the panel's Claude model at the same effort) merges the proposed rewrites into one candidate. In round 2 the full panel votes `accept` or `reject` on it under the same family rule. If it isn't accepted and rounds remain, the synthesis call refines the candidate using the objections, and the panel votes again.
4. **Additions.** One synthesis call clusters all proposed additions. Clusters proposed by at least two reviewers go to the round-2 vote. Single proposals are dropped and listed in `decisions.json`. An addition the panel rejects by consensus is dropped.
5. Whatever is still undecided after `--rounds` goes to `human-review.md`.

The revised sheet keeps kept and disputed items as they were. It applies accepted rewrites, drops removals, and appends accepted additions.

## Output

```
<out>/run.json                 panel, effort, rounds, prompt version
<out>/summary.json             counts, per case
<out>/calls/<key>.json         every validated model reply (the resume cache)
<out>/canary-report.json       canary mode only
<out>/<case>/sheet.json        the sheet reviewed
<out>/<case>/packet/           the fact packet, when none was prebuilt
<out>/<case>/round-1/<reviewer>.json, summary.json
<out>/<case>/round-2/synthesis-revisions.json, synthesis-additions.json, <reviewer>.json, summary.json
<out>/<case>/facts.json        the revised sheet
<out>/<case>/decisions.json    every item and addition: outcome, why, and each reviewer's verdict, reason and evidence
<out>/<case>/human-review.md   disputed items only, with every reviewer's position and evidence
<out>/<case>/canary.json       canary mode only: the planted defects (ground truth)
```

Each call's resume key hashes the evidence (every evidence file except `repo.git`), the sheet, the prompt (which already contains the round's proposals), provider, model, effort, round and replicate. Changing any of these makes a new call.

## Applying a review

`--apply` writes the revised sheet into the case (its `facts.json`) and rebuilds `facts-provenance.json` from it:

- Kept items keep their sources.
- A rewrite keeps its sources and adds those the panel cited.
- An addition carries the references the panel cited, resolved to provenance sources (`diff`, `commit`, `git` at base or head, `session`) with checked line ranges. An accepted addition with no resolvable reference is marked `unsourced` and goes to human review instead of the sheet.

Every cited range is rehashed the way preflight reads it. The provenance gets `reviewKind: "expert-panel"` and an `expertReview` record with:

- the run id;
- reviewers (model, family, effort, count);
- the number of rounds;
- the revised facts hash;
- disputed, revised, removed and added counts (disputed includes disputed and unsourced additions).

`scripts/provenance.ts --rehash` keeps that record. The run folder's `facts.json` is always exactly what `--apply` would write. Cases without provenance only get their `facts.json` rewritten.

Sheets come from the case's `facts` file. A case without one is reviewed from `<packets>/<id>/facts.draft.json` when that exists. Its provenance is then built from the draft's sources on `--apply`.

## Cross-examination

With `--cross-exam`, items still disputed after round 1 get one more pass:

1. When anyone proposed a rewrite, the synthesizer merges the proposals into one candidate.
2. Each reviewer sees, for each disputed item, the current text, the candidate, and every round-1 argument grouped by position with its evidence references. The arguments carry no reviewer names, no families and no counts.
3. Each reviewer chooses keep, revise (to the candidate) or remove.

The prompt tells reviewers that arguments are claims, not evidence: they must check the cited evidence themselves and must not defer to a side. The same family rule then applies. A settled choice is final; anything still split goes to human review with the cross-examination votes listed.

`decisions.json` records each reviewer's round-1 verdict next to its final choice, and the summary counts changed positions per family, so herding shows up. Round-2 ballots are built from round-1 consensus only, so adding cross-examination to a finished run with `--resume` reuses every earlier call.

## Focused re-review

`--focus-run <earlier run>` re-checks a sheet after `--apply`. Only the items whose text is not on the earlier run's `sheet.json` for that case go to the panel, and the rest is shown as context. No additions are proposed. Unchanged items are recorded as `reviewed: false` and are left out of the counts. Rewrites, votes and cross-examination work as in a full review.

## Canary calibration

`--canaries <n>` picks n cases, spread round-robin across session agents and preferring a new repository family each time (the case ID's first segment). It plants four defects in each sheet, deterministically:

- **missing:** removes the most-cited claim (ties go to the longest);
- **contradicted:** alters a number, direction word or identifier in another claim, or negates it as a last resort;
- **unsupported:** appends the first claim of the next case in ID order;
- **trap-true:** replaces the first trap with a true claim from the same sheet.

Then it runs the normal review. The ground truth is saved in `canary.json`, and the case directories are never touched (`--apply` is refused).

Scoring:

- **Catch rate:** an item defect is caught when its round-1 consensus is `revise` or `remove`. A missing fact is caught when an addition restating it (at least half its distinctive words) is accepted by consensus, or, with `--rounds 1`, when both families' majorities proposed one.
- **False-alarm rate:** unmutated items with a consensus `revise` or `remove`. Disputed items count as neither caught nor false alarms.
- **Per-family recall:** defects each family's majority flagged, over all planted defects.

**Pass bar:** at least 80% caught and at most 10% false alarms. The command prints PASS or FAIL and exits 1 on FAIL. Don't review real sheets until it passes.

## Sealed cases

With `--aggregate-only` the terminal shows only counts: cases, items, settled, kept, revised, removed and disputed items, additions, calls, cost and canary metrics. It never shows case names, fact text or the run folder path. The run folder still holds every decision and `human-review.md` for the person resolving disputes. The panel models do see sealed content, but they tune nothing, so the set stays sealed for the tuner.

## Debate and judges (`prbench fact-debate`)

Entries without family consensus are settled by debate plus two independent judges:

```sh
bun run prbench fact-debate --cases <dir> --from <run> [--from <run>...] --out <dir> [--apply] [--aggregate-only]
bun run prbench fact-debate --cases <dir> --control spec.json --out <dir>     # score the judges first
```

**What is settled:** every disputed item and disputed or unsourced addition in the `--from` runs, matched by text to the case's current sheet. That covers round-1 disputes and consensus revisions whose rewrite failed the round-2 vote.

**Per case, over all entries at once:**
1. **Debate A:** Opus makes the case, then Sol must rebut it, even if it agrees.
2. **Debate B:** Sol makes the case, then Opus rebuts.
3. **Judges:** each judge independently reads the same read-only evidence and both debates, and rules on every entry: keep, revise (with the final text) or remove. The defaults are Fable 5.1 and GPT-6 Astra, both at xhigh (`--judge`, repeatable; `--judge-effort`). Neither judge sees the other's ruling.

**Combining the rulings:**
- **All judges keep, or all remove:** applied.
- **All judges revise:** the second judge checks the first judge's text (accept or reject against the evidence). If it rejects it, the first judge checks the second's text. The first text accepted is applied; if neither is accepted, the entry goes to a human.
- **Any other split:** a human, with every ruling and both debates in `human-review.md`.

**Blinding and bias:**
- Debaters see the roles advocate and respondent.
- Judges see "Debater 1" and "Debater 2". The label for each model is fixed per case by a hash of the case ID and recorded in `debates.json`.
- For each debater, the summary reports its opening stance and its final stance (its rebuttal position, after reading the other's case).
- For each judge, on contested entries (where the debaters' final stances differ), it reports how often the judge sided with Opus or with Sol, and with Debater 1 or Debater 2.

**Why two judges instead of consensus:** in cross-examination, and in an earlier amend-and-pick debate, the Claude reviewers moved toward a well-argued position far more readily than Sol did. Any rule that needs the two debating families to agree therefore drifted toward the more stubborn side. A single Claude judge (Fable) removed that, but left the question of a Claude model judging debates that include a Claude model. A second frontier judge from the other family (Astra) answers that, and the judges never debate each other.

**Control (`--control`, built by `scripts/fact-control.ts`):**
- items the whole panel kept unanimously in round 1 (expected: keep);
- the planted canaries on their canary sheets (expected: revise or remove; a removed claim offered as an addition is expected to be added).

It reports combined and per-judge results (correct, wrong, sent to a human) and is never applied.

**Deciding splits:**
- `--decider <model>` makes one judge's ruling settle every entry the judges disagree on, instead of sending it to a human.
- `prbench fact-decide --run <dir> --decider <model> [--apply] [--aggregate-only]` does the same afterwards for a finished run, with no model calls.
- For the 3.0.0 release the decider is Fable 5.1. On the remaining splits, neither keep nor revise was wrong. Fable reasoned through that uncertainty better on human review, and it is the stronger model.

**Model checks:**
- A Claude reply is refused if Claude Code reports a different model than requested; it quietly substitutes its default model for an unknown or org-restricted model.
- Codex fails on an unknown model by itself (`model_not_found`).

**Cost:** the reported cost covers Claude calls only. Codex runs on the subscription.

**`--apply`:** writes applied rulings with provenance from the judges' cited evidence. An accepted addition with no resolvable reference goes to `human-review.md`.

## Accuracy adjudication (`prbench accuracy-review`)

The adoption gate counts a pairwise judge's accuracy flag only after a reviewer confirms it with hash-checked source proof.

```sh
bun run prbench accuracy-review --run <comparison run> --cases <dir> --out <dir> --write
bun run prbench compare ... --out <comparison run> --resume --report-only   # rebuild the gate
```

**Per case:**
- Two independent judges read the case's evidence and every flagged statement in that case's drafts. The defaults are Fable 5.1 and GPT-6 Astra at xhigh, with `--decider` defaulting to the first.
- Each draft appears as `drafts/dN.md`, with its captured commands in `drafts/dN.validation.json`. Nothing says which system wrote it.
- For each flag, the judges rule confirmed or false-positive and give a reason and evidence references.
- If the judges agree, that ruling stands; a split is decided by the decider.

**Evidence references:** they are resolved to adjudication sources that the comparison re-verifies when it rebuilds the gate: the diff, a commit, a file at base or head, a session transcript, or the draft's own captured command. A ruling with no verifiable reference is left out, so its flag stays unresolved.

**Output:** `--write` puts `adjudications.json` into the run.

**What it doesn't change:** the tool imports nothing into the writer, judge or gate contracts, so adding it doesn't change a frozen harness's identity.
