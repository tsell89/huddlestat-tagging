#!/usr/bin/env node
/** Dev helper: verify plays.jsonl chain without full test suite */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { loadGameMeta, loadGamePlays } = await import(
  join(root, "src/pbp/loadGame.js")
);
const { replayChainMismatches, formatReplayFailures } = await import(
  join(root, "src/pbp/replay.js")
);

const gameId = process.argv[2] ?? "hudl-spec-2-4";
const meta = loadGameMeta(gameId);
const plays = loadGamePlays(gameId);
const mismatches = replayChainMismatches(plays, meta, 20);
if (mismatches.length) {
  console.error(formatReplayFailures(mismatches));
  process.exit(1);
}
console.log(`OK ${gameId} (${plays.length} plays)`);
