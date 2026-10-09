import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  capDistanceToGoal,
  isLegalScrimmageDistance,
  labelYardLine,
  yardsAdvanced,
  yardsToOpponentGoal,
} from "./fieldPosition100.js";
import { formatDownDistance } from "./index.js";

describe("capDistanceToGoal", () => {
  test("leaves 1st & 10 alone when more than 10 yards remain", () => {
    assert.equal(capDistanceToGoal(10, 18), 10);
    assert.equal(yardsToOpponentGoal(18), 18);
    assert.equal(capDistanceToGoal(10, -25), 10);
  });

  test("caps first-and-10 inside the 10 to yards-to-goal", () => {
    assert.equal(capDistanceToGoal(10, 8), 8);
    assert.equal(capDistanceToGoal(10, 4), 4);
    assert.equal(capDistanceToGoal(10, 9), 9);
    assert.equal(capDistanceToGoal(10, 1), 1);
  });

  test("never emits 2nd & 6 at Opp 4", () => {
    assert.equal(capDistanceToGoal(6, 4), 4);
    assert.equal(isLegalScrimmageDistance(2, 6, 4), false);
    assert.equal(isLegalScrimmageDistance(2, 4, 4), true);
  });

  test("D series caps toward our goal, not theirs", () => {
    assert.equal(capDistanceToGoal(10, 5, "D"), 10);
    assert.equal(isLegalScrimmageDistance(1, 10, 5, "D"), true);
    assert.equal(capDistanceToGoal(10, -5, "D"), 5);
    assert.equal(isLegalScrimmageDistance(1, 10, -5, "D"), false);
    assert.equal(isLegalScrimmageDistance(1, 5, -5, "D"), true);
  });

  test("kickoff down 0 is exempt from the legality check", () => {
    assert.equal(isLegalScrimmageDistance(0, 0, -40), true);
  });
});

describe("formatDownDistance", () => {
  test("labels goal-to-go inside the 10", () => {
    assert.equal(formatDownDistance(1, 8, 8), "1st & Goal");
    assert.equal(formatDownDistance(2, 4, 4), "2nd & Goal");
    assert.equal(formatDownDistance(1, 10, 18), "1st & 10");
    assert.equal(formatDownDistance(2, 8, 10), "2nd & 8");
    assert.equal(formatDownDistance(0, 0, -40), "0 & 0");
    assert.equal(formatDownDistance(1, 10, 5, "D"), "1st & 10");
    assert.equal(formatDownDistance(1, 5, -5, "D"), "1st & Goal");
  });

  test("UI yard labels are Own N / Opp N / 50", () => {
    assert.equal(labelYardLine(-5), "Own 5");
    assert.equal(labelYardLine(4), "Opp 4");
    assert.equal(labelYardLine(50), "50");
  });
});

describe("yardsToOpponentGoal with goal line / end zone", () => {
  test("returns 100 yards when starting from own end zone / goal line (0)", () => {
    assert.equal(yardsToOpponentGoal(0), 100);
    assert.equal(yardsToOpponentGoal(0, "own"), 100);
  });

  test("calculates distance from negative and positive yard lines", () => {
    assert.equal(yardsToOpponentGoal(-5), 95);
    assert.equal(yardsToOpponentGoal(50), 50);
    assert.equal(yardsToOpponentGoal(10), 10);
  });
});

describe("yardsAdvanced with goal line / end zone", () => {
  test("return from own end zone (0) to Own 20 (-20) is 20 yards", () => {
    assert.equal(yardsAdvanced(0, -20), 20);
  });

  test("return from own end zone (0) to midfield (50) is 50 yards", () => {
    assert.equal(yardsAdvanced(0, 50), 50);
  });

  test("100-yard return from own end zone (0) to opponent TD (0) is 100 yards", () => {
    assert.equal(yardsAdvanced(0, 0, "opponent", "own"), 100);
  });

  test("return from Own 5 (-5) to opponent TD (0) is 95 yards", () => {
    assert.equal(yardsAdvanced(-5, 0, "opponent"), 95);
  });
});
