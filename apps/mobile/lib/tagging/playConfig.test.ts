import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ODK,
  PlayType,
  Result,
  defaultOffensivePlay,
} from "@huddlestat/shared";
import {
  applyResultChange,
  defaultOffensePlayType,
  ensureOffensePadDraft,
  shouldShowOffensePad,
} from "./playConfig";

describe("applyResultChange", () => {
  test("leaving a confirmed pass TD for Sack clears endpoint state", () => {
    const draft = {
      ...defaultOffensivePlay(1, "SHS"),
      playType: PlayType.Pass,
      result: Result.CompleteTd,
      yardLine: 10,
      gainLoss: 10,
      spotEncoding: "tackle:10|end:TD",
    };

    const next = applyResultChange(draft, Result.Sack);

    assert.equal(next.result, Result.Sack);
    assert.equal(next.gainLoss, 0);
    assert.equal(next.spotEncoding, undefined);
  });

  test("Complete → Sack clears passer (QB is rusher on sack)", () => {
    const draft = {
      ...defaultOffensivePlay(1, "SHS"),
      playType: PlayType.Pass,
      result: Result.Complete,
      passer: { jersey: "7", name: "QB" },
      receiver: { jersey: "11", name: "WR" },
    };

    const next = applyResultChange(draft, Result.Sack);

    assert.equal(next.result, Result.Sack);
    assert.equal(next.passer.jersey, "");
    assert.equal(next.receiver.jersey, "");
  });

  test("leaving a confirmed run TD for Fumble clears endpoint state", () => {
    const draft = {
      ...defaultOffensivePlay(1, "SHS"),
      playType: PlayType.Run,
      result: Result.RushTd,
      yardLine: 10,
      gainLoss: 10,
      spotEncoding: "tackle:10|end:TD",
    };

    const next = applyResultChange(draft, Result.Fumble);

    assert.equal(next.result, Result.Fumble);
    assert.equal(next.gainLoss, 0);
    assert.equal(next.spotEncoding, undefined);
  });
});

describe("ensureOffensePadDraft", () => {
  test("odk D 1st & 10 with empty type → Run / Rush (them with the ball)", () => {
    const draft = {
      ...defaultOffensivePlay(11, "SHS"),
      odk: ODK.Defense,
      yardLine: 25,
    };
    assert.equal(shouldShowOffensePad(draft), true);
    const next = ensureOffensePadDraft(draft);
    assert.equal(next.playType, PlayType.Run);
    assert.equal(next.result, Result.Rush);
    assert.equal(next.odk, ODK.Defense);
  });

  test("UX-11: 4th & 13 @ Opp 28 defaults to FG", () => {
    const draft = {
      ...defaultOffensivePlay(6, "SHS"),
      down: 4,
      distance: 13,
      yardLine: 28,
    };
    assert.equal(defaultOffensePlayType(draft), PlayType.FieldGoal);
    const next = ensureOffensePadDraft(draft);
    assert.equal(next.playType, PlayType.FieldGoal);
    assert.equal(next.result, Result.Good);
  });

  test("UX-12: 4th & 2 in FG range defaults to Run", () => {
    const draft = {
      ...defaultOffensivePlay(6, "SHS"),
      down: 4,
      distance: 2,
      yardLine: 28,
    };
    assert.equal(defaultOffensePlayType(draft), PlayType.Run);
    const next = ensureOffensePadDraft(draft);
    assert.equal(next.playType, PlayType.Run);
    assert.equal(next.result, Result.Rush);
  });

  test("4th & 10 outside FG range defaults to Punt", () => {
    const draft = {
      ...defaultOffensivePlay(6, "SHS"),
      down: 4,
      distance: 10,
      yardLine: -40,
    };
    assert.equal(defaultOffensePlayType(draft), PlayType.Punt);
    const next = ensureOffensePadDraft(draft);
    assert.equal(next.playType, PlayType.Punt);
  });
});
