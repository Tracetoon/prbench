/**
 * Runnability check: can each case's main check command run at the case's head
 * commit inside the writer sandbox? Writers that run a repo's tests should see
 * the code's own failures, not failures the sandbox causes.
 *
 * Per case, a sandbox is made exactly as `compare` makes one for a writer
 * (createSandbox + prepareCase with the same preparation profile and fixtures,
 * same environment), except that recorded sessions are not placed: no check
 * reads agent logs, and they stay out of the extra sandboxes. The repo's main
 * check command is detected (package.json "check", then "test", or a known
 * command for repos without one), run with a timeout, and classified:
 *
 *   pass       exit 0
 *   fail       nonzero exit with no sign of a missing environment
 *   env-error  missing modules/tools/fixtures/network, or preparation failed
 *   no-command the repo has no check command the host can run
 *
 * Usage:
 *   bun run scripts/check-runnability.ts --cases <dir> [--preparation <file>]
 *     [--only a,b] [--jobs 4] [--timeout-ms 1500000] [--out <json>] [--keep]
 *     [--log-dir <dir>]   (full check output per case, for diagnosis)
 *
 * --preparation defaults to <cases>/preparation.json. --out is merged per case,
 * so --only reruns update their rows and keep the others.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { caseDirs, loadCase, type LoadedCase } from "../src/schema/case.ts";
import { createSandbox, type Sandbox } from "../src/run/sandbox.ts";
import { prepareCase, type Preparation } from "../src/run/comparisonInputs.ts";
import { atomicJson } from "../src/run/ledger.ts";

type Status = "pass" | "fail" | "env-error" | "no-command";
export interface Row {
  case: string;
  command: string[] | null;
  status: Status;
  summary: string;
  durationMs?: number;
  reason?: string;
  checkedAt: string;
}

/**
 * Repos with no package.json check/test script: the command their CI runs, or
 * null with the reason it can't run on this host.
 */
const KNOWN: Record<string, { command: string[] | null; reason?: string }> = {
  "bazzite-stale-portal": { command: ["sh", "-c", "./tests/test-ensure.sh && ./tests/test-units.sh"] },
  "aifirstextension-apache-license": { command: ["xvfb-run", "-a", "npm", "test"] },
};
const NO_COMMAND: [RegExp, string][] = [
  [/^vex(aim|agent|-v5)/, "Rust workspace (cargo test); no cargo toolchain on the host, and a per-sandbox toolchain install is not cheap"],
  [/^winapps-/, "Nix/shell repo with no test command (only pre-commit hooks fetched from the network)"],
  [/^aifirstwebsite-/, "Hugo site with no check or test script; hugo is not on the host and the theme is a git submodule"],
];

/**
 * Why a check that still fails is not the sandbox's doing, from diagnosis
 * (re-running outside the sandbox, at low load, or reading the failing test).
 * Matched against the case id and the failing tests' names.
 */
const NOTES: { case?: RegExp; failing?: RegExp; note: string }[] = [
  {
    failing: /builds native Maven installation plans/,
    note: "host-specific: the test expects an APT plan on Linux, but the host is rpm-ostree (/run/ostree-booted), so the code picks Homebrew; not caused by the sandbox",
  },
  {
    failing: /\(real Claude Code client\)|\(real claude --bare client\)/,
    note: "live-service tests drive a real, logged-in Claude Code client; the sandbox has no Claude login",
  },
  {
    failing: /codex install \/ uninstall > install --no-hooks/,
    note: "harness-intrinsic: the sandbox sets CODEX_HOME for the Codex writer, so Showtail's test setup (`CODEX_HOME ??= ...`) does not pin a private one and another test's user-scope hooks leak into this assertion",
  },
  {
    failing: /review run --all and the merged list/,
    note: "real at head: concurrent review passes merge in nondeterministic order (the test expects a fixed pass order)",
  },
  {
    case: /^aifirstcli-hooks-path$/,
    note: "real at head: committed books/ match @aifirst/content 1.6.0 while src/content/embedded.generated.ts says 1.5.0, so `sync-content --check` fails before tests run",
  },
  {
    case: /^showtail-/,
    note: "not sandbox-caused: the same tests fail in a plain clone outside the sandbox with a clean env; the repo pins bun 1.4.0 (.bun-version) and the host runs bun 1.3.14 (installing another bun was not attempted)",
  },
  {
    failing: /\[\d{4,}(\.\d+)?ms\]/,
    note: "some failures are bun's 5s per-test timeout under concurrent load (subprocess-heavy tests); they pass or vary when run alone",
  },
];

function notesFor(id: string, summary: string): string | undefined {
  const hits = NOTES.filter((n) => (!n.case || n.case.test(id)) && (!n.failing || n.failing.test(summary)) && (n.case || n.failing));
  return hits.length ? hits.map((n) => n.note).join("; ") : undefined;
}

function detect(id: string, repo: string): { command: string[] | null; reason?: string } {
  if (KNOWN[id]) return KNOWN[id]!;
  for (const [re, reason] of NO_COMMAND) if (re.test(id)) return { command: null, reason };
  const pkg = join(repo, "package.json");
  if (!existsSync(pkg)) return { command: null, reason: "no package.json and no known check command" };
  const scripts = JSON.parse(readFileSync(pkg, "utf8")).scripts ?? {};
  const bun = existsSync(join(repo, "bun.lock")) || existsSync(join(repo, "bun.lockb"));
  for (const name of ["check", "test"])
    if (scripts[name]) return { command: bun ? ["bun", "run", name] : ["npm", "run", name] };
  return { command: null, reason: "package.json has no check or test script" };
}

const ENV_PATTERNS: RegExp[] = [
  /Cannot find (module|package) ['"]/,
  /error: Cannot find (module|package)/,
  /Module not found/,
  /command not found/,
  /: not found$/m,
  /spawn \S+ ENOENT/,
  /Executable not found in \$PATH/,
  /\b(ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT)\b/,
  /getaddrinfo/,
  /Could not resolve host/,
  /transport '[a-z]+' not allowed/,
  /unable to access 'https?:/,
  /Failed to download/i,
  /Missing X server|cannot open display/i,
  /fixture.*(missing|not found)/i,
];

export function classify(code: number | null, timedOut: boolean, output: string): { status: Status; summary: string } {
  const counts = /\n\s*(\d+) pass\s*\n\s*(?:\d+ skip\s*\n\s*)?(?:\d+ todo\s*\n\s*)?(\d+) fail/.exec(output);
  const ran = /Ran \d+ tests? across \d+ files?\.[^\n]*/.exec(output)?.[0];
  // Runners that start one `bun test` per file print a total line of their own.
  const perFile = /Source test files: \d+ passed, \d+ failed/.exec(output)?.[0];
  const failures = [...output.matchAll(/^\(fail\) ([^\n]+)/gm)].map((m) => m[1]!.trim());
  const errors = output.split("\n").filter((l) => /\berror\b|Error:|ERR!|FAIL/i.test(l)).map((l) => l.trim()).filter(Boolean);
  const envHits = ENV_PATTERNS.flatMap((re) => output.split("\n").filter((l) => re.test(l)).slice(0, 2).map((l) => l.trim()));
  const parts: string[] = [];
  if (timedOut) parts.push("timed out");
  if (perFile) parts.push(perFile);
  else if (counts) parts.push(`${counts[1]} pass, ${counts[2]} fail${ran ? `; ${ran}` : ""}`);
  if (code !== 0) {
    if (failures.length) parts.push(`failing: ${[...new Set(failures)].slice(0, 6).join(" | ")}`);
    const lines = envHits.length ? envHits : errors;
    if (lines.length) parts.push(`first errors: ${[...new Set(lines)].slice(0, 4).join(" | ")}`);
    if (!failures.length && !lines.length) parts.push(`tail: ${output.trim().split("\n").slice(-4).join(" | ")}`);
  }
  const summary = parts.join("; ").slice(0, 1500);
  if (code === 0 && !timedOut) return { status: "pass", summary };
  return { status: envHits.length ? "env-error" : "fail", summary };
}

function absolutePreparation(file: string): Preparation | undefined {
  if (!existsSync(file)) return undefined;
  const profile = JSON.parse(readFileSync(file, "utf8")) as Preparation;
  for (const entry of Object.values(profile.cases))
    for (const f of entry.fixtures ?? []) f.bundle = resolve(dirname(file), f.bundle);
  return profile;
}

async function checkOne(dir: string, profile: Preparation | undefined, timeoutMs: number, keep: boolean): Promise<Row> {
  const loaded = loadCase(dir);
  const id = loaded.case.id;
  const checkedAt = new Date().toISOString();
  // Same sandbox as a writer's, without placing the recorded sessions.
  const bare: LoadedCase = { dir: loaded.dir, case: { ...loaded.case, sessions: [] } };
  let sandbox: Sandbox | undefined;
  try {
    sandbox = createSandbox(bare);
    try {
      prepareCase(sandbox, id, profile);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { case: id, command: null, status: "env-error", summary: `preparation failed: ${message.slice(0, 1200)}`, checkedAt };
    }
    const { command, reason } = detect(id, sandbox.repo);
    if (!command) return { case: id, command: null, status: "no-command", summary: "", reason, checkedAt };
    const began = performance.now();
    const proc = Bun.spawn(command, {
      cwd: sandbox.repo,
      env: { ...sandbox.env, CI: "1" },
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGKILL");
    }, timeoutMs);
    const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
    const code = await proc.exited;
    clearTimeout(timer);
    const durationMs = Math.round(performance.now() - began);
    const { status, summary } = classify(code, timedOut, `${stdout}\n${stderr}`);
    // Full check output (repo test output only) for diagnosis.
    const logDir = arg("--log-dir");
    if (logDir) {
      mkdirSync(logDir, { recursive: true });
      writeFileSync(join(logDir, `${id}.log`), `$ ${command.join(" ")}\nexit ${code}${timedOut ? " (timed out)" : ""}\n${stdout}\n--- stderr ---\n${stderr}`);
    }
    if (keep) console.error(`${id}: kept sandbox ${sandbox.root}`);
    const note = status === "pass" ? undefined : notesFor(id, summary);
    return { case: id, command, status, summary, durationMs, checkedAt, ...(note ? { reason: note } : {}) };
  } finally {
    if (sandbox && !keep) sandbox.dispose();
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

if (import.meta.main) {
  const cases = resolve(arg("--cases") ?? "/var/tmp/prbench-tmp/pool61");
  const prepFile = resolve(arg("--preparation") ?? join(cases, "preparation.json"));
  const out = resolve(arg("--out") ?? "/var/home/steve/Development/prbench/results/v4/runnability.json");
  const only = arg("--only")?.split(",").filter(Boolean);
  const jobs = Number(arg("--jobs") ?? 4);
  const timeoutMs = Number(arg("--timeout-ms") ?? 1_500_000);
  const keep = process.argv.includes("--keep");
  const worker = arg("--worker");
  const profile = absolutePreparation(prepFile);

  if (worker) {
    // One case per process: preparation is synchronous and must not stall the pool.
    const row = await checkOne(join(cases, worker), profile, timeoutMs, keep);
    process.stdout.write(JSON.stringify(row));
    process.exit(0);
  }

  const dirs = caseDirs(cases).filter((d) => !only || only.includes(d.split("/").pop()!));
  if (only) for (const id of only) if (!dirs.some((d) => d.endsWith(`/${id}`))) throw new Error(`No case ${id} in ${cases}`);
  const existing = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : { cases: {} };
  const rows: Record<string, Row> = existing.cases ?? {};
  const queue = [...dirs];
  const runOne = async () => {
    for (let dir = queue.shift(); dir; dir = queue.shift()) {
      const id = dir.split("/").pop()!;
      const args = [process.execPath, import.meta.path, "--worker", id, "--cases", cases, "--preparation", prepFile, "--timeout-ms", String(timeoutMs)];
      if (keep) args.push("--keep");
      if (arg("--log-dir")) args.push("--log-dir", resolve(arg("--log-dir")!));
      const p = Bun.spawn(args, { stdout: "pipe", stderr: "inherit" });
      const text = await new Response(p.stdout).text();
      await p.exited;
      let row: Row;
      try {
        row = JSON.parse(text);
      } catch {
        row = { case: id, command: null, status: "env-error", summary: `checker crashed: ${text.slice(-500)}`, checkedAt: new Date().toISOString() };
      }
      rows[id] = row;
      console.error(`${id}: ${row.status}${row.command ? ` (${row.command.join(" ")})` : ""} ${row.summary.slice(0, 200)}`);
      const counts: Record<string, number> = {};
      for (const r of Object.values(rows)) counts[r.status] = (counts[r.status] ?? 0) + 1;
      atomicJson(out, {
        schema: "prbench.runnability/v1",
        cases: Object.fromEntries(Object.entries(rows).sort(([a], [b]) => a.localeCompare(b))),
        counts,
        source: { cases, preparation: prepFile },
        updatedAt: new Date().toISOString(),
      });
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, jobs) }, runOne));
  const counts: Record<string, number> = {};
  for (const r of Object.values(rows)) counts[r.status] = (counts[r.status] ?? 0) + 1;
  console.log(JSON.stringify(counts));
}
