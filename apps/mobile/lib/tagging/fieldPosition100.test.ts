import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  canStepHudlYardLine,
  fieldPositionToSliderRatio,
  stepHudlYardLine,
} from "./fieldPosition100";

describe("stepHudlYardLine", () => {
  test("steps toward opponent goal on internal axis", () => {
    assert.equal(stepHudlYardLine(-25, 50), 25);
    assert.equal(stepHudlYardLine(25, 1), 24);
  });

  test("clamps at own 1 and opp 1", () => {
    assert.equal(stepHudlYardLine(-1, -1), -1);
    assert.equal(stepHudlYardLine(1, 1), 1);
    assert.equal(canStepHudlYardLine(-1, -1), false);
    assert.equal(canStepHudlYardLine(1, 1), false);
  });

  test("fieldPositionToSliderRatio maps goal lines and midfield", () => {
    assert.equal(fieldPositionToSliderRatio(0), 0);
    assert.equal(fieldPositionToSliderRatio(100), 1);
    assert.equal(fieldPositionToSliderRatio(50), 0.5);
  });
});
