import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ODK,
  PlayType,
  Result,
  defaultKickoffPlay,
  defaultOffensivePlay,
} from "@huddlestat/shared";
import { isAdvancingTowardOpponent } from "./directionOfPlay.js";

const TEAM = "WHS";

describe("isAdvancingTowardOpponent", () => {
  test("offense rush/pass advances toward opponent", () => {
    const draft = defaultOffensivePlay(2, TEAM);
    assert.equal(isAdvancingTowardOpponent(draft, "kick"), true);
  });

  test("our pass intercepted — return toward our end", () => {
    const draft = {
      ...defaultOffensivePlay(2, TEAM),
      playType: PlayType.Pass,
      result: Result.Interception,
      odk: ODK.Offense,
    };
    assert.equal(isAdvancingTowardOpponent(draft, "kick"), false);
  });

  test("our defensive INT return advances toward opponent", () => {
    const draft = {
      ...defaultOffensivePlay(2, TEAM),
      playType: PlayType.Pass,
      result: Result.Interception,
      odk: ODK.Defense,
    };
    assert.equal(isAdvancingTowardOpponent(draft, "kick"), true);
  });

  test("kickoff receive advances toward opponent", () => {
    const draft = {
      ...defaultKickoffPlay(1, TEAM),
      playType: PlayType.KickoffReceive,
    };
    assert.equal(isAdvancingTowardOpponent(draft, "receive"), true);
  });

  test("we kick — return comes toward us", () => {
    const draft = defaultKickoffPlay(1, TEAM);
    assert.equal(isAdvancingTowardOpponent(draft, "kick"), false);
  });
});
