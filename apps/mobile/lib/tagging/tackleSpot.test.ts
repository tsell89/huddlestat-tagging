import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  PlayType,
  Result,
  defaultOffensivePlay,
} from "@huddlestat/shared";
import {
  applyTackleSpotToDraft,
  canTackleStepYardLine,
  isAtOwnGoalLine,
  isAtOwnOne,
  isTackleLeftExtreme,
  isTackleRightExtreme,
  sliderYardLineForTackleEnd,
  tackleFieldPositionToRatio,
  tackleRatioToYardLine,
  tackleStepYardLine,
  tackleStripCenterX,
  TACKLE_SLIDER_OWN_GOAL,
  TACKLE_SLIDER_OWN_ONE,
  TACKLE_SLIDER_OPP_ONE,
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

  test("own goal is left extreme for confirm safety", () => {
    assert.equal(isTackleLeftExtreme(TACKLE_SLIDER_OWN_GOAL), true);
    assert.equal(isAtOwnGoalLine(TACKLE_SLIDER_OWN_GOAL), true);
    assert.equal(isAtOwnOne(TACKLE_SLIDER_OWN_ONE), true);
    assert.equal(isTackleLeftExtreme(TACKLE_SLIDER_OWN_ONE), false);
  });

  test("opp 1 is right extreme", () => {
    assert.equal(isTackleRightExtreme(TACKLE_SLIDER_OPP_ONE), true);
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
});
