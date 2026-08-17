import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ODK, PlayType, Result, defaultOffensivePlay } from "./index.js";
import {
  countOtPossessions,
  deriveScoreFromPlays,
  shouldFinalizeOtGame,
} from "./scoreFromPlays.js";

const TEAM = "WHS";

function play(overrides: Partial<ReturnType<typeof defaultOffensivePlay>>) {
  return { ...defaultOffensivePlay(1, TEAM), ...overrides };
}

describe("deriveScoreFromPlays", () => {
  test("offensive TD (odk O)", () => {
    const score = deriveScoreFromPlays([
      play({
        playNumber: 1,
        odk: ODK.Offense,
        playType: PlayType.Run,
        result: Result.RushTd,
      }),
    ]);
    assert.deepEqual(score, { us: 6, them: 0 });
  });

  test("FG Good (odk O)", () => {
    const score = deriveScoreFromPlays([
      play({
        playNumber: 1,
        odk: ODK.Offense,
        playType: PlayType.FieldGoal,
        result: Result.Good,
      }),
    ]);
    assert.deepEqual(score, { us: 3, them: 0 });
  });

  test("extra point Good (odk O)", () => {
    const score = deriveScoreFromPlays([
      play({
        playNumber: 2,
        odk: ODK.Offense,
        playType: PlayType.ExtraPoint,
        result: Result.Good,
      }),
    ]);
    assert.deepEqual(score, { us: 1, them: 0 });
  });

  test("safety on offense (odk O) — 2 them", () => {
    const score = deriveScoreFromPlays([
      play({
        playNumber: 3,
        odk: ODK.Offense,
        playType: PlayType.Run,
        result: Result.Safety,
      }),
    ]);
    assert.deepEqual(score, { us: 0, them: 2 });
  });

  test("safety on defense (odk D) — 2 us", () => {
    const score = deriveScoreFromPlays([
      play({
        playNumber: 4,
        odk: ODK.Defense,
        playType: PlayType.Run,
        result: Result.Safety,
      }),
    ]);
    assert.deepEqual(score, { us: 2, them: 0 });
  });

  test("live-ball safety via end:SA (odk D)", () => {
    const score = deriveScoreFromPlays([
      play({
        playNumber: 5,
        odk: ODK.Defense,
        playType: PlayType.Run,
        result: Result.Fumble,
        spotEncoding: "fumble:-5|recover:0|end:SA|by:D",
      }),
    ]);
    assert.deepEqual(score, { us: 2, them: 0 });
  });

  test("opponent offensive TD (odk D, Run)", () => {
    const score = deriveScoreFromPlays([
      play({
        playNumber: 6,
        odk: ODK.Defense,
        playType: PlayType.Run,
        result: Result.RushTd,
      }),
    ]);
    assert.deepEqual(score, { us: 0, them: 6 });
  });

  test("kickoff return TD (end:TD, odk O)", () => {
    const score = deriveScoreFromPlays([
      play({
        playNumber: 7,
        odk: ODK.Offense,
        playType: PlayType.KickoffReceive,
        result: Result.Return,
        spotEncoding: "catch:-5|end:TD",
      }),
    ]);
    assert.deepEqual(score, { us: 6, them: 0 });
  });

  test("we-kick KO return TD is their 6", () => {
    const score = deriveScoreFromPlays([
      play({
        playNumber: 8,
        odk: ODK.Kicking,
        playType: PlayType.Kickoff,
        result: Result.Return,
        spotEncoding: "catch:5|end:TD",
      }),
    ]);
    assert.deepEqual(score, { us: 0, them: 6 });
  });

  test("opponent INT return TD (odk O, end:TD) is their 6", () => {
    const score = deriveScoreFromPlays([
      play({
        playNumber: 9,
        odk: ODK.Offense,
        playType: PlayType.Pass,
        result: Result.Interception,
        spotEncoding: "catch:20|end:TD",
      }),
    ]);
    assert.deepEqual(score, { us: 0, them: 6 });
  });

  test("odk D rush TD with tackle|end:TD is still their 6", () => {
    const score = deriveScoreFromPlays([
      play({
        playNumber: 10,
        odk: ODK.Defense,
        playType: PlayType.Run,
        result: Result.RushTd,
        spotEncoding: "tackle:-5|end:TD",
      }),
    ]);
    assert.deepEqual(score, { us: 0, them: 6 });
  });
});

describe("shouldFinalizeOtGame", () => {
  test("2nd-team FG after 1st scoreless OT possession", () => {
    const otPlays = [
      play({
        playNumber: 10,
        quarter: 5,
        odk: ODK.Offense,
        playType: PlayType.Run,
        result: Result.Cop,
        down: 4,
      }),
      play({
        playNumber: 11,
        quarter: 5,
        odk: ODK.Defense,
        playType: PlayType.FieldGoal,
        result: Result.Good,
      }),
    ];
    const score = deriveScoreFromPlays(otPlays);
    assert.deepEqual(score, { us: 0, them: 3 });
    assert.deepEqual(countOtPossessions(otPlays), { us: 1, them: 1 });
    assert.equal(shouldFinalizeOtGame(otPlays, "OT", score), true);
  });

  test("no finalize when only one OT possession complete", () => {
    const otPlays = [
      play({
        playNumber: 10,
        quarter: 5,
        odk: ODK.Offense,
        playType: PlayType.FieldGoal,
        result: Result.Good,
      }),
    ];
    const score = deriveScoreFromPlays(otPlays);
    assert.equal(shouldFinalizeOtGame(otPlays, "OT", score), false);
  });
});
