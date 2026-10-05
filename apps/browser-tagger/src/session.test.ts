import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ODK, PLAYLIST_DATA_HEADERS, parserOmitsSituation } from "@huddlestat/shared";
import {
  confirmSnap,
  csvFilename,
  currentChain,
  gameFromStored,
  hudlCsv,
  openingGame,
  previewSnap,
  startOver,
  storedGame,
  undoLast,
} from "./session.js";

const KICKOFF =
  "Snider 88 KO. #0 catch Own 20 (THEM blank), OOB Own 38, +18.";

describe("browser tagger session", () => {
  test("preview chains a kickoff return without inventing the snap situation", () => {
    const preview = previewSnap(openingGame("Northrop"), KICKOFF);
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
  });

  test("confirm, undo, and replace stay on the phone playlist", () => {
    let game = confirmSnap(openingGame("Northrop"), KICKOFF);
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
    const afterKick = confirmSnap(openingGame("Northrop"), KICKOFF);
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
    assert.equal(csvFilename("Northrop"), "snider-vs-northrop.playlist.csv");
  });

  test("start over clears the playlist and storage restores the chain", () => {
    const game = confirmSnap(openingGame("Wayne"), KICKOFF);
    const cleared = startOver(game);
    assert.equal(cleared.plays.length, 0);
    assert.equal(cleared.opponent, "Wayne");
    const stored = storedGame(game);
    assert.equal(stored.situation.yardLine, 38);
    assert.equal(stored.situation.odk, ODK.Defense);
    const loaded = gameFromStored(JSON.stringify(stored));
    assert.equal(loaded.plays.length, 1);
    assert.equal(currentChain(loaded.plays).yardLine, 38);
    assert.equal(gameFromStored("not json").plays.length, 0);
  });
});
