#!/usr/bin/env node
/**
 * Ingest Hudl playlist CSV into fixtures/pbp/games/<gameId>/plays.jsonl
 * Usage: ingest-hudl-csv.mjs <csvPath> <gameId> <teamCode> [rules]
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { parseHudlCsv } = await import(join(root, "src/pbp/hudlCsv.js"));
const { gameDir } = await import(join(root, "src/pbp/loadGame.js"));

const [csvPath, gameId, teamCode, rules = "HS"] = process.argv.slice(2);
if (!csvPath || !gameId || !teamCode) {
  console.error(
    "Usage: ingest-hudl-csv.mjs <csvPath> <gameId> <teamCode> [HS|NCAA|NFL]",
  );
  process.exit(1);
}

const text = readFileSync(csvPath, "utf8");
const plays = parseHudlCsv(text, teamCode);
const dir = gameDir(gameId);
mkdirSync(dir, { recursive: true });

writeFileSync(
  join(dir, "plays.jsonl"),
  plays.map((p) => JSON.stringify(p)).join("\n") + "\n",
);

const meta = {
  gameId,
  rules,
  source: "hudl",
  teamOffense: teamCode,
  teamDefense: "OPP",
  periods: 4,
  redacted: teamCode !== "TEAM_A",
};
writeFileSync(join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
console.log(`Wrote ${plays.length} plays to ${dir}`);
