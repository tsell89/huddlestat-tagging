import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parsePartialPlaylistCsv, type PlaylistData } from "./index.js";
import { looksLikePartial23ColPlaylist } from "./hudlCanonical.js";

const dir = dirname(fileURLToPath(import.meta.url));
const maxprepsDir = join(dir, "../fixtures/maxpreps");

function loadPartialFixture(): PlaylistData[] {
  return parsePartialPlaylistCsv(
    readFileSync(
      join(maxprepsDir, "snider-vs-warsaw-2025-08-22.playlist.csv"),
      "utf8",
    ),
    "SHS",
  );
}

function fullHudlShapePlay(overrides: Partial<PlaylistData> = {}): PlaylistData {
  return {
    playNumber: 1,
    quarter: 2,
    odk: "O",
    yardLine: 35,
    down: 1,
    distance: 10,
    hash: "M",
    gainLoss: 5,
    passer: { jersey: "", name: "" },
    receiver: { jersey: "", name: "" },
    rusher: { jersey: "12", name: "QB" },
    result: "Rush",
    team: "SHS",
    tackler1: { jersey: "", name: "" },
    tackler2: { jersey: "", name: "" },
    recoveredBy: { jersey: "", name: "" },
    returner: { jersey: "", name: "" },
    playType: "Run",
    kicker: { jersey: "", name: "" },
    interceptedBy: { jersey: "", name: "" },
    ...overrides,
  };
}

describe("looksLikePartial23ColPlaylist", () => {
  test("flags Snider 23-col partial fixture (platform rejects on official commit)", () => {
    const plays = loadPartialFixture();
    assert.ok(plays.length > 10);
    assert.equal(looksLikePartial23ColPlaylist(plays), true);
  });

  test("does not flag multi-quarter Hudl-shaped plays", () => {
    const plays = [
      fullHudlShapePlay({ playNumber: 1, quarter: 1 }),
      fullHudlShapePlay({ playNumber: 2, quarter: 2, spotEncoding: "end:-25" }),
    ];
    assert.equal(looksLikePartial23ColPlaylist(plays), false);
  });

  test("does not flag short samples", () => {
    assert.equal(looksLikePartial23ColPlaylist(loadPartialFixture().slice(0, 5)), false);
  });
});
