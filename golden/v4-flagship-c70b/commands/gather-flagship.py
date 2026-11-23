#!/usr/bin/env python3
"""Site data for the flagship benchmark (decisions #129): full70, native vs candidate70b, 61x3, subscription cost."""
import json, collections, statistics as st, glob, os, subprocess, sys
R = "$PRBENCH/results/v4/full70"; FULL = "$PRBENCH/results/v4/pool61-flagship-c69il"
COST = "$JOBS/evpage/flagship-cost.py"; C = "tracetoon-candidate"
smoke = set(d for d in os.listdir("$TMP/smoke8") if not d.startswith(".") and d != "preparation.json")
out = {"schema": "tracetoon.flagship-site-data/v1", "run": "results/v4/full70", "cases": 61, "replicates": 3,
       "contextTokens": 500000, "pricing": "USD per M tokens, user-verified 2026-11-21; Claude subscription caching (main thread 1 h, subagents 5 min); Codex 30-min TTL"}
for p, nat, natsrc, scen, setup in (("claude", "claude-native", f"{FULL}/claude-nobg2", "subscription",
                                     {"session": "claude-opus-5-5 (medium)", "drafter": "claude-opus-5-5, effort low (fresh subagent)", "reviewers": "claude-haiku-5-5, effort xhigh (2 passes, claude -p)", "judges": ["claude-opus-5-5", "claude-sonnet-5-5"]}),
                                    ("codex", "codex-native", f"{FULL}/codex", "openai",
                                     {"session": "gpt-6.1-sol (medium)", "drafter": "gpt-6.1-sol, reasoning effort low (spawn_agent)", "reviewers": "gpt-6-luna, effort xhigh (2 passes, codex exec)", "judges": ["gpt-6.1-sol", "gpt-6.1-terra"]})):
    d = json.load(open(f"{R}/{p}/summary.json")); by = collections.defaultdict(lambda: collections.defaultdict(list))
    for s in d["scores"]: by[s["case"]][s["system"]].append(s)
    m = lambda xs, k: st.mean(x[k] for x in xs)
    allc = lambda sysn, k: st.mean(x[k] for v in by.values() for x in v[sysn])
    dl = {c: m(v[C], "composite") - m(v[nat], "composite") for c, v in by.items() if v[C] and v[nat]}
    def pref(sel):
        w = l = sp = 0
        for f in glob.glob(f"{R}/{p}/**/{nat}/pairs.json", recursive=True):
            g = collections.defaultdict(set)
            for r in json.load(open(f)):
                if sel(r["case"]): g[r["case"]].add(r["verdict"])
            for v in g.values():
                if len(v) == 1: x = v.pop(); w += x == C; l += x == nat
                else: sp += 1
        return {"tracetoon": w, "native": l, "split": sp}
    val = collections.defaultdict(list)
    for f in glob.glob(f"{R}/{p}/**/{nat}/pairs.json", recursive=True):
        for pr in json.load(open(f)):
            for arm in (C, nat):
                for s in pr["sides"].get(arm, []):
                    v = (s.get("rubric") or {}).get("validation")
                    if v is not None: val[arm].append(v)
    cc = json.loads(subprocess.run([sys.executable, COST, f"{R}/{p}"], capture_output=True, text=True, check=True).stdout)["summary"]
    cn = json.loads(subprocess.run([sys.executable, COST, natsrc], capture_output=True, text=True, check=True).stdout)["summary"][nat]
    adj = json.load(open(f"{R}/{p}/adjudications.json"))["entries"]
    grp = {}
    for name, sel in (("smoke8", lambda c: c in smoke), ("other53", lambda c: c not in smoke)):
        ds = [v for c, v in dl.items() if sel(c)]
        grp[name] = {"cases": len(ds), "compositeDelta": round(st.mean(ds), 2), "preference": pref(sel)}
    out[p] = {
        "setup": setup,
        "composite": {"native": round(allc(nat, "composite"), 2), "tracetoon": round(allc(C, "composite"), 2)},
        "compositeDelta": round(st.mean(dl.values()), 2), "compositeDeltaSE": round(st.pstdev(dl.values()) / len(dl) ** 0.5, 2),
        "casesWon": sum(x > 0 for x in dl.values()),
        "preference": pref(lambda c: True),
        "judgeErrorsPerDraft": {"native": round(allc(nat, "factualErrors"), 3), "tracetoon": round(allc(C, "factualErrors"), 3)},
        "validationRubric": {"native": round(st.mean(val[nat]), 2), "tracetoon": round(st.mean(val[C]), 2)},
        "costPerPR": {"scenario": scen, "native": round(cn[scen], 3), "tracetoon": round(cc[C][scen], 3), "ratio": round(cc[C][scen] / cn[scen], 3),
                       "rawNative": round(cn["raw"], 3), "rawTracetoon": round(cc[C]["raw"], 3)},
        "mainRequests": {"native": round(cn["mainRequests"], 1), "tracetoon": round(cc[C]["mainRequests"], 1)},
        "accuracyReview": {"tracetoonFlags": len(adj), "confirmed": sum(e["outcome"] == "confirmed" for e in adj)},
        "groups": grp,
    }
json.dump(out, open(f"{R}/flagship-site-data.json", "w"), indent=1)
print(json.dumps({k: (v if k not in ("claude", "codex") else {kk: v[kk] for kk in ("compositeDelta", "preference", "costPerPR")}) for k, v in out.items()}, indent=1)[:2500])
