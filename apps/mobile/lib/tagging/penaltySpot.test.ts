import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { autoFirstDownWhenAgainst } from "./penaltySpot.js";

describe("autoFirstDownWhenAgainst", () => {
  test("D defaults AFD on", () => {
    assert.equal(autoFirstDownWhenAgainst("D"), true);
  });

  test("O clears AFD (does not preserve prior D default)", () => {
    assert.equal(autoFirstDownWhenAgainst("O"), false);
  });
});
