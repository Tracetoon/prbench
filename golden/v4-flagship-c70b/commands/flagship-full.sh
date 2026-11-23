#!/bin/bash
# Archived as run (paths replaced: $PRBENCH = prbench checkout, $HARNESS = bench-v4 worktree (Codex), $HARNESS_CLAUDE = bench-v4-nobg worktree (Claude), $TMP = scratch dir, $JOBS = helper-script dir).
# Full flagship benchmark (decisions #121): native vs candidate69il, pool61 x 3, Sol/Opus sessions. Separate benchmark (no 3-way).
J=$JOBS; P=$PRBENCH; F=$HARNESS
S=$P/results/evgraph-skills; D=$TMP/pool61; O=$P/results/v4/pool61-flagship-c69il; C=$P/results/v4/pool61-vs-original
LOG=$P/results/v4/final-chain.log; say() { echo "$(date +%F' '%T) [flagship-full] $*" >> $LOG; }
export PRBENCH_CLAUDE_COMMAND='["$TMP/claude-code-2.1.319/node_modules/.bin/claude"]' PRBENCH_WRITER_TIMEOUT_MS=3600000 PRBENCH_JUDGE_TIMEOUT_MS=1800000 TMPDIR=/var/tmp
jj() { [ $1 = claude ] && echo "claude:claude-opus-5-5@medium,claude:claude-sonnet-5-5@medium" || echo "codex:gpt-6.1-sol@medium,codex:gpt-6.1-terra@medium"; }
mm() { [ $1 = claude ] && echo claude-opus-5-5@medium || echo gpt-6.1-sol@medium; }
args() { echo compare --provider $1 --models $(mm $1) --judges $(jj $1) --systems native,candidate --replicates 3 --purpose diagnostic --baseline-skill $S/candidate62 --candidate-skill $S/candidate69il --cases $D --preparation $D/preparation.json --split dev --cache $C/$1-cache --parallel 6 --out $O/$1; }
launch() { (cd $F && bun run src/cli.ts $(args $1) "${@:2}" >> $O/$1.log 2>&1 & echo $! > $TMP/flagfull-$1.pid); sleep 5; say "$1 launched ${*:2}"; $J/reap-code.sh $TMP/flagfull-$1.pid >> $TMP/reap-flagfull.log 2>&1 & }
st() { jq -r .status $O/$1/state.json 2>/dev/null; }
mkdir -p $O; say "start (harness $(cd $F && git rev-parse --short HEAD))"
launch codex; sleep 20; launch claude
declare -A rs=([codex]=0 [claude]=0)
while :; do n=0
  for prov in codex claude; do kill -0 $(cat $TMP/flagfull-$prov.pid) 2>/dev/null && continue
    s=$(st $prov); if [ "$s" = complete ] || [ ${rs[$prov]} -ge 3 ]; then n=$((n+1)); continue; fi
    rs[$prov]=$((rs[$prov]+1)); say "$prov exited '$s'; resume #${rs[$prov]}"; launch $prov --resume --recover-lock; done
  [ $n -ge 2 ] && break; sleep 60; done
say "runs done codex=$(st codex) claude=$(st claude)"
for prov in codex claude; do [ "$(st $prov)" = complete ] || continue
  (cd $F && bun run src/cli.ts accuracy-review --run $O/$prov --cases $D --out $O/$prov-accuracy --decider claude-fable-5-1 --parallel 6 --write >> $O/$prov-accuracy.log 2>&1); say "$prov accuracy exit $?"
  (cd $F && bun run src/cli.ts $(args $prov) --resume --report-only >> $O/$prov.report.log 2>&1); say "$prov rebuilt exit $?"
done
say done
