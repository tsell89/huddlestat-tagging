#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { loadScenario } = await import(join(root, "src/pbp/loadScenario.js"));
const { nextDraftAfterPlay } = await import(join(root, "src/index.js"));

const name = process.argv[2];
if (!name) {
  console.error("Usage: sync-scenario.mjs <scenario-name>");
  process.exit(1);
}

const data = loadScenario(name);
let { meta, plays } = data;

for (let i = 0; i < plays.length - 1; i++) {
  const draft = nextDraftAfterPlay(
    plays[i],
    plays[i + 1].playNumber,
    meta.teamOffense,
    { rules: meta.rules, overtime: meta.overtime },
  );
  plays[i + 1] = {
    ...plays[i + 1],
    down: draft.down,
    distance: draft.distance,
    yardLine: draft.yardLine,
    odk: draft.odk,
  };
}

writeFileSync(
  join(root, "fixtures/pbp/scenarios", `${name}.json`),
  JSON.stringify({ meta, plays }, null, 2) + "\n",
);
console.log(`Synced scenario ${name}`);
