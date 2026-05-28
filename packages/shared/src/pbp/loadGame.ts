import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { playlistDataSchema, type PlaylistData } from "../index.js";
import type { PbpExpectation, PbpGameMeta } from "./types.js";

const FIXTURES_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/pbp",
);

export function fixturesRoot(): string {
  return FIXTURES_ROOT;
}

export function gameDir(gameId: string): string {
  return join(FIXTURES_ROOT, "games", gameId);
}

export function loadGameMeta(gameId: string): PbpGameMeta {
  const raw = readFileSync(join(gameDir(gameId), "meta.json"), "utf8");
  return JSON.parse(raw) as PbpGameMeta;
}

export function loadGamePlays(gameId: string): PlaylistData[] {
  const lines = readFileSync(join(gameDir(gameId), "plays.jsonl"), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line, i) => {
    const parsed = JSON.parse(line) as PlaylistData;
    return playlistDataSchema.parse(parsed);
  });
}

export function loadGameExpectations(gameId: string): PbpExpectation[] {
  const path = join(gameDir(gameId), "expectations.jsonl");
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line) => JSON.parse(line) as PbpExpectation);
}

export function listGameIds(): string[] {
  const gamesPath = join(FIXTURES_ROOT, "games");
  if (!existsSync(gamesPath)) return [];
  return readdirSync(gamesPath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}
