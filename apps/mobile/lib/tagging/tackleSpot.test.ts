import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ODK,
  PlayType,
  Result,
  defaultOffensivePlay,
  nextDraftAfterPlay,
} from "@huddlestat/shared";
import {
  applyTackleSpotToDraft,
  computeTackleGainLoss,
  initTackleEndFromDraft,
} from "./tackleSpot.js";

const TEAM = "WHS";

describe("computeTackleGainLoss odk polarity", () => {
  test("offense: Opp 20 → Opp 17 is +3 (toward TD)", () => {
    assert.equal(
      computeTackleGainLoss(20, { kind: "yardline", yardLine: 17 }, ODK.Offense),
      3,
    );
  });

  test("offense: Opp 20 → Opp 23 is −3 (retreat)", () => {
    assert.equal(
      computeTackleGainLoss(20, { kind: "yardline", yardLine: 23 }, ODK.Offense),
      -3,
    );
  });

  test("defense: Opp 20 → Opp 23 is +3 possession (negate axis −3)", () => {
    assert.equal(
      computeTackleGainLoss(20, { kind: "yardline", yardLine: 23 }, ODK.Defense),
      3,
    );
  });

  test("defense: Opp 25 → Opp 32 is +7 possession", () => {
    assert.equal(
      computeTackleGainLoss(25, { kind: "yardline", yardLine: 32 }, ODK.Defense),
      7,
    );
  });

  test("defense TFL Opp 25 → Opp 20 is −5 possession", () => {
    assert.equal(
      computeTackleGainLoss(25, { kind: "yardline", yardLine: 20 }, ODK.Defense),
      -5,
    );
  });
});

describe("applyTackleSpotToDraft odk D", () => {
  test("D 1st & 10 @ Opp 20 tackled Opp 23 → gain +3 → 2nd & 7", () => {
    const draft = {
      ...defaultOffensivePlay(5, TEAM),
      odk: ODK.Defense,
      playType: PlayType.Run,
      result: Result.Rush,
      yardLine: 20,
      down: 1,
      distance: 10,
    };
    const saved = applyTackleSpotToDraft(draft, {
      kind: "yardline",
      yardLine: 23,
    });
    assert.equal(saved.gainLoss, 3);
    assert.equal(saved.spotEncoding, "tackle:20|end:23");
    const next = nextDraftAfterPlay(saved, 6, TEAM);
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.down, 2);
    assert.equal(next.distance, 7);
    assert.equal(next.yardLine, 23);
  });

  test("D first down Opp 20 → Opp 35 → 1st & 10 @ 35", () => {
    const draft = {
      ...defaultOffensivePlay(5, TEAM),
      odk: ODK.Defense,
      playType: PlayType.Run,
      result: Result.Rush,
      yardLine: 20,
      down: 1,
      distance: 10,
    };
    const saved = applyTackleSpotToDraft(draft, {
      kind: "yardline",
      yardLine: 35,
    });
    assert.equal(saved.gainLoss, 15);
    const next = nextDraftAfterPlay(saved, 6, TEAM);
    assert.equal(next.down, 1);
    assert.equal(next.distance, 10);
    assert.equal(next.yardLine, 35);
    assert.equal(next.odk, ODK.Defense);
  });

  test("initTackleEndFromDraft reconstructs D gain polarity", () => {
    const draft = {
      ...defaultOffensivePlay(5, TEAM),
      odk: ODK.Defense,
      playType: PlayType.Run,
      result: Result.Rush,
      yardLine: 20,
      gainLoss: 3,
    };
    const end = initTackleEndFromDraft(draft);
    assert.deepEqual(end, { kind: "yardline", yardLine: 23 });
  });
});
