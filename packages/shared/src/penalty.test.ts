import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ODK,
  PlayType,
  Result,
  advancePenaltySituation,
  advanceSituation,
  decodePenalty,
  defaultOffensivePlay,
  encodePenaltySpotEncoding,
  enforcePenaltyFieldPosition,
  nextDraftAfterPlay,
  yardLineAfterPlay,
} from "./index.js";

const TEAM = "WHS";

describe("penalty encoding", () => {
  test("legacy foul:Y decodes as holding 10 vs O", () => {
    assert.deepEqual(decodePenalty("foul:-42"), {
      foulSpot: -42,
      yards: 10,
      against: "O",
      autoFirstDown: false,
    });
  });

  test("round-trips explicit encoding", () => {
    const enc = encodePenaltySpotEncoding({
      foulSpot: 25,
      yards: 5,
      against: "D",
      autoFirstDown: true,
    });
    assert.equal(enc, "foul:25|yd:5|vs:D|afd:1");
    assert.deepEqual(decodePenalty(enc), {
      foulSpot: 25,
      yards: 5,
      against: "D",
      autoFirstDown: true,
    });
  });

  test("holding compact form omits flags", () => {
    assert.equal(
      encodePenaltySpotEncoding({ foulSpot: -40, yards: 10, against: "O" }),
      "foul:-40",
    );
  });
});

describe("half-distance enforcement", () => {
  test("Own 5 holding 10 → Own 3 (half of 5)", () => {
    // foulPos 5, delta -10 → half distance 2 → pos 3
    assert.equal(enforcePenaltyFieldPosition(5, -10), 3);
  });
});

describe("advancePenaltySituation", () => {
  test("holding MVP: 2nd & 10 @ Own 40, foul Own 42 → 2nd & 18 @ Own 32", () => {
    const play = {
      ...defaultOffensivePlay(3, TEAM),
      odk: ODK.Offense,
      playType: PlayType.Run,
      result: Result.Penalty,
      yardLine: -40,
      down: 2,
      distance: 10,
      spotEncoding: "foul:-42",
    };
    assert.deepEqual(advanceSituation(play), {
      down: 2,
      distance: 18,
      yardLine: -32,
    });
  });

  test("half-distance near own goal", () => {
    const play = {
      ...defaultOffensivePlay(3, TEAM),
      odk: ODK.Offense,
      playType: PlayType.Pass,
      result: Result.Penalty,
      yardLine: -5,
      down: 1,
      distance: 5,
      spotEncoding: "foul:-5",
    };
    const next = advancePenaltySituation(play);
    assert.equal(next.yardLine, -3);
    assert.equal(next.down, 1);
  });

  test("false start 5 yd vs O", () => {
    const play = {
      ...defaultOffensivePlay(3, TEAM),
      odk: ODK.Offense,
      playType: PlayType.Run,
      result: Result.Penalty,
      yardLine: -25,
      down: 1,
      distance: 10,
      spotEncoding: encodePenaltySpotEncoding({
        foulSpot: -25,
        yards: 5,
        against: "O",
      }),
    };
    assert.deepEqual(advanceSituation(play), {
      down: 1,
      distance: 15,
      yardLine: -20,
    });
  });

  test("defensive holding 10 + auto 1st @ Opp 25", () => {
    const play = {
      ...defaultOffensivePlay(3, TEAM),
      odk: ODK.Offense,
      playType: PlayType.Pass,
      result: Result.Penalty,
      yardLine: 25,
      down: 3,
      distance: 8,
      spotEncoding: encodePenaltySpotEncoding({
        foulSpot: 25,
        yards: 10,
        against: "D",
        autoFirstDown: true,
      }),
    };
    const next = advanceSituation(play);
    assert.equal(next.down, 1);
    assert.equal(next.distance, 10);
    assert.equal(next.yardLine, 15);
  });

  test("odk D: their offensive holding retreats toward their goal", () => {
    const play = {
      ...defaultOffensivePlay(3, TEAM),
      odk: ODK.Defense,
      playType: PlayType.Run,
      result: Result.Penalty,
      yardLine: 25,
      down: 1,
      distance: 10,
      spotEncoding: "foul:25",
    };
    // Opp 25 → Opp 15 (backed up toward their EZ), distance grows to 20
    assert.deepEqual(advanceSituation(play), {
      down: 1,
      distance: 20,
      yardLine: 15,
    });
  });

  test("odk D: we hold (vs D) + auto 1st → Opp 35", () => {
    const play = {
      ...defaultOffensivePlay(3, TEAM),
      odk: ODK.Defense,
      playType: PlayType.Pass,
      result: Result.Penalty,
      yardLine: 25,
      down: 2,
      distance: 7,
      spotEncoding: encodePenaltySpotEncoding({
        foulSpot: 25,
        yards: 10,
        against: "D",
        autoFirstDown: true,
      }),
    };
    const next = advanceSituation(play);
    assert.equal(next.down, 1);
    assert.equal(next.yardLine, 35);
    assert.equal(next.distance, 10);
  });

  test("nextDraftAfterPlay preserves odk after penalty", () => {
    const play = {
      ...defaultOffensivePlay(3, TEAM),
      odk: ODK.Defense,
      playType: PlayType.Run,
      result: Result.Penalty,
      yardLine: 25,
      down: 1,
      distance: 10,
      spotEncoding: "foul:25",
    };
    const next = nextDraftAfterPlay(play, 4, TEAM);
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.yardLine, 15);
    assert.equal(next.down, 1);
    assert.equal(next.distance, 20);
    assert.equal(yardLineAfterPlay(play), 15);
  });
});
