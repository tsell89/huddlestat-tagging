import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ODK, PlayType, Result } from "@huddlestat/shared";
import {
  reduceTaggingSession,
  runActions,
  snapshot,
  startSession,
  type TaggingSession,
  type TaggingSnapshot,
} from "./taggingSession";
import {
  recipe,
  runScriptAThroughPlay,
  SCRIPT_A_ACTIONS,
} from "./taggingSessionRecipes";

function assertSnap(
  state: TaggingSession,
  expected: Partial<TaggingSnapshot> & {
    headerIncludes?: string;
    headerExcludes?: string;
  },
): TaggingSnapshot {
  const snap = snapshot(state);
  if (expected.header !== undefined) assert.equal(snap.header, expected.header);
  if (expected.pad !== undefined) assert.equal(snap.pad, expected.pad);
  if (expected.phase !== undefined) assert.equal(snap.phase, expected.phase);
  if (expected.kickoffRole !== undefined) {
    assert.equal(snap.kickoffRole, expected.kickoffRole);
  }
  if (expected.canSave !== undefined) assert.equal(snap.canSave, expected.canSave);
  if (expected.playCount !== undefined) {
    assert.equal(snap.playCount, expected.playCount);
  }
  if (expected.score !== undefined) {
    assert.deepEqual(snap.score, expected.score);
  }
  if (expected.headerIncludes) {
    assert.ok(
      snap.header.includes(expected.headerIncludes),
      `header ${JSON.stringify(snap.header)} should include ${JSON.stringify(expected.headerIncludes)}`,
    );
  }
  if (expected.headerExcludes) {
    assert.ok(
      !snap.header.includes(expected.headerExcludes),
      `header ${JSON.stringify(snap.header)} should not include ${JSON.stringify(expected.headerExcludes)}`,
    );
  }
  return snap;
}

describe("startSession / newGameReceive", () => {
  test("recipe snapshot: opening KO, We receive, no saves", () => {
    const s = recipe("newGameReceive");
    assertSnap(s, {
      header: "PLAY 1 · Q1 · Kickoff @ -40",
      pad: "Kickoff",
      phase: "Q1",
      kickoffRole: "receive",
      canSave: true,
      playCount: 0,
      score: { us: 0, them: 0 },
    });
    assert.equal(s.draft.playType, PlayType.KickoffReceive);
    assert.equal(s.draft.yardLine, -40);
  });

  test("one-off: flip role to We kick before save", () => {
    const s = reduceTaggingSession(recipe("newGameReceive"), {
      type: "kickoffRole",
      role: "kick",
    });
    assertSnap(s, {
      pad: "Kickoff",
      kickoffRole: "kick",
      playCount: 0,
      headerIncludes: "Kickoff @ -40",
    });
    assert.equal(s.draft.playType, PlayType.Kickoff);
    assert.equal(s.openingKickoffRole, "kick");
  });
});

describe("Script A — canonical drive + UX-14", () => {
  test("play 1 SAVE → PLAY 2 · 1st & 10 @ -25 · Run", () => {
    const s = runScriptAThroughPlay(1);
    assertSnap(s, {
      header: "PLAY 2 · Q1 · 1st & 10 @ -25",
      pad: "Run",
      phase: "Q1",
      kickoffRole: "receive",
      playCount: 1,
      score: { us: 0, them: 0 },
    });
    assert.equal(s.plays[0].returnYards, 20);
    assert.equal(s.plays[0].spotEncoding, "catch:-5|end:-25");
  });

  test("play 2 SAVE → PLAY 3 · 1st & 10 @ 25 · Run", () => {
    const s = runScriptAThroughPlay(2);
    assertSnap(s, {
      header: "PLAY 3 · Q1 · 1st & 10 @ 25",
      pad: "Run",
      playCount: 2,
    });
    assert.equal(s.plays[1].gainLoss, 50);
  });

  test("play 3 SAVE → PLAY 4 · 2nd & 10 @ 25 · Run", () => {
    const s = runScriptAThroughPlay(3);
    assertSnap(s, {
      header: "PLAY 4 · Q1 · 2nd & 10 @ 25",
      pad: "Run",
      playCount: 3,
    });
    assert.equal(s.plays[2].result, Result.Incomplete);
    assert.equal(s.plays[2].gainLoss, 0);
  });

  test("play 4 SAVE → PLAY 5 · 3rd & 8 @ 23 · Run", () => {
    const s = runScriptAThroughPlay(4);
    assertSnap(s, {
      header: "PLAY 5 · Q1 · 3rd & 8 @ 23",
      pad: "Run",
      playCount: 4,
    });
    assert.equal(s.plays[3].gainLoss, 2);
  });

  test("play 5 SAVE → 4th & 13 @ Opp 28 · FG pad default (UX-11)", () => {
    const s = runScriptAThroughPlay(5);
    assertSnap(s, {
      header: "PLAY 6 · Q1 · FG @ 28",
      pad: "FG",
      playCount: 5,
    });
    assert.equal(s.draft.down, 4);
    assert.equal(s.draft.distance, 13);
    assert.equal(s.draft.yardLine, 28);
    assert.equal(s.draft.playType, PlayType.FieldGoal);
    assert.equal(s.plays[4].gainLoss, -5);
    assert.equal(s.plays[4].result, Result.Sack);
  });

  test("play 6 SAVE → Kickoff @ Own 40 · We kick (UX-14)", () => {
    const s = runScriptAThroughPlay(6);
    assertSnap(s, {
      header: "PLAY 7 · Q1 · Kickoff @ -40",
      pad: "Kickoff",
      kickoffRole: "kick",
      playCount: 6,
      score: { us: 3, them: 0 },
    });
    assert.equal(s.draft.playType, PlayType.Kickoff);
    assert.equal(s.plays[5].playType, PlayType.FieldGoal);
    assert.equal(s.plays[5].result, Result.Good);
    assert.equal(s.plays[5].kickYards, 38);
  });

  test("recipe('scriptA') matches play 6 end state", () => {
    const s = recipe("scriptA");
    assertSnap(s, {
      header: "PLAY 7 · Q1 · Kickoff @ -40",
      pad: "Kickoff",
      phase: "Q1",
      kickoffRole: "kick",
      playCount: 6,
      score: { us: 3, them: 0 },
    });
  });

  test("one-off: Play 7 TB from scriptA → offense snap, role still kick", () => {
    const s = runActions(recipe("scriptA"), [
      { type: "result", result: Result.Touchback },
      { type: "save" },
    ]);
    assertSnap(s, {
      pad: "Run",
      kickoffRole: "kick",
      playCount: 7,
      headerIncludes: "1st & 10",
    });
    assert.notEqual(s.draft.playType, PlayType.Kickoff);
    assert.notEqual(s.draft.playType, PlayType.KickoffReceive);
  });
});

describe("q2 recipe", () => {
  test("snapshot: phase Q2 once in header, not Q1 · Q1", () => {
    const s = recipe("q2");
    const snap = assertSnap(s, {
      phase: "Q2",
      playCount: 1,
      headerIncludes: "Q2",
      headerExcludes: "Q1",
    });
    assert.equal((snap.header.match(/Q2/g) ?? []).length, 1);
    assert.equal(s.draft.quarter, 2);
  });

  test("one-off: save a rush in Q2 stamps quarter 2", () => {
    const s = runActions(recipe("q2"), [
      { type: "playType", playType: PlayType.Run },
      { type: "result", result: Result.Rush },
      { type: "tackle", end: { kind: "yardline", yardLine: -20 } },
      { type: "save" },
    ]);
    assert.equal(s.plays[1].quarter, 2);
    assertSnap(s, { phase: "Q2", playCount: 2 });
  });
});

describe("halftime recipe", () => {
  test("snapshot: HALFTIME, no extra play row", () => {
    const q2 = recipe("q2");
    const s = recipe("halftime");
    assertSnap(s, {
      phase: "HALFTIME",
      playCount: q2.plays.length,
      headerIncludes: "Halftime",
    });
    assert.equal(s.plays.length, q2.plays.length);
  });

  test("one-off: Start 2nd half → Q3 kickoff, opposite opening role", () => {
    const q3 = reduceTaggingSession(recipe("halftime"), { type: "phaseAdvance" });
    assertSnap(q3, {
      phase: "Q3",
      kickoffRole: "kick",
      pad: "Kickoff",
      headerIncludes: "Kickoff @ -40",
    });
    assert.equal(q3.draft.yardLine, -40);
    assert.equal(q3.draft.quarter, 3);
    assert.equal(q3.draft.playType, PlayType.Kickoff);
  });
});

describe("q3Kickoff recipe", () => {
  test("snapshot: 2H kickoff at Own 40, We kick", () => {
    const s = recipe("q3Kickoff");
    assertSnap(s, {
      phase: "Q3",
      kickoffRole: "kick",
      pad: "Kickoff",
      header: "PLAY 2 · Q3 · Kickoff @ -40",
    });
    assert.equal(s.draft.yardLine, -40);
  });

  test("one-off: save 2H TB → quarter 3 on the kickoff row", () => {
    const s = runActions(recipe("q3Kickoff"), [
      { type: "result", result: Result.Touchback },
      { type: "save" },
    ]);
    assert.equal(s.plays[s.plays.length - 1].quarter, 3);
    assertSnap(s, { phase: "Q3", pad: "Run" });
  });
});

describe("q4Tied recipe", () => {
  test("snapshot: Q4, scores equal from tagged FGs", () => {
    const s = recipe("q4Tied");
    assertSnap(s, {
      phase: "Q4",
      score: { us: 3, them: 3 },
    });
    assert.ok(s.plays.some((p) => p.playType === PlayType.FieldGoal && p.odk === ODK.Offense && p.result === Result.Good));
    assert.ok(s.plays.some((p) => p.playType === PlayType.FieldGoal && p.odk === ODK.Defense && p.result === Result.Good));
  });

  test("one-off: startOt us → OT possession snap, not kickoff", () => {
    const s = reduceTaggingSession(recipe("q4Tied"), {
      type: "startOt",
      possession: "us",
    });
    assertSnap(s, {
      phase: "OT",
      pad: "Run",
      score: { us: 3, them: 3 },
    });
    assert.notEqual(s.draft.playType, PlayType.Kickoff);
    assert.notEqual(s.draft.playType, PlayType.KickoffReceive);
    assert.equal(s.draft.odk, ODK.Offense);
    assert.equal(s.draft.yardLine, 10);
    assert.equal(s.draft.quarter, 5);
    assert.equal(s.draft.down, 1);
    assert.equal(s.draft.distance, 10);
  });
});

describe("otUsBall recipe", () => {
  test("snapshot: HS OT @ Opp 10, quarter 5, odk O", () => {
    const tied = recipe("q4Tied");
    const s = recipe("otUsBall");
    assertSnap(s, {
      phase: "OT",
      pad: "Run",
      playCount: tied.plays.length,
      score: { us: 3, them: 3 },
      headerIncludes: "OT",
    });
    assert.equal(s.draft.odk, ODK.Offense);
    assert.equal(s.draft.yardLine, 10);
    assert.equal(s.draft.quarter, 5);
    assert.equal(s.otPossession, "us");
  });

  test("one-off: OT rush does not route to kickoff", () => {
    const s = runActions(recipe("otUsBall"), [
      { type: "playType", playType: PlayType.Run },
      { type: "result", result: Result.Rush },
      { type: "tackle", end: { kind: "yardline", yardLine: 5 } },
      { type: "save" },
    ]);
    assert.equal(s.plays[s.plays.length - 1].quarter, 5);
    assert.notEqual(s.draft.playType, PlayType.Kickoff);
    assertSnap(s, { phase: "OT" });
  });
});

describe("halftime does not insert a play", () => {
  test("phaseAdvance Q2→HALFTIME keeps playCount", () => {
    const before = recipe("q2");
    const after = reduceTaggingSession(before, { type: "phaseAdvance" });
    assert.equal(after.plays.length, before.plays.length);
    assert.equal(after.phase, "HALFTIME");
  });
});

describe("runActions", () => {
  test("replays Script A the same as recipe('scriptA')", () => {
    const viaRun = runActions(
      startSession({ teamCode: "SHS", openingKickoffRole: "receive" }),
      SCRIPT_A_ACTIONS,
    );
    const viaRecipe = recipe("scriptA");
    assert.deepEqual(snapshot(viaRun), snapshot(viaRecipe));
  });
});
