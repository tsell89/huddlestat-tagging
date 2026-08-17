import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  PlayType,
  Result,
  defaultOffensivePlay,
} from "@huddlestat/shared";
import { applyResultChange } from "./playConfig";

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
