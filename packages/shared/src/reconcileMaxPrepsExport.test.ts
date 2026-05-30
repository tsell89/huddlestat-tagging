import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { playlistDataSchema } from "./index.js";
import {
  deriveMaxPrepsBoxScoreFromPlays,
  parseMaxPrepsTxt,
} from "./maxPrepsBoxScore.js";
import { reconcileMaxPrepsExport } from "./reconcileMaxPrepsExport.js";

const dir = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(dir, "../fixtures/maxpreps");

function load(name: string): string {
  return readFileSync(join(fixtureDir, name), "utf8");
}

function loadPlaylistJsonl(name: string) {
  return load(name)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => playlistDataSchema.parse(JSON.parse(line)));
}

describe("reconcileMaxPrepsExport — East Noble #94 PuntInside20", () => {
  test("documents inside-20 mismatch with play-level suspects", () => {
    const plays = loadPlaylistJsonl("snider-vs-east-noble-2025.playlist.jsonl");
    const derived = deriveMaxPrepsBoxScoreFromPlays(plays);
    const golden = parseMaxPrepsTxt(load("snider-vs-east-noble-2025.hudl.txt"));

    const report = reconcileMaxPrepsExport(derived, golden, plays);

    const insideDelta = report.deltas.find(
      (d) => d.jersey === "94" && d.field === "PuntInside20",
    );
    assert.ok(insideDelta, "expected PuntInside20 delta for #94");
    assert.equal(insideDelta!.derived, 1);
    assert.equal(insideDelta!.golden, 2);

    const play26 = report.suspectPlays.find((s) => s.playNumber === 26);
    assert.ok(play26, "play 26 should count for both");
    assert.match(play26!.reason, /Counts inside-20/);

    const play27 = report.suspectPlays.find((s) => s.playNumber === 27);
    assert.ok(play27, "play 27 should be flagged as excluded");
    assert.match(play27!.reason, /Excluded.*80/);
  });

  test("does not throw on mismatch", () => {
    const plays = loadPlaylistJsonl("snider-vs-east-noble-2025.playlist.jsonl");
    const derived = deriveMaxPrepsBoxScoreFromPlays(plays);
    const golden = parseMaxPrepsTxt(load("snider-vs-east-noble-2025.hudl.txt"));
    assert.doesNotThrow(() =>
      reconcileMaxPrepsExport(derived, golden, plays),
    );
  });
});
