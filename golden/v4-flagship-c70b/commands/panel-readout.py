#!/usr/bin/env python3
"""Panel readout (decisions #125): subscription-only cost, composite, consensus, errors, Validation, smoke8 split."""
import json, collections, statistics as st, glob, os, subprocess, sys
R = "$PRBENCH/results/v4"; C = "tracetoon-candidate"
COST = "$JOBS/evpage/flagship-cost.py"
smoke = set(d for d in os.listdir("$TMP/smoke8") if not d.startswith(".") and d != "preparation.json")
def readout(label, run, nat, native_cost_run=None):
    d = json.load(open(f"{run}/summary.json")); sc = collections.defaultdict(dict)
    for s in d["scores"]: sc[(s["case"], s["replicate"])][s["system"]] = s
    keys = [k for k, v in sc.items() if C in v and nat in v]
    def pref(sel):
        w = l = sp = 0
        for f in glob.glob(f"{run}/**/{nat}/pairs.json", recursive=True):
            by = collections.defaultdict(set)
            for r in json.load(open(f)):
                if sel(r["case"]): by[r["case"]].add(r["verdict"])
            for v in by.values():
                if len(v) == 1: x = v.pop(); w += x == C; l += x == nat
                else: sp += 1
        return w, l, sp
    val = collections.defaultdict(list)
    for f in glob.glob(f"{run}/**/{nat}/pairs.json", recursive=True):
        for p in json.load(open(f)):
            for arm in (C, nat):
                for s in p["sides"].get(arm, []):
                    x = (s.get("rubric") or {}).get("validation")
                    if x is not None: val[arm].append(x)
    cost = json.loads(subprocess.run([sys.executable, COST, run], capture_output=True, text=True, check=True).stdout)
    scen = "subscription" if "subscription" in cost["scenarios"] else "openai"
    cs = cost["summary"]
    if native_cost_run and nat not in cs:
        cs[nat] = json.loads(subprocess.run([sys.executable, COST, native_cost_run], capture_output=True, text=True, check=True).stdout)["summary"][nat]
    for grp, sel in (("all", lambda c: True), ("smoke8", lambda c: c in smoke), ("other53", lambda c: c not in smoke)):
        ks = [k for k in keys if sel(k[0])]
        if not ks: continue
        n = st.mean(sc[k][nat]["composite"] for k in ks); c = st.mean(sc[k][C]["composite"] for k in ks)
        w, l, sp = pref(sel)
        line = f"{label:34s} {grp:7s} n={len(ks):3d} native {n:5.1f} cand {c:5.1f} Δ {c-n:+5.1f}  consensus {w}-{l} ({sp} split)  err {st.mean(sc[k][nat]['factualErrors'] for k in ks):.2f}->{st.mean(sc[k][C]['factualErrors'] for k in ks):.2f}"
        if grp == "all":
            ratio = cs[C][scen] / cs[nat][scen] if nat in cs else float("nan")
            line += f"  validation {st.mean(val[nat]):.2f}->{st.mean(val[C]):.2f}  cost {scen} ${cs.get(nat,{}).get(scen,float('nan')):.2f}->${cs[C][scen]:.2f} ({ratio:.2f}x)  main {cs.get(nat,{}).get('mainRequests',0):.1f}->{cs[C]['mainRequests']:.1f}"
        print(line)
FULL = f"{R}/pool61-flagship-c69il"
if "--only-b" not in sys.argv: readout("A Opus/Opus (c70)", f"{R}/panelA/claude", "claude-native", f"{FULL}/claude-nobg2")
if os.path.exists(f"{R}/panelB/claude/summary.json"): readout("B Opus/Sonnet drafter (c70s)", f"{R}/panelB/claude", "claude-native", f"{FULL}/claude-nobg2")
if "--only-b" not in sys.argv: readout("C Sonnet/Sonnet (c70)", f"{R}/panelC/claude", "claude-native")
if "--only-b" not in sys.argv: readout("Codex Sol (c70)", f"{R}/panelA/codex", "codex-native", f"{FULL}/codex")
