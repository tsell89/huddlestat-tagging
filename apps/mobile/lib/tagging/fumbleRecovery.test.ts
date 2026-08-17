import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ODK,
  PlayType,
  Result,
  defaultOffensivePlay,
} from "@huddlestat/shared";
import {
  applyFumbleSpotsToDraft,
  isPendingFumbleReturnConfirm,
} from "./fumbleRecovery";

describe("applyFumbleSpotsToDraft", () => {
  test("odk D fumble recovered at Opp 32 is +7 (their offense)", () => {
    const draft = {
      ...defaultOffensivePlay(12, "SHS"),
      playType: PlayType.Run,
      result: Result.Fumble,
      odk: ODK.Defense,
      yardLine: 25,
    };
    const next = applyFumbleSpotsToDraft(draft, {
      fumbleAt: 28,
      recoveredBy: "offense",
      recoveredAt: 32,
      returnEnd: { kind: "yardline", yardLine: 32 },
    });
    assert.equal(next.gainLoss, 7);
    assert.equal(next.spotEncoding, "fumble:28|end:32|by:O");
  });

  test("defense recovery stores return yards without requiring UI overlay", () => {
    const draft = {
      ...defaultOffensivePlay(12, "SHS"),
      playType: PlayType.Run,
      result: Result.Fumble,
      odk: ODK.Defense,
      yardLine: 32,
    };
    const next = applyFumbleSpotsToDraft(draft, {
      fumbleAt: 29,
      recoveredBy: "defense",
      recoveredAt: 29,
      returnEnd: { kind: "touchdown" },
    });
    assert.equal(next.returnYards, 29);
    assert.equal(next.spotEncoding, "fumble:29|end:TD|by:D");
  });
});

describe("isPendingFumbleReturnConfirm", () => {
  test("defense return at own goal (Hudl 0) is pending safety", () => {
    assert.equal(
      isPendingFumbleReturnConfirm({
        fumbleAt: -5,
        recoveredBy: "defense",
        recoveredAt: -3,
        returnEnd: { kind: "yardline", yardLine: 0 },
      }),
      true,
    );
  });

  test("defense return in own end zone is pending until confirmed", () => {
    assert.equal(
      isPendingFumbleReturnConfirm({
        fumbleAt: -5,
        recoveredBy: "defense",
        recoveredAt: -3,
        returnEnd: { kind: "endzone", side: "own" },
      }),
      true,
    );
  });

  test("confirmed safety and offense recovery are not pending", () => {
    assert.equal(
      isPendingFumbleReturnConfirm({
        fumbleAt: -5,
        recoveredBy: "defense",
        recoveredAt: -3,
        returnEnd: { kind: "safety" },
      }),
      false,
    );
    assert.equal(
      isPendingFumbleReturnConfirm({
        fumbleAt: 0,
        recoveredBy: "offense",
        recoveredAt: 0,
        returnEnd: { kind: "yardline", yardLine: 0 },
      }),
      false,
    );
  });
});
