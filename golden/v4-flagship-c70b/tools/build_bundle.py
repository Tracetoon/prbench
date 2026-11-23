#!/usr/bin/env python3
"""Rebuilds the curated golden bundle from a finished prbench run folder.

    python3 tools/build_bundle.py <run-dir> <out-dir>

<run-dir> is the run's results folder (it holds codex/, claude/, *-accuracy/ and
flagship-site-data.json). Each provider's writer model is read from its
manifest, and verdicts are taken from every comparison the run judged (here
the candidate against the provider's native agent). Only curated, path-free data is copied:
manifests, summaries without per-draft traces, per-draft scores, pairwise
verdicts, accuracy findings and adjudications, and draft titles/bodies.
Traces, sandboxes, raw sessions, attempt logs and receipts are never read.
Local paths are replaced with placeholders, and the script fails if any remain.
"""
import csv, glob, json, os, re, sys

RUN, OUT = sys.argv[1], sys.argv[2]
PROVIDERS = ["codex", "claude"]
PATHS = [
    (re.compile(r"/var/home/[A-Za-z0-9._-]+"), "<home>"),
    (re.compile(r"/home/(?!user\b)[A-Za-z0-9._-]+"), "<home>"),
    (re.compile(r"/var/tmp/[A-Za-z0-9._-]+"), "<tmp>"),
    (re.compile(r"/tmp/claude-[0-9]+"), "<tmp>"),
]
EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
EMAIL_OK = re.compile(r"@(?:example\.(?:invalid|com|org)|users\.noreply\.github\.com|anthropic\.com|github\.com)$|\.service$|^noreply@")


def scrub(text):
    for rx, rep in PATHS:
        text = rx.sub(rep, text)
    return text


def write(rel, data):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    text = data if isinstance(data, str) else json.dumps(data, indent=1, ensure_ascii=False) + "\n"
    with open(path, "w") as f:
        f.write(scrub(text))


def load(p):
    with open(p) as f:
        return json.load(f)


def replicate_dirs(run, model):
    yield 1, os.path.join(run, model)
    for d in sorted(glob.glob(os.path.join(run, "replicate-*"))):
        yield int(d.rsplit("-", 1)[1]), os.path.join(d, model)


for prov in PROVIDERS:
    run = os.path.join(RUN, prov)
    model = load(f"{run}/manifest.json")["settings"]["models"][0]
    write(f"{prov}/manifest.json", load(f"{run}/manifest.json"))
    with open(f"{run}/summary.md") as f:
        write(f"{prov}/summary.md", f.read())
    summary = load(f"{run}/summary.json")
    keep = ("durationMs", "writerOutcome", "pricedCost", "subagentThreads", "inputTokens", "cachedInputTokens", "outputTokens", "usageByModel", "workflow")
    summary["writerMetrics"] = [
        {"case": m["case"], "system": m["system"], "replicate": m["replicate"], "model": m["model"], **{k: m[k] for k in keep if k in m}}
        for m in summary["writerMetrics"]
    ]
    summary.pop("operationalHistory", None)  # attempt-level bookkeeping with local paths
    summary["_curation"] = "writerMetrics reduced to timing, outcome, tokens and priced cost; operationalHistory omitted (attempt bookkeeping). Full file stays with the raw run."
    write(f"{prov}/summary.json", summary)
    for name in ("accuracy-findings.json", "adjudications.json"):
        write(f"{prov}/{name}", load(f"{run}/{name}"))

    cols = ["replicate", "case", "system", "composite", "claims", "context", "uncertainties", "rubric", "factualErrors", "unsupportedClaims", "traps", "errorRate", "judgments", "costUsd", "costSource", "inputTokens", "cachedInputTokens", "outputTokens", "subagentThreads"]
    with open(os.path.join(OUT, prov, "scores.csv"), "w", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["provider", "model"] + cols)
        for s in sorted(summary["scores"], key=lambda s: (s["case"], s["replicate"], s["system"])):
            w.writerow([prov, s["model"]] + [s.get(c, "") for c in cols])

    drafts, verdicts = [], []
    for rep, mdir in replicate_dirs(run, model):
        for p in sorted(glob.glob(f"{mdir}/artifacts/*/*.json")):
            if p.endswith((".status.json", ".receipt.json", ".scope-audit.json")):
                continue
            a = load(p)
            if a.get("schema") != "prbench.artifact/v1":
                continue
            drafts.append({"provider": prov, "model": model, "replicate": rep, "case": a["case"], "system": a["system"], "title": a.get("title"), "body": a.get("body")})
        for pairs in sorted(glob.glob(f"{mdir}/*/pairs.json")):
          for r in load(pairs):
            verdicts.append([prov, rep, r["case"], r["judge"], r["x"], r["y"], r["verdict"], r.get("flipped", False)])
    with open(os.path.join(OUT, prov, "drafts.jsonl"), "w") as f:
        for d in drafts:
            f.write(scrub(json.dumps(d, ensure_ascii=False)) + "\n")
    with open(os.path.join(OUT, prov, "verdicts.csv"), "w", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["provider", "replicate", "case", "judge", "x", "y", "verdict", "flipped"])
        w.writerows(sorted(verdicts, key=lambda v: (v[2], v[1], v[3])))

    nat = os.path.join(RUN, f"native-{prov}")
    if os.path.isdir(nat):
        with open(f"{nat}/summary.md") as f:
            write(f"native-showcase/{prov}-summary.md", f.read())
        with open(os.path.join(OUT, "native-showcase", f"{prov}-drafts.jsonl"), "w") as f:
            for p in sorted(glob.glob(f"{nat}/*/artifacts/*/*.json")):
                if p.endswith((".status.json", ".receipt.json", ".scope-audit.json")):
                    continue
                a = load(p)
                f.write(scrub(json.dumps({"provider": prov, "case": a["case"], "system": a["system"], "title": a.get("title"), "body": a.get("body")}, ensure_ascii=False)) + "\n")

write("flagship-site-data.json", load(os.path.join(RUN, "flagship-site-data.json")))
for prov in PROVIDERS:
    for suffix, name in (("", "cost-model.json"), ("-native", "cost-model-native.json")):
        cost = os.path.join(RUN, f"cost-model-{prov}{suffix}.json")
        if os.path.exists(cost):
            write(f"{prov}/{name}", load(cost))

# Fail closed: no local path or unexpected e-mail address may remain.
bad = []
for root, _, files in os.walk(OUT):
    if os.sep + "tools" in root[len(OUT):]:
        continue
    for name in files:
        p = os.path.join(root, name)
        with open(p, errors="replace") as f:
            text = f.read()
        if re.search(r"/var/home/|/home/(?!user\b)[A-Za-z0-9._-]+/|/var/tmp/prbench", text):
            bad.append(f"{p}: local path")
        for m in EMAIL.findall(text):
            if not EMAIL_OK.search(m):
                bad.append(f"{p}: e-mail {m}")
if bad:
    sys.exit("\n".join(sorted(set(bad))[:50]))
print("ok")
