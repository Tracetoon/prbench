/**
 * Builds the judge's control set for `prbench fact-debate --control`:
 *
 * - unanimous: items every panel reviewer kept in round 1 of a fact-review run
 *   (expected: keep), sampled round-robin across cases, deterministically;
 * - canaries: the planted defects of a canary run, on the canary sheets.
 *   Contradicted, unsupported and trap-made-true items are expected revise or
 *   remove; the removed "missing" claim is offered as a proposed addition and
 *   is expected to be added (keep or revise).
 *
 * Usage: bun run scripts/fact-control.ts --unanimous <run> [--n 30] --canaries <canary run> --out spec.json
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ControlSpec } from "../src/factreview/debate.ts";
import type { SheetItem, Verdict } from "../src/factreview/schema.ts";

type Spec = ControlSpec["cases"][number];

export function unanimousEntries(
  run: string,
  n: number,
  exclude: Set<string> = new Set(),
): Spec[] {
  const perCase = new Map<string, SheetItem[]>();
  for (const id of readdirSync(run).sort()) {
    const f = join(run, id, "decisions.json");
    if (exclude.has(id) || !existsSync(f)) continue;
    const d = JSON.parse(readFileSync(f, "utf8"));
    const keeps = (d.items ?? []).filter(
      (i: any) =>
        i.reviewed !== false &&
        i.round1?.votes?.length &&
        i.round1.votes.every(
          (v: any) => v.verdict === "keep" && v.trapIsReal !== false,
        ),
    );
    if (keeps.length)
      perCase.set(
        id,
        keeps.map((i: any) => ({
          id: i.id,
          category: i.category,
          text: i.text,
        })),
      );
  }
  // Evenly spaced picks from each case, so the sample spreads over cases and sections.
  const per = Math.max(1, Math.ceil(n / Math.max(1, perCase.size)));
  const out: Spec[] = [];
  let taken = 0;
  for (const [id, items] of perCase) {
    const k = Math.min(per, items.length, n - taken);
    if (k <= 0) break;
    const picks = Array.from(
      { length: k },
      (_, j) => items[Math.floor((j * items.length) / k)]!,
    );
    taken += picks.length;
    out.push({
      case: id,
      entries: picks.map((i) => ({
        ...i,
        kind: "item" as const,
        earlier: null,
        expected: ["keep"] as Verdict[],
        group: "unanimous",
      })),
    });
  }
  return out;
}

export function canaryEntries(run: string): Spec[] {
  const out: Spec[] = [];
  for (const id of readdirSync(run).sort()) {
    const f = join(run, id, "canary.json");
    if (!existsSync(f)) continue;
    const canary = JSON.parse(readFileSync(f, "utf8"));
    const sheet: SheetItem[] = JSON.parse(
      readFileSync(join(run, id, "sheet.json"), "utf8"),
    ).items;
    const entries: Spec["entries"] = [];
    let n = 0;
    for (const d of canary.defects) {
      if (d.kind === "missing") {
        const category = d.category ?? "claims";
        entries.push({
          id: `N${++n}`,
          kind: "addition",
          category,
          text: d.text,
          earlier: null,
          expected: ["keep", "revise"],
          group: "canary:missing",
        });
        continue;
      }
      const item = sheet.find((s) => s.id === d.id);
      if (!item)
        throw new Error(`${id}: canary ${d.id} not on the canary sheet`);
      entries.push({
        ...item,
        kind: "item",
        earlier: null,
        expected: ["revise", "remove"],
        group: `canary:${d.kind}`,
      });
    }
    out.push({ case: id, sheet, entries });
  }
  return out;
}

/** Canary cases carry their canary sheet; unanimous items come from the other cases' real sheets. */
export function controlSpec(unanimous: Spec[], canaries: Spec[]): ControlSpec {
  return {
    schema: "prbench.fact-debate-control/v1",
    cases: [...canaries, ...unanimous],
  };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const opt = (name: string) =>
    argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined;
  const out = opt("--out");
  const u = opt("--unanimous");
  const c = opt("--canaries");
  if (!out || !u || !c) {
    console.error(
      "usage: fact-control.ts --unanimous <run> [--n 30] --canaries <canary run> --out spec.json",
    );
    process.exit(2);
  }
  const n = Number(opt("--n") ?? 30);
  const canaries = canaryEntries(resolve(c));
  const unanimous = unanimousEntries(
    resolve(u),
    n,
    new Set(canaries.map((x) => x.case)),
  );
  const spec = controlSpec(unanimous, canaries);
  writeFileSync(resolve(out), JSON.stringify(spec, null, 2) + "\n");
  const count = (g: string) =>
    spec.cases.flatMap((x) => x.entries).filter((e) => e.group.startsWith(g))
      .length;
  console.log(
    `control: ${spec.cases.length} cases; unanimous ${count("unanimous")}; canaries ${count("canary")}`,
  );
}
