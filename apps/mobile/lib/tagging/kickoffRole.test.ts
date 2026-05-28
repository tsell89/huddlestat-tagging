import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ODK,
  PlayType,
  Result,
  defaultKickoffPlay,
  defaultOffensivePlay,
} from "@huddlestat/shared";
import {
  isKickoffDraft,
  resolveKickoffRoleAfterSave,
} from "./kickoffRoleResolve.js";

const TEAM = "WHS";

describe("resolveKickoffRoleAfterSave", () => {
  const kickoffDraft = defaultKickoffPlay(7, TEAM, { quarter: 1 });
  const runDraft = defaultOffensivePlay(7, TEAM);

  test("our FG Good → kick when next draft is kickoff", () => {
    const saved = {
      ...defaultOffensivePlay(6, TEAM),
      playType: PlayType.FieldGoal,
      result: Result.Good,
      odk: ODK.Offense,
    };
    assert.equal(
      resolveKickoffRoleAfterSave(saved, kickoffDraft, "receive"),
      "kick",
    );
  });

  test("opponent FG Good → receive when next draft is kickoff", () => {
    const saved = {
      ...defaultOffensivePlay(6, TEAM),
      playType: PlayType.FieldGoal,
      result: Result.Good,
      odk: ODK.Defense,
    };
    assert.equal(
      resolveKickoffRoleAfterSave(saved, kickoffDraft, "kick"),
      "receive",
    );
  });

  test("our XP Good → kick", () => {
    const saved = {
      ...defaultOffensivePlay(6, TEAM),
      playType: PlayType.ExtraPoint,
      result: Result.Good,
      odk: ODK.Offense,
    };
    assert.equal(
      resolveKickoffRoleAfterSave(saved, kickoffDraft, "receive"),
      "kick",
    );
  });

  test("blocked PAT after opponent TD → receive", () => {
    const saved = {
      ...defaultOffensivePlay(6, TEAM),
      playType: PlayType.ExtraPointBlock,
      result: Result.Blocked,
      odk: ODK.Defense,
    };
    assert.equal(
      resolveKickoffRoleAfterSave(saved, kickoffDraft, "kick"),
      "receive",
    );
  });

  test("next draft not kickoff → role unchanged", () => {
    const saved = {
      ...defaultOffensivePlay(6, TEAM),
      playType: PlayType.FieldGoal,
      result: Result.Good,
      odk: ODK.Offense,
    };
    assert.equal(
      resolveKickoffRoleAfterSave(saved, runDraft, "receive"),
      "receive",
    );
    assert.equal(isKickoffDraft(runDraft), false);
  });
});
