import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { PlayType, Result } from "../constants.js";
import { mapCfbdPlay } from "./cfbdMapper.js";

describe("cfbdMapper", () => {
  test("maps kickoff return", () => {
    const row = mapCfbdPlay(
      {
        id: 1,
        playNumber: 1,
        offense: "TEAM_A",
        defense: "OPP",
        down: 1,
        distance: 10,
        yardsToGoal: 75,
        yardsGained: 18,
        playType: "Kickoff Return (Offense)",
        playText: "Kickoff return to the 25",
      },
      { teamOffense: "TEAM_A", isOurOffense: true },
    );
    assert.ok(row);
    assert.equal(row.playType, PlayType.Kickoff);
    assert.equal(row.result, Result.Return);
  });

  test("maps penalty with foul spotEncoding when parseable", () => {
    const row = mapCfbdPlay(
      {
        id: 2,
        playNumber: 5,
        offense: "TEAM_A",
        defense: "OPP",
        down: 2,
        distance: 10,
        yardsToGoal: 58,
        yardsGained: -10,
        playType: "Penalty",
        playText: "Holding at the own 42",
      },
      { teamOffense: "TEAM_A", isOurOffense: true },
    );
    assert.ok(row);
    assert.equal(row.result, Result.Penalty);
    assert.equal(row.spotEncoding, "foul:-42");
  });

  test("maps fair catch punt", () => {
    const row = mapCfbdPlay(
      {
        id: 3,
        playNumber: 8,
        offense: "TEAM_A",
        defense: "OPP",
        down: 4,
        distance: 8,
        yardsToGoal: 55,
        yardsGained: -38,
        playType: "Punt",
        playText: "Punt fair catch at the 20",
      },
      { teamOffense: "TEAM_A", isOurOffense: true },
    );
    assert.ok(row);
    assert.equal(row.playType, PlayType.Punt);
    assert.equal(row.result, Result.FairCatch);
  });

  test("maps kneel as Rush", () => {
    const row = mapCfbdPlay(
      {
        id: 4,
        playNumber: 40,
        offense: "TEAM_A",
        defense: "OPP",
        down: 1,
        distance: 10,
        yardsToGoal: 60,
        yardsGained: -1,
        playType: "QB Kneel",
        playText: "TEAM_A kneels",
      },
      { teamOffense: "TEAM_A", isOurOffense: true },
    );
    assert.ok(row);
    assert.equal(row.playType, PlayType.Run);
    assert.equal(row.result, Result.Rush);
    assert.equal(row.gainLoss, -1);
  });

  test("maps timeout", () => {
    const row = mapCfbdPlay(
      {
        id: 5,
        playNumber: 12,
        offense: "TEAM_A",
        defense: "OPP",
        down: 2,
        distance: 7,
        yardsToGoal: 40,
        yardsGained: 0,
        playType: "Timeout",
        playText: "Timeout TEAM_A",
      },
      { teamOffense: "TEAM_A", isOurOffense: true },
    );
    assert.ok(row);
    assert.equal(row.result, Result.Timeout);
  });
});
