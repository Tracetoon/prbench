import { afterAll, expect, test } from "bun:test";
import { chmodSync, existsSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  checkFrozenRuntime,
  freezeRuntime,
  FROZEN_RUNTIMES_FILE,
  readFrozen,
} from "../src/run/runtimeFreeze.ts";
import { cleanupTemps, tempDir } from "./helpers.ts";
afterAll(cleanupTemps);

test("a frozen runtime accepts only the same binary, through symlinks too", () => {
  const root = tempDir(),
    bin = tempDir();
  const real = join(bin, "agent-1.0"),
    link = join(bin, "agent");
  writeFileSync(real, "#!/bin/sh\necho 1.0\n");
  chmodSync(real, 0o755);
  symlinkSync(real, link);
  // Nothing frozen: no check.
  expect(checkFrozenRuntime(root, "claude", [link])).toBeUndefined();
  const entry = freezeRuntime(root, "claude", [link], "1.0");
  expect(entry.path).toBe(real);
  expect(existsSync(join(root, FROZEN_RUNTIMES_FILE))).toBe(true);
  expect(readFrozen(root).claude!.sha256).toBe(entry.sha256);
  expect(checkFrozenRuntime(root, "claude", [link])!.version).toBe("1.0");
  // Same version string, different bytes (an update or another packaging): refused.
  writeFileSync(real, "#!/bin/sh\necho 1.0 # rebuilt\n");
  expect(() => checkFrozenRuntime(root, "claude", [link])).toThrow(
    "differs from the frozen one",
  );
  // Other providers are unaffected.
  expect(checkFrozenRuntime(root, "codex", [link])).toBeUndefined();
});
