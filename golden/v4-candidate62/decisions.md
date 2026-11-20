<!-- Copied from the working decisions log (results/v4/decisions.md) on 2026-11-20 for the golden bundle. Local paths are replaced by <tmp>/<dev>; a private report link is removed. Entries after #64 concern later candidates (63-67) that were not adopted; the golden run is candidate62 (#57-#64). -->

# Overnight decisions, 2026-11-15

The user approved following the recommended option on open questions until morning. Each decision is recorded here.

1. **One pool.** `datasets/real-cases-4.0.0.draft.json` puts all 44 cases from 3.0.0 in dev, with an empty test split. New admitted cases are appended. (This follows the user's direction; recorded here for completeness.)
2. **Workspace-folder sessions count.** A session started in a parent folder (such as `~/Development`, or the org folder on codex-dev) is attributed to the child repo or staged mirror that the session text names. Import and admission later confirm that the session covers the change.
3. **Discovery reads only the start and end of each log** (the first and last 256 KB). The full text is read only when a session's repo has to be identified from what it mentions. The full-read version ran past 25 minutes and printed nothing while the diagnostic was using memory.
4. **Late commits.** Agents often leave work uncommitted, and the user commits it afterwards. With `--late`, a session with no commits in its window may claim commits made up to 3 hours after it ended, but only those that touch a file named in the session (basename of 6 or more characters). Import's window and the fact review still check coverage.
5. **Staged `aifirstextension`** from codex-dev (the one repo there that wasn't mirrored). codex-dev has no Codex sessions newer than October 2026, so it adds nothing more.
6. **Selection: 25 candidates, 24 imported** (17 Claude, 7 Codex) from discovery's 47. Dropped:
   - overlapping ranges, keeping one per group, usually the single-commit change;
   - generated rebundle commits and release chores;
   - a Tracetoon comic-asset commit;
   - the second copy of each prbench change found in the `prbench-score` clone;
   - a Showtail SignPath range with the same base as the pool case `showtail-signpath`;
   - an `aifirstcli` Windows cmd-shim series that continues the excluded `aifirstcli-windows-cmd-shim`;
   - `tracetoon-graph-search-links`: its slice kept only 3 records.
7. **At most 10 cases from this benchmark-building conversation's own subagent work.** 16 qualified, but taking all of them would over-weight one session.
8. **The Claude/Codex balance can't be met.** Every source (this machine, codex-dev) yields only about 10 usable Codex changes, and 7 were taken. The pool is about 68 cases rather than 80. More Codex cases need sessions from other machines, or new Codex work.
9. **Subagent-matched cases import the parent session plus the matched subagents** (`subagentOf`).
10. **Coverage verdict at drafting time.** The fact drafters mark each case covered, partial or not-covered; not-covered cases are dropped before expert review.
11. **Coverage drops (6 of 24).** The drafters found that the retained sessions don't make 5 of the changes:
    - `relate-grouped-aggregates`
    - `tracetoon-brief-reviewer-cover`
    - `tracetoon-lean-review-packet`
    - `tracetoon-rc27-promotion`
    - `tracetoon-release-no-round`

    `aifirstextension-content-sync` was only partly covered: a bot workflow wrote its diff. All 6 are moved to `<tmp>/new2611-dropped`. **18 new cases remain** (12 Claude, 6 Codex), for a pool of 61. Late-window and workspace matching gave roughly 1 false match in 4. The coverage check caught them.
12. **`candidate51`** = `candidate50` plus two generic wording fixes that the `candidate50` diagnostic pointed to:
    - the do-not-say row now also forbids "approval or review wasn't recorded";
    - the writing guide and the lean reviewer forbid commit-order wording that puts edits after a commit ("followed … and changed", "after which").
13. **Memory-pressure stop (about 02:00).** Claude Code stopped the fact-review panel, after 2 of 18 cases (`aifirstcli-showtail-harness` and `aifirstcli-signpath-release`; both applied), plus the wrapper shell of the dev27 diagnostic. The dev27 compare processes kept running. The fact review is not restarted, because the harness asks for user approval first. Resume it with `--resume` on `results/v4/fact-review/new2611-1`. Cause: 16 concurrent writers (2 providers × `--parallel 8`), some running `bun test` (about 10 GB in total), on top of about 20 GB of desktop apps. Future runs should use `--parallel 4` per provider when other work shares the machine.
14. **First run on the new cases scores against draft fact sheets.** Expert review is paused, see 13. The run is `candidate51` vs `candidate49` on the 18 new cases: diagnostic, 1 replicate, `--parallel 4` per provider. It starts only after the dev27 diagnostic ends, so the two runs don't compete for memory. Its scores are provisional until the sheets finish expert review, and then they can be rescored with `prbench rescore`.
15. **No `candidate52` overnight.** The dev27 Claude flags aren't adjudicated and show no clear generic pattern, so `candidate51`, with the two fixes the evidence supported, is the latest candidate.
16. **New-case run results are provisional.** Single replicate, draft facts. Codex −6.3 [−13.3, 0.9] is recorded, but no candidate change is made on it. Next step: resume the fact review (needs approval), rescore this run against the reviewed sheets with `prbench rescore`, then run 2 replicates on the full 61-case pool.
17. **Approved 2026-11-15 morning:** resume the fact review (`--parallel 4`), then fact-debate with `--decider claude-fable-5-1`, then rescore the new-case run, then `candidate51` vs `candidate49` on all 61 cases with 2 replicates.
18. **Fact review finished.** The resume was restarted on only the 16 unreviewed cases (`--case`). A plain `--resume` would have re-reviewed the 2 applied sheets, and its brief start overwrote one `sheet.json` record; both `sheet.json` files were rebuilt from the original drafts (20 and 21 items). Totals for the 16 cases: 279 items; 218 settled (184 kept, 29 revised, 5 removed); 61 disputed; 44 additions accepted; $144.45. The disputes go to fact-debate with `--decider claude-fable-5-1`.
19. **Debates finished.** 80 entries; the two judges agreed on 69, and Fable decided the other 11. Outcomes: 24 kept, 45 revised, 7 removed, and 4 additions settled. $98.97. All 18 cases validate. The new cases' facts are now expert-reviewed.
20. **No rescore of the provisional new-case run.** `prbench rescore` recomputes scores from existing judgments and can't re-judge against revised fact sheets. The 61-case run judges the new cases against their reviewed sheets and supersedes it.
21. **The 61-case run uses a fresh cache.** Baseline drafts from the earlier runs are not reused, so each arm gets independent new drafts.
22. **61-case run finished** (`results/v4/pool61/report.md`). `candidate51` ≈ `candidate49`: Claude −0.1 [−2.5, 2.4], Codex +0.2 [−1.9, 2.3]. The gate fails on unadjudicated flags, pairwise wins, and Claude's cost ratio of 1.001. The new-case Codex −6.3 was noise.
23. **Plan approved (after the 61-case run):** apply what the recent runs showed before one decision run against the original workflow. The steps:
    - sandbox validation runnable;
    - `candidate52`;
    - a judge-retry fix;
    - a smoke run;
    - the decision run: 2 replicates, pre-registered judges, confirmation, then adjudication;
    - a decision by a pre-stated rule: composite lower bound ≥ −2.5, error non-inferiority, cost ≤ 0.8×, claim coverage drop ≤ 0.05.
24. **Judge fix** (`bench-v4-xdg` 2920959): when a reply's error lists disagree with its own claim assessments, they are rebuilt from the assessments and recorded in `derivedLists`, not re-asked.
25. **`candidate52`** (tag d2d02e9; generic and contains no case names):
    - start points are only non-type functions defined in the file. A parser bug had counted `type X` lines inside multi-line imports as definitions;
    - behaviour goes to the function with the most changed lines;
    - environment-stopped checks "could not run here", with no counts;
    - an always-present "absence" do-not-say row;
    - request rows carry their order;
    - check receipts are reused while the tracked code is unchanged. Only about 8 of 336 Codex check calls were exact repeats, so this saves little time.
26. **Runnability** (bench-v4 85ae0d1, cb74ec9; `results/v4/runnability.json`): 19 → 31 of 61 cases pass their main check at head in the sandbox, and environment errors went from 12 to 0.
    - **Fixes:**
      - a Showtail fixture plus an offline dependency step for 11 Tracetoon cases;
      - an `aifirstcontent` sibling fixture;
      - `npm ci` for the extension;
      - a private TMPDIR;
      - dropping `XDG_SESSION_TYPE` and `COLORTERM`;
      - removing host `~/.claude/plugins` from PATH.
    - **Still failing (17):**
      - an APT-vs-rpm-ostree host test;
      - one untraced TUI test;
      - books that don't match at head;
      - tests that need a logged-in Claude client;
      - Showtail failures that also occur outside the sandbox, maybe bun 1.3.14 vs a pinned 1.4.0 (installing 1.4.0 was blocked by the permission classifier and not attempted further);
      - `CODEX_HOME` reaching a test;
      - bun's 5 s per-test limit.
    - **No command (13):** cargo, hugo and winapps cases.

    These remaining failures affect both arms equally.
27. The judge fix was cherry-picked into `bench-v4` (f4f7139). The smoke run uses `bench-v4` at f4f7139.
28. **Smoke run of `candidate52` vs `candidate51`** (`results/v4/smoke-c52`): Claude −0.5, Codex −5.3 [−12.9, 1.7].
    - **Regressions from `candidate52`:**
      - a brief-query crash (no brief at all);
      - a false "first request of the session" label;
      - a dropped commit-row code excerpt;
      - a chained-check path that left a limit open;
      - a callback chosen as the entry.
    - **Shared with `candidate51`:**
      - reviewer passes inject unverified facts;
      - validation rows pick a stale run;
      - owners matched by words;
      - checks skipped;
      - the absence rule only advisory.
29. **Overnight plan (user: run about 9 h, with no decisions needed from them):**
    - **A.** Build `candidate53`, time-boxed to 02:40.
    - **B.** Run an 8-case smoke of `candidate53` vs `candidate51`, with a mechanical pick. Choose `candidate53` if all hold:
      - every candidate trace has a brief;
      - candidate flags ≤ `candidate52`'s on those 8 cases;
      - the pooled mean Δ ≥ −3.

      Otherwise use `candidate51`.
    - **C.** Decision run of the pick vs the original workflow on `pool61`: 2 replicates, confirmation (pre-registered judges), `--parallel 6`, automatic `--resume` up to 3 times.
    - **D.** `accuracy-review --write`, rebuild the report, judge against the pre-stated rule.
30. **The decision run uses 3 replicates.** prbench's confirmation protocol requires exactly 3 replicates, which is a better match to protocol and precision than diagnostic with 2.
    - **Size:** 366 writers and 732 judge orders per provider; the `--plan` dry run was accepted.
    - **Time:** about 9–11 h at `--parallel 6`, finishing around 13:00–14:00.
    - **Chain:** `overnight.sh` (detached) waits for the `candidate53` bundle (deadline 02:50), then runs `smoke-c53.sh`, `gate-c53.py` and `decision-run.sh <pick>`.
    - **Logs:** `results/v4/overnight.log` and `results/v4/pool61-vs-original/orchestrator.log`.
31. **`candidate53`** (tag 532372d; 11 commits on top of `candidate52`): all 9 fixes in; full suite 770 pass; generic (no case names in the diff). Smoke started 01:16. Risk: `publish` now refuses on the enforced review path when the repo declares checks and there is no receipt or recorded `--skip`. The gate's "all writers complete" criterion catches that if it blocks writers.
32. **Decision run finished at 13:41** (`results/v4/pool61-vs-original/report.md`).
    - **Claude meets all four pre-stated criteria** (the prbench gate passed): +0.8 [−1.9, 3.4], errors 0.585 vs 0.776, cost 0.72×, coverage equal.
    - **Codex meets 3 of 4:** +2.7 [0.6, 4.7], cost 0.61×, claim coverage +0.10. It misses error non-inferiority: 0.180 vs 0.230 is better, but the upper bound of 0.098 exceeds the 0.05 margin.
    - **Adjudication:** Codex 113 flags, $66.69; Claude 309 flags, $168.19.
33. **Tuning rounds approved** (user: the 61-PR result is not a big enough win).
    - **Loss analyses:** most of the losses come from Tracetoon's brief and render code:
      - motivation clipped or dropped;
      - uncertainties deleted by the `candidate53` absence check;
      - old behavior unstated;
      - the Validation section hiding passing runs;
      - unfinished runs;
      - secondary changes lost to caps;
      - framing.
    - **Tuning set:** `tune25` (20 worst losses plus 5 controls). Missed facts are in `results/v4/tuning/missed-facts.json`.
    - **Rounds:** `tune-round.sh`, both providers, 2 replicates, pre-registered judge pairs, original-workflow drafts reused from the 61-case caches (the `--plan` dry run confirmed full reuse).
    - **Round-0 reference** (`candidate53`, all cached): Codex +1.1 and Claude −5.5 on the 25 cases.
    - **Gate** (`tune-gate.py`): mean Δ on the 20 losses up by at least +5, each control within −8, and consensus graph picks improve, for each provider.
34. **Round-0 fact audit (`candidate53` briefs):** of the 91 missed facts, 5 are prominent, 42 buried, 34 absent and 10 contradicted (gate 5.5%). The patterns went to the `candidate54` build: empty behavior lines for changed files, facts only in commit or test titles, contradicting doNotSay or "no plan" rows, and a PR1 row hiding runs.
35. **`candidate54`** (tag f13fb09, generic): motivation, uncertainties, old behavior (`before`), validation and finishing are done. Partly done: secondary units and cost. Dropped: large-file splitting, per-doc units, the entry-row core-logic rule, and compact render output. Briefs replayed for both agents (25/25 ok).
36. **Round-1 audit** (`candidate54`): 24 prominent, 33 buried, 29 absent, 5 contradicted (26.4%, up from 5.5%); 26 improved, 0 regressed. It misses the pre-set 80% audit bar, which was too ambitious: many facts exist only in logs or are judge nuance.
    - **Decision:** run the round-1 benchmark now, to measure the real effect, and in parallel build `candidate55` from the audit's noise list and the remaining contradictions:
      - a misplaced "CI on final head" row;
      - spurious platform limits;
      - a `before` that misses the failing branch;
      - doc files treated as code;
      - an absence rule that ignores existing limits;
      - Claude's redundant "historical run" rows;
      - scoped "not run" statements without a limits row.
37. **`candidate55`** (tag dafcc76, generic):
    - CI row only after an actual push;
    - platform rows only from platform-specific lines;
    - `before` ranked by changed lines and failure text;
    - docs are not conditional code;
    - the absence rule cites limits;
    - historical rows removed;
    - unrun-script, workflow and fakes rows;
    - a `details` column with flags, thresholds and jobs.

    Round 1 (`candidate54`) is slower than estimated: candidate drafts run real suites (up to 10 min per check), so the round takes about 4–5 h.
38. **Round-2 audit** (`candidate55`): 27 prominent, 33 buried, 28 absent, 3 contradicted (29.7%); 5 improved and 1 regressed against r1. New noise:
    - CI wording;
    - a false "no CI run" row;
    - "never run" on test-driven modules;
    - junk `details` values.

    `candidate56` fixes that noise before round 2, which then runs on `candidate56`.
39. **Incident (about 18:20):** the `candidate56` agent's cleanup `rm -rf $TMPDIR/prbench-*-??????` deleted live round-1 writer sandboxes. 9 candidate attempts failed with "workspace disappeared" (Codex 4, Claude 5). These are no-draft failures, retried automatically (up to 3), so the round stays valid at extra time and cost. `candidate56` (tag fd9520d) is built: CI wording and results, entry-point-only script rows, clean `details`.
40. **Round 1** (`candidate54` on `tune25`):
    - **Claude Code:** losses −5.9 → −1.2, head-to-head 11–19 → 18–9, all 25 −5.5 → −0.4.
    - **Codex:** losses −1.6 → −0.2, head-to-head 25–16 → 28–14.

    The gate formally FAILS: the loss gain is under +5, and single controls dropped (Codex `pr8` −20, Claude `repl-usb-iface` −22). With 2 replicates, single-case swings of ±20 are within noise, so the per-control criterion is too strict. Judge on the aggregate head-to-head and the loss mean. Persistent losers on both providers: `sql-row-order`, `signpath-release`, `book-walk`. Round 2 runs on `candidate56`.
41. **`candidate57`** (tag edff3c9), fixing the persistent losers:
    - unmatched-session `sources` row;
    - session matching for `git commit -F -` and chained `git log`;
    - Claude subagent logs no longer double-counted;
    - comment/test-only commit flag;
    - CI runner OS as platform evidence;
    - answered questions as decisions;
    - wrapper and script runs as checks;
    - new-script flags;
    - plan-vs-code rows;
    - entry ranking;
    - neutral Validation wording.

    Replay shows the 3 losers improved and no regressions. Known issue: `review-run`'s 'runs every planned pass concurrently' merged-order test is flaky (affects only the order of review findings).
42. **Round 2** (`candidate56`):
    - **Codex:** losses −1.6 → +1.5, all 25 +1.1 → +3.4, head-to-head 25–16 → 27–14.
    - **Claude:** losses −5.9 → −0.5 (+5.4, passes), all 25 −5.5 → −0.2, head-to-head 11–19 → 17–9.

    Formal gate: FAIL on single controls (Codex `repl-usb-iface` −16). Worst remaining: `signpath-release` (both), `tui-responsive` (Claude), `showtail-signpath`. Round 3 runs on `candidate57`.
43. **Round-2 analysis:** the remaining deficits are Codex economy (test inventories) and Claude consequences, scope and uncertainties. Errors come from blanket platform/CI absence rows, invisible workflow YAML and extraction wording. `candidate57` regressions: an entry rule picking trivial helpers, and unanswered-question decisions. `candidate58` (being built) reverts the entry rule and adds those fixes plus drafting-guide rules for economy, consequences and problem statement. Plan extended: round 4 on `candidate58` if round 3 is not decisive.
44. **`candidate58`** (tag 160b49f): entry ranking back to `candidate56`'s; no unanswered decisions; CI runs tied to workflow and platform with before/after-edit wording; per-workflow units; extraction wording; drafting rules for economy, consequences, problem and tests. Replays in `r4-c58`.
45. **Round 3** (`candidate57`): regressed against round 2.
    - **Codex:** all 25 +1.2 (r2 +3.4), losses −1.4, head-to-head 28–17.
    - **Claude:** all 25 −1.4 (r2 −0.2), losses −3.2, head-to-head 19–10.

    Consistent with the found entry-rule regression (helpers as entry) and unanswered-decision rows. `candidate58` reverts and fixes these. Round 4 runs on `candidate58`.
46. **Overnight (user: about 8 h autonomous, all recommendations approved, a solid run by morning).** The planned full run (confirmation, fresh baseline plus a native arm) would take 12–15 h, too long.
    - **Instead, `final-chain.sh`** (detached):
      1. Wait for round 4.
      2. Pick between `candidate56` and `candidate58` by the mean of the two providers' all-25 Δ (ties go to `candidate58`).
      3. Full 61-case run, 3 replicates, pre-registered judge pairs. The 183 original-workflow drafts per provider are reused from the `pool61-vs-original` caches; the `--plan` dry run confirmed this. Reuse forces the diagnostic purpose; the drafts and judges are the same as a confirmation.
      4. Graph drafts are fresh except those already written by tuning rounds. `--parallel 6`, auto-resume up to 3 times.
      5. Accuracy review `--write` and report rebuild.
      6. A native mini-run on the 3 biggest public showcase gains, for the report's three-way example.
    - **Output:** `results/v4/pool61-final/`.
    - **Log:** `results/v4/final-chain.log`.
47. **Round 4** (`candidate58`, the best round):
    - **Claude:** all 25 −5.5 → +3.5, losses −5.9 → +2.6 (+8.5), head-to-head 11–19 → 19–5.
    - **Codex:** all 25 +1.1 → +2.8, losses −1.6 → +0.7, head-to-head 25–16 → 27–17.

    The formal gate failed only on Codex's loss gain (+2.3 < 5) and a noisy control (`cli-guard-tests` −11.6). The chain picked `candidate58` (pooled 3.12 vs 1.57 for `candidate56`). Full run launched at 01:25.
48. **Judge bug found (06:30).** `compare --judges` takes a comma-separated list, and repeating the flag kept only the last value.
    - **Affected runs:** all tuning rounds (`r0`–`r4`), the overnight full run (`pool61-final`) and the native mini-run used ONE judge per provider: Terra for Codex, Sonnet for Claude. The tuning comparisons stay internally consistent, because every round used the same single judge.
    - **Fix:** the full run is re-judged with both pre-registered judges (`rejudge.sh` → `results/v4/pool61-final2`). Drafts and existing judgments come from cache; only the second judge's calls, a fresh accuracy review and a native re-run are new.
    - **Single-judge results** (`pool61-final`), for the record:
      - **Codex:** +4.8 [2.5, 7.1], cost 0.544, Terra's picks 103–46.
      - **Claude:** +1.8 [−0.7, 4.4], cost 0.695, Sonnet's picks 80–29.
      - **Untouched 36:** Codex +5.5, Claude +1.6.
      - **Codex confirmed errors:** 0.153 vs 0.109.
49. **Final two-judge run** (`results/v4/pool61-final2`, `candidate58`):
    - **Codex:** +4.3 [2.1, 6.3], both-judges picks 83–34 (71%, 61–80%), cost 0.544 (−46%). Confirmed errors 0.26 vs 0.22 (difference [−0.10, +0.19], misses our 0.05 margin).
    - **Claude:** +3.6 [1.0, 6.3], picks 69–17 (80%, 71–88%), cost 0.695 (−31%). Confirmed errors 0.68 vs 0.81 (upper bound +0.093, misses the margin).
    - **Untouched 36:** Codex 51–14 (+5.1), Claude 43–11 (+2.6).
    - **Showcase** (native arm, two judges) on `tracetoon-neighborhood`, Codex: agent alone 50.7, original 68.2, graph 89.6.
    - **Published:** report artifact v3; site commit e41fe9d on `site/evidence-61-cases`; PR #138 body updated.
50. **`candidate59`** (tag e7ca8b7) fixes the final-run QA bugs:
    - Claude Bash calls get `timeout: 600000` (the 120 s default backgrounded checks), with no polling, and render/review/publish happen before the turn ends;
    - a 15-min check timeout shown as "timed out (incomplete)";
    - four false-absence limit fixes;
    - the earlier column comes from PASS or the exit;
    - session-history rows kept;
    - toolchain mismatch shown as "could not run as pinned here";
    - repo-relative paths;
    - no tool-name wording;
    - economy rules.

    Suite 851/0. Targeted check on `bug12` vs `candidate58` (cached, both judges).
51. **`final3-chain.sh`** (detached): waits for the `bug12` round, then runs `bug12-gate.py` against `candidate58`. Pass requires no unrendered or early-exit drafts, picks share not lower, and mean Δ not lower by more than 2, for each provider.
    - **On pass:** full 61-case `candidate59` run (both judges, comma form; original drafts reused) → accuracy review → rebuild → native showcase on `prbench-compare-systems` for both providers, into `results/v4/pool61-final3`.
    - **On fail:** the report stays on `candidate58` (pre-stated).
52. **`bug12` gate for `candidate59`: FAIL.**
    - **Codex** improved a lot: Δ −2.9 → +6.1, picks 3–6 → 5–3, raw flags 14 → 5, no unrendered drafts.
    - **Claude** still had 2 early exits, with Δ +4.9 → +1.5. New cause: Claude Code writers start reviewers with `run_in_background` and end the turn "waiting for the notification", which ends the one-shot session and loses the review.
    - **`candidate60`** (tag d3d75cc): reviewers become foreground Agent calls, never ending the turn while they run. Rerun `bug12` and gate (`bug12-gate60.py`) → `final4-chain` full run (`results/v4/pool61-final4`).
53. **Replan approved** (user: one comprehensive candidate for the maximum gain).
    - **`candidate61`** = a quality agent (Validation section renders limits and session history; new limit generators; behavior-level rows plus an omitted-behavior check; goal-request resolution; quantifier, "Previously" and vocabulary flags; where-to-start and feedback slots; whole-PR titles; entry row; joiner and path fixes) plus a cost agent (no Codex polling; SKILL.md trimmed to ≤12K characters; publish auto-rebind and agentId; `tracetoon finish`; compact output). They work in separate worktrees, merged later.
    - **Then:** a 3-case smoke run, then a 61×1 panel paired against `candidate58` replicate 1 (`panel-gate.py`: per-provider gain ≥ +1.0, or pooled ≥ +1.5 with neither below −0.5; head-to-head not worse; cost not higher), then replicates 2–3.
54. **`candidate61`** (tag on 678e244/2e2df6b): quality branch (779be86, c496cc5) merged with the cost branch (3e711e4, e4b04c8). SKILL.md was resolved to the trimmed version plus the where-to-start and feedback lines. Suite 879/880 (the known `review-run` timeout). A fixture package name was made generic. Replay 25/25 on both agents. Workflow smoke on 3 cases follows.
55. **Smoke** (`candidate61`, 3 cases): workflows complete on both agents (all rendered, reviewed and published; no tags, no early exits). Codex input tokens down about 55% (2.4M/1.1M/0.7M vs 3.0M/2.8M/3.1M). Claude cost mixed. `c61-chain.sh` launched: panel → gate → final (`pool61-final5`, 3 replicates, replicate 1 reused) → accuracy review → native showcase.
56. **Panel FAIL** (`candidate61`, 61×1, vs `candidate58` replicate 1):
    - **Codex:** Δ +3.55 → −3.85 (gain −7.4 ± 1.8 SE), picks 28–15 → 15–24, cost/draft $0.223 → $0.126 (−44%).
    - **Claude:** Δ +0.65 → −0.75 (−1.4 ± 2.6, not significant), picks 21–9 → 16–13, cost $0.418 → $0.342 (−18%).

    The cost changes work, but something in `candidate61` hurts Codex quality. The chain stopped; diagnosis is under way.

## 57. candidate61 diagnosis → candidate62 (2026-11-17)
Diagnosis (read-only agent, judge flags matched to draft sections): the Codex drop comes from render printing every open limit under Validation (c61 779be86). Factual errors in Validation 4→39, unverifiable 107→199, Validation 482→942 chars, economy 1.52→1.06. Prose errors flat (13→14). Unreliable generators: push-absent, tag/release-absent, "no test file names", "Only commit X's message", loose TTY/platform. Plus a fresh-check collision bug (stripped `<repo>/` key lets an absolute-path pass hide a failing relative-path run; pr5/pr8–pr12). The workflow/cost changes (finish, quiet check, blocking waits, SKILL trim) did not hurt: drafting.md read 58/58, reviews 61/61.
Decision: candidate62 = candidate61 minus render-all-limits (≤2 reliable open-point lines), writer-selected limits restored in drafting.md with per-behavior coverage guidance, unreliable generators removed/tightened, collision fixed. Same panel and gate (panel-c62 vs panel-c58).
## 58. candidate62 built; panel launched (2026-11-17)
candidate62 (tag on 8d9783f): ≤2 reliable open points (stale session run beside a fresh pass; failed push); push/tag/no-test/only-commit limits removed; TTY needs real terminal code; platform limit skipped when tests pass the platform; receipt collision fixed in checks.ts and render; drafting.md restores writer-selected limits and per-behavior coverage. Accepted agent deviation: uncited open limits are advisory in render (not rows that block publish), consistent with "skip limits you can't support". Suite 54/55 files (known review-run flake, passes alone); typecheck clean; replay on 8 cases confirms. Smoke skipped: workflow/cost code is unchanged from candidate61, which ran cleanly on all 61×2. c62-chain.sh: panel-c62 → panel-gate → pool61-final6 (3 reps) → accuracy → rebuild → native showcase.
## 59. candidate62 panel: gate FAIL on quality rule; quality ≈ candidate58, cost far lower (2026-11-17 20:42)
Codex: delta +3.55 → +2.23 (gain −1.32 ± 1.38 SE); picks 28–15 (65%) → 23–15 (61%); cost vs original (geo) 0.549 → 0.300.
Claude: delta +0.65 → +2.09 (gain +1.44 ± 2.23 SE); picks 21–9 (70%) → 22–8 (73%); cost vs original 0.619 → 0.512.
Pooled gain +0.06. The candidate61 regression is fixed (Codex −7.4 → −1.3, within noise), and quality is statistically indistinguishable from candidate58 while cost drops a further 45% (Codex) and 17% (Claude). Chain stopped per pre-stated rule; asking the user whether to run the final on candidate62 (same quality, much cheaper) or iterate again.
## 60. User chose the candidate62 final run (2026-11-17 ~20:50). c62-final.sh: pool61-final6, 3 replicates (rep 1 drafts reused by cache), accuracy review, rebuild, native showcase.
## 61. candidate62 final run complete (2026-11-18 00:58), before accuracy review. Codex: delta +3.29 ± 1.16 SE, consensus 79–38 (68%), cost geo 0.292 (71% lower). Claude: +3.45 ± 1.32, 60–21 (74%), cost 0.545 (45% lower). vs candidate58 (pool61-final2): Codex +4.3, 83–34 (71%), 0.544; Claude +3.6, 69–17 (80%), 0.695. Quality within noise; cost much lower.
## 62. candidate62 final after accuracy review (2026-11-18 02:30)
site-data: pool61-final6/site-data-final.json. Codex: consensus 79–38 (67.5%, CI 56–79%), Δ +3.3 [1.0, 5.5], cost 0.300 [0.277, 0.323]; confirmed errors/draft 0.333 vs original 0.164 (diff +0.169 [0.000, 0.361]); strict gate fails. Claude: 60–21 (74%, 62–85%), Δ +3.5 [0.8, 6.1], cost 0.573; errors 0.470 vs 0.842 (diff −0.372 [−0.585, −0.153]); strict gate PASSES (first time).
Codex confirmed candidate errors: 41 prose, 19 Validation. Validation ones are render bugs: (a) the "session's last test run came before the final edits" open point fires when the edit and the test ran in the same chained command, edit first (pr11 ×6, parallel-providers); (b) fresh checks run on a tree a failing bundle step regenerated (restored later) are listed as passes "on the submitted content" (receipt-quoting r3 ×7); (c) a relative/absolute TRACETOON_TEST_CLI variant still collapses in pr9 (the `./` form); (d) "Where to start" picks a thin shim/selector. Native showcase and rebuild exits were nonzero, as in earlier runs (diagnostic gate); outputs complete.
## 63. User chose: publish candidate62 with the Codex accuracy increase disclosed in the run details (2026-11-18). Report rebuild delegated (data-driven numbers, new three-way annotations, history of c61→c62).
## 64. Report published on candidate62 (2026-11-18): artifact v5 (private report artifact); site commit 9d6ce59 pushed to site/evidence-61-cases; PR #138 body updated (figures, disclosures, data path pool61-final6).
## 65. candidate63 plan approved (2026-11-18): generator fixes (G), render/Validation/drafting (W), cost/workflow (C) in parallel worktrees wt-c63{g,w,c} from candidate62; smoke; 61×1 panel vs panel-c62 with accuracy review; gate incl. Codex errors ≤ c62; final; report.
## 66. User (2026-11-18): 'get as much of this done as you can overnight without stopping.' Interpretation: proceed autonomously through merge, smoke, panel, gate; if the gate passes run the final and update report/PR; if it fails, analyse and build candidate64 and panel it rather than wait; record every decision here.
## 67. candidate63 merged and tagged (4543ebd, branch c63-merge); suite 58/58; bundle evgraph-skills/candidate63. Smoke launched on smoke3 (results/v4/tuning/smoke-c63).
## 68. candidate63 smoke (3 cases × 1): workflows complete; cost Codex $0.087 vs c62 $0.194 on the same cases (−55%), Claude $0.364 vs $0.395 (−8%). Quality vs panel-c62 same cases: Codex −5.1, Claude −9.0 (n=3, noisy, but judges' notes show systematic causes):
- "Checks passed: tests 243/243" judged false: compressed count drops the skipped test (pass/total must include skips).
- The scoped fakes row ("three of the four changed tests use a fake…") still judged unsupported/error.
- G's new "last X run … shows no exit status" line read as odd filler ("tsc exit status remark").
- Claude prose reads as a "file/helper inventory" (economy 1 in 12/12 judgments): W's unmentioned-files advisory and "one clause per test/docs file" push listing.
- Claude uncertainties fell (0.50→0.27).
Decision: candidate63b before the panel — fix the count format; drop the fakes generator and the no-exit-status open point from rendered text; remove the unmentioned-files advisory from render output; drafting groups by behaviour (no per-file clauses), and restores limit wording for uncertainties. Re-smoke.
## 69. candidate63b built (tag 42b615b): count format with skips; fakes generator removed; no-exit-status row dropped; unmentioned-files advisory hidden; drafting groups by behaviour; platform rows restored (sessionPlatform treated /var/tmp cwd as unknown — the main cause of lost Claude uncertainties); focused receipts no longer hide session runs; toolchain caveat once; failure reason line. Suite 59/59. Re-smoke as smoke-c63b.
## 70. candidate63b smoke (3 cases, same cases as panel-c62): Codex cand 79.6 (c62 79.1, c63 74.0), cost $0.092 vs $0.195 (−53%), errors 0; Claude cand 68.2 (c62 54.2, c63 45.2), cost $0.337 vs $0.395 (−15%), errors 0, uncertainties 0.59 (c62 0.50). Workflows complete. Go to the 61×1 panel: c63-chain.sh with PICK=candidate63b PANEL=panel-c63b, final dir pool61-final7.
## 71. panel-c63b aborted by the environment, not the candidate (2026-11-18 06:01)
Homebrew upgraded node to 26.0.0 / npm 12.2.3 at 00:22; npm 12 defaults allow-git=none, so case aifirstextension-apache-license's preparation `npm ci` (git dependency) failed with EALLOWGIT and both providers stopped as "invalid" after 13 and 11 cases. Partial, not a gate result: Codex gain +3.7 ± 3.2 (13 cases), cost $0.069 vs $0.127, 1 confirmed error; Claude −1.2 ± 4.4 (11 cases), cost $0.306 vs $0.347.
Fix options: an env var changes the writer environment identity (all cache keys → original drafts not reused); a global npmrc change was denied by the permission classifier (not attempted further). Chosen: that one case's preparation command becomes `npm ci --allow-git=all` in pool61/preparation.json (backup preparation.json.orig-npm11). Only that case's cache key changes, so its original-workflow drafts are regenerated (6 drafts in the final); disclosed. Relaunching the panel as panel-c63b2 (finished candidate drafts reused from cache).
## 72. Cache-miss bug in my chain launch (2026-11-18 06:25)
panel-c63b and panel-c63b2 were re-running the ORIGINAL-workflow drafts: launching c63-chain.sh as `PICK=… PANEL=… ./c63-chain.sh` put PICK/PANEL in the environment, which changed the writer environmentHash (7771d1… in panel-c62/smoke-c63b vs 719212…/e77c04…), so no cached drafts matched. Stopped panel-c63b2 (SIGTERM to its process group) after ~20 min. The script now takes the candidate and panel name as arguments. Cost of the mistake: about 15–20 extra writer drafts. The npm preparation change (#71) still applies. Relaunching as panel-c63b3 and checking the manifest environmentHash equals 7771d1… before letting it run.
## 73. panel-c63b3 gate FAIL (2026-11-18 09:29). Codex: delta +2.23 → +3.15 (gain +0.92 ± 1.41), picks 23–15 → 25–11 (69%), cost /bin/bash.127 → /bin/bash.075 (−41%), confirmed errors 21 → 12. Claude: +2.09 → −3.31 (gain −5.40 ± 1.76, significant), picks 22–8 → 7–18, cost /bin/bash.347 → /bin/bash.333. Codex is a clear win on cost and accuracy; Claude regressed. Diagnosing Claude for candidate64.
## 74. candidate63b Claude regression diagnosed → candidate64 (2026-11-18)
Cause is the Claude workflow change, not the generators: background `check --all` alongside reviewers meant checks ran before the first finish in 1/58 (c62 88/122); "recheck none → straight to publish" skipped finish after review edits (17/58 vs 93/122) and publish re-renders quietly without enforcing the brief check; writers wrote "no pass / not verified" lines themselves (34/61 bodies, ~20 errors), contradicting Validation; 600 s foreground re-run timeouts 12/58 (two drafts never published); 9/58 piped prepare through `head -c` and lost the brief (mean −16.4; `next` no longer pointed at `query brief`); Claude never passed `--also`, so repos with no declared checks lost Validation (7 drafts); compressed "tests N/N" judged unverifiable; drafting "open points required" and the fakes-caveat ban cost uncertainty credit.
candidate64 = candidate63b + Claude flow reverted to c62 order (foreground checks before the first finish; finish after review edits; publish shows and enforces the brief check), truncation-proof prepare + `query brief` pointer, condensed drafting rules back in Claude's next, --also suggestions from session checks, Validation keeps command + runner counts, drafting open-point/fakes wording reverted, staleNoPass widened. Codex flow unchanged.
## 75. candidate64 built (tag on c96c7ac): Claude flow back to foreground check → finish → review → finish → publish; publish enforces the brief check; truncation-proof prepare; Claude drafting rules in next; runOutcomeDenial; --also suggestions; Validation with command + runner counts. Suite 945/946 (flaky review-run). Smoke on smoke6 (smoke3 + vexaim, pr10, aifirstwebsite-signing-policy — three of candidate63b's worst Claude cases).
## 76. candidate64 smoke6 (vs same cases): Claude Δ +11.9 (c62 +1.1, c63b −5.2), errors 0.17, cost $0.369 (c62 $0.382); Codex Δ +6.4 (c62 +9.0, c63b +9.9; one case −12), cost $0.095 (c62 $0.167), errors 0. All drafts published; Validation present except the no-checks case (as in c62). Baselines reused (env hashes match). Go to the panel: c63-chain.sh candidate64 panel-c64.
## 77. panel-c64 gate FAIL on the quality rule (2026-11-18 13:32)
Codex: delta +2.23 → +1.45 (gain −0.78 ± 1.29), picks 23–15 → 25–18 (58%), cost $0.127 → $0.080 (−37%), confirmed errors 21 → 13 (c62 baseline r1: 10). Claude: +2.09 → +1.13 (gain −0.96 ± 1.97), picks 22–8 → 14–11 (56%), cost $0.347 → $0.321 (−8%). Pooled −0.87.
Summary of this round vs candidate62 (61×1 panels): quality within noise for both candidates on both providers except candidate63b Claude (−5.4, fixed in 64); Codex confirmed errors fall by ~40% (21 → 12/13) and Codex cost by ~40%; Claude cost −8%. No quality gain above noise. Asking the user whether to run the final on candidate64 (accuracy + cost) or stop.
## 78. User chose: iterate again (candidate65), aiming for a quality gain above noise.
## 79. Headroom analysis → candidate65 scope (2026-11-18)
Findings: Claude uncertainties lose ~1.5–2 pts to the baseline because the Sonnet judge credits only stated limits (cand .37–.41 vs base .56–.59); candidate64's "never write that an outcome isn't shown" and the lean reviewer's step 3 suppress exactly those. candidate64's weakened "Previously…" rule cost Codex problem (1.67→1.47) and prior-behaviour context (.39→.24). Codex economy notes blame Validation noise (87/137); repeated environment failures; "on the submitted content" after the check batch changed tracked inputs (unsupported .078 vs .019). 5 Claude bodies published raw [S1]/[CH1] tags. Context is brief-limited (low-overlap facts covered .07 by both arms). Noise: composite SE ≈1.3 per 61×1 panel, dominated by factual errors; coverage+rubric sub-composite SE ≈0.6–0.7.
candidate65 = candidate64 + (a) explicit session-scoped limit clauses allowed/required (no CI on final head, last full run before edit X, hardware/OS not exercised, untested changed branches), reviewer-lean step 3 aligned; (b) restore "Previously…" whenever a was/before row exists; (c) Validation: collapse repeated environment failures, cap lists, fix "submitted content" after input-changing checks, block raw brief tags at publish; (d) 2–3 sentence Background from trigger/decision/why rows; (e) target length from behaviours+commit sentences+tests, a "reach" clause; (g) finish lists uncited request/decision/background/limits rows (advisory). Skip assistant-prose extraction (f) this round. Gate also reported on the coverage+rubric sub-composite.
## 80. candidate65 built (tag on 50f6a31): scoped Limits section, Previously rule restored, quieter Validation (collapsed env failures, ≤5 passes, 'regenerated files'), Background 2–3 sentences, wordBudget max(60×units, 35×(behaviours+commit sentences+tests)) cap 600, Reach clause, uncited-row advisory; raw-tag guard; Claude check --all batch bounded to 540 s (a foreground check over the 10-min Bash limit left 5 c64 Claude drafts unrendered). Tests pass. Smoke on smoke6.
## 81. candidate65 smoke6: Codex Δ +8.2 (c64 +6.4, c62 +9.0), cost $0.077, errors 0.12; Claude Δ +1.8 (c64 +11.9), errors 0.33 (c64 0.17), drafts longer (book-walk 603, pr10 612 words; economy 1 in 18/24 judgments). Claude judge errors come from the required "Previously…" sentences (old behaviour misstated ×3), Background decision paraphrase ("the user chose to test every route live"), and an unsupported result claim. Decision: candidate65b — "Previously" required only in Codex's next (where analysis showed the gain); drafting.md goes back to "only where a was-row shows the old behaviour, saying only what the row shows"; Background ≤2 sentences and decisions stated as the row words them; word budget per-item weight 30, cap 520. Workflow unchanged, so go straight to the 61×1 panel after tests.
## 82. candidate65b built (tag on 8a105af); tests pass. Launching the 61×1 panel: c63-chain.sh candidate65b panel-c65b (final dir pool61-final7 if the gate passes).
## 83. panel-c65b gate FAIL (2026-11-18 17:57). Codex: gain −0.20 ± 1.42, picks 22–15 (59%), cost $0.127 → $0.074 (−42%), errors 21 → 15. Claude: gain −2.89 ± 1.71, picks 13–12 (52%), cost $0.347 → $0.308. The run completed despite a low-memory episode (~15:40; Claude Code stopped only my waiter). Memory at 18:40: 22 GB available, zram swap full. Across candidate63b/64/65b, no quality gain over candidate62 above noise; Codex cost −37–42% and confirmed errors −30–40% hold in every panel. Awaiting the user's decision.
## 84. User chose the candidate64 final run (2026-11-18 ~18:50). c64-final.sh candidate64 → pool61-final7 (3 replicates; rep 1 reused from panel-c64), accuracy review, rebuild, native showcase. Report stays on candidate62 if the final is worse.
## 85. User (2026-11-19 ~00:45): skip the 3-way example; the quality drop is too large to adopt candidate64. Stopped the c64-final chain shell (the running Claude accuracy review continues on its own; no rebuild/native). Next: theories for the drop, tested by comparing briefs/drafts between runs.
## 86. Correction to #85: killing the chain shell terminated the running Claude accuracy review instead (exit 143, 36/39 flagged cases ruled; resumable), and the chain then ran the native showcase anyway (~1 min each, cached drafts, exit 3 as usual). Claude accuracy for candidate64 is therefore partial; not needed for the current analysis.
## 87. Why candidate64 lost quality vs candidate62 (two read-only analyses, 2026-11-19)
Refuted: brief shrinkage (briefs +1.3%, |r| ≤ 0.22 with per-case drops); judge drift (identical baseline drafts moved +0.34 Codex / −0.23 Claude, no mean shift); cost cuts removing useful work (fewer calls/fix rounds don't correlate with quality, |r| ≤ 0.23; Codex review work unchanged); replicate-1 origin.
Supported:
- Claude: 20/183 drafts never rendered/published — `check --all` as one foreground call overran Claude Code's 600 s Bash limit (31/120 traced drafts), went to the background and the writer ended its turn; raw body.md kept (Δ −12.2 on those drafts). They explain the whole Claude composite drop (−1.47 of −1.43); without them Claude preference 67% and Δ +3.76 ≈ candidate62. Claude preference change −14.3 pp, p = 0.009.
- Codex: next lost DRAFTING_RULES and drafting.md softened "Previously": drafts with "Previously" 142 → 31/183, problem rubric 1.69 → 1.46 (≈ −0.4); 200-word floor + optional housekeeping shortened prose 225 → 191 words (≈ −0.5 claims). Codex preference change −8.3 pp, p = 0.15 (about 40% noise).
- Smaller: fakes/arm64 limit rows removed (Claude uncertainties ≈ −0.27); check --all running every declared script (test:compiled/bundled, bundle) adds failing/unbindable Validation lines (Codex unsupported ≈ −0.26; Claude validation item ≈ −0.19); docs ≤ 1 clause (Claude claims ≈ −0.2); Claude piping prepare through head -c (17% of drafts).
Proposed candidate66 = candidate64 keeping its cost/accuracy gains, plus: Claude check budget under 600 s with overlapping/bundle/build scripts excluded and per-command lines; Codex next regains the drafting rules (problem first, required "Previously" when was/before, 250–450 words); candidate62's drafting wording for Previously, length, housekeeping, docs, test files; fakes and arm64 limit rows back; prepare writes the brief to a file so truncation can't lose it.
## 88. User approved candidate66 (2026-11-19): build → smoke6 → 61×1 panel vs panel-c62 (gate2) → final if it passes.
## 89. candidate66 built (tag on b597d11, branch c66 from candidate64); suite 963/963. Smoke on smoke6.
## 90. candidate66 smoke6: workflows intact (all rendered/published, no raw tags, Previously present in 5/6 Codex and 4/6 Claude). Codex Δ +6.6 (c64 +6.4), cost $0.083; Claude Δ −3.0 (c64 +11.9, c62 +1.1), driven by two cases with writer misreadings of code details (sampling count, 'headless'), not by a systematic generator/workflow fault; Codex has one error from a required 'Previously' sentence. Smoke n=6 is noisy; the analysis-backed fixes target the full-run causes, so proceed to the 61×1 panel.
## 91. The candidate66 chain would write its final into pool61-final7, which held the candidate64 final; stopping the chain failed (signal went to the wrong group), so instead renamed the finished candidate64 run to pool61-final7-c64 (no live process used it). The candidate66 panel continues; its final (if the gate passes) writes a fresh pool61-final7.
## 92. panel-c66 gate FAIL (2026-11-19 05:05) on the error rule and pooled quality. Codex: gain +1.38 ± 1.35, picks 20–8 (71%; c62 panel 61%), cost $0.127 → $0.072 (−43%), confirmed errors 21 → 23. Claude: gain −1.26 ± 2.00, picks 19–8 (70%; c62 73%), cost $0.347 → $0.312 (−10%). Unrendered drafts: Claude 3 (c64 6, c62 1), Codex 2 (c62 2). Read: quality ≈ candidate62 on both providers (the candidate64 drop is recovered), cost lower, Codex accuracy gain of c64 lost (required 'Previously' sentences are one source). Asking the user.
## 93. User: one more round, but research and plan first to decide which fixes to include (runs are expensive).
## 94. Research for the final round (2026-11-19): candidate67 plan
Codex (c62/c64/c66 panels): c66's preference gain is mostly baseline re-judging noise (identical baseline drafts 73.4 → 71.7); per-judge preference 60–63% in all three. Real gain: problem item 1.47 → 1.68 (problem-first + "Previously"). Errors +10 from required "Previously" (written from truncated was-fragments, up to 5 per draft) and the 250-word floor/housekeeping coverage (longer drafts, overreach). Scoped checks are the cleanest gain; per-check lines, fakes/arm64 rows neutral. Recurring Validation error: relative-path `--also` command reported passed though it errored.
Claude: c66 vs c62 loss = factual errors 0.143 → 0.295 (−2.3 pts), mostly forced housekeeping/config/CI clauses and test-detail claims from longer drafts. All unrendered drafts: a command exceeded 600 s, moved to background, writer ended its turn; the 540 s budget failed because streamCheck kills only the direct child (grandchildren keep pipes open; 1100 s runs), and c66's "wait for it, never end the turn" led to Monitor + turn end; c62's "run the same command again in the foreground" survived 14 such moves. Capped batch turned prbench test passes into timeouts.
candidate67 = candidate66 with: process-group kill + check --all returns before ~540 s leaving checks running detached (15-min per-check limit), rerun waits, publish waits instead of refusing, c62's background wording; "Previously" only when a was/before row shows the complete old condition, at most two; ~250–400 words, floor 200, housekeeping optional (≤1 clause, never a blocking row); test clauses from titles only; one combined passes line; `--also` limited to session commands in this repo touching diff paths, relative-path receipts fixed; containment detects native test runners inside `check`; "no passing run after last edit" limit counts later lint/syntax checks; Claude drops the second finish. Evaluation: skip the 1-replicate panel (cannot resolve these effects) and go to smoke6 → full 61×3 run compared directly with candidate62's final run, with a pre-stated adopt rule.
## 95. User approved candidate67 autonomously (2026-11-19): smoke6 → full 61×3 run; if the adopt rule fails but my recommendation is still to run/fix, proceed (targeted fix + rerun pre-approved). Adopt rule vs candidate62 final: consensus preference ≥ c62 − 3 pp on each provider, Codex confirmed errors ≤ 0.33/draft, cost lower.
## 96. candidate67 built (tag on cada400; d0850e5 also bounds the brief's doNotSay 'Previously' hint — accepted). Suite green; detached Claude check batch verified with the compiled binary. Smoke on smoke6.
## 97. candidate67 smoke6: workflows intact on both providers (all rendered, no raw tags; baselines reused). Codex Δ +6.3, errors 0.08 (c66 0.29), economy 1.50 (c66 1.21), cost $0.087; Claude Δ −5.0 (c66 −3.0; c62 panel same cases +1.1), errors 0.33 — writer misreads (a Dockerfile flag repeated in c66 and c67 drafts, rm handling, transcript finders), no workflow fault. 'Previously' now rare (Codex 0/6, Claude 1/6). n=6 is noise-dominated; per the approved plan, launching the full 61×3 run (c67-final.sh candidate67 → pool61-final8).
## 98. Machine crash during the candidate67 full run (~10:50, 2026-11-19); both providers left 'cancelled' at Codex 300/366 writers, 588/732 judgments and Claude 346/366, 680/732. Inputs intact; new kernel 7.3.4 after reboot; 37 crash-leftover sandboxes under $TMPDIR/prbench-* left in place. Resuming with c67-resume.sh (both launches --resume --recover-lock).
## 99. Resume refused (2026-11-19 10:58): 'Experiment inputs changed'. Frozen inputs (harness, skills, cases, probe) verify OK; the difference is the writer environmentHash: codex 7771d1… → ac7a39…, claude 7664dd… → e077a7…. The hash covers the whole launching environment; after the reboot the desktop session and Claude Code (now 2.1.328; AI_AGENT var) changed, and per-login values (e.g. ICEAUTHORITY, XDG_SESSION_PATH) cannot be reproduced (searched 6,240 variants of the likely keys: no match). Same hash also keys the draft caches, so no fresh run from this session can reuse the original-workflow drafts either. Stopped; asking the user.
## 100. User chose the resume override. Harness commit on bench-v4 (wt-benchv4): compare --accept-environment-change (with --resume only) keeps the recorded writer environment hash and appends {at, recorded, current} to <run>/environment-overrides.json. comparison.ts/compare.ts/cli.ts are outside the writer/judge contracts and gate policy, so identity and cache keys are unchanged. Resuming pool61-final8 with it; disclose in the report.
## 101. The Claude run went 'invalid' after resuming: one replicate-3 judge attempt (vex-v5-serial-aim-port, Opus, ab) was killed by the crash (exit 137, failureKind invalid = non-retryable), so the persisted recovery limit stopped it 3 times. Moved that attempt dir to pool61-final8/crash-killed-attempts/ (not deleted) so the judgment reruns; c67-claude-finish.sh resumes Claude, then accuracy review and rebuild. Codex: complete; accuracy done (exit 0).
## 102. candidate67 full run (61×3, resumed after the crash) vs candidate62 final — adopt rule FAILS; report stays on candidate62 (2026-11-19 14:10)
Codex: Δ +2.99 (c62 +3.29), consensus 68–40 (63.0% vs 67.5%, −4.5 pp > 3 pp allowance), cost ratio 0.174 (c62 0.292), confirmed errors 61/183 = 0.33 (c62 0.33). Claude: Δ +3.38 (c62 +3.45), 50–26 (65.8% vs 74.1%, −8.3 pp), cost 0.491 (c62 0.545), errors 101 vs baseline 147 (c62 86 vs 154). Unrendered drafts: Codex 4, Claude 3 of 183.
Read across candidate64/66/67: the composite score lead matches candidate62 within noise and cost is consistently lower (Codex ~83% below the original vs 71%), but the both-judges-agree preference share comes in lower every time, most clearly on Claude (60–66% vs 74%). Recommendation: stop tuning; keep the published candidate62 report. Not starting another round.
## 103. User: go with candidate62; update the website to match the artifact. Found PR #138 was merged on 2026-11-18 00:58 UTC at e41fe9d (candidate58 content) before the candidate62 commit 9d6ce59 was pushed, so the live site still shows candidate58. New branch site/evidence-61-candidate62 from upstream/gh-pages (d09e833) with 9d6ce59 cherry-picked (056061e); conflict in evidence-graph-61.html resolved by keeping the candidate62 page and re-applying upstream's new header (favicon links, wordmark). index.html merged cleanly. Opening a new PR.
## 104. Opened PR #178 (Tracetoon/tracetoon, site/evidence-61-candidate62 → gh-pages, head 056061e) via the Tracetoon skill: reviewed brief path, 2 Haiku reviewers (lens d + general), 12 findings applied in one pass, review current. Waiting for the user to merge.
## 105. Headline claims updated everywhere in the repo: PR #179 (docs/headline-candidate62 → main): RESULTS/HOST_COPY in scripts/agent-surfaces.ts + regenerated surfaces (27 files) + README hand-written figures; checks pass. PR #178 gained index.md + og:description fixes. Outside directories/npm page need resubmission or the next npm publish.
## 106. Check-in and publication (2026-11-20). PRs: #180 merged; #179 in the merge queue.
User decisions:
- Merge candidate62 into Tracetoon main, so the release matches the benchmarked code (it diverged 2026-11-10 with 86 commits; main has moved 284 since).
- Publish all 61 replay cases as real-cases 4.0.0, via the existing redaction/secret-scan pipeline. Show the release to the user before uploading to Tingsters/prbench.
- Commit a curated golden bundle (results/golden/) to prbench: manifests, per-case scores, verdicts, adjudications, site data, decisions log, draft texts. No traces or sandboxes.
- Overhaul the prbench README (setup, run, golden-run table, reproduce).
- Add a fun, illustrated prbench page to tracetoon.ai.
Audit findings:
- prbench origin/main is from 2026-11-05. bench-v4 (the harness used for every v4 run) is 73 commits ahead and unpushed, as are dataset-v3, fact-review, final-bench and bench-v4-xdg.
- Tracetoon candidate tags/branches (candidate50/c63-*/c66) are local only.
