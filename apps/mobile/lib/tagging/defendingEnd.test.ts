import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  attackingEnd,
  ballGoingEnd,
  defendingEndAfterQuarterBreak,
  formatDefendingEndLabel,
  mathRatioFromOriented,
  oppositeDefendingEnd,
  orientedRatio,
  secondHalfDefendingEndFromOpening,
} from "./defendingEnd.js";

describe("oppositeDefendingEnd", () => {
  test("left ↔ right", () => {
    assert.equal(oppositeDefendingEnd("left"), "right");
    assert.equal(oppositeDefendingEnd("right"), "left");
  });
});

describe("attackingEnd", () => {
  test("opposite of defending", () => {
    assert.equal(attackingEnd("left"), "right");
    assert.equal(attackingEnd("right"), "left");
  });
});

describe("orientedRatio", () => {
  test("left defending leaves math ratio unchanged", () => {
    assert.equal(orientedRatio(0, "left"), 0);
    assert.equal(orientedRatio(0.5, "left"), 0.5);
    assert.equal(orientedRatio(1, "left"), 1);
  });

  test("right defending mirrors track", () => {
    assert.equal(orientedRatio(0, "right"), 1);
    assert.equal(orientedRatio(0.25, "right"), 0.75);
    assert.equal(orientedRatio(0.5, "right"), 0.5);
    assert.equal(orientedRatio(1, "right"), 0);
  });

  test("round-trip math ↔ display", () => {
    for (const end of ["left", "right"] as const) {
      for (const r of [0, 0.1, 0.5, 0.9, 1]) {
        const display = orientedRatio(r, end);
        assert.ok(
          Math.abs(mathRatioFromOriented(display, end) - r) < 1e-12,
        );
      }
    }
  });
});

describe("ballGoingEnd", () => {
  test("offense advances toward attacking end", () => {
    assert.equal(ballGoingEnd("left", true), "right");
    assert.equal(ballGoingEnd("right", true), "left");
  });

  test("defense: ball advances toward defending end", () => {
    assert.equal(ballGoingEnd("left", false), "left");
    assert.equal(ballGoingEnd("right", false), "right");
  });
});

describe("secondHalfDefendingEndFromOpening", () => {
  test("opposite of opening", () => {
    assert.equal(secondHalfDefendingEndFromOpening("left"), "right");
    assert.equal(secondHalfDefendingEndFromOpening("right"), "left");
  });

  test("defaults to left when opening unknown", () => {
    assert.equal(secondHalfDefendingEndFromOpening(null), "left");
  });
});

describe("formatDefendingEndLabel", () => {
  test("labels", () => {
    assert.equal(formatDefendingEndLabel("left"), "Defend left");
    assert.equal(formatDefendingEndLabel("right"), "Defend right");
  });
});

describe("defendingEndAfterQuarterBreak", () => {
  test("flips Q1→Q2 and Q3→Q4", () => {
    assert.equal(defendingEndAfterQuarterBreak("Q1", "Q2", "left"), "right");
    assert.equal(defendingEndAfterQuarterBreak("Q3", "Q4", "right"), "left");
  });

  test("no flip for other transitions", () => {
    assert.equal(defendingEndAfterQuarterBreak("Q2", "HALFTIME", "left"), null);
    assert.equal(defendingEndAfterQuarterBreak("HALFTIME", "Q3", "left"), null);
    assert.equal(defendingEndAfterQuarterBreak("Q4", "OT", "right"), null);
  });
});
