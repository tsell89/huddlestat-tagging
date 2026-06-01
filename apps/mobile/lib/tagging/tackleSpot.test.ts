import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  isTackleLeftExtreme,
  isTackleRightExtreme,
  sliderYardLineForTackleEnd,
  TACKLE_SLIDER_OWN_ONE,
  TACKLE_SLIDER_OPP_ONE,
} from "./tackleSpot";

describe("tackle slider extremes", () => {
  test("own 1 is left extreme", () => {
    assert.equal(isTackleLeftExtreme(-1), true);
    assert.equal(isTackleLeftExtreme(-25), false);
  });

  test("opp 1 is right extreme", () => {
    assert.equal(isTackleRightExtreme(1), true);
    assert.equal(isTackleRightExtreme(25), false);
  });

  test("slider yard line for TD/SA ends", () => {
    assert.equal(
      sliderYardLineForTackleEnd({ kind: "touchdown" }, -25),
      TACKLE_SLIDER_OPP_ONE,
    );
    assert.equal(
      sliderYardLineForTackleEnd({ kind: "safety" }, -25),
      TACKLE_SLIDER_OWN_ONE,
    );
  });
});
