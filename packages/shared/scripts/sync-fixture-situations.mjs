#!/usr/bin/env node
/**
 * Align play[i+1] down/distance/yardLine/odk to nextDraftAfterPlay(play[i]).
 * Keeps playType, result, gainLoss, spotEncoding unchanged.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { loadGameMeta, loadGamePlays, gameDir } = await import(
  join(root, "src/pbp/loadGame.js")
);
const { nextDraftAfterPlay } = await import(join(root, "src/index.js"));

function chainOptions(meta) {
  return { rules: meta.rules, overtime: meta.overtime };
}

const gameId = process.argv[2];
if (!gameId) {
  console.error("Usage: sync-fixture-situations.mjs <gameId>");
  process.exit(1);
}

const meta = loadGameMeta(gameId);
let plays = loadGamePlays(gameId);

for (let i = 0; i < plays.length - 1; i++) {
  const draft = nextDraftAfterPlay(
    plays[i],
    plays[i + 1].playNumber,
    meta.teamOffense,
    chainOptions(meta),
  );
  plays[i + 1] = {
    ...plays[i + 1],
    down: draft.down,
    distance: draft.distance,
    yardLine: draft.yardLine,
    odk: draft.odk,
  };
}

const out = plays.map((p) => JSON.stringify(p)).join("\n") + "\n";
writeFileSync(join(gameDir(gameId), "plays.jsonl"), out);
console.log(`Synced ${gameId} (${plays.length} plays)`);
