#!/usr/bin/env python3
"""Cost model v2 (decisions #116-#118): reprice every model request in a prbench run's
retained writer traces, with and without a carried user context on the main thread.

Usage: flagship-cost.py <run dir (one provider)> [--prefix 500000] [--json out.json]

- Main thread = the writer's own session: Claude, the earliest-starting non-sidechain
  session file; Codex, the earliest-starting rollout. Everything else (Claude
  subagents, nested `claude -p` reviewers, Codex spawned agents and `codex exec`
  reviewers) is delegated and carries no prefix.
- Main-thread requests carry PREFIX cached tokens: billed as cache reads, or as a cache
  write at the main thread's TTL rate when the gap between request starts exceeds that TTL.
  A request's start is the timestamp of the record that triggered it (the preceding
  user / tool-result record), since the TTL timer starts at the beginning of a request.
- Claude scenarios (Claude Code docs): subscription = main 1 h, subagents 5 min;
  api = 5 min / 5 min; api1h = 1 h / 1 h (promptCacheTtl + subagentPromptCacheTtl).
  Cache writes are repriced at the scenario's TTL rate for their thread.
- Codex: 30-min TTL. OpenAI tier: a request whose total input (incl. the prefix) exceeds
  272K is priced at the high tier. Uncached input is billed at the cache-write rate.
"""
import glob, json, os, statistics as st, sys, collections
from datetime import datetime

# USD per M tokens. User-verified 2026-11-21. w5 = 5-min (Claude) / 30-min (OpenAI) write, w1h = 1-h write.
PRICES = {
    "opus":   dict(read=0.20, inp=4.00, out=20.00, w5=5.00, w1h=8.00),
    "sonnet": dict(read=0.10, inp=2.00, out=10.00, w5=2.50, w1h=4.00),
    # Haiku 5.5: $0.10 in / $0.50 out (claude-api skill, <=100K prompts); cache read/write by the
    # standard multipliers (0.1x read, 1.25x 5-min write, 2x 1-h write): an assumption.
    "haiku":  dict(read=0.01, inp=0.10, out=0.50, w5=0.125, w1h=0.20),
    "sol":    dict(read=0.10, inp=2.00, out=10.00, w5=2.50, hi=dict(read=0.20, inp=4.00, out=15.00, w5=5.00)),
    "terra":  dict(read=0.05, inp=1.00, out=5.00, w5=1.25, hi=dict(read=0.10, inp=2.00, out=7.50, w5=2.50)),
    "luna":   dict(read=0.01, inp=0.10, out=0.50, w5=0.10),
}
OPENAI = {"sol", "terra", "luna"}
TIER = 272_000
# scenario -> (main TTL seconds, delegated TTL seconds)
CLAUDE_SCENARIOS = {"subscription": (3600, 300), "api": (300, 300), "api1h": (3600, 3600)}
CODEX_SCENARIOS = {"openai": (1800, 1800)}


def family(model):
    m = (model or "").lower()
    for k in PRICES:
        if k in m:
            return k
    return None


def jsonl(f):
    """Records of a JSONL file; unreadable lines (e.g. torn by a crash) are skipped."""
    out = []
    for line in open(f, errors="replace"):
        line = line.strip().strip("\x00")
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except ValueError:
            pass
    return out


def ts(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp() if s else None


def claude_requests(tdir):
    """Requests per session file; returns list of dicts with start/end, usage and main flag."""
    sessions = []
    for f in glob.glob(f"{tdir}/*.jsonl"):
        lines = jsonl(f)
        side = any(j.get("isSidechain") for j in lines if "isSidechain" in j)
        first = next((ts(j.get("timestamp")) for j in lines if j.get("timestamp")), None)
        msgs, last_trigger = {}, None
        for j in lines:
            if j.get("type") != "assistant":
                if j.get("type") in ("user", "system") and j.get("timestamp"):
                    last_trigger = ts(j["timestamp"])
                continue
            m = j["message"]
            u = m.get("usage") or {}
            cc = u.get("cache_creation") or {}
            mid = m.get("id")
            if mid not in msgs:
                msgs[mid] = dict(start=last_trigger or ts(j.get("timestamp")), model=m.get("model"))
            msgs[mid].update(
                t=ts(j.get("timestamp")),
                inp=u.get("input_tokens", 0), read=u.get("cache_read_input_tokens", 0),
                write=u.get("cache_creation_input_tokens", 0), out=u.get("output_tokens", 0))
        sessions.append((side, first or 0, list(msgs.values())))
    mains = sorted([s for s in sessions if not s[0]], key=lambda s: s[1])
    out = []
    for side, first, reqs in sessions:
        is_main = (not side) and mains and first == mains[0][1]
        for r in reqs:
            r["main"] = bool(is_main)
            out.append(r)
    return out


def codex_requests(tdir):
    files = []
    for f in glob.glob(f"{tdir}/*.jsonl"):
        start, reqs, seen, model, last_trigger = None, [], set(), None, None
        for j in jsonl(f):
            p = j.get("payload") or {}
            t = ts(j.get("timestamp"))
            if j.get("type") == "session_meta" and start is None:
                start = ts(p.get("timestamp") or j.get("timestamp"))
            if j.get("type") == "turn_context" and p.get("model"):
                model = p["model"]
            if j.get("type") == "response_item" and p.get("type") in ("function_call_output", "custom_tool_call_output", "message") and p.get("role", "tool") != "assistant":
                last_trigger = t
            if j.get("type") == "token_usage_record" and p.get("usage"):
                key = p.get("response_id") or (p.get("turn_id"), j.get("ordinal"))
                if key in seen:
                    continue
                seen.add(key)
                u = p["usage"]
                reqs.append(dict(start=last_trigger or t, t=t, model=p.get("model") or model,
                                 inp=u.get("input_tokens", 0) - u.get("cached_input_tokens", 0),
                                 read=u.get("cached_input_tokens", 0), write=0,
                                 out=u.get("output_tokens", 0)))
        files.append((start or 0, reqs))
    files.sort(key=lambda x: x[0])
    out = []
    for i, (_, reqs) in enumerate(files):
        for r in reqs:
            r["main"] = i == 0
            out.append(r)
    return out


def run_cost(reqs, prefix, scenario):
    main_ttl, sub_ttl = scenario
    total = main = 0.0
    expiries = 0
    prev_start = None
    for r in sorted(reqs, key=lambda r: (r["start"] or 0)):
        fam = family(r["model"])
        if fam is None:
            raise SystemExit(f"no price for model {r['model']!r}")
        p = PRICES[fam]
        carried = prefix if r["main"] else 0
        if fam in OPENAI:
            if "hi" in p and r["inp"] + r["read"] + carried > TIER:
                p = p["hi"]
            w = p["w5"]
            cost = r["inp"] * w + r["read"] * p["read"] + r["out"] * p["out"]
        else:
            ttl = main_ttl if r["main"] else sub_ttl
            w = p["w1h"] if ttl >= 3600 else p["w5"]
            cost = r["inp"] * p["inp"] + r["write"] * w + r["read"] * p["read"] + r["out"] * p["out"]
        if carried:
            gap = (r["start"] - prev_start) if (prev_start and r["start"]) else 0
            expired = gap > main_ttl
            expiries += expired
            cost += carried * (w if expired else p["read"])
            prev_start = r["start"]
        cost /= 1e6
        total += cost
        if r["main"]:
            main += cost
    return total, main, expiries


def main():
    root = sys.argv[1]
    prefix = int(sys.argv[sys.argv.index("--prefix") + 1]) if "--prefix" in sys.argv else 500_000
    provider = "claude" if "claude" in json.load(open(f"{root}/manifest.json"))["settings"].get("provider", "codex") else "codex"
    scenarios = CLAUDE_SCENARIOS if provider == "claude" else CODEX_SCENARIOS
    rows = collections.defaultdict(list)
    for t in sorted(glob.glob(f"{root}/attempts/writer/*/*/*/*.traces")):
        system = os.path.basename(t)[: -len(".traces")]
        reqs = claude_requests(t) if provider == "claude" else codex_requests(t)
        if not reqs:
            continue
        row = dict(case=os.path.basename(os.path.dirname(t)),
                   mainRequests=sum(r["main"] for r in reqs), subRequests=sum(not r["main"] for r in reqs),
                   models=sorted({family(r["model"]) or str(r["model"]) for r in reqs}))
        row["raw"] = run_cost(reqs, 0, next(iter(scenarios.values())))[0]
        for name, sc in scenarios.items():
            tot, mn, exp = run_cost(reqs, prefix, sc)
            row[f"{name}"] = tot
            row[f"{name}_main"] = mn
            row[f"{name}_expiries"] = exp
        rows[system].append(row)
    summary = {}
    for system, rs in rows.items():
        keys = [k for k in rs[0] if k not in ("case", "models")]
        summary[system] = {"drafts": len(rs), "models": sorted({m for r in rs for m in r["models"]}),
                           **{k: round(st.mean(r[k] for r in rs), 4) for k in keys}}
    print(json.dumps({"prefix": prefix, "scenarios": list(scenarios), "summary": summary}, indent=1))
    if "--json" in sys.argv:
        json.dump({"prefix": prefix, "summary": summary, "rows": rows}, open(sys.argv[sys.argv.index("--json") + 1], "w"), indent=1)


if __name__ == "__main__":
    main()
