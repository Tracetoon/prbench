/**
 * Finds candidate replay cases in recent agent sessions: changes a session
 * committed to a real repository, not already in the case pool.
 *
 *   bun run scripts/discover-cases.ts --since 2026-09-01 [--root <session dir>]... \
 *     [--pool <cases dir>]... [--candidates datasets/expansion/candidates.json] [--json]
 *
 * Session roots default to ~/.claude/projects and ~/.codex/sessions, plus the
 * staged copies under ~/.cache/prbench/staging/sessions. For each session it
 * reads the recorded working directory and time span, resolves the repository,
 * and takes the commits authored in that span (plus ten minutes) on the
 * repository's branches. Consecutive commits form one change: base is the
 * parent of the first, head the last, when the first is an ancestor of the
 * last. Changes already in the pool (same repository and head, or a head the
 * pool already covers) are skipped. Benchmark sandboxes and temp folders are
 * ignored. Nothing is copied: the output lists candidates for import-cases.ts.
 */
import { closeSync, existsSync, openSync, readdirSync, readFileSync, readSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";

const argv = process.argv.slice(2);
const all = (n: string) => argv.flatMap((a, i) => (a === n ? [argv[i + 1]!] : []));
const one = (n: string) => all(n)[0];
const since = Date.parse(one("--since") ?? "2026-09-01");
const late = argv.includes("--late");
const home = homedir();
const roots = all("--root").length
  ? all("--root")
  : [join(home, ".claude", "projects"), join(home, ".codex", "sessions"), join(home, ".cache", "prbench", "staging", "sessions")];

const git = (cwd: string, args: string[]) => {
  const r = Bun.spawnSync(["git", "-c", "core.fsmonitor=false", "-C", cwd, ...args], { stdout: "pipe", stderr: "pipe" });
  return r.exitCode === 0 ? r.stdout.toString().trim() : undefined;
};

function* jsonlFiles(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* jsonlFiles(p);
    else if (e.isFile() && e.name.endsWith(".jsonl")) yield p;
  }
}

interface Session { path: string; agent: "claude-code" | "codex"; cwd: string; start: number; end: number; text: string }

const chunk = (path: string, from: number, len: number) => {
  const fd = openSync(path, "r");
  try { const b = Buffer.alloc(len); const n = readSync(fd, b, 0, len, from); return b.subarray(0, n).toString("utf8"); } finally { closeSync(fd); }
};
function readSession(path: string): Session | undefined {
  const st = statSync(path);
  if (st.mtimeMs < since || st.size < 2000) return undefined;
  // The working directory and start time are near the top; the end time is in the last records.
  const head = chunk(path, 0, Math.min(st.size, 256_000));
  const tail = st.size > 256_000 ? chunk(path, st.size - 256_000, 256_000) : "";
  let cwd: string | undefined, start = Infinity, end = 0, agent: Session["agent"] = path.includes("/.codex/") || basename(path).startsWith("rollout-") ? "codex" : "claude-code";
  for (const line of (head + "\n" + tail).split("\n")) {
    if (!line) continue;
    let d: any;
    try { d = JSON.parse(line); } catch { continue; }
    const t = Date.parse(d.timestamp ?? "");
    if (Number.isFinite(t)) { start = Math.min(start, t); end = Math.max(end, t); }
    cwd ??= d.cwd ?? d.payload?.cwd;
    if (d.type === "session_meta") agent = "codex";
  }
  if (!cwd || !Number.isFinite(start) || end < since) return undefined;
  if (/^\/(tmp|var\/tmp)\//.test(cwd) || /prbench-|tracetoon-codex-|\/\.claude\/jobs\//.test(cwd)) return undefined;
  return { path, agent, cwd, start, end, get text() { return readFileSync(path, "utf8"); } };
}

// The pool: every case's repository head and base, so covered changes are skipped.
const pool = new Set<string>();
for (const dir of all("--pool"))
  for (const c of existsSync(dir) ? readdirSync(dir) : []) {
    const f = join(dir, c, "case.json");
    if (!existsSync(f)) continue;
    const k = JSON.parse(readFileSync(f, "utf8"));
    if (k.repo?.head) pool.add(String(k.repo.head));
    if (k.repo?.base) pool.add(`base:${k.repo.base}`);
  }
const candFile = one("--candidates");
if (candFile && existsSync(candFile)) for (const c of JSON.parse(readFileSync(candFile, "utf8")).cases ?? []) pool.add(String(c.head));

interface Change { repo: string; base: string; head: string; commits: number; insertions: number; deletions: number; files: number; subject: string; sessions: { agent: string; path: string }[]; start: string }
const changes = new Map<string, Change>();
const skipped: Record<string, number> = {};
const skip = (why: string) => (skipped[why] = (skipped[why] ?? 0) + 1);
// Staged mirrors of repositories that live on other machines (codex-dev).
const mirrors = join(home, ".cache", "prbench", "staging", "repos");
const mirrorFor = (cwd: string) => {
  const name = basename(cwd);
  for (const m of existsSync(mirrors) ? readdirSync(mirrors) : [])
    if (m.replace(/\.git$/, "").toLowerCase() === name.toLowerCase()) return join(mirrors, m);
  return undefined;
};
const childRepos = (dir: string) =>
  readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && existsSync(join(dir, e.name, ".git"))).map((e) => join(dir, e.name));
const allMirrors = () => (existsSync(mirrors) ? readdirSync(mirrors).map((m) => join(mirrors, m)) : []);
const mentions = (text: string, repo: string) => {
  const name = basename(repo).replace(/\.git$/, "");
  return name.length >= 4 && new RegExp(`[/\\s"'\`]${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[/\\s"'\`]`, "i").test(text);
};
for (const root of roots)
  for (const path of jsonlFiles(root)) {
    const s = readSession(path);
    if (!s) { skip("old, tiny or sandbox session"); continue; }
    // A removed agent worktree (<repo>/.claude/worktrees/<name>) committed into <repo>.
    const wt = /^(.*)\/\.claude\/worktrees\/[^/]+/.exec(s.cwd)?.[1];
    const local = existsSync(s.cwd) ? s.cwd : wt && existsSync(wt) ? wt : undefined;
    const top = local ? git(local, ["rev-parse", "--show-toplevel"]) : mirrorFor(s.cwd);
    // A session started in a parent folder (a workspace of several repositories):
    // the child repositories, or the staged mirrors, whose name the session mentions.
    const repos = top ? [top] : (() => { const text = s.text; return (local ? childRepos(local) : allMirrors()).filter((r) => mentions(text, r)); })();
    if (!repos.length) { skip("no repository for cwd"); continue; }
    for (const repo of repos) {
    const window = (after: number) => git(repo, ["log", "--all", "--no-merges", `--since=@${Math.floor(s.start / 1000)}`, `--until=@${Math.floor(s.end / 1000) + after}`, "--format=%H %ct %s"]);
    let log = window(600);
    // Agents often leave the work uncommitted and the user commits it later: allow
    // commits up to three hours after the session when they touch a file the session names.
    if (!log && late) {
      const text = s.text;
      const named = (h: string) => (git(repo, ["show", "--name-only", "--format=", h]) ?? "").split("\n").some((f) => f && text.includes(basename(f)) && basename(f).length >= 6);
      log = (window(3 * 3600) ?? "").split("\n").filter((l) => l && named(l.split(" ")[0]!)).join("\n") || undefined;
      if (log) skip("committed after the session (late window)");
    }
    if (!log) { skip("no commits in the session window"); continue; }
    const commits = log.split("\n").map((l) => { const [h, t, ...m] = l.split(" "); return { h: h!, t: Number(t), m: m.join(" ") }; }).sort((a, b) => a.t - b.t);
    const first = commits[0]!, last = commits.at(-1)!;
    if (git(repo, ["merge-base", "--is-ancestor", first.h, last.h]) === undefined && first.h !== last.h) continue;
    const base = git(repo, ["rev-parse", `${first.h}^`]);
    if (!base) { skip("no base commit"); continue; }
    if (pool.has(last.h) || commits.some((c) => pool.has(c.h))) { skip("already in the pool"); continue; }
    const stat = git(repo, ["diff", "--shortstat", base, last.h]) ?? "";
    const n = (re: RegExp) => Number(re.exec(stat)?.[1] ?? 0);
    const key = `${repo}@${last.h}`;
    const prev = changes.get(key);
    const change: Change = prev ?? { repo, base, head: last.h, commits: commits.length, files: n(/(\d+) files? changed/), insertions: n(/(\d+) insertions?/), deletions: n(/(\d+) deletions?/), subject: last.m.slice(0, 80), sessions: [], start: new Date(s.start).toISOString() };
    if (!change.sessions.some((x) => x.path === path)) change.sessions.push({ agent: s.agent, path });
    changes.set(key, change);
    }
  }

const list = [...changes.values()]
  .filter((c) => c.insertions + c.deletions >= 15 && c.insertions + c.deletions <= 3000)
  .sort((a, b) => b.start.localeCompare(a.start));
if (argv.includes("--json")) console.log(JSON.stringify(list, null, 2));
else
  for (const c of list)
    console.log(`${c.start.slice(0, 10)} ${[...new Set(c.sessions.map((s) => s.agent))].join("+").padEnd(17)} ${basename(c.repo).padEnd(28)} ${c.head.slice(0, 10)} +${c.insertions}/-${c.deletions} ${c.files}f ${c.commits}c  ${c.subject}`);
console.error(`${list.length} candidate changes (pool heads excluded: ${pool.size}); skipped sessions: ${JSON.stringify(skipped)}`);
