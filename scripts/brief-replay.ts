/**
 * Brief replay: what does Tracetoon's `prepare` hand a writer for each case?
 * No model is called.
 *
 * Per case, the sandbox is built exactly as `compare` builds one for a writer
 * of the chosen agent: createSandbox (checkout at head, main/origin at base,
 * recorded sessions placed in the sandbox's agent homes), prepareCase (the
 * preparation profile's fixtures and commands), then installTracetoon with the
 * bundle pinned (skill in ~/.claude/skills or <repo>/.agents/skills, runtime
 * bin/tracetoon-<platform>-<arch> copied into the sandbox bin, hooks
 * installed). Then the skill's launcher runs what SKILL.md tells a writer to:
 * `task begin --json` (step 0) and `prepare --json` with the flags read from
 * the trailing "Brief layout:", "Review passes:", ... lines, plus `--run <id>`.
 *
 * Differences from a writer, by design: the agent's own session is absent
 * (writers run prepare from inside a live session whose log Tracetoon also
 * sees), and the host is named with TRACETOON_HOST_AGENT instead of the
 * agent's CODEX_THREAD_ID / CLAUDECODE variables. No agent credentials are
 * placed in the sandbox. Checked against candidate writer traces (pool61):
 * briefs and the rest of prepare's JSON match byte for byte apart from the
 * run id, except that Tracetoon itself sometimes renders an out-of-repo path
 * in a quoted request as "‹withheld›" and sometimes drops it, run to run.
 *
 * Outputs, with the sandbox root replaced by "<sandbox>" as in retained traces:
 *   <out>/<case>.prepare.json      prepare's JSON
 *   <out>/<case>.brief.txt         its `brief` field, as printed
 *   <out>/<case>.evidence-notes.md the run's evidence-notes.md, when written
 *   <out>/index.json               case -> ok/error, flags, timings (merged per case)
 *
 * Usage:
 *   bun run scripts/brief-replay.ts --cases <dir> --skill <bundle dir>
 *     --agent claude-code|codex --out <dir> [--only a,b] [--jobs N]
 *     [--preparation <file>] [--keep]
 *
 * Convention: <round>/briefs/<agent>/, e.g. results/v4/tuning/r0-c53/briefs/codex/.
 * --preparation defaults to <cases>/preparation.json. Sandboxes go under
 * TMPDIR and are removed afterwards unless --keep. Session logs never leave
 * the sandbox except as the text Tracetoon itself prints into the outputs.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { caseDirs, loadCase } from "../src/schema/case.ts";
import { createSandbox, type Sandbox } from "../src/run/sandbox.ts";
import { prepareCase, type Preparation } from "../src/run/comparisonInputs.ts";
import { installTracetoon } from "../src/systems/tracetoon.ts";
import { atomicJson } from "../src/run/ledger.ts";
import { exec } from "../src/util/exec.ts";

type Agent = "claude-code" | "codex";
export interface Row {
  case: string;
  status: "ok" | "error";
  stage?: "sandbox" | "preparation" | "install" | "begin" | "prepare" | "crash";
  error?: string;
  run?: string;
  briefChars?: number;
  evidenceNotes?: boolean;
  timings: Record<string, number>;
  at: string;
}

/** Flag lines SKILL.md ends its workflow with, and the prepare flag each sets. */
const SKILL_LINES: [label: string, flag: string][] = [
  ["Brief layout", "--layout"],
  ["Review passes", "--review-passes"],
  ["Review lenses", "--review-lenses"],
  ["Reviewer model", "--reviewer-model"],
  ["Reviewer effort", "--reviewer-effort"],
  ["Reviewer runner", "--reviewer-runner"],
  ["Review recheck", "--review-recheck"],
  ["Graph search", "--graph-search"],
];

/**
 * prepare's flags from SKILL.md, as its step 2 tells a writer: layout and
 * passes always; the others when their line names a value ("none" for lenses
 * means no lenses; recheck "none" and graph search "none" are values).
 */
export function prepareFlags(skillMd: string): string[] {
  const flags: string[] = [];
  for (const [label, flag] of SKILL_LINES) {
    const m = new RegExp(`^${label}:[ \\t]*(.*?)\\.?[ \\t]*$`, "m").exec(skillMd);
    const value = m?.[1]?.trim();
    if (!value) {
      if (flag === "--layout" || flag === "--review-passes")
        throw new Error(`SKILL.md has no "${label}:" line`);
      continue;
    }
    if (/^(default|-)$/i.test(value)) continue;
    if (flag === "--review-lenses" && /^none$/i.test(value)) continue;
    flags.push(flag, value);
  }
  return flags;
}

function absolutePreparation(file: string): Preparation | undefined {
  if (!existsSync(file)) return undefined;
  const profile = JSON.parse(readFileSync(file, "utf8")) as Preparation;
  for (const entry of Object.values(profile.cases))
    for (const f of entry.fixtures ?? []) f.bundle = resolve(dirname(file), f.bundle);
  return profile;
}

const runtimeName = () =>
  `tracetoon-${process.platform === "win32" ? "windows" : process.platform}-${process.arch}${process.platform === "win32" ? ".exe" : ""}`;

function message(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 2000);
}

async function replayOne(dir: string, opts: { skill: string; agent: Agent; out: string; profile?: Preparation; keep: boolean }): Promise<Row> {
  const loaded = loadCase(dir);
  const id = loaded.case.id;
  const timings: Record<string, number> = {};
  const at = new Date().toISOString();
  let t = performance.now();
  const lap = (name: string) => {
    const now = performance.now();
    timings[name] = Math.round(now - t);
    t = now;
  };
  const fail = (stage: Row["stage"], error: unknown): Row => ({ case: id, status: "error", stage, error: message(error), timings, at });
  let sandbox: Sandbox | undefined;
  try {
    // The writer's sandbox, sessions included (runCase builds it from the full case).
    try { sandbox = createSandbox(loaded); } catch (e) { return fail("sandbox", e); }
    lap("sandboxMs");
    try { prepareCase(sandbox, id, opts.profile); } catch (e) { return fail("preparation", e); }
    lap("preparationMs");
    let tt: ReturnType<typeof installTracetoon>;
    try {
      tt = installTracetoon(sandbox, opts.agent, { skill: opts.skill, runtime: join(opts.skill, "bin", runtimeName()) });
    } catch (e) { return fail("install", e); }
    lap("installMs");
    const scrub = (s: string) => s.replaceAll(sandbox!.root, "<sandbox>");
    const env = { ...sandbox.env, ...tt.env, TRACETOON_HOST_AGENT: opts.agent === "codex" ? "codex" : "claude" };
    const launcher = join(tt.skill, "bin", process.platform === "win32" ? "tracetoon.cmd" : "tracetoon");
    const run = (args: string[]) => exec([launcher, ...args], { cwd: sandbox!.repo, env });

    const begin = run(["task", "begin", "--json"]);
    lap("beginMs");
    let runId: string;
    try {
      if (begin.code) throw new Error(`exit ${begin.code}: ${scrub(begin.stderr || begin.stdout).trim()}`);
      runId = JSON.parse(begin.stdout).run;
      if (!runId) throw new Error(`no run id: ${scrub(begin.stdout).slice(0, 500)}`);
    } catch (e) { return fail("begin", e); }

    const flags = prepareFlags(readFileSync(join(tt.skill, "SKILL.md"), "utf8"));
    const prep = run(["prepare", "--json", ...flags, "--run", runId]);
    lap("prepareMs");
    const base = join(opts.out, id);
    if (prep.stderr.trim()) writeFileSync(`${base}.prepare.stderr.txt`, scrub(prep.stderr));
    let parsed: any;
    try {
      if (prep.code) throw new Error(`exit ${prep.code}: ${scrub(prep.stderr || prep.stdout).trim()}`);
      parsed = JSON.parse(prep.stdout);
    } catch (e) { return fail("prepare", e); }
    writeFileSync(`${base}.prepare.json`, scrub(JSON.stringify(parsed, null, 2)) + "\n");
    const brief = typeof parsed.brief === "string" ? parsed.brief : undefined;
    if (brief !== undefined) writeFileSync(`${base}.brief.txt`, scrub(brief));
    const notes = join(sandbox.gitDir, "tracetoon", "runs", runId, "evidence-notes.md");
    const hasNotes = existsSync(notes);
    if (hasNotes) writeFileSync(`${base}.evidence-notes.md`, scrub(readFileSync(notes, "utf8")));
    if (opts.keep) console.error(`${id}: kept sandbox ${sandbox.root}`);
    return {
      case: id,
      status: brief === undefined ? "error" : "ok",
      ...(brief === undefined ? { stage: "prepare" as const, error: "prepare returned no brief" } : {}),
      run: runId,
      briefChars: brief?.length ?? 0,
      evidenceNotes: hasNotes,
      timings,
      at,
    };
  } finally {
    if (sandbox && !opts.keep) sandbox.dispose();
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

if (import.meta.main) {
  const need = (name: string) => {
    const v = arg(name);
    if (!v) throw new Error(`${name} is required (see the usage at the top of scripts/brief-replay.ts)`);
    return v;
  };
  const cases = resolve(need("--cases"));
  const skill = resolve(need("--skill"));
  const agent = need("--agent") as Agent;
  if (agent !== "claude-code" && agent !== "codex") throw new Error(`--agent must be claude-code or codex, got ${agent}`);
  const out = resolve(need("--out"));
  const prepFile = resolve(arg("--preparation") ?? join(cases, "preparation.json"));
  const only = arg("--only")?.split(",").filter(Boolean);
  const jobs = Number(arg("--jobs") ?? 4);
  const keep = process.argv.includes("--keep");
  const worker = arg("--worker");
  if (!existsSync(join(skill, "SKILL.md")) || !existsSync(join(skill, "bin", runtimeName())))
    throw new Error(`${skill} is not a pinned Tracetoon bundle (needs SKILL.md and bin/${runtimeName()})`);
  mkdirSync(out, { recursive: true });

  if (worker) {
    // One case per process: sandbox preparation is synchronous and must not stall the pool.
    const row = await replayOne(join(cases, worker), { skill, agent, out, profile: absolutePreparation(prepFile), keep });
    process.stdout.write(JSON.stringify(row));
    process.exit(0);
  }

  const dirs = caseDirs(cases).filter((d) => !only || only.includes(d.split("/").pop()!));
  if (only) for (const id of only) if (!dirs.some((d) => d.endsWith(`/${id}`))) throw new Error(`No case ${id} in ${cases}`);
  const indexFile = join(out, "index.json");
  const existing = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, "utf8")) : { cases: {} };
  const rows: Record<string, Row> = existing.cases ?? {};
  const flags = prepareFlags(readFileSync(join(skill, "SKILL.md"), "utf8"));
  const began = performance.now();
  const save = () => {
    const counts: Record<string, number> = {};
    for (const r of Object.values(rows)) counts[r.status] = (counts[r.status] ?? 0) + 1;
    atomicJson(indexFile, {
      schema: "prbench.brief-replay/v1",
      agent,
      skill,
      skillVersion: existsSync(join(skill, "VERSION")) ? readFileSync(join(skill, "VERSION"), "utf8").trim() : undefined,
      prepareArgs: ["prepare", "--json", ...flags, "--run", "<task begin run>"],
      hostAgentEnv: `TRACETOON_HOST_AGENT=${agent === "codex" ? "codex" : "claude"}`,
      source: { cases, preparation: prepFile },
      counts,
      cases: Object.fromEntries(Object.entries(rows).sort(([a], [b]) => a.localeCompare(b))),
      updatedAt: new Date().toISOString(),
    });
    return counts;
  };
  const queue = [...dirs];
  const runOne = async () => {
    for (let dir = queue.shift(); dir; dir = queue.shift()) {
      const id = dir.split("/").pop()!;
      const args = [process.execPath, import.meta.path, "--worker", id, "--cases", cases, "--skill", skill, "--agent", agent, "--out", out, "--preparation", prepFile];
      if (keep) args.push("--keep");
      const started = performance.now();
      const p = Bun.spawn(args, { stdout: "pipe", stderr: "inherit" });
      const text = await new Response(p.stdout).text();
      await p.exited;
      let row: Row;
      try {
        row = JSON.parse(text);
      } catch {
        row = { case: id, status: "error", stage: "crash", error: `worker crashed: ${text.slice(-500)}`, timings: {}, at: new Date().toISOString() };
      }
      row.timings.totalMs = Math.round(performance.now() - started);
      rows[id] = row;
      console.error(`${id}: ${row.status}${row.stage ? ` (${row.stage}: ${row.error?.slice(0, 200)})` : ""} ${JSON.stringify(row.timings)}`);
      save();
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, jobs) }, runOne));
  console.log(JSON.stringify({ counts: save(), wallMs: Math.round(performance.now() - began) }));
}
