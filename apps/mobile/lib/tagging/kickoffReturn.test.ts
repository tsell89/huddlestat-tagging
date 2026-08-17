import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { PlayType, Result, defaultKickoffPlay } from "@huddlestat/shared";
import {
  applyKickoffSpotsToDraft,
  caughtRatioToYardLine,
  computeReturnYards,
  defaultKickoffReturnSpots,
} from "./kickoffReturn";

describe("kickoff return defaults", () => {
  test("we receive: Own 5 → Own 25 · +20", () => {
    const spots = defaultKickoffReturnSpots(false);
    assert.equal(spots.caughtAt, -5);
    assert.equal(spots.returnEnd.kind, "yardline");
    if (spots.returnEnd.kind === "yardline") {
      assert.equal(spots.returnEnd.yardLine, -25);
    }
    assert.equal(computeReturnYards(spots.caughtAt, spots.returnEnd), 20);
  });

  test("we kick: Opp 5 → Opp 25 · +20", () => {
    const spots = defaultKickoffReturnSpots(true);
    assert.equal(spots.caughtAt, 5);
    assert.equal(spots.returnEnd.kind, "yardline");
    if (spots.returnEnd.kind === "yardline") {
      assert.equal(spots.returnEnd.yardLine, 25);
    }
    assert.equal(
      computeReturnYards(spots.caughtAt, spots.returnEnd, true),
      20,
    );
  });
});

describe("applyKickoffSpotsToDraft", () => {
  test("we kick return writes opp spots and +20", () => {
    const draft = defaultKickoffPlay(10, "SHS", { result: Result.Return });
    const spots = defaultKickoffReturnSpots(true);
    const next = applyKickoffSpotsToDraft(draft, spots);
    assert.equal(next.playType, PlayType.Kickoff);
    assert.equal(next.returnYards, 20);
    assert.equal(next.gainLoss, 20);
    assert.equal(next.spotEncoding, "catch:5|end:25");
  });
});

describe("caught-at slider range", () => {
  test("can land on Opp 5 (not clamped to Own 1)", () => {
    const fromRightHalf = caughtRatioToYardLine(0.95);
    assert.ok(fromRightHalf > 0, `expected opponent side, got ${fromRightHalf}`);
  });
});
