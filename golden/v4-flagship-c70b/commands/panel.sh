#!/bin/bash
# Archived as run (paths replaced: $PRBENCH = prbench checkout, $HARNESS = bench-v4 worktree (Codex), $HARNESS_CLAUDE = bench-v4-nobg worktree (Claude), $TMP = scratch dir, $JOBS = helper-script dir).
# Panel runner (decisions #125). Args: OUTNAME CASESDIR REPS CANDIDATE PROVIDERS(codex,claude) CLAUDEMODEL [extra...]
# Claude runs from wt-benchv4-nobg (background tasks disabled), Codex from wt-benchv4, as in the flagship full run (cache reuse).
OUTN=$1; D=$2; REPS=$3; CAND=$4; PROVS=${5//,/ }; CM=${6:-claude-opus-5-5@medium}; shift 6
P=$PRBENCH; S=$P/results/evgraph-skills; O=$P/results/v4/$OUTN; C=$P/results/v4/pool61-vs-original
LOG=$P/results/v4/final-chain.log; say() { echo "$(date +%F' '%T) [$OUTN] $*" >> $LOG; }
export PRBENCH_CLAUDE_COMMAND='["$TMP/claude-code-2.1.319/node_modules/.bin/claude"]' PRBENCH_WRITER_TIMEOUT_MS=3600000 PRBENCH_JUDGE_TIMEOUT_MS=1800000 TMPDIR=/var/tmp
# __ENVFROM__ in extra args = the flagship full run of this provider (claude-nobg2 / codex).
ef() { [ $1 = claude ] && echo $P/results/v4/pool61-flagship-c69il/claude-nobg2 || echo $P/results/v4/pool61-flagship-c69il/codex; }
xa() { local prov=$1; shift; for a in "$@"; do [ "$a" = __ENVFROM__ ] && echo $(ef $prov) || echo $a; done; }
wt() { [ $1 = claude ] && echo $HARNESS_CLAUDE || echo $HARNESS; }
jj() { [ $1 = claude ] && echo "claude:claude-opus-5-5@medium,claude:claude-sonnet-5-5@medium" || echo "codex:gpt-6.1-sol@medium,codex:gpt-6.1-terra@medium"; }
mm() { [ $1 = claude ] && echo $CM || echo gpt-6.1-sol@medium; }
args() { echo compare --provider $1 --models $(mm $1) --judges $(jj $1) --systems native,candidate --replicates $REPS --purpose diagnostic --baseline-skill $S/candidate62 --candidate-skill $S/$CAND --cases $D --preparation $D/preparation.json --split dev --cache $C/$1-cache --parallel 6 --out $O/$1; }
mkdir -p $O
if [ "$1" = --plan ]; then for prov in $PROVS; do (cd $(wt $prov) && bun run src/cli.ts $(args $prov) --plan $(xa $prov "${@:2}")); done; exit; fi
say "start cand=$CAND provs=$PROVS claude=$CM"
for prov in $PROVS; do (cd $(wt $prov) && bun run src/cli.ts $(args $prov) $(xa $prov "$@") >> $O/$prov.log 2>&1 & echo $! > $TMP/$OUTN-$prov.pid); sleep 20; done
for prov in $PROVS; do p=$(cat $TMP/$OUTN-$prov.pid); while kill -0 $p 2>/dev/null; do sleep 60; done; say "$prov: $(jq -r .status $O/$prov/state.json)"; done
say done
