import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  PLAYLIST_DATA_HEADERS,
  emptyPlayerRef,
  looksLikePartial23ColPlaylist,
  parsePartialPlaylistCsv,
  playlistDataSchema,
  toPlaylistDataRow,
} from "../index.js";
import { parseHudlCsv } from "./hudlCsv.js";

const dir = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(dir, "../../fixtures/pbp");
const maxprepsDir = join(dir, "../../fixtures/maxpreps");

function minimalPlay(overrides: Record<string, unknown> = {}) {
  return {
    playNumber: 1,
    quarter: 1,
    odk: "K",
    yardLine: -40,
    down: 0,
    distance: 0,
    hash: "M",
    gainLoss: 20,
    passer: emptyPlayerRef,
    receiver: emptyPlayerRef,
    rusher: emptyPlayerRef,
    result: "Return",
    team: "TEAM_A",
    tackler1: emptyPlayerRef,
    tackler2: emptyPlayerRef,
    recoveredBy: emptyPlayerRef,
    returner: emptyPlayerRef,
    playType: "KO",
    kicker: emptyPlayerRef,
    interceptedBy: emptyPlayerRef,
    ...overrides,
  };
}

describe("parseHudlCsv — 32-col HuddleStat export", () => {
  test("maps COMPLETION column to spotEncoding", () => {
    const text = readFileSync(
      join(fixtureDir, "hudl-32col-spot-encoding.csv"),
      "utf8",
    );
    const [play] = parseHudlCsv(text, "TEAM_A");
    assert.ok(play);
    assert.equal(play.spotEncoding, "catch:-5|end:-25");
    assert.equal(play.playType, "KO");
    assert.equal(play.result, "Return");
  });

  test("round-trips hudl-32col-spot-encoding.csv through export columns", () => {
    const text = readFileSync(
      join(fixtureDir, "hudl-32col-spot-encoding.csv"),
      "utf8",
    );
    const [parsed] = parseHudlCsv(text, "TEAM_A");
    assert.ok(parsed);
    const row = toPlaylistDataRow(parsed);
    assert.equal(row.length, PLAYLIST_DATA_HEADERS.length);
    assert.equal(row.at(-1), "catch:-5|end:-25");
    assert.equal(row[0], "1");
    assert.equal(row[1], "1");
    assert.equal(row[25], "KO");
  });

  test("23-col raw Hudl export has no spotEncoding and matches partial shape guard", () => {
    const text = readFileSync(
      join(maxprepsDir, "snider-vs-warsaw-2025-08-22.playlist.csv"),
      "utf8",
    );
    const plays = parsePartialPlaylistCsv(text, "SHS");
    const [play] = plays;
    assert.ok(play);
    assert.equal(play.spotEncoding, undefined);
    assert.equal(looksLikePartial23ColPlaylist(plays), true);
  });
});

describe("toPlaylistDataRow — CSV export boundary", () => {
  test("writes spotEncoding to COMPLETION column", () => {
    const row = toPlaylistDataRow(
      playlistDataSchema.parse(
        minimalPlay({ spotEncoding: "catch:-5|end:-25" }),
      ),
    );
    assert.equal(row.length, PLAYLIST_DATA_HEADERS.length);
    assert.equal(row.at(-1), "catch:-5|end:-25");
    assert.equal(PLAYLIST_DATA_HEADERS.at(-1), "COMPLETION");
  });
});

describe("playlistDataSchema — legacy JSON", () => {
  test("maps completion to spotEncoding on ingest", () => {
    const parsed = playlistDataSchema.parse(
      minimalPlay({ completion: "catch:-5|end:-25" }),
    );
    assert.equal(parsed.spotEncoding, "catch:-5|end:-25");
    assert.ok(!("completion" in parsed));
  });
});
