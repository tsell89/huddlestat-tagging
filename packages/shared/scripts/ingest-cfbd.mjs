#!/usr/bin/env node
/**
 * Fetch CFBD /plays for a game and write mapped fixtures (requires CFBD_API_KEY).
 * Usage: ingest-cfbd.mjs <cfbdGameId> <teamOffenseAbbrev>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { mapCfbdPlay, isOurTeamOnOffense } = await import(
  join(root, "src/pbp/cfbdMapper.js")
);
const { gameDir } = await import(join(root, "src/pbp/loadGame.js"));

const [cfbdGameId, teamOffense] = process.argv.slice(2);
const apiKey = process.env.CFBD_API_KEY;

if (!cfbdGameId || !teamOffense) {
  console.error("Usage: CFBD_API_KEY=... ingest-cfbd.mjs <gameId> <teamOffense>");
  process.exit(1);
}
if (!apiKey) {
  console.error("CFBD_API_KEY is required");
  process.exit(1);
}

const url = new URL("https://api.collegefootballdata.com/plays");
url.searchParams.set("gameId", cfbdGameId);

const res = await fetch(url, {
  headers: { Authorization: `Bearer ${apiKey}` },
});
if (!res.ok) {
  console.error(`CFBD ${res.status}: ${await res.text()}`);
  process.exit(1);
}

/** @type {import('../src/pbp/cfbdMapper.js').CfbdPlay[]} */
const raw = await res.json();
raw.sort((a, b) => a.playNumber - b.playNumber);

const gameId = `cfbd-${cfbdGameId}`;
const plays = [];
let n = 1;
for (const row of raw) {
  const offense = row.offense ?? "";
  const mapped = mapCfbdPlay(
    { ...row, playNumber: n },
    {
      teamOffense,
      isOurOffense: isOurTeamOnOffense(offense, teamOffense),
    },
  );
  if (mapped) {
    plays.push({ ...mapped, playNumber: n, team: teamOffense });
    n++;
  }
}

const dir = gameDir(gameId);
mkdirSync(dir, { recursive: true });
writeFileSync(
  join(dir, "plays.jsonl"),
  plays.map((p) => JSON.stringify(p)).join("\n") + "\n",
);
writeFileSync(
  join(dir, "meta.json"),
  JSON.stringify(
    {
      gameId,
      rules: "NCAA",
      source: "cfbd",
      teamOffense,
      teamDefense: "OPP",
      periods: 4,
      redacted: true,
      cfbdGameId: Number(cfbdGameId),
    },
    null,
    2,
  ) + "\n",
);
console.log(`Wrote ${plays.length} mapped plays to ${dir}`);
console.log("Run: npx tsx scripts/sync-fixture-situations.mjs", gameId);
