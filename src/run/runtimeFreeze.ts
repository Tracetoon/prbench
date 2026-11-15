// Frozen writer runtimes. A benchmark round tunes and confirms on one exact
// agent CLI binary per provider; an auto-update, a reinstall or a different
// packaging of "the same version" must not slip in between. `prbench runtime
// freeze` records the resolved executable's sha256 in frozen-runtimes.json at
// the harness root; compare refuses a provider whose executable differs.
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { digest } from "../util/hash.ts";

export const FROZEN_RUNTIMES_FILE = "frozen-runtimes.json";

export interface FrozenRuntime {
  provider: string;
  /** The real file the provider command resolves to (symlinks followed). */
  path: string;
  sha256: string;
  version: string;
  frozenAt: string;
}

/** The real executable behind a provider command (an npm shim resolves to its native binary). */
export function resolveExecutable(command: string[]): string {
  const first = command[0]!;
  const found = isAbsolute(first) ? first : Bun.which(first);
  if (!found || !existsSync(found))
    throw new Error(`Agent executable cannot be resolved: ${first}`);
  return realpathSync(found);
}

export function readFrozen(root: string): Record<string, FrozenRuntime> {
  const file = join(root, FROZEN_RUNTIMES_FILE);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
}

export function freezeRuntime(
  root: string,
  provider: string,
  command: string[],
  version: string,
): FrozenRuntime {
  const path = resolveExecutable(command);
  const entry: FrozenRuntime = {
    provider,
    path,
    sha256: digest(readFileSync(path)),
    version,
    frozenAt: new Date().toISOString(),
  };
  const all = readFrozen(root);
  all[provider] = entry;
  writeFileSync(
    join(root, FROZEN_RUNTIMES_FILE),
    JSON.stringify(all, null, 2) + "\n",
  );
  return entry;
}

/** Throws when a runtime is frozen for this provider and the command resolves to a different binary. */
export function checkFrozenRuntime(
  root: string,
  provider: string,
  command: string[],
): FrozenRuntime | undefined {
  const frozen = readFrozen(root)[provider];
  if (!frozen) return undefined;
  const path = resolveExecutable(command);
  const sha256 = digest(readFileSync(path));
  if (sha256 !== frozen.sha256)
    throw new Error(
      `The ${provider} runtime differs from the frozen one (${frozen.version}, sha256 ${frozen.sha256.slice(0, 12)}…): ${path} has sha256 ${sha256.slice(0, 12)}…. Point the provider command at the frozen binary or re-freeze deliberately.`,
    );
  return frozen;
}
