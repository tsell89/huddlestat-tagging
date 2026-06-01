#!/usr/bin/env node
/** @deprecated Use repo-root `npm run qa:replay` → scripts/qa-replay.mjs */
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const script = join(repoRoot, "scripts/qa-replay.mjs");
const r = spawnSync("npx", ["tsx", script, ...process.argv.slice(2)], {
  cwd: repoRoot,
  stdio: "inherit",
});
process.exit(r.status ?? 1);
