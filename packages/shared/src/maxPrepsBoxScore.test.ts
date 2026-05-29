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
});
