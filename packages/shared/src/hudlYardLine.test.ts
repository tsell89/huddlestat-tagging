import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ODK, PlayType } from "./constants.js";
import { yardLineForHudlExport } from "./hudlYardLine.js";

describe("yardLineForHudlExport", () => {
  test("flips defense and kickoff receive, and leaves a PAT and our kickoff", () => {
    assert.equal(
      yardLineForHudlExport({
        yardLine: 20,
        odk: ODK.Defense,
        playType: PlayType.Run,
      }),
      -20,
    );
    assert.equal(
      yardLineForHudlExport({
        yardLine: 40,
        odk: ODK.Kicking,
        playType: PlayType.KickoffReceive,
      }),
      -40,
    );
    assert.equal(
      yardLineForHudlExport({
        yardLine: -40,
        odk: ODK.Kicking,
        playType: PlayType.Kickoff,
      }),
      -40,
    );
    assert.equal(
      yardLineForHudlExport({
        yardLine: -25,
        odk: ODK.Offense,
        playType: PlayType.Run,
      }),
      -25,
    );
    assert.equal(
      yardLineForHudlExport({
        yardLine: 3,
        odk: ODK.Offense,
        playType: PlayType.ExtraPoint,
      }),
      3,
    );
    assert.equal(
      yardLineForHudlExport({
        yardLine: 3,
        odk: ODK.Defense,
        playType: PlayType.ExtraPoint,
      }),
      3,
    );
    assert.equal(
      yardLineForHudlExport({
        yardLine: 1,
        odk: ODK.Defense,
        playType: PlayType.TwoPoint,
      }),
      1,
    );
    assert.equal(
      yardLineForHudlExport({
        yardLine: 3,
        odk: ODK.Defense,
        playType: PlayType.ExtraPointBlock,
      }),
      3,
    );
    assert.equal(
      yardLineForHudlExport({
        yardLine: 1,
        odk: ODK.Defense,
        playType: PlayType.TwoPointBlock,
      }),
      1,
    );
    assert.equal(
      yardLineForHudlExport({
        yardLine: 0,
        odk: ODK.Defense,
        playType: PlayType.Run,
      }),
      0,
    );
    assert.equal(
      yardLineForHudlExport({
        yardLine: 50,
        odk: ODK.Offense,
        playType: PlayType.Run,
      }),
      50,
    );
  });
});
