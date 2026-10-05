import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ODK,
  PLAYLIST_DATA_HEADERS,
  PlayType,
  Result,
  defaultOffensivePlay,
  parserOmitsSituation,
} from "@huddlestat/shared";
import {
  confirmSnap,
  csvFilename,
  currentChain,
  gameFromStored,
  hudlCsv,
  lastPlayEndYard,
  openingGame,
  previewSnap,
  situationChain,
  situationLine,
  startOver,
  storedGame,
  takeBackLastPlay,
  parseSpotLabel,
  undoLast,
  withoutLastPlay,
  type BrowserGame,
} from "./session.js";

const KICKOFF =
  "Snider 88 KO. #0 catch Own 20 (THEM blank), OOB Own 38, +18.";
const TOSS = "Snider deferred their choice and is kicking off.";

function ready(opponent = "Northrop"): BrowserGame {
  const game = confirmSnap(openingGame(opponent), TOSS);
  assert.equal(game.plays.length, 0);
  assert.equal(game.kickoff, "kick");
  return game;
}

describe("browser tagger session", () => {
  test("preview chains a kickoff return without inventing the snap situation", () => {
    const preview = previewSnap(ready(), KICKOFF);
    assert.equal(preview.canConfirm, true);
    assert.equal(parserOmitsSituation(preview.parsed), true);
    assert.equal(preview.play?.playType, "KO");
    assert.equal(preview.play?.result, "Return");
    assert.equal(preview.play?.down, 0);
    assert.equal(preview.play?.distance, 0);
    assert.equal(preview.play?.yardLine, -40);
    assert.equal(preview.play?.odk, ODK.Kicking);
    assert.match(preview.story.before, /Kickoff\. Snider kicks from Snider 40/);
    assert.match(preview.story.happened, /Returned to Northrop 38/);
    assert.match(preview.story.next, /Northrop ball, 1st & 10 at Northrop 38/);
    assert.equal(preview.story.next.startsWith("Next:"), false);
  });

  test("confirm, undo, and replace stay on the phone playlist", () => {
    let game = confirmSnap(ready(), KICKOFF);
    assert.equal(game.plays.length, 1);
    assert.equal(game.transcripts[0], KICKOFF);
    assert.equal(currentChain(game.plays).odk, ODK.Defense);
    assert.equal(currentChain(game.plays).yardLine, 38);

    const undone = undoLast(game);
    assert.equal(undone.game.plays.length, 0);
    assert.equal(undone.transcript, KICKOFF);
    assert.equal(currentChain(undone.game.plays).playTypeGuess, "KO");

    game = confirmSnap(undone.game, "Kickoff touchback, kicker 94");
    assert.equal(game.plays.length, 1);
    assert.equal(game.plays[0]!.result, "Touchback");
    assert.equal(game.plays[0]!.kicker.jersey, "94");
  });

  test("the next snap's down and distance come from the chain", () => {
    const afterKick = confirmSnap(ready(), KICKOFF);
    const note = "1st & 3 Snider 10. Run 4 THEM blank, +9. Tackle 24 US.";
    const preview = previewSnap(afterKick, note);
    assert.equal(parserOmitsSituation(preview.parsed), true);
    assert.equal(preview.play?.odk, ODK.Defense);
    assert.equal(preview.play?.down, 1);
    assert.equal(preview.play?.distance, 10);
    assert.equal(preview.play?.yardLine, 38);
    assert.equal(preview.play?.gainLoss, 9);
    assert.equal(preview.play?.tackler1.jersey, "24");
    assert.equal(preview.play?.rusher.jersey, "");

    const game = confirmSnap(afterKick, note);
    const csv = hudlCsv(game);
    const lines = csv.split("\n");
    assert.equal(lines[0], PLAYLIST_DATA_HEADERS.join(","));
    assert.equal(lines[1]!.split(",")[3], "-40");
    assert.equal(lines[2]!.split(",")[2], "D");
    assert.equal(lines[2]!.split(",")[3], "-38");
    assert.equal(csvFilename("Northrop", 2026), "Snider-Northrop-2026.playlist.csv");
  });

  test("start over clears the playlist and storage restores the chain", () => {
    const game = confirmSnap(ready("Wayne"), KICKOFF);
    const cleared = startOver(game);
    assert.equal(cleared.plays.length, 0);
    assert.equal(cleared.opponent, "Wayne");
    assert.equal(cleared.kickoff, null);
    assert.equal(situationLine(cleared), "Dictate the coin toss.");
    const stored = storedGame(game);
    assert.equal(stored.situation.yardLine, 38);
    assert.equal(stored.situation.odk, ODK.Defense);
    const loaded = gameFromStored(JSON.stringify(stored));
    assert.equal(loaded.plays.length, 1);
    assert.equal(currentChain(loaded.plays).yardLine, 38);
    assert.equal(gameFromStored("not json").plays.length, 0);
  });

  test("a yard-line correction moves the penalty foul spot", () => {
    const note = "False start, 5 yards.";
    const unadjusted = previewSnap(ready(), note);
    const moved = previewSnap(ready(), note, { yardLine: -30 });
    assert.match(unadjusted.play?.spotEncoding ?? "", /foul:-40/);
    assert.match(moved.play?.spotEncoding ?? "", /foul:-30/);
    assert.notEqual(moved.next.yardLine, unadjusted.next.yardLine);
  });

  test("edited return yards move the next ball spot", () => {
    const original = previewSnap(ready(), KICKOFF);
    const edited = previewSnap(ready(), KICKOFF, {
      gainLoss: 25,
      returnYards: 25,
    });
    assert.equal(original.play?.spotEncoding, "catch:20|end:38");
    assert.equal(original.next.yardLine, 38);
    assert.equal(edited.play?.spotEncoding, "catch:20|end:45");
    assert.equal(edited.play?.returnYards, 25);
    assert.equal(edited.next.yardLine, 45);
  });

  test("changing a return to a touchback drops the old end spot", () => {
    const returned = previewSnap(ready(), KICKOFF);
    const touchback = previewSnap(ready(), KICKOFF, { result: "Touchback" });
    assert.equal(returned.next.yardLine, 38);
    assert.equal(touchback.play?.result, "Touchback");
    assert.equal(touchback.play?.spotEncoding, undefined);
    assert.notEqual(touchback.next.yardLine, 38);
  });

  test("a bare punt cannot confirm", () => {
    const preview = previewSnap(
      confirmSnap(ready(), "Kickoff touchback, kicker 94"),
      "punt",
    );
    assert.equal(preview.canConfirm, false);
    assert.equal(preview.parsed.result, "Downed");
    assert.equal(preview.parsed.confidence, "low");
    assert.equal(preview.play == null, false);
    assert.match(preview.story.happened, /Punt/);
    assert.match(preview.ask, /end spot/);
    assert.throws(() => confirmSnap(confirmSnap(ready(), "Kickoff touchback, kicker 94"), "punt"));
  });

  test("undo while a snap is already back does not drop the play before it", () => {
    const game = confirmSnap(
      confirmSnap(ready(), KICKOFF),
      "Run 4 THEM blank, +9. Tackle 24 US.",
    );
    const once = takeBackLastPlay(game, false);
    assert.equal(once.kind, "undone");
    if (once.kind !== "undone") return;
    assert.equal(once.game.plays.length, 1);
    const twice = takeBackLastPlay(once.game, true);
    assert.equal(twice.kind, "already");
    assert.equal(once.game.plays.length, 1);
  });

  test("yard line words do not match inside other words", () => {
    const labels = { team: "Snider", opponent: "Northrop" };
    assert.equal(parseSpotLabel("brown 25", labels).ok, false);
    assert.equal(parseSpotLabel("opportunity 40", labels).ok, false);
    assert.deepEqual(parseSpotLabel("Own 25", labels), { ok: true, yardLine: -25 });
    assert.deepEqual(parseSpotLabel("Northrop 38", labels), { ok: true, yardLine: 38 });
  });

  test("the coin toss sets who kicks and is not a playlist row", () => {
    const blocked = previewSnap(openingGame("Northrop"), KICKOFF);
    assert.equal(blocked.canConfirm, false);
    assert.equal(blocked.story.happened, "Dictate the coin toss first.");

    const preview = previewSnap(openingGame("Northrop"), TOSS);
    assert.equal(preview.kind, "kickoff");
    assert.equal(preview.story.before, "Before the kickoff.");
    assert.equal(preview.story.happened, "Snider deferred. Snider is kicking off.");
    assert.equal(preview.story.next, "Kickoff. Snider kicks from Snider 40.");

    const receive = previewSnap(openingGame("Northrop"), "Northrop deferred. Snider will receive.");
    assert.equal(receive.story.happened, "Northrop deferred. Snider will receive.");
    assert.equal(receive.story.next, "Kickoff. Northrop kicks from Northrop 40.");
  });

  test("a second-half kickoff note stays off the playlist", () => {
    const game = confirmSnap(ready(), KICKOFF);
    const preview = previewSnap(game, "Northrop is kicking off.");
    assert.equal(preview.openingToss, false);
    assert.equal(preview.story.next, "Kickoff. Northrop kicks from Northrop 40.");
    const next = confirmSnap(game, "Northrop is kicking off.");
    assert.equal(next.plays.length, 1);
    assert.equal(next.kickoff, "kick");
    assert.equal(situationLine(next), "Kickoff. Northrop kicks from Northrop 40.");
    assert.equal(situationChain(next).yardLine, 40);
    assert.equal(lastPlayEndYard(next), 38);
  });

  test("editing a second-half kickoff keeps that kickoff waiting", () => {
    const afterHalf = confirmSnap(confirmSnap(ready(), KICKOFF), "Northrop is kicking off.");
    const kicked = confirmSnap(afterHalf, "Northrop 80 KO touchback.");
    assert.equal(kicked.plays.length, 2);
    assert.equal(kicked.plays[1]!.playType, "KO Rec");
    assert.equal(kicked.nextKickoff, null);
    const editing = withoutLastPlay(kicked);
    assert.equal(editing.plays.length, 1);
    assert.equal(editing.nextKickoff, "receive");
    assert.equal(situationLine(editing), "Kickoff. Northrop kicks from Northrop 40.");
  });

  test("a failed note does not change the playlist", () => {
    const game = confirmSnap(ready(), KICKOFF);
    const preview = previewSnap(game, "um the thing");
    assert.equal(preview.canConfirm, false);
    assert.equal(preview.play, null);
    assert.equal(preview.ask, "Name the play and the result.");
    assert.equal(preview.story.happened, "Name the play and the result.");
    assert.throws(() => confirmSnap(game, "um the thing"), /Name the play and the result/);
    assert.equal(game.plays.length, 1);
  });

  test("replacing a snap uses the situation that snap started in", () => {
    const kicked = confirmSnap(ready(), KICKOFF);
    assert.match(situationLine(kicked), /Northrop ball/);
    assert.equal(situationLine(withoutLastPlay(kicked)), "Kickoff. Snider kicks from Snider 40.");

    const ended = confirmSnap(kicked, "Final.");
    assert.equal(situationLine(ended), "Snider 0, Northrop 0.");
    assert.equal(
      situationLine(withoutLastPlay(ended)),
      "Kickoff. Snider kicks from Snider 40.",
    );
  });

  test("confirm replaces the previous play", () => {
    const game = confirmSnap(ready(), KICKOFF);
    const replaced = confirmSnap(withoutLastPlay(game), "Kickoff touchback, kicker 94");
    assert.equal(replaced.plays.length, 1);
    assert.equal(replaced.plays[0]!.result, "Touchback");
    assert.equal(replaced.transcripts[0], "Kickoff touchback, kicker 94");
    assert.equal(replaced.plays[0]!.kicker.jersey, "94");
  });

  test("final confirms the score from the plays and adds no row", () => {
    const game = confirmSnap(ready(), KICKOFF);
    const preview = previewSnap(game, "Final.");
    assert.equal(preview.kind, "final");
    assert.equal(preview.story.happened, "Game over.");
    assert.equal(preview.story.next, "Snider 0, Northrop 0.");
    const ended = confirmSnap(game, "Final.");
    assert.equal(ended.phase, "final");
    assert.equal(ended.plays.length, 1);
    assert.equal(situationLine(ended), "Snider 0, Northrop 0.");
  });

  test("a tied end of regulation continues into overtime", () => {
    const game: BrowserGame = {
      ...openingGame("Northrop"),
      kickoff: "kick",
      started: true,
      plays: [
        {
          ...defaultOffensivePlay(1, "SHS"),
          quarter: 4,
          playType: PlayType.Run,
          result: Result.Rush,
          gainLoss: 2,
        },
      ],
      transcripts: ["2 runs for 2"],
    };
    const preview = previewSnap(game, "Final.");
    assert.equal(preview.kind, "overtime");
    assert.match(preview.story.happened, /Overtime/);
    assert.match(preview.story.next, /1st &/);
    assert.doesNotMatch(preview.story.next, /Snider 0/);
    const ot = confirmSnap(game, "Final.");
    assert.equal(ot.phase, "ot");
    assert.equal(ot.plays.length, 1);
    assert.match(situationLine(ot), /Snider ball/);
    const early = previewSnap(ot, "Final.");
    assert.equal(early.canConfirm, false);
    assert.equal(early.story.happened, "Overtime continues.");
  });

  test("overtime ends once both teams have possessed and the score is not tied", () => {
    const game: BrowserGame = {
      ...openingGame("Northrop"),
      kickoff: "kick",
      phase: "ot",
      started: true,
      plays: [
        {
          ...defaultOffensivePlay(1, "SHS"),
          quarter: 5,
          odk: ODK.Offense,
          playType: PlayType.Run,
          result: Result.Cop,
          down: 4,
        },
        {
          ...defaultOffensivePlay(2, "SHS"),
          quarter: 5,
          odk: ODK.Defense,
          playType: PlayType.FieldGoal,
          result: Result.Good,
        },
      ],
      transcripts: ["turnover on downs", "field goal good"],
    };
    const preview = previewSnap(game, "Final.");
    assert.equal(preview.kind, "final");
    assert.equal(preview.story.next, "Snider 0, Northrop 3.");
  });
});
