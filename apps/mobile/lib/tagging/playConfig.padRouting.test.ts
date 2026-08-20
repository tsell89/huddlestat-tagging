import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ODK,
  PlayType,
  defaultPuntReceivePlay,
  nextDraftAfterPlay,
  Result,
} from "@huddlestat/shared";
import { shouldShowOffensePad } from "./playConfig.js";

const TEAM = "WHS";

describe("shouldShowOffensePad — Punt Rec after 4th-down punt", () => {
  test("chain draft after our punt is not a blank pad", () => {
    const punt = {
      ...defaultPuntReceivePlay(5, TEAM),
      playNumber: 5,
      odk: ODK.Offense,
      playType: PlayType.Punt,
      result: Result.Downed,
      yardLine: -28,
      down: 4,
      distance: 2,
      gainLoss: -35,
      spotEncoding: "end:35",
    };
    const next = nextDraftAfterPlay(punt, 6, TEAM);
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.playType, PlayType.PuntReceive);
    assert.equal(
      shouldShowOffensePad(next),
      true,
      "Punt Rec must route to OffensePad/PuntPad — blank pad breaks Script E",
    );
  });

  test("defense Run/Pass remain on offense pad", () => {
    assert.equal(
      shouldShowOffensePad({
        ...defaultPuntReceivePlay(7, TEAM),
        playType: PlayType.Run,
        odk: ODK.Defense,
        result: Result.Rush,
      }),
      true,
    );
  });

  test("open scrimmage draft after turnover (odk D, empty playType) shows pad", () => {
    const afterInt = nextDraftAfterPlay(
      {
        ...defaultPuntReceivePlay(3, TEAM),
        playNumber: 3,
        odk: ODK.Offense,
        playType: PlayType.Pass,
        result: Result.Interception,
        yardLine: -30,
        down: 2,
        distance: 8,
        spotEncoding: "catch:15|end:-32",
      },
      4,
      TEAM,
    );
    assert.equal(afterInt.odk, ODK.Defense);
    assert.equal(afterInt.playType, "");
    assert.equal(shouldShowOffensePad(afterInt), true);
  });
});
