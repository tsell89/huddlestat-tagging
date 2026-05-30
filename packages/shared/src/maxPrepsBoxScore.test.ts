import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  deriveMaxPrepsBoxScoreFromPlays,
  MAXPREPS_FOOTBALL_COLUMNS,
  parseMaxPrepsTxt,
  parsePartialPlaylistCsv,
  serializeMaxPrepsTxt,
  type MaxPrepsFootballColumn,
} from "./maxPrepsBoxScore.js";
import { ODK, PlayType, Result, emptyPlayerRef } from "./constants.js";

const dir = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(dir, "../fixtures/maxpreps");

function load(name: string): string {
  return readFileSync(join(fixtureDir, name), "utf8");
}

function rowByJersey(text: string, jersey: string) {
  const rows = parseMaxPrepsTxt(text);
  const row = rows.find((r) => String(r.Jersey) === jersey);
  assert.ok(row, `missing jersey ${jersey}`);
  return row;
}

function derivedByJersey(jersey: string) {
  const plays = parsePartialPlaylistCsv(
    load("snider-vs-warsaw-2025-08-22.playlist.csv"),
    "SHS",
  );
  const rows = deriveMaxPrepsBoxScoreFromPlays(plays);
  const row = rows.find((r) => String(r.Jersey) === jersey);
  assert.ok(row, `missing derived jersey ${jersey}`);
  return row;
}

function expectFields(
  jersey: string,
  fields: MaxPrepsFootballColumn[],
) {
  const expected = rowByJersey(load("snider-vs-warsaw-2025-08-22.hudl.txt"), jersey);
  const actual = derivedByJersey(jersey);
  for (const field of fields) {
    assert.equal(
      actual[field],
      expected[field],
      `${jersey}.${field}: expected ${expected[field]}, got ${actual[field]}`,
    );
  }
}

describe("deriveMaxPrepsBoxScoreFromPlays — Snider vs Warsaw fixture", () => {
  test("#12 rushing matches Hudl MaxPreps export", () => {
    expectFields("12", [
      "RushingNum",
      "RushingYards",
      "RushingLong",
      "RushingTDNum",
      "PATRushingNum",
    ]);
  });

  test("#14 passing and rushing match Hudl MaxPreps export", () => {
    expectFields("14", [
      "RushingNum",
      "RushingYards",
      "RushingLong",
      "PassingComp",
      "PassingAtt",
      "PassingYards",
      "PassingLong",
      "PassingInt",
      "TotalTDNum",
    ]);
  });

  test("#7 receiving and INT match", () => {
    expectFields("7", ["ReceivingNum", "ReceivingYards", "ReceivingLong", "INTs"]);
  });

  test("#11 solo and assist tackles follow locked A2/A3 rules", () => {
    const actual = derivedByJersey("11");
    assert.equal(actual.Tackles, 9, "solo tackles");
    assert.equal(actual.Assists, 4, "assist tackles");
    assert.equal(actual.TotalTackles, 13, "total tackles");
    assert.equal(
      (actual.Tackles as number) + (actual.Assists as number),
      actual.TotalTackles,
    );
  });

  test("defensive players total tackles match", () => {
    const expectedText = load("snider-vs-warsaw-2025-08-22.hudl.txt");
    const expectedRows = parseMaxPrepsTxt(expectedText);
    const plays = parsePartialPlaylistCsv(
      load("snider-vs-warsaw-2025-08-22.playlist.csv"),
      "SHS",
    );
    const derived = deriveMaxPrepsBoxScoreFromPlays(plays);

    for (const exp of expectedRows) {
      const tot = exp.TotalTackles as number;
      if (tot === 0) continue;
      const act = derived.find((r) => String(r.Jersey) === String(exp.Jersey));
      assert.ok(act, `missing derived row for #${exp.Jersey}`);
      assert.equal(
        act.TotalTackles,
        tot,
        `#${exp.Jersey} TotalTackles`,
      );
    }
  });
});

describe("serializeMaxPrepsTxt", () => {
  test("round-trips fixture parse", () => {
    const source = load("snider-vs-warsaw-2025-08-22.hudl.txt");
    const rows = parseMaxPrepsTxt(source);
    const reserialized = serializeMaxPrepsTxt(rows);
    const parsed = parseMaxPrepsTxt(reserialized);
    assert.equal(parsed.length, rows.length);
    for (let i = 0; i < rows.length; i++) {
      for (const col of MAXPREPS_FOOTBALL_COLUMNS) {
        assert.equal(parsed[i]![col], rows[i]![col], `${col} row ${i}`);
      }
    }
  });

  test("preserves fractional sack values", () => {
    const rows = parseMaxPrepsTxt(load("snider-vs-warsaw-2025-08-22.hudl.txt"));
    const row = rows[0]!;
    row.Sacks = 0.5;
    const reserialized = serializeMaxPrepsTxt([row]);
    const parsed = parseMaxPrepsTxt(reserialized);
    assert.equal(parsed[0]!.Sacks, 0.5);
    assert.match(reserialized, /\|0\.5\|/);
  });

  test("sack yards go to sacked rusher rushing stats, not tacklers", () => {
    const rows = deriveMaxPrepsBoxScoreFromPlays([
      {
        playNumber: 1,
        quarter: 1,
        odk: ODK.Defense,
        yardLine: 23,
        down: 3,
        distance: 8,
        hash: "M",
        gainLoss: -5,
        passer: emptyPlayerRef,
        receiver: emptyPlayerRef,
        rusher: { jersey: "17", name: "Opp QB" },
        result: Result.Sack,
        team: "SHS",
        tackler1: { jersey: "90", name: "Rusher" },
        tackler2: emptyPlayerRef,
        recoveredBy: emptyPlayerRef,
        returner: emptyPlayerRef,
        playType: PlayType.Pass,
        kicker: emptyPlayerRef,
        interceptedBy: emptyPlayerRef,
      },
    ]);
    const tackler = rows.find((r) => String(r.Jersey) === "90");
    const sacked = rows.find((r) => String(r.Jersey) === "17");
    assert.ok(tackler && sacked);
    assert.equal(tackler.Sacks, 1);
    assert.equal(tackler.SacksYardsLost, 0);
    assert.equal(sacked.RushingNum, 1);
    assert.equal(sacked.RushingYards, -5);
  });
});
