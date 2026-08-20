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

  test("our punt returned — return toward our end", () => {
    const draft = {
      ...defaultOffensivePlay(4, TEAM),
      playType: PlayType.Punt,
      result: Result.Return,
      odk: ODK.Offense,
      down: 4,
    };
    assert.equal(isAdvancingTowardOpponent(draft, "kick"), false);
  });

  test("our punt/FG blocked — recovery toward our end", () => {
    for (const playType of [PlayType.Punt, PlayType.FieldGoal] as const) {
      const draft = {
        ...defaultOffensivePlay(4, TEAM),
        playType,
        result: Result.Blocked,
        odk: ODK.Offense,
        down: 4,
      };
      assert.equal(isAdvancingTowardOpponent(draft, "kick"), false);
    }
  });

  test("we fumble, defense recovers — return toward our end", () => {
    const draft = {
      ...defaultOffensivePlay(2, TEAM),
      playType: PlayType.Run,
      result: Result.Fumble,
      odk: ODK.Offense,
      spotEncoding: "fumble:-22|recover:10|end:-32|by:D",
    };
    assert.equal(isAdvancingTowardOpponent(draft, "kick"), false);
  });

  test("we fumble, offense recovers — still toward opponent", () => {
    const draft = {
      ...defaultOffensivePlay(2, TEAM),
      playType: PlayType.Run,
      result: Result.Fumble,
      odk: ODK.Offense,
      spotEncoding: "fumble:-22|end:-18|by:O",
    };
    assert.equal(isAdvancingTowardOpponent(draft, "kick"), true);
  });

  test("defense fumble recovery return advances toward opponent", () => {
    const draft = {
      ...defaultOffensivePlay(2, TEAM),
      playType: PlayType.Run,
      result: Result.Fumble,
      odk: ODK.Defense,
      spotEncoding: "fumble:22|recover:-10|end:32|by:D",
    };
    assert.equal(isAdvancingTowardOpponent(draft, "kick"), true);
  });

  test("we return their punt (odk D) toward opponent", () => {
    const draft = {
      ...defaultOffensivePlay(4, TEAM),
      playType: PlayType.Punt,
      result: Result.Return,
      odk: ODK.Defense,
      down: 4,
    };
    assert.equal(isAdvancingTowardOpponent(draft, "kick"), true);
  });

  test("Punt Rec return advances toward opponent", () => {
    const draft = {
      ...defaultOffensivePlay(6, TEAM),
      playType: PlayType.PuntReceive,
      result: Result.Return,
      odk: ODK.Defense,
    };
    assert.equal(isAdvancingTowardOpponent(draft, "receive"), true);
  });
});
