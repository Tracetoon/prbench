#!/usr/bin/env python3
"""Flagship anchor readout: composite per system, consensus picks per pairing, cost raw and at 500k (decisions #116)."""
import collections, glob, json, statistics as st, subprocess, sys
R = sys.argv[1]; C = "tracetoon-candidate"
COST = "$JOBS/evpage/flagship-cost.py"
for p in ("codex", "claude"):
    d = json.load(open(f"{R}/{p}/summary.json"))
    sc = collections.defaultdict(dict)
    for s in d["scores"]: sc[s["case"]][s["system"]] = s
    systems = sorted({s for v in sc.values() for s in v})
    full = [c for c, v in sc.items() if len(v) == len(systems)]
    print(f"== {p}: {len(full)} complete cases of {len(sc)}; status {d['status']}")
    for s in systems:
        print(f"   {s:22s} composite {st.mean(sc[c][s]['composite'] for c in full):6.1f}  errors/draft {st.mean(sc[c][s]['factualErrors'] for c in full):.2f}")
    for other in [s for s in systems if s != C]:
        dl = [sc[c][C]["composite"] - sc[c][other]["composite"] for c in full]
        w = l = sp = 0
        for f in glob.glob(f"{R}/{p}/*/{other}/pairs.json"):
            byc = collections.defaultdict(lambda: collections.defaultdict(set))
            for r in json.load(open(f)):
                if r["case"] in full: byc[r["case"]][r["judge"]].add(r["verdict"])
            for v in byc.values():
                vs = set().union(*v.values())
                if len(vs) == 1: x = vs.pop(); w += x == C; l += x == other
                else: sp += 1
        se = st.pstdev(dl) / len(dl) ** 0.5
        print(f"   c68 vs {other:20s} composite Δ {st.mean(dl):+5.1f} ± {se:.1f}   consensus {w}-{l} (split {sp})")
    out = json.loads(subprocess.run([sys.executable, COST, f"{R}/{p}"], capture_output=True, text=True, check=True).stdout)
    scen = out["scenarios"]; summ = out["summary"]
    for s, v in sorted(summ.items()):
        print(f"   cost {s:22s} raw ${v['raw']:.3f}  " + "  ".join(f"{k} ${v[k]:.3f}" for k in scen) + f"  main req {v['mainRequests']:.1f}  expiries " + "/".join(f"{v[k + '_expiries']:.1f}" for k in scen))
    nat = next((s for s in summ if s.endswith("-native")), None)
    if nat and C in summ:
        print("   cost ratio c/native  " + "  ".join(f"{k} {summ[C][k] / summ[nat][k]:.2f}" for k in scen))
