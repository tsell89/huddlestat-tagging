import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseHudlCsv } from "./hudlCsv.js";

const dir = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(dir, "../../fixtures/pbp");

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
});
