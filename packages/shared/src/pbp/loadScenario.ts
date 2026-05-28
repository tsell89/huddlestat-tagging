import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { playlistDataSchema, type PlaylistData } from "../index.js";
import { fixturesRoot } from "./loadGame.js";
import type { PbpScenarioFile } from "./types.js";

export function loadScenario(name: string): PbpScenarioFile {
  const path = join(fixturesRoot(), "scenarios", `${name}.json`);
  const raw = JSON.parse(readFileSync(path, "utf8")) as PbpScenarioFile;
  raw.plays = raw.plays.map((p) => playlistDataSchema.parse(p));
  return raw;
}

export function listScenarioNames(): string[] {
  const dir = join(fixturesRoot(), "scenarios");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}
