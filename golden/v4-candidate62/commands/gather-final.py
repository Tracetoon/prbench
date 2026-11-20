# Archived as run: builds site-data-final.json (RUN=<run dir>, POOL=<cases dir>). Paths replaced as in the shell scripts.
#!/usr/bin/env python3
"""Builds site-data-final.json from the overnight full run (results/v4/pool61-final) in the same schema as
site-data.json, plus a three-way showcase (native / original / graph) from the native mini-run."""
import collections, glob, json, math, os, random, re, statistics as st

P = os.environ.get("RUN", "$PRBENCH/results/v4/pool61-final2")
OLD = json.load(open("$PRBENCH/results/v4/pool61-vs-original/site-data.json"))
C, B, N = "tracetoon-candidate", "tracetoon-baseline", "native"
TUNE = set(json.load(open("$PRBENCH/results/v4/tuning/missed-facts.json"))["tuning"]) | set(
    json.load(open("$PRBENCH/results/v4/tuning/missed-facts.json"))["controls"])
random.seed(7)


def pairs(root):
    per = collections.defaultdict(list)
    for f in glob.glob(f"{root}/**/tracetoon-baseline/pairs.json", recursive=True):
        byc = collections.defaultdict(dict)
        for r in json.load(open(f)):
            if {r["x"], r["y"]} == {B, C}:
                byc[r["case"]][r["judge"]] = r["verdict"]
        for c, v in byc.items():
            per[c].append(v)
    return per


def pref(per, which, cases):
    def tally(cs):
        w = l = 0
        for c in cs:
            for v in per[c]:
                if which == "consensus":
                    vs = set(v.values())
                    if len(vs) == 1:
                        x = vs.pop(); w += x == C; l += x == B
                else:
                    x = v.get(which); w += x == C; l += x == B
        return w, l
    w, l = tally(cases)
    boots = []
    for _ in range(4000):
        bw, bl = tally([random.choice(cases) for _ in cases])
        if bw + bl: boots.append(bw / (bw + bl))
    boots.sort()
    return {"wins": w, "losses": l, "share": round(w / (w + l), 3) if w + l else None,
            "clusterCI": [round(boots[int(.025 * len(boots))], 3), round(boots[int(.975 * len(boots)) - 1], 3)],
            "bootP_share_le_half": round(sum(b <= .5 for b in boots) / len(boots), 4)}


site = {k: OLD[k] for k in ("suite", "reference5case")}
site["generated"] = os.environ.get("GENERATED", "2026-11-17")
site["run"] = os.environ.get("RUN_NOTE", "prbench bench-v4 (writer side f4f7139), 61 cases x 3 replicates, pre-registered judge pairs, original-workflow drafts reused from the 2026-11-16 run (diagnostic purpose)")
site["candidate"] = os.environ.get("CANDIDATE", "candidate58 (Tracetoon 160b49f)")
site["previous"] = {p: {"compositeDelta": OLD[p]["compositeDelta"], "costRatio": OLD[p]["costRatio"], "preference": OLD[p]["preference"]["consensus"]} for p in ("codex", "claude")}
for p in ("codex", "claude"):
    d = json.load(open(f"{P}/{p}/summary.json"))
    sc = collections.defaultdict(lambda: collections.defaultdict(list)); arm = collections.defaultdict(lambda: collections.defaultdict(list))
    for s in d["scores"]:
        sc[s["case"]][s["system"]].append(s["composite"])
        for k in ("composite", "claims", "context", "uncertainties", "rubric", "factualErrors", "unsupportedClaims", "traps", "costUsd", "inputTokens", "outputTokens"):
            if s.get(k) is not None: arm[s["system"]][k].append(s[k])
    percase = {c: round(st.mean(v[C]) - st.mean(v[B]), 2) for c, v in sc.items()}
    comp = {sys: {k: round(st.mean(v), 4) for k, v in a.items()} for sys, a in arm.items()}
    for sys in (B, C): comp[sys]["compositeCaseMean"] = round(st.mean(st.mean(v[sys]) for v in sc.values()), 2)
    per = pairs(f"{P}/{p}"); cases = sorted(per)
    judges = sorted({j for c in per for v in per[c] for j in v})
    pg, q = d["performanceGate"], d["qualityGate"]
    # composite delta + CI from the summary's paired table
    md = open(f"{P}/{p}/summary.md").read()
    m = re.search(r"\| tracetoon-baseline \| 183 \| (-?[\d.]+) \[(-?[\d.]+), (-?[\d.]+)\] \| -?[\d.]+ to", md)
    untouched = [c for c in cases if c not in TUNE]
    site[p] = {"model": d["scores"][0]["model"], "judges": d["scores"][0]["judges"],
               "preference": {**{j: pref(per, j, cases) for j in judges}, "consensus": pref(per, "consensus", cases)},
               "preferenceUntouched": pref(per, "consensus", untouched),
               "caseLevel": {"candidateBetterCases": sum(v > 0 for v in percase.values()), "cases": len(percase)},
               "components": comp, "perCaseDelta": dict(sorted(percase.items(), key=lambda kv: kv[1])),
               "untouchedMeanDelta": round(st.mean(percase[c] for c in untouched), 2), "tunedMeanDelta": round(st.mean(percase[c] for c in cases if c in TUNE), 2),
               "costRatio": round(pg["geometricMeanCostRatio"], 3), "costRatioCI": [round(x, 3) for x in pg["costRatio95CI"]],
               "writerTimeRatio": round(pg["geometricMeanWriterRatio"], 3), "writerTimeRatioCI": [round(x, 3) for x in pg["writerRatio95CI"]],
               "accuracy": q["accuracy"], "gate": {"quality": q["status"], "failures": q["failures"], "performance": pg["status"]},
               "judgeAgreement": d["reports"][0]["report"].get("judgeAgreement"),
               "compositeDelta": [float(m.group(1)), float(m.group(2)), float(m.group(3))] if m else None}

# three-way showcase from the native mini-run (Codex and Claude)
three = []
for p in ("codex", "claude"):
    root = f"{P}/native-{p}"
    if not os.path.exists(f"{root}/summary.json"): continue
    for f in glob.glob(f"{root}/**/artifacts/*/{p}-native.json", recursive=True):
        case = f.split("/")[-2]; adir = os.path.dirname(f)
        drafts = {}
        for sysn in (N, B, C):
            fp = f"{adir}/{p + '-native' if sysn == N else sysn}.json"
            if os.path.exists(fp):
                a = json.load(open(fp)); body = re.sub(r"<!--.*?-->", "", a.get("body", ""), flags=re.S)
                drafts[sysn] = {"title": a.get("title"), "body": re.sub(r"<sub>Assisted-by.*?</sub>", "", body, flags=re.S).strip(), "costUsd": None}
        # judge assessments per system: errors / unsupported / coverage ids
        ann = collections.defaultdict(lambda: {"contradicted": set(), "unsupported": set(), "covered": collections.Counter(), "n": 0})
        for pf in glob.glob(f"{root}/**/pairs.json", recursive=True):
            for r in json.load(open(pf)):
                if r["case"] != case: continue
                for sysn, sides in r["sides"].items():
                    sysn = N if sysn.endswith("-native") else sysn
                    for s in sides:
                        a = ann[sysn]; a["n"] += 1
                        for ca in s.get("claimAssessments", []):
                            if ca.get("status") in ("contradicted", "unsupported"): a[ca["status"]].add(ca["claim"])
                        for k in ("claimsCovered", "contextCovered"):
                            a["covered"].update(s.get(k, []))
        facts = json.load(open(f"{root}/inputs/cases/{case}/facts.json"))
        sc = json.load(open(f"{root}/summary.json"))["scores"]
        nm = lambda x: N if x.endswith("-native") else x
        comps = {nm(s["system"]): s["composite"] for s in sc if s["case"] == case}
        costs = {nm(s["system"]): s.get("costUsd") for s in sc if s["case"] == case}
        for sysn in drafts: drafts[sysn]["costUsd"] = costs.get(sysn); drafts[sysn]["composite"] = comps.get(sysn)
        three.append({"provider": p, "case": case, "drafts": drafts, "facts": {k: facts.get(k, []) for k in ("claims", "context", "uncertainties", "traps")},
                      "annotations": {k: {"contradicted": sorted(v["contradicted"]), "unsupported": sorted(v["unsupported"]),
                                          "covered": {i: c for i, c in v["covered"].items()}, "judgments": v["n"]} for k, v in ann.items()}})
site["threeWay"] = three

# ---- extra stats for the report: rubric items, error rate, token use by model, tuning rounds, session context ----
PRICES = {"gpt-6.1-terra": (1.0, 0.05, 5.0), "gpt-6-luna": (0.10, 0.01, 0.50)}  # $/M input, cached input, output
for p in ("codex", "claude"):
    rub = collections.defaultdict(lambda: collections.defaultdict(list))
    for f in glob.glob(f"{P}/{p}/**/tracetoon-baseline/pairs.json", recursive=True):
        for r in json.load(open(f)):
            if {r["x"], r["y"]} != {B, C}: continue
            for sysn, sides in r["sides"].items():
                for s in sides:
                    for k, v in (s.get("rubric") or {}).items():
                        if v is not None: rub[sysn][k].append(v)
    site[p]["rubricItems"] = {sysn: {k: round(st.mean(v), 3) for k, v in items.items()} for sysn, items in rub.items()}
    d = json.load(open(f"{P}/{p}/summary.json"))
    er = collections.defaultdict(list); th = collections.defaultdict(list)
    for s in d["scores"]:
        if s.get("errorRate") is not None: er[s["system"]].append(s["errorRate"])
        if s.get("subagentThreads") is not None: th[s["system"]].append(s["subagentThreads"])
    for sysn in (B, C):
        site[p]["components"][sysn]["errorRate"] = round(st.mean(er[sysn]), 4)
        if th[sysn]: site[p]["components"][sysn]["subagentThreads"] = round(st.mean(th[sysn]), 2)
    um = collections.defaultdict(lambda: collections.defaultdict(float)); n = collections.Counter()
    for w in d["writerMetrics"]:
        n[w["system"]] += 1
        for m, u in (w.get("usageByModel") or {}).items():
            cost = u.get("costUsd")
            if cost is None and m in PRICES:
                pi, pc, po = PRICES[m]
                cost = ((u["inputTokens"] - u["cachedInputTokens"]) * pi + u["cachedInputTokens"] * pc + u["outputTokens"] * po) / 1e6
            for k in ("inputTokens", "cachedInputTokens", "outputTokens"): um[(w["system"], m)][k] += u[k]
            um[(w["system"], m)]["costUsd"] += cost or 0
    site[p]["usageByModel"] = {sysn: {m: {k: round(v / n[sysn], 4 if k == "costUsd" else 0) for k, v in um[(s2, m)].items()}
                                      for (s2, m) in um if s2 == sysn} for sysn in (B, C)}

TUN = "$PRBENCH/results/v4/tuning"
rounds = []
for r in ("r1-c54", "r2-c56", "r3-c57", "r4-c58"):
    g = open(f"{TUN}/{r}/gate.txt").read(); row = {"round": r.split("-")[0], "candidate": "candidate" + r.split("-c")[1]}
    for p in ("codex", "claude"):
        ln = next(x for x in g.splitlines() if x.startswith(p + ":"))
        cons = re.search(r"consensus (\d+)-(\d+) -> (\d+)-(\d+)", ln); a25 = re.search(r"all25 ([-+\d.]+) -> ([-+\d.]+)", ln)
        row[p] = {"before": [int(cons.group(1)), int(cons.group(2))], "picks": [int(cons.group(3)), int(cons.group(4))],
                  "all25Before": float(a25.group(1)), "all25": float(a25.group(2))}
    rounds.append(row)
site["tuningRounds"] = rounds

fc = collections.defaultdict(list)
for f in glob.glob(f"{P}/codex/inputs/cases/*/facts.json"):
    x = json.load(open(f))
    for k in ("claims", "context", "uncertainties", "traps"): fc[k].append(len(x.get(k, [])))
site["suite"]["factCounts"] = {k: [min(v), max(v), round(st.mean(v), 1)] for k, v in fc.items()}
SESS = os.environ.get("POOL", "$TMP/pool61")
import runpy
here = os.path.dirname(os.path.abspath(__file__))
runpy.run_path(os.path.join(here, "session-context.py"))
site["sessionContext"] = {k: v["endContext"] for k, v in json.load(open(os.path.join(here, "session-context.json"))).items()}
json.dump(site, open(f"{P}/site-data-final.json", "w"), indent=1)
print("ok", {p: (site[p]["compositeDelta"], site[p]["preference"]["consensus"]["share"], site[p]["costRatio"]) for p in ("codex", "claude")}, len(three))
