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
});
