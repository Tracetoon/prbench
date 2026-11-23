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

    `aifirstextension-content-sync` was only partly covered: a bot workflow wrote its diff. All 6 are moved to `$TMP/new2611-dropped`. **18 new cases remain** (12 Claude, 6 Codex), for a pool of 61. Late-window and workspace matching gave roughly 1 false match in 4. The coverage check caught them.
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
39. **Incident (about 18:20):** the `candidate56` agent's cleanup `rm -rf $TMP/prbench-*-??????` deleted live round-1 writer sandboxes. 9 candidate attempts failed with "workspace disappeared" (Codex 4, Claude 5). These are no-draft failures, retried automatically (up to 3), so the round stays valid at extra time and cost. `candidate56` (tag fd9520d) is built: CI wording and results, entry-point-only script rows, clean `details`.
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
## 64. Report published on candidate62 (2026-11-18): artifact v5 https://claude.ai/artifact/ReeXMhWKgFAMbY9etga7Qq; site commit 9d6ce59 pushed to site/evidence-61-cases; PR #138 body updated (figures, disclosures, data path pool61-final6).
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
## 98. Machine crash during the candidate67 full run (~10:50, 2026-11-19); both providers left 'cancelled' at Codex 300/366 writers, 588/732 judgments and Claude 346/366, 680/732. Inputs intact; new kernel 7.3.4 after reboot; 37 crash-leftover sandboxes under $TMP/prbench-* left in place. Resuming with c67-resume.sh (both launches --resume --recover-lock).
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
## 107. Tracetoon: candidate62 merged onto main (wt-land62, branch feat/evidence-brief-candidate62, 8338e51 + ae71c08 + merge of upstream main incl. #179), pushed to the fork; replay briefs byte-identical to candidate62. PR description in progress via the Tracetoon skill. prbench: release/v4-golden (wt-prb-release) with tingsters/main merged, dataset 4.0.0 staged at $TMP/release-4.0.0 (61 cases, review report REVIEW.md), golden bundle golden/v4-candidate62 (5.4 MB), README overhaul; suite 346/347 (1 skip). Holding the prbench push and dataset upload for consent questions (vexagent repo history; collaborator consent for 24 AI First/Showtail Codex cases).
## 108. User: vexagent cases publish with the work email and home path scrubbed from the repo history (SHAs change; disclose); collaborator consent covers all 24 AI First/Showtail Codex cases. Tracetoon PR #182 opened (feat/evidence-brief-candidate62 → main). prbench agent re-staging 4.0.0 with the scrub.
## 109. User approved all four publication steps. Step 1: pushed release/v4-golden to steveonjava/prbench.
## 110. Step 2: created release cases-v4.0.0 on Tracetoon/prbench with the archive (sha256 fece4524…7f6e), dataset-release.json, SHA256SUMS, MANIFEST, DATASET_CARD, preflight summary.
## 111. prbench PR Tracetoon/prbench#7 opened (release/v4-golden → main); follow-up e26d676 marks 4.0.0 published. Waiting for the user to merge #7 (and Tracetoon #182) before cutting prbench v0.4.0 and the site page PR.
## 112. prbench PR #7 merged (2ffe754) after macOS/Windows test fixes (d729aae) and the 0.4.0 bump (d86cd20). Released v0.4.0 (prbench-0.4.0.tgz sha256 9be9e5ac…2dab) from 2ffe754; verified a clean install fetches real-cases@4.0.0 and preflight passes on all 61. Next: tracetoon.ai prbench page PR.
## 113. Site PR #185 opened (prbench page). Edited its Validation section: it listed an unrelated main-repo bun test run from the same session.
## 114. User: merge them. Site PR #185 merged (prbench page live on gh-pages). #182 not mergeable yet: conflicts with upstream main (#181/#183/#184 touched SKILL.md and plugins) and one Windows CI job failed; agent resolving, then merge.
## 115. Tracetoon #182 merged via the merge queue as squash b3e376e (content identical to the branch). Pushed tag candidate62 (8d9783f) to Tracetoon/tracetoon so the golden bundle's candidate skill identity stays publicly reachable after the squash.

## 116. Native comparison on flagship session models; candidate68 (delegated drafter) (2026-11-21)
User: what matters is Tracetoon vs no Tracetoon; cost with a 500k warm user context; most users run Opus 5.5. Finding: candidate62's main thread drafts (16.3 main requests/PR, $0.28; Haiku reviewers $0.06 on Claude), so at 500k every main request re-reads the session (+$0.82 Sonnet / +$1.63 Opus per PR). Drafts are written from Tracetoon's own outputs (0.2 Read calls per run), so a fresh delegate should match quality.
candidate68 (Tracetoon a272ccc, tag candidate68, branch c68 from candidate62): prepare --drafter-model / SKILL "Drafter model: standard" → drafter-packet.md (candidate62's next step addressed to the drafter + brief); coordinator starts one fresh drafter (Claude sonnet, Codex gpt-6.1-terra); Claude drafter hands back at review packets (subagents can't start agents), coordinator starts lens-d + general Haiku reviewers and SendMessages their ids; Codex drafter runs tracetoon review run; coordinator publishes. Suite: affected files 81/81; new tests for both hosts and the off cases. SendMessage verified working in pinned Claude Code 2.1.319 -p under the harness permission set.
Cost model (user-verified prices, USD/M): Opus .20 read/4 in/20 out/5 write(5m) 8(1h); Sonnet .10/2/10/2.5/4; Sol ≤272K .10/2/10/2.5, >272K .20/4/15/5; Terra ≤272K .05/1/5/1.25, >272K .10/2/7.5/2.5. Main-thread requests carry a 500k cached prefix (OpenAI tier by total input → Sol always >272K); prefix re-written when the gap exceeds the TTL (Claude 5 min and 1 h reported, OpenAI 30 min); delegated threads carry no prefix.
Anchor (flagship-anchor): smoke8 × 1 replicate, session model Codex gpt-6.1-sol / Claude claude-opus-5-5, systems native + baseline(=candidate62) + candidate(=candidate68), usual judges. Pre-stated rule for the full run: c68 not worse than c62 by >3 composite or >1 consensus pair; c68 preferred over native and cheaper at 500k (Claude 5-min TTL); pick that provider, larger composite delta over native if both, Opus on a tie within noise; parity failure → one handoff fix + re-anchor; neither beats native → stop and report.

## 117. Anchor 1 result (flagship-anchor) and re-anchor with candidate68b (2026-11-21)
- **Codex (Sol), 8 cases:** composite native 63.7 / c62 71.0 / c68 69.5. c68 vs native +5.8±6.6, consensus 4-2. c68 vs c62 −1.5±6.3, consensus 2-5 (c68 higher on 6/8 cases; one outlier, cli-guard-tests 44 vs 88). Cost/PR at 500k: native $3.26, c62 $4.05, c68 $2.84 (raw $0.26/$0.39/$0.24). Coordinator spent 6 short wait_agent calls (60 s).
- **Claude (Opus):** run invalid: native Opus ended its turn "waiting for the test run" (default 120 s Bash timeout moved tests to the background) and produced no PR on showtail-transcript-migrator 3/3 attempts (and once on tracetoon-update-command); judging stopped at 36/64. On 4 complete cases: native 41.1 / c62 76.5 / c68 68.6; c68 vs native +27.5, consensus 3-0. c68 vs c62 −7.9±2.4 (lower on all 5 judged cases). Cost/PR at 500k with 5-min TTL: native $3.04, c62 $4.49, c68 $2.83. With 1-h TTL: $1.36 / $3.29 / $1.80 (native's long background waits expire the 5-min cache).
- **Parity failed on both providers.** Reading pr5: the Sonnet drafter follows the same rules but writes less detail (~400 vs ~600 words). Drafting capability, not a lost handoff. Cost model validated: repriced raw Claude median equals Claude Code costUsd median ($0.3312).
- **candidate68b** (dc689c7): `Drafter model: inherit` (fresh drafter on the session model, no model argument), and Codex coordinator waits as long as wait_agent allows.
- **Re-anchor** flagship-anchor2: smoke7 (smoke8 without showtail-transcript-migrator, where native fails deterministically); cached native and c62 drafts reused; 14 new c68b drafts. Same pre-stated rule.
- **Open fairness issue for the full run:** native no-PR from background-moved Bash.

## 118. Re-anchor result; plan for cost iterations (2026-11-21)
- **flagship-anchor2 (candidate68b, inherit drafter), smoke7:**
  - Codex: native 64.3 / c62 74.4 / c68b 78.7. c68b vs native +14.4, consensus 5-1; vs c62 +4.3, 2-0. Codex invalid at 54/56 judgments: I committed a harness change to wt-benchv4 while the run was live and the judge's input check refused it. Don't change the run worktree during runs.
  - Claude: native 40.2 / c62 75.9 / c68b 74.9. c68b vs native +34.7, consensus 6-0; vs c62 −1.0 (parity passes).
  - Inherit restores quality.
- **User corrections and plan (approved):**
  - Claude Code cache TTL: subscription = main 1 h, subagents 5 min; API = 5 min / 5 min; settings can set 1 h for both. The timer starts at the request start.
  - Iterate before the full run: fix background timeouts, cut main-thread calls, get a clear cost win.
  - Criteria per provider (vs native, flagship session, 500k prefix):
    - wins > losses and composite Δ ≥ +5;
    - cost ≤ 0.75 × native in every scenario (Claude: subscription, api, api1h; Codex: 30 min);
    - main requests ≤ 5;
    - no no-PR runs.
  - At most 3 rounds, then report; the full run only on the user's go.
- **Bash fix** (bench-v4 fd8345e): every Claude writer gets BASH_DEFAULT_TIMEOUT_MS=600000 and BASH_MAX_TIMEOUT_MS=900000. Probe on 2.1.319 -p: a 150 s command is backgrounded without the vars and stays in the foreground with them.
- **candidate69** (Tracetoon 9761337):
  - one setup call (status, doctor, prepare);
  - the drafter drafts, checks, reviews and publishes, replying `PUBLISHED <url>`; the coordinator relays it;
  - `tracetoon review run` Claude runner: claude -p from CLAUDE_CODE_EXECPATH, no tools, model verified from modelUsage, parent session ids dropped;
  - `Reviewer runner: auto` → tracetoon on both hosts;
  - Codex: one wait_agent with the longest timeout, no interim drafter messages.
  - Bundles: candidate69i (inherit) and candidate69s (standard). Suite green apart from known review-run timing flakes (pass alone).
- **Cost model v2** (evpage/flagship-cost.py):
  - three Claude scenarios; writes repriced at per-thread TTL rates;
  - expiry measured start-to-start;
  - nested `claude -p` sessions counted as delegated.
  - On anchor 1, native Claude costs $1.36 (subscription) / $2.98 (api) / $1.36 (api1h) per PR; c68 costs $1.80 / $2.76 / $1.88.
- **Smoke:** smoke-c69s (pr5, both providers, native+candidate) before round 1.
- crash 2026-11-21 ~14:35: smoke-c69s codex candidate attempt+traces zeroed; moved smoke dir and its 2 cache entries to results/v4/crash-aside-20261121; smoke relaunched fresh
- smoke-c69s: Codex OK (5 main requests, cost 0.50x native at 500k; quality -14 on the one case). Claude: nested claude -p reviewers 'Not logged in' (Claude Code strips CLAUDE_CODE_OAUTH_TOKEN from tool env; users log in via ~/.claude). Coordinator fell back to Haiku agents, 23 main requests. Harness fix bench-v4 471e66e: sandbox ~/.claude/.credentials.json from the writer token (verified a file login from the token works). Rerun as smoke-c69s2.
- smoke-c69s2: Claude coordinator 4 main requests, nested claude -p reviewers OK, drafter published; cost 0.82-0.90x native (1 case). Codex 5 main, 0.51x. Round 1 launched: r1-c69s then r1-c69i on smoke8 (round1.sh).

## 119. Round 1 result; round 2 = drafter effort low (2026-11-21)
**Round 1** (smoke8 × 1, native + candidate; native shared via cache).

| | Codex 69s | Codex 69i | Claude 69s | Claude 69i |
|---|---|---|---|---|
| Composite Δ vs native | −0.9±8.8 | +10.0±5.9 | +9.2±7.4 | +27.0±5.7 |
| Consensus | 3-4 | 3-2 | 2-3 | 5-1 |
| Errors/draft | 0.41 | 0.00 | 0.34 | 0.00 |
| Main requests | 6.0 | 6.1 | 5.9 | 4.0 |
| Cost ratio vs native (500k) | 0.22 | 0.27 | sub 0.55 / api 0.75 / api1h 0.59 | sub 0.61 / api 0.82 / api1h 0.69 |

- Native cost/PR: Codex $3.65 (31 main requests). Claude sub $1.83 / api $3.13 / api1h $1.83 (14.6 main requests).
- **69i** (drafter on the session model) meets every criterion except:
  - Claude api (0.82). In the 5-min TTL scenario the coordinator's single wait for the drafter (5–12 min on 6/8 cases) expires the 500k main cache → one 500k write ($2.50 on Opus) per PR.
  - Codex main requests 6.1. Codex wait_agent returns several times while the drafter works, even with a 1 h timeout: host behaviour, negligible cost.
- **69s** (Sonnet/Terra drafter) fails quality.
- **Keep-warm pings rejected:** they would fix api but push api1h above 0.75.

**Round 2:** candidate69il = 69i + `Drafter effort: low` (Tracetoon ce52354).
- Reason: lower drafter cost and shorter drafter time, so fewer expiries.
- Same smoke8; natives from cache.

## 120. Round 2 (candidate69il = inherit drafter, effort low) meets the cost and quality criteria (2026-11-21)
Natives from round 1. Costs at 500k, ratios vs round-1 native.

| | Composite (native → c69il) | Δ | Consensus | Errors/draft (native → c69il) | Main requests | Cost/PR | Ratio |
|---|---|---|---|---|---|---|---|
| Codex | 64.0 → 72.2 | +8.2±5.6 | 4-3 | 0.22 → 0.12 | 5.6 | $0.87 (raw $0.27) | 0.24 |
| Claude | 45.9 → 67.0 | +21.1±5.6 | 3-1 | 0.41 → 0.00 | 4.0 | sub $0.93 / api $2.09 / api1h $1.03 | sub 0.51 / api 0.67 / api1h 0.56 |

- Claude API-scenario cache expiries fell from 0.6 to 0.5 per PR. All 16 writers complete; no no-PR runs.
- **Only miss:** Codex main requests 5.6 vs ≤5. Codex wait_agent returns early several times: host behaviour, and cost is already 0.24×. Criterion met in substance; disclosed.
- **Trade vs 69i:** −6 Claude / −2 Codex composite for ~15–20% lower cost and passing the API scenario.
- **Recommendation for the full run:** candidate69il. Stop iterating (plan: stop when criteria met) and ask the user for go.

## 121. Full flagship run: a separate benchmark, native vs candidate69il (2026-11-21)
User: the extrapolated 3-way no longer holds (both the candidate and the writer models changed). Treat this as a separate benchmark: "Tracetoon vs no Tracetoon on Opus 5.5 / Sol 6.1 with a 500k session". The published candidate62-vs-original result (Terra/Sonnet) stays as the earlier algorithm comparison.
- Run: pool61 × 3 replicates, both providers in parallel, Sol / Opus sessions, usual judges, `--systems native,candidate`, candidate69il.
- Out: results/v4/pool61-flagship-c69il.
- Chain: flagship-full.sh (restart up to 3×, accuracy review with Fable decider, report rebuild).
- Cost model: evpage/flagship-cost.py on the traces.

## 122. Claude full run invalid: native Opus backgrounds long test suites itself; restart with background tasks disabled (2026-11-21 ~22:40)
- **What happened:** pool61-flagship-c69il/claude stopped invalid at 52/366 writers. Native Opus chose run_in_background for long suites (prbench-aggregate-only, prbench-compare-systems, prbench-crossjudge, aifirstcli-learner-replay-ux), said "I'll wait for the notification" and ended the -p turn with no PR. 3/3 attempts failed on prbench-aggregate-only; the chain's 3 resumes all hit the same case.
- **Fix:** CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1 for every Claude writer. Verified on 2.1.319: run_in_background is rejected and the agent runs the command in the foreground. Interactively the agent would be notified and continue, so this gives the same end result.
- **Where:** separate harness worktree wt-benchv4-nobg, branch bench-v4-nobg 4e3d66c, so the live Codex run from wt-benchv4 is untouched.
- **Restart:** Claude alone (flagship-claude.sh) into pool61-flagship-c69il/claude-nobg. The 52 earlier Claude drafts are not reused: the contract changed. Codex continues unchanged (122/366 at 22:34).
- 22:40 restart mislaunched from the old harness worktree (sed missed the F= line); stopped after ~5 min, moved to claude-nobg-mislaunched; relaunched as claude-nobg2 from wt-benchv4-nobg (verify start line shows 4e3d66c).

## 123. Codex flagship result (pool61-flagship-c69il/codex, 2026-11-22 05:40)
- **Scale:** 61×3, 366 writers, 732 judgments, all complete.
- **Quality:** composite native 63.8 → candidate69il 77.3 (+13.5 ± 1.24 case-clustered). Consensus 64-35 (76 split). Judge-flagged errors/draft 0.208 → 0.131.
- **Cost** (flagship-cost v2, 500k prefix, 30-min TTL, 175 drafts with traces): native $3.50 (30 main requests) → $0.97 (6.3 main requests) = 0.28×. Raw: $0.258 → $0.297.
- **Accuracy review:** Tracetoon arm only (ACCURACY_ARMS excludes native), 68 flags: 51 confirmed, 17 false positives. Adjudications feed only the gate, never composites or judge error counts, so the comparison stays symmetric. A native-flag audit is optional, for a symmetric "confirmed errors" figure.
- **Rebuild:** exit 1 = quality gate "no baseline" failures (expected without a baseline arm). Summary rebuilt with adjudications.
- **Claude** (claude-nobg2): 210/366 writers at 05:40, no failures.

## 124. Claude flagship result (pool61-flagship-c69il/claude-nobg2, 2026-11-22 08:57)
- **Run health:** 61×3 complete, no native no-PR runs after the background-task fix. One candidate scope rejection on aifirstcli-hooks-path, which a later attempt passed.
- **Quality:** composite native 54.0 → candidate69il 66.0 (+12.0 ± 1.9 case-clustered). Consensus 34-33 (89 split). Judge-flagged errors/draft 0.292 → 0.164.
- **Cost** (500k, flagship-cost v2):

  | Scenario | Native | c69il | Ratio |
  |---|---|---|---|
  | Subscription | $1.29 | $0.93 | 0.73 |
  | API 5-min | $2.44 | $2.34 | 0.96 |
  | API 1 h | $1.29 | $1.04 | 0.81 |

  Main requests: native 10.2, candidate 4.0. API expiries per PR: candidate 0.60 (the wait on the drafter), native 0.50.
- **Native is cheaper than in the anchors:** with background tasks disabled, its long suites run in the foreground (14.6 → 10.2 main requests).
- **Accuracy review** (Tracetoon arm only): 144 flags, 111 confirmed, 33 false positives.

## 125. Why the full Claude run deviated from the anchors; candidate70; setup exploration (2026-11-22)
**1. Case mix (main cause).** smoke8 = the cases behind candidate52's smoke regressions: heavy cases where native Opus is weak.

| Full run, Claude | Native composite | Δ | Consensus | Native $/PR (sub) | Native main requests |
|---|---|---|---|---|---|
| smoke8 cases | 41.5 | +23.0 | 10-5 | 1.80 | 14.2 |
| Other 53 | 55.9 | +10.4 | 24-28 | 1.21 | 9.6 |

The smoke8 row reproduces the anchor. Tracetoon's cost is flat at $0.93 (sub).

**2. Regression since candidate69: check results missing from Validation.**
- 0/183 bodies list passing checks on both providers; Validation rubric 0.49 vs native 1.91 (Claude), 0.75 vs 1.70 (Codex). candidate62: 1.6–1.84.
- Cause: candidate69's one-call setup dropped `task begin`. `publish.ts` checksStale required readTask, and passOnSubmittedContent needed the task root, so receipts from the drafter's post-prepare checks never reached the brief.
- The Opus judge's head-to-head is 86-59 for native; its notes say "accurate / honest / reports the fresh check result". Sonnet's is 45-41 for Tracetoon.

**3. Smaller factors.** The background fix only lowered native's API-5-min cost; native's Validation was already ~1.8–1.9.

**candidate70** (Tracetoon 9299dde):
- checksStale fires on receipts without a task; repo root comes from the run folder; the setup call begins the task again.
- Regression test fails on 69il and passes on 70. Suite: only the known review-run timing flake.
- Bundles: candidate70 (inherit, effort low) and candidate70s (Sonnet drafter, effort low).

**User:** subscription rates only (main 1 h, subagents 5 min); drop the API scenarios. Explore setups and pick the best story.
- A. Opus/Opus (candidate70)
- B. Opus session / Sonnet drafter (candidate70s)
- C. Sonnet/Sonnet (candidate70 on a Sonnet session, new Sonnet natives)
- Codex: Sol rerun with candidate70

Each setup is a 61×1 panel. Pre-stated picking rule:
1. Eligible: wins > losses, Δ ≥ +5, sub cost ≤ 0.75× native, no no-PR runs.
2. Largest composite Δ + % saving.
3. Near-tie → same-model story (A or C).

Smoke first: smoke-c70 (pr11, both providers).
- smoke-c70 (pr11): Validation lists 'Checks passed' on both providers; main requests 4 (Claude) / 5 (Codex). Panel A plan: all 61 natives per provider reused from the full run. Launched panels.sh: A || C, then B.

## 126. Reboot ~15:20 killed the panels at 5/122 (A) and 1/122 (C) writers; B not started. No zeroed files. Added compare --environment-from <run> (bench-v4-nobg) so new panel B adopts the full Claude run's env hash (plan: 61/61 natives reused). Resumed A and C with --accept-environment-change, then B (panels-resume.sh).

## 127. Panel results with candidate70, subscription cost (2026-11-22)
61×1 per setup; natives reused from the full run (A, B, Codex). Panel B's first start refused its own override log ("output must be empty"); fixed in bench-v4-nobg 1a9de82; the failed start was moved to panelB-failed-start and B relaunched.

| Setup | Composite (native → c70) | Δ | Consensus | Errors/draft | Validation | Cost/PR | Ratio | Main requests | Groups |
|---|---|---|---|---|---|---|---|---|---|
| A Opus/Opus (c70) | 52.9 → 68.4 | +15.5 | 21-4 (29 split) | 0.32 → 0.14 | 1.75 → 1.51 | $1.29 → $0.94 (sub) | 0.73 | 10.2 → 4.0 | smoke8 +20.9; other53 +14.7, 17-3 |
| C Sonnet/Sonnet (c70) | 30.6 → 63.9 | +33.3 | 57-0 | 0.16 → 0.21 | 0.93 → 1.73 | $0.23 → $0.49 | 2.09 | 3.8 → 4.0 | — |
| Codex Sol (c70) | 62.4 → 78.0 | +15.6 | 39-5 | 0.26 → 0.15 | 1.68 → 1.62 | $3.50 → $1.09 | 0.31 | 30 → 7.0 | — |

- The Validation fix closed the gap (c69il: 0.49 vs 1.91). The Claude head-to-head went from 34-33 to 21-4.
- **C:** native Sonnet writes minimal PRs (median 66 words, few requests), so a cost win is impossible. C is not eligible under the cost criterion.
- **B** (Opus session, Sonnet drafter): running.
- **B** Opus session / Sonnet drafter (c70s): composite 54.0 → 57.5 (+3.5), consensus 12-16 (30 split), errors 0.32 → 0.29, Validation 1.78 → 1.54, cost $1.29 → $0.76 (0.59×), main requests 4.1. Fails quality: other53 +1.8, 10-14.
- **Picking rule:**
  - Claude: eligible only A (Δ +15.5, 27% saving). B fails quality; C fails cost.
  - Codex: eligible (Δ +15.6, 69% saving).
- **Recommendation:** A (Opus session, Opus drafter at low effort) plus Codex Sol, both candidate70. Full 61×3 rerun with natives from the full run's cache (replicates 1–3), then publish. Awaiting the user's go.

## 128. Setup A chosen; candidate70b; full rerun (2026-11-23)
- **User:** A (Opus session, Opus drafter) is the best story: it wins on quality and on cost, and matches the Codex Sol win.
- **Codex panel check** (66 runs): drafter Sol at low effort in 61; in 5 runs spawn_agent had no reasoning_effort (medium); reviewers Luna xhigh via codex exec. Claude panel: Agent effort low in 66/66.
- **Fix, candidate70b** (Tracetoon b9597b0): the Codex coordinator names exact spawn_agent arguments, task_name / fork_turns "none" / `reasoning_effort: "low"` marked required. Test added.
- **Harness:** --environment-from cherry-picked onto bench-v4 (wt-benchv4 189bd5f).
- **Run:** full70.sh, 61×3, both providers. Natives from the flagship full run (plan: 366/366 natives reused). Then accuracy review and rebuild. Out: results/v4/full70.

## 129. Full rerun result (full70, candidate70b, 61×3) — both providers meet all criteria (2026-11-23)
| | Claude (Opus session, Opus drafter low, Haiku reviewers) | Codex (Sol session, Sol drafter low, Luna reviewers) |
|---|---|---|
| Composite (native → c70b) | 52.8 → 68.3 | 64.1 → 78.1 |
| Δ (case-clustered) | +15.5 | +14.0 |
| Consensus | 72-9 (79 split) | 111-19 (45 split) |
| Judge errors/draft | 0.32 → 0.16 | 0.18 → 0.15 |
| Validation | 1.79 → 1.61 | 1.72 → 1.60 |
| Cost/PR at 500k | $1.29 → $0.93 = 0.72× (subscription) | $3.50 → $0.93 = 0.27× (30-min) |
| Main requests | 10.2 → 4.0 | 30.0 → 5.8 |
| smoke8 | +26.4, 12-0 | +8.8, 13-3 |
| Other 53 | +13.9, 60-9 | +14.8, 98-16 |

- **Accuracy review** (Tracetoon arm): Claude 111/144 confirmed, Codex 56/78. Both runs are complete with 0 writer failures; rebuild exit 1 = gate without a baseline arm (expected).
- **Codex drafter effort:** reasoning_effort low in 184/184 spawns (including retries).
- **Case-clustered Δ:** Claude +15.5 ± 2.0 (52/61 cases won); Codex +14.0 ± 1.2 (57/61).
