#!/bin/bash
# Archived as run (paths replaced: $PRBENCH = prbench checkout, $HARNESS = bench-v4 worktree, $TMP = scratch dir, $JOBS = helper-script dir).
# Generic round: $1 candidate, $2 out name (results/v4/tuning/<name>), $3 cases dir, $4 replicates. Both judges (comma form), original drafts reused.
CAND=$1; ROUND=$2; D=$3; REPS=$4
P=$PRBENCH; F=$HARNESS; S=$P/results/evgraph-skills; O=$P/results/v4/tuning/$ROUND; C=$P/results/v4/pool61-vs-original
export PRBENCH_CLAUDE_COMMAND='["$TMP/claude-code-2.1.319/node_modules/.bin/claude"]' PRBENCH_WRITER_TIMEOUT_MS=3600000 PRBENCH_JUDGE_TIMEOUT_MS=1800000 TMPDIR=/var/tmp
mkdir -p $O
for prov in codex claude; do
  if [ $prov = claude ]; then m=claude-sonnet-5-5@medium; j=claude:claude-opus-5-5@medium,claude:claude-sonnet-5-5@medium; else m=gpt-6.1-terra@medium; j=codex:gpt-6.1-sol@medium,codex:gpt-6.1-terra@medium; fi
  (cd $F && bun run src/cli.ts compare --provider $prov --models $m --judges $j --systems baseline,candidate --replicates $REPS --purpose diagnostic --baseline-skill $S/baseline --candidate-skill $S/$CAND --cases $D --preparation $D/preparation.json --split dev --cache $C/$prov-cache --parallel 6 --out $O/$prov > $O/$prov.log 2>&1 & echo $! > $TMP/round-$ROUND-$prov.pid)
  sleep 20; $JOBS/reap-code.sh $TMP/round-$ROUND-$prov.pid >> $TMP/reap-round.log 2>&1 &
done
for prov in codex claude; do while kill -0 $(cat $TMP/round-$ROUND-$prov.pid) 2>/dev/null; do sleep 60; done; echo "$prov: $(jq -r .status $O/$prov/state.json) judges=$(jq -c .settings.judges $O/$prov/manifest.json)"; done
