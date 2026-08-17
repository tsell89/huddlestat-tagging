import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PlayType, ODK, type PlaylistData } from "@huddlestat/shared";
import { padLabelForDraft } from "./padLabel.js";

const base = (): PlaylistData => ({
  playNumber: 1,
  quarter: 1,
  odk: ODK.Offense,
  yardLine: -25,
  down: 1,
  distance: 10,
  hash: "M",
  gainLoss: 0,
  passer: { jersey: "", name: "" },
  receiver: { jersey: "", name: "" },
  rusher: { jersey: "", name: "" },
  result: "",
  team: "SHS",
  tackler1: { jersey: "", name: "" },
  tackler2: { jersey: "", name: "" },
  recoveredBy: { jersey: "", name: "" },
  returner: { jersey: "", name: "" },
  playType: PlayType.Run,
  kicker: { jersey: "", name: "" },
  interceptedBy: { jersey: "", name: "" },
});

describe("padLabelForDraft", () => {
  test("kickoff receive", () => {
    const d = { ...base(), playType: PlayType.KickoffReceive, odk: ODK.Kicking };
    assert.equal(padLabelForDraft(d), "Kickoff");
  });

  test("field goal", () => {
    const d = { ...base(), playType: PlayType.FieldGoal, down: 4 };
    assert.equal(padLabelForDraft(d), "FG");
  });

  test("scoring pad", () => {
    const d = { ...base(), playType: PlayType.ExtraPoint, down: 1, distance: 1 };
    assert.equal(padLabelForDraft(d), "Scoring");
  });

  test("defense scrimmage with empty playType is Run", () => {
    const d: PlaylistData = {
      ...base(),
      playType: "",
      odk: ODK.Defense,
      result: "",
    };
    assert.equal(padLabelForDraft(d), "Run");
  });

  test("4th & 13 @ Opp 28 empty type is FG", () => {
    const d: PlaylistData = {
      ...base(),
      playType: "",
      result: "",
      down: 4,
      distance: 13,
      yardLine: 28,
    };
    assert.equal(padLabelForDraft(d), "FG");
  });
});
