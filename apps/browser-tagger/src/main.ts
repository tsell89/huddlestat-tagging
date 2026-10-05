import type { DictatedChain, PlaylistData } from "@huddlestat/shared";
import {
  STORAGE_KEY,
  confirmSnap,
  csvFilename,
  currentChain,
  gameFromStored,
  hudlCsv,
  parseSpotLabel,
  previewSnap,
  startOver,
  storedGame,
  takeBackLastPlay,
  type BrowserGame,
  type SituationAdjust,
} from "./session.js";
import {
  TEAM_NAME,
  pageSituationSentence,
  previousHappened,
  spotLabel,
  whoLine,
} from "./story.js";

const $ = (id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
};

const opponentInput = $("opponent") as HTMLInputElement;
const confirmBtn = $("confirm") as HTMLButtonElement;
const transcriptField = $("transcript") as HTMLTextAreaElement;

let game: BrowserGame = openingFromStorage();
let lastPreviewKey = "";
let situationTouched = new Set<string>();
let playTouched = new Set<string>();
let filling = false;
let previewTimer = 0;
let previewGen = 0;
let correction: { transcript: string } | null = null;

function openingFromStorage(): BrowserGame {
  try {
    return gameFromStored(localStorage.getItem(STORAGE_KEY));
  } catch {
    return gameFromStored(null);
  }
}

function names() {
  return { team: TEAM_NAME, opponent: game.opponent };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storedGame(game)));
}

function syncOpponent() {
  const name = opponentInput.value.trim() || "Northrop";
  if (game.opponent !== name) {
    game = { ...game, opponent: name };
    persist();
  }
}

function transcriptText() {
  return transcriptField.value.trim();
}

function formatSpot(yardLine: number) {
  return spotLabel(yardLine, names());
}

function parseSpot(text: string) {
  return parseSpotLabel(text, names());
}

function currentSetup(): DictatedChain {
  const base = currentChain(game.plays);
  const down = situationTouched.has("down") ? Number(($("down") as HTMLInputElement).value) : base.down;
  const distance = situationTouched.has("distance")
    ? Number(($("distance") as HTMLInputElement).value)
    : base.distance;
  let yardLine = base.yardLine;
  if (situationTouched.has("yard")) {
    const spot = parseSpot(($("yard") as HTMLInputElement).value);
    if (spot.ok) yardLine = spot.yardLine;
  }
  return {
    ...base,
    down: Number.isInteger(down) ? down : base.down,
    distance: Number.isInteger(distance) ? distance : base.distance,
    yardLine,
  };
}

function paintSituation() {
  const scrimmageEdit = situationTouched.has("down") || situationTouched.has("distance");
  $("situationLine").textContent = pageSituationSentence(currentSetup(), names(), scrimmageEdit);
}

function lastPlay(): PlaylistData | null {
  return game.plays.length ? game.plays[game.plays.length - 1]! : null;
}

function fillPlayFields(play: PlaylistData) {
  filling = true;
  const result = $("result") as HTMLSelectElement;
  const value = play.result || "Rush";
  if (!Array.from(result.options).some((option) => option.value === value)) {
    const extra = document.createElement("option");
    extra.value = value;
    extra.textContent = value;
    result.appendChild(extra);
  }
  result.value = value;
  ($("yards") as HTMLInputElement).value = String(play.gainLoss ?? 0);
  filling = false;
}

function renderPrevious() {
  const section = $("previous");
  if (correction) {
    section.hidden = false;
    $("previousHint").textContent = "Confirm replaces this play and rebuilds the situation.";
    $("previousNote").hidden = true;
    return;
  }
  const play = lastPlay();
  if (!play) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  const end = currentChain(game.plays).yardLine;
  $("previousLine").textContent = previousHappened(play, formatSpot(end));
  const who = whoLine(play);
  $("previousWho").hidden = !who;
  $("previousWho").textContent = who;
  const note = game.transcripts[play.playNumber - 1] || "";
  $("previousNote").hidden = !note;
  $("previousNote").textContent = note;
  $("previousHint").textContent = playTouched.size
    ? "Undo last, then Confirm, to replace this play."
    : "Undo last puts this play back in the box. Confirm replaces it.";
  if (playTouched.size === 0) fillPlayFields(play);
}

function syncSituationFields() {
  const chain = currentChain(game.plays);
  filling = true;
  if (!situationTouched.has("down")) ($("down") as HTMLInputElement).value = String(chain.down ?? 0);
  if (!situationTouched.has("distance")) {
    ($("distance") as HTMLInputElement).value = String(chain.distance ?? 0);
  }
  if (!situationTouched.has("yard")) ($("yard") as HTMLInputElement).value = formatSpot(chain.yardLine ?? -40);
  filling = false;
  paintSituation();
}

function renderState() {
  syncSituationFields();
  renderPrevious();
}

function wholeNumber(raw: string, label: string) {
  if (String(raw).trim() === "") throw new Error(`${label} needs a whole number`);
  const n = Number(raw);
  if (!Number.isInteger(n)) throw new Error(`${label} needs a whole number`);
  return n;
}

function buildAdjust(): SituationAdjust | undefined {
  const adjust: SituationAdjust = {};
  if (situationTouched.has("down")) {
    const down = wholeNumber(($("down") as HTMLInputElement).value, "Down");
    if (down < 0 || down > 4) throw new Error("Down is 0–4");
    adjust.down = down;
  }
  if (situationTouched.has("distance")) {
    const distance = wholeNumber(($("distance") as HTMLInputElement).value, "Distance");
    if (distance < 0 || distance > 99) throw new Error("Distance is 0–99");
    adjust.distance = distance;
  }
  if (situationTouched.has("yard")) {
    const spot = parseSpot(($("yard") as HTMLInputElement).value);
    if (!spot.ok) throw new Error(spot.message);
    adjust.yardLine = spot.yardLine;
  }
  if (correction) {
    if (playTouched.has("result")) adjust.result = ($("result") as HTMLSelectElement).value as PlaylistData["result"];
    if (playTouched.has("yards")) {
      const yards = wholeNumber(($("yards") as HTMLInputElement).value, "Yards");
      adjust.gainLoss = yards;
      if (($("result") as HTMLSelectElement).value === "Return") adjust.returnYards = yards;
    }
  }
  return Object.keys(adjust).length ? adjust : undefined;
}

function previewKey(adjust: SituationAdjust | undefined) {
  return JSON.stringify({ text: transcriptText(), adjust: adjust ?? null });
}

function showStory(data: ReturnType<typeof previewSnap>) {
  const story = data.story;
  $("storyBefore").textContent = story.before;
  $("storyHappened").textContent = story.happened;
  $("storyNext").textContent = String(story.next || "").replace(/^Next:\s*/, "");
  $("storyCard").hidden = false;
  if (correction) {
    $("previousLine").textContent = story.happened;
    const who = whoLine(data.play);
    $("previousWho").hidden = !who;
    $("previousWho").textContent = who;
    if (playTouched.size === 0 && data.play) fillPlayFields(data.play);
  }
}

function message(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function previewNow() {
  const gen = ++previewGen;
  const text = transcriptText();
  if (!text) {
    confirmBtn.disabled = true;
    $("storyCard").hidden = true;
    paintSituation();
    return;
  }
  let adjust: SituationAdjust | undefined;
  try {
    adjust = buildAdjust();
  } catch (err) {
    $("msg").textContent = message(err);
    confirmBtn.disabled = true;
    return;
  }
  const data = previewSnap(game, text, adjust);
  if (gen !== previewGen || transcriptText() !== text) return;
  lastPreviewKey = previewKey(adjust);
  confirmBtn.disabled = !data.canConfirm;
  showStory(data);
  $("msg").textContent = data.canConfirm ? "" : data.story.happened || "Rewrite the dictation";
}

function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => {
    try {
      previewNow();
    } catch (err) {
      $("msg").textContent = message(err);
    }
  }, 350);
}

function mark(bucket: Set<string>, key: string) {
  if (filling) return;
  bucket.add(key);
  confirmBtn.disabled = true;
  lastPreviewKey = "";
  if (bucket === situationTouched) paintSituation();
  if (bucket === playTouched && !correction) {
    $("previousHint").textContent = "Undo last, then Confirm, to replace this play.";
    return;
  }
  if (transcriptText()) schedulePreview();
}

for (const id of ["down", "distance", "yard"]) {
  $(id).addEventListener("input", () => mark(situationTouched, id));
  $(id).addEventListener("change", () => mark(situationTouched, id));
}
for (const id of ["result", "yards"]) {
  $(id).addEventListener("input", () => mark(playTouched, id));
  $(id).addEventListener("change", () => mark(playTouched, id));
}

transcriptField.addEventListener("input", () => {
  lastPreviewKey = "";
  confirmBtn.disabled = true;
  $("storyCard").hidden = true;
  const text = transcriptText();
  if (correction && text !== correction.transcript) playTouched = new Set();
  if (!correction && playTouched.size) {
    playTouched = new Set();
    const play = lastPlay();
    if (play) fillPlayFields(play);
    renderPrevious();
  }
  if (text) schedulePreview();
  else paintSituation();
});

$("preview").addEventListener("click", () => {
  try {
    previewNow();
  } catch (err) {
    $("msg").textContent = message(err);
  }
});

confirmBtn.addEventListener("click", () => {
  try {
    const text = transcriptText();
    const adjust = buildAdjust();
    if (!text || previewKey(adjust) !== lastPreviewKey) {
      $("msg").textContent = "Preview is stale — check the chain again";
      confirmBtn.disabled = true;
      return;
    }
    game = confirmSnap(game, text, adjust);
    correction = null;
    playTouched = new Set();
    situationTouched = new Set();
    transcriptField.value = "";
    lastPreviewKey = "";
    confirmBtn.disabled = true;
    $("storyCard").hidden = true;
    persist();
    renderState();
    $("msg").textContent = "Confirmed.";
    transcriptField.focus();
  } catch (err) {
    $("msg").textContent = message(err);
  }
});

function undoLastPlay(opts: { rewrite?: boolean } = {}) {
  clearTimeout(previewTimer);
  previewGen += 1;
  const taken = takeBackLastPlay(game, correction !== null);
  if (taken.kind === "already") {
    $("msg").textContent = "That play is already back in the box.";
    if (!transcriptText() && correction) transcriptField.value = correction.transcript;
    if (opts.rewrite) {
      transcriptField.focus();
      transcriptField.select();
    }
    return;
  }
  if (taken.kind === "empty") {
    $("msg").textContent = "No play to undo.";
    return;
  }
  const pending = {
    result: ($("result") as HTMLSelectElement).value,
    yards: ($("yards") as HTMLInputElement).value,
    useResult: playTouched.has("result") && !opts.rewrite,
    useYards: playTouched.has("yards") && !opts.rewrite,
  };
  const undone = taken;
  game = undone.game;
  correction = { transcript: undone.transcript.trim() };
  situationTouched = new Set();
  playTouched = new Set();
  if (pending.useResult) playTouched.add("result");
  if (pending.useYards) playTouched.add("yards");
  lastPreviewKey = "";
  confirmBtn.disabled = true;
  $("storyCard").hidden = true;
  $("previousLine").textContent = "This play is back in the box.";
  persist();
  renderState();
  filling = true;
  if (pending.useResult) ($("result") as HTMLSelectElement).value = pending.result;
  if (pending.useYards) ($("yards") as HTMLInputElement).value = pending.yards;
  filling = false;
  transcriptField.value = undone.transcript;
  $("msg").textContent = opts.rewrite
    ? "Rewrite the dictation, then confirm."
    : "This play is back in the box. Confirm replaces it.";
  if (opts.rewrite) {
    transcriptField.focus();
    transcriptField.select();
  }
  if (transcriptText()) previewNow();
}

$("rewrite").addEventListener("click", () => {
  if (!transcriptText() && game.plays.length) {
    try {
      undoLastPlay({ rewrite: true });
    } catch (err) {
      $("msg").textContent = message(err);
    }
    return;
  }
  playTouched = new Set();
  lastPreviewKey = "";
  confirmBtn.disabled = true;
  transcriptField.focus();
  transcriptField.select();
  if (transcriptText()) schedulePreview();
});

$("undo").addEventListener("click", () => {
  try {
    undoLastPlay();
  } catch (err) {
    $("msg").textContent = message(err);
  }
});

$("start").addEventListener("click", () => {
  if (!window.confirm("Wipe this playlist back to the kickoff?")) return;
  game = startOver(game);
  correction = null;
  playTouched = new Set();
  situationTouched = new Set();
  transcriptField.value = "";
  lastPreviewKey = "";
  confirmBtn.disabled = true;
  $("storyCard").hidden = true;
  persist();
  renderState();
  $("msg").textContent = "Back to the kickoff.";
  transcriptField.focus();
});

$("csv").addEventListener("click", () => {
  try {
    const text = hudlCsv(game);
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFilename(game.opponent);
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    $("msg").textContent = message(err);
  }
});

opponentInput.addEventListener("change", () => {
  syncOpponent();
  situationTouched = new Set();
  renderState();
});

opponentInput.value = game.opponent;
renderState();
