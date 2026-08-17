import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ODK,
  PlayType,
  Result,
  defaultOffensivePlay,
} from "@huddlestat/shared";
import {
  applyTackleSpotToDraft,
  canTackleStepYardLine,
  formatTackleEndDisplay,
  isAtOwnGoalLine,
  isAtOwnOne,
  isPendingTackleConfirm,
  isTackleLeftExtreme,
  isTackleRightExtreme,
  sliderPosForTackleEnd,
  sliderYardLineForTackleEnd,
  tackleEndFromSliderPos,
  tackleFieldPositionToRatio,
  tackleRatioToYardLine,
  tackleSliderPosFromCenterX,
  tackleStepYardLine,
  tackleStripCenterX,
  tackleThumbCenterX,
  TACKLE_SLIDER_OWN_GOAL,
  TACKLE_SLIDER_OWN_ONE,
  TACKLE_SLIDER_OPP_ONE,
  TACKLE_SLIDER_SAFETY_POS,
  TACKLE_SLIDER_TD_POS,
  TACKLE_STRIP_END_ZONE_PX,
} from "./tackleSpot";

describe("tackle slider axis", () => {
  test("goal line and own 1 are distinct ratios", () => {
    assert.equal(tackleFieldPositionToRatio(0), 0);
    assert.ok(tackleFieldPositionToRatio(1) > 0);
    assert.equal(tackleRatioToYardLine(0), TACKLE_SLIDER_OWN_GOAL);
    assert.equal(tackleRatioToYardLine(tackleFieldPositionToRatio(1)), -1);
    assert.equal(tackleRatioToYardLine(1), TACKLE_SLIDER_OPP_ONE);
  });

  test("strip goal line inset from edge", () => {
    const w = 400;
    assert.equal(tackleStripCenterX(w, 0), TACKLE_STRIP_END_ZONE_PX);
    assert.equal(
      tackleStripCenterX(w, 100),
      w - TACKLE_STRIP_END_ZONE_PX,
    );
  });

  test("0 and 101 rest in the painted end zones", () => {
    const w = 400;
    assert.equal(
      tackleThumbCenterX(w, TACKLE_SLIDER_SAFETY_POS),
      TACKLE_STRIP_END_ZONE_PX / 2,
    );
    assert.equal(
      tackleThumbCenterX(w, TACKLE_SLIDER_TD_POS),
      w - TACKLE_STRIP_END_ZONE_PX / 2,
    );
    assert.equal(
      tackleSliderPosFromCenterX(w, TACKLE_STRIP_END_ZONE_PX / 2),
      TACKLE_SLIDER_SAFETY_POS,
    );
    assert.equal(
      tackleSliderPosFromCenterX(w, w - TACKLE_STRIP_END_ZONE_PX / 2),
      TACKLE_SLIDER_TD_POS,
    );
    assert.equal(tackleSliderPosFromCenterX(w, TACKLE_STRIP_END_ZONE_PX), 1);
    assert.equal(
      tackleSliderPosFromCenterX(w, w - TACKLE_STRIP_END_ZONE_PX),
      99,
    );
    assert.deepEqual(tackleEndFromSliderPos(0, true), {
      kind: "endzone",
      side: "own",
    });
    assert.deepEqual(tackleEndFromSliderPos(101, true), {
      kind: "endzone",
      side: "opponent",
    });
    assert.deepEqual(tackleEndFromSliderPos(101, false), {
      kind: "yardline",
      yardLine: TACKLE_SLIDER_OPP_ONE,
    });
  });

  test("own goal is left extreme for confirm safety", () => {
    assert.equal(isTackleLeftExtreme(TACKLE_SLIDER_OWN_GOAL), true);
    assert.equal(isAtOwnGoalLine(TACKLE_SLIDER_OWN_GOAL), true);
    assert.equal(isAtOwnOne(TACKLE_SLIDER_OWN_ONE), true);
    assert.equal(isTackleLeftExtreme(TACKLE_SLIDER_OWN_ONE), false);
    assert.equal(
      formatTackleEndDisplay({
        kind: "yardline",
        yardLine: TACKLE_SLIDER_OWN_GOAL,
      }),
      "Safety",
    );
    assert.equal(
      formatTackleEndDisplay({ kind: "endzone", side: "own" }),
      "Safety",
    );
    assert.equal(
      formatTackleEndDisplay({ kind: "endzone", side: "opponent" }),
      "Touchdown",
    );
    assert.equal(
      isPendingTackleConfirm({ kind: "endzone", side: "own" }),
      true,
    );
    assert.equal(
      isPendingTackleConfirm({ kind: "endzone", side: "opponent" }),
      true,
    );
    assert.equal(isPendingTackleConfirm({ kind: "safety" }), false);
  });

  test("opp 1 is right extreme", () => {
    assert.equal(isTackleRightExtreme(TACKLE_SLIDER_OPP_ONE), true);
    assert.equal(isTackleRightExtreme(TACKLE_SLIDER_OWN_GOAL), false);
  });

  test("step between goal line and own 1", () => {
    assert.equal(
      tackleStepYardLine(TACKLE_SLIDER_OWN_GOAL, 1),
      TACKLE_SLIDER_OWN_ONE,
    );
    assert.equal(
      tackleStepYardLine(TACKLE_SLIDER_OWN_ONE, -1),
      TACKLE_SLIDER_OWN_GOAL,
    );
    assert.equal(canTackleStepYardLine(TACKLE_SLIDER_OWN_GOAL, 1), true);
    assert.equal(canTackleStepYardLine(TACKLE_SLIDER_OWN_GOAL, -1), false);
  });

  test("slider yard line for TD/SA ends", () => {
    assert.equal(
      sliderYardLineForTackleEnd({ kind: "touchdown" }, -25),
      TACKLE_SLIDER_OPP_ONE,
    );
    assert.equal(
      sliderYardLineForTackleEnd({ kind: "safety" }, -25),
      TACKLE_SLIDER_OWN_GOAL,
    );
    assert.equal(sliderPosForTackleEnd({ kind: "touchdown" }), 101);
    assert.equal(sliderPosForTackleEnd({ kind: "safety" }), 0);
    assert.equal(
      sliderPosForTackleEnd({ kind: "endzone", side: "opponent" }),
      101,
    );
  });
});

describe("tackle confirmation semantics", () => {
  test("touchdown confirmation derives Rush, TD", () => {
    const draft = {
      ...defaultOffensivePlay(1, "SHS"),
      playType: PlayType.Run,
      result: Result.Rush,
      yardLine: -25,
    };
    const next = applyTackleSpotToDraft(draft, { kind: "touchdown" });

    assert.equal(next.result, Result.RushTd);
    assert.equal(next.gainLoss, 75);
    assert.equal(next.spotEncoding, "tackle:-25|end:TD");
  });

  test("safety confirmation preserves the underlying result", () => {
    const draft = {
      ...defaultOffensivePlay(1, "SHS"),
      playType: PlayType.Pass,
      result: Result.Sack,
      yardLine: -5,
    };
    const next = applyTackleSpotToDraft(draft, { kind: "safety" });

    assert.equal(next.result, Result.Sack);
    assert.equal(next.gainLoss, -5);
    assert.equal(next.spotEncoding, "tackle:-5|end:SA");
  });

  test("pass touchdown confirmation derives Complete, TD", () => {
    const draft = {
      ...defaultOffensivePlay(1, "SHS"),
      playType: PlayType.Pass,
      result: Result.Complete,
      yardLine: 10,
    };
    const next = applyTackleSpotToDraft(draft, { kind: "touchdown" });

    assert.equal(next.result, Result.CompleteTd);
    assert.equal(next.gainLoss, 10);
    assert.equal(next.spotEncoding, "tackle:10|end:TD");
  });

  test("sack cannot be converted to a touchdown", () => {
    const draft = {
      ...defaultOffensivePlay(1, "SHS"),
      playType: PlayType.Pass,
      result: Result.Sack,
      yardLine: 10,
    };
    const next = applyTackleSpotToDraft(draft, { kind: "touchdown" });

    assert.equal(next.result, Result.Sack);
    assert.equal(next.spotEncoding, "tackle:10|end:1");
  });

  test("moving off a confirmed endpoint demotes TD results", () => {
    const runDraft = {
      ...defaultOffensivePlay(1, "SHS"),
      playType: PlayType.Run,
      result: Result.RushTd,
      yardLine: 10,
    };
    const passDraft = {
      ...defaultOffensivePlay(1, "SHS"),
      playType: PlayType.Pass,
      result: Result.CompleteTd,
      yardLine: 10,
    };

    assert.equal(
      applyTackleSpotToDraft(runDraft, {
        kind: "yardline",
        yardLine: 1,
      }).result,
      Result.Rush,
    );
    assert.equal(
      applyTackleSpotToDraft(passDraft, {
        kind: "yardline",
        yardLine: 1,
      }).result,
      Result.Complete,
    );
  });

  test("odk D Opp 25 → Opp 32 is +7 (their offense toward our goal)", () => {
    const draft = {
      ...defaultOffensivePlay(11, "SHS"),
      playType: PlayType.Run,
      result: Result.Rush,
      odk: ODK.Defense,
      yardLine: 25,
    };
    const next = applyTackleSpotToDraft(draft, {
      kind: "yardline",
      yardLine: 32,
    });
    assert.equal(next.gainLoss, 7);
    assert.equal(next.spotEncoding, "tackle:25|end:32");
  });

  test("pending end zone does not confirm the score yet", () => {
    const draft = {
      ...defaultOffensivePlay(12, "SHS"),
      playType: PlayType.Run,
      result: Result.Rush,
      yardLine: 32,
    };
    const pendingTd = applyTackleSpotToDraft(draft, {
      kind: "endzone",
      side: "opponent",
    });
    assert.equal(pendingTd.result, Result.Rush);
    assert.equal(pendingTd.gainLoss, 32);
    assert.equal(isPendingTackleConfirm({ kind: "endzone", side: "opponent" }), true);

    const pendingSa = applyTackleSpotToDraft(draft, {
      kind: "endzone",
      side: "own",
    });
    assert.equal(pendingSa.result, Result.Rush);
    assert.equal(pendingSa.gainLoss, -68);
  });
});
