import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ODK,
  PlayType,
  Result,
  advanceSituation,
  defaultKickoffPlay,
  defaultOffensivePlay,
  emptyPlayerRef,
  isFailedFourthDown,
  nextDraftAfterPlay,
  normalizePlayOnSave,
  yardLineAfterPlay,
  type PlaylistData,
} from "./index.js";

const TEAM = "WHS";

function basePlay(
  overrides: Partial<PlaylistData>,
): PlaylistData {
  return {
    ...defaultOffensivePlay(1, TEAM),
    ...overrides,
  };
}

describe("canonical drive (spec §2.4)", () => {
  test("play 1: kickoff return to Own 25 → 1st & 10 @ Own 25", () => {
    const ko: PlaylistData = {
      ...defaultKickoffPlay(1, TEAM),
      yardLine: -40,
      down: 0,
      distance: 0,
      result: Result.Return,
      gainLoss: 20,
      returnYards: 20,
      completion: "catch:-5|end:-25",
    };

    assert.equal(yardLineAfterPlay(ko), -25);
    assert.deepEqual(advanceSituation(ko), {
      down: 1,
      distance: 10,
      yardLine: -25,
    });
  });

  test("play 2: run Own 25 to Opp 25 (+50) → 1st & 10 @ Opp 25", () => {
    const run = basePlay({
      playNumber: 2,
      playType: PlayType.Run,
      result: Result.Rush,
      yardLine: -25,
      down: 1,
      distance: 10,
      gainLoss: 50,
    });

    assert.equal(yardLineAfterPlay(run), 25);
    assert.deepEqual(advanceSituation(run), {
      down: 1,
      distance: 10,
      yardLine: 25,
    });
  });

  test("sack: 3rd & 8 @ Opp 23, loss of 5 → 4th & 13 @ Opp 28", () => {
    const sack = basePlay({
      playNumber: 3,
      playType: PlayType.Pass,
      result: Result.Sack,
      yardLine: 23,
      down: 3,
      distance: 8,
      gainLoss: -5,
    });

    assert.equal(yardLineAfterPlay(sack), 28);
    assert.deepEqual(advanceSituation(sack), {
      down: 4,
      distance: 13,
      yardLine: 28,
    });
  });

  test("FG good on 4th → next draft is kickoff", () => {
    const fg = basePlay({
      playNumber: 4,
      playType: PlayType.FieldGoal,
      result: Result.Good,
      yardLine: 28,
      down: 4,
      distance: 13,
      gainLoss: 0,
      kicker: { jersey: "3", name: "Kicker" },
      kickYards: 38,
    });

    const next = nextDraftAfterPlay(fg, 5, TEAM);
    assert.equal(next.playType, PlayType.Kickoff);
    assert.equal(next.odk, ODK.Kicking);
    assert.equal(next.down, 0);
    assert.equal(next.playNumber, 5);
  });
});

describe("touchback @ Own 20 (HS)", () => {
  test("kickoff touchback places next snap at Own 20", () => {
    const ko = {
      ...defaultKickoffPlay(1, TEAM),
      result: Result.Touchback,
      gainLoss: 0,
    };

    assert.equal(yardLineAfterPlay(ko), -20);
    assert.deepEqual(advanceSituation(ko), {
      down: 1,
      distance: 10,
      yardLine: -20,
    });
  });
});

describe("incomplete / tipped pass", () => {
  test("incomplete keeps spot, gainLoss=0, down advances", () => {
    const incomplete = basePlay({
      playType: PlayType.Pass,
      result: Result.Incomplete,
      yardLine: -25,
      down: 2,
      distance: 7,
      gainLoss: -12,
    });

    const saved = normalizePlayOnSave(incomplete);
    assert.equal(saved.gainLoss, 0);
    assert.deepEqual(advanceSituation(saved), {
      down: 3,
      distance: 7,
      yardLine: -25,
    });
  });

  test("tipped pass behaves like incomplete", () => {
    const tipped = basePlay({
      playType: PlayType.Pass,
      result: Result.TippedPass,
      yardLine: 15,
      down: 1,
      distance: 10,
      gainLoss: 8,
    });

    const saved = normalizePlayOnSave(tipped);
    assert.equal(saved.gainLoss, 0);
    assert.deepEqual(advanceSituation(saved), {
      down: 2,
      distance: 10,
      yardLine: 15,
    });
  });
});

describe("failed 4th down", () => {
  test("short run on 4th auto COP and flips possession", () => {
    const run = basePlay({
      playType: PlayType.Run,
      result: Result.Rush,
      yardLine: 28,
      down: 4,
      distance: 13,
      gainLoss: 0,
    });

    const saved = normalizePlayOnSave(run);
    assert.equal(saved.result, Result.Cop);
    assert.equal(isFailedFourthDown(run), true);

    const next = nextDraftAfterPlay(run, 5, TEAM);
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.down, 1);
    assert.equal(next.distance, 10);
    assert.equal(next.yardLine, -28);
  });

  test("incomplete on 4th auto COP at same spot", () => {
    const pass = basePlay({
      playType: PlayType.Pass,
      result: Result.Incomplete,
      yardLine: 28,
      down: 4,
      distance: 13,
      gainLoss: 0,
    });

    const saved = normalizePlayOnSave(pass);
    assert.equal(saved.result, Result.Cop);
    assert.equal(saved.gainLoss, 0);

    const next = nextDraftAfterPlay(pass, 5, TEAM);
    assert.equal(next.yardLine, -28);
  });
});
