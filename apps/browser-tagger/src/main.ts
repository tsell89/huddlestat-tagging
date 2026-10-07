import {
  STORAGE_KEY,
  confirmReplacing,
  confirmSnap,
  csvFilename,
  fileStem,
  gameFromStored,
  hasOpeningSituation,
  hudlCsv,
  lastPlayEndYard,
  previewSnap,
  situationLine,
  startOver,
  storedGame,
  withoutLastPlay,
  type BrowserGame,
  type SnapPreview,
} from "./session.js";
import { createLiveBoxPublisher } from "./liveBox.js";
import { TEAM_NAME, previousHappened, whoLine } from "./story.js";

const $ = (id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
};

const startOpponent = $("startOpponent") as HTMLInputElement;
const continueBtn = $("continue") as HTMLButtonElement;
const opponentInput = $("opponent") as HTMLInputElement;
const transcriptField = $("transcript") as HTMLTextAreaElement;
const previewBtn = $("preview") as HTMLButtonElement;
const editBtn = $("edit") as HTMLButtonElement;
const confirmBtn = $("confirm") as HTMLButtonElement;

let game: BrowserGame = openingFromStorage();
let mode: "dictate" | "ready" = "dictate";
let replacing = false;
let lastPreview: SnapPreview | null = null;
let lastKey = "";
let messageText = "";
let modalOpen = false;

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

function transcriptText() {
  return transcriptField.value.trim();
}

function targetGame(): BrowserGame {
  return replacing ? withoutLastPlay(game) : game;
}

function placeholder(): string {
  if (!hasOpeningSituation(game)) return "Snider deferred their choice and is kicking off.";
  if (game.plays.length === 0) return "Snider 88 KO. #0 catch Own 20, OOB Own 38, +18.";
  return "12 runs for 4, tackled by 11";
}

function selectNote() {
  requestAnimationFrame(() => {
    transcriptField.focus();
    const end = transcriptField.value.length;
    transcriptField.setSelectionRange(0, end);
  });
}

function show(el: HTMLElement, on: boolean) {
  el.hidden = !on;
}

function render() {
  const started = game.started;
  show($("startScreen"), !started);
  show($("tagger"), started);
  show($("modal"), modalOpen);

  const ended = game.phase === "final" && !replacing && mode !== "ready";
  const play = game.plays.length ? game.plays[game.plays.length - 1]! : null;
  show($("previous"), Boolean(play));
  if (play) {
    const endYard = lastPlayEndYard(game);
    $("previousLine").textContent = previousHappened(play, names(), endYard ?? play.yardLine);
    const who = whoLine(play);
    show($("previousWho"), Boolean(who));
    $("previousWho").textContent = who;
    const note = game.transcripts[play.playNumber - 1] || game.transcripts[game.transcripts.length - 1] || "";
    show($("previousNote"), Boolean(note));
    $("previousNote").textContent = note;
  }

  $("situationLine").textContent = situationLine(replacing ? targetGame() : game);
  show($("finalActions"), ended);
  show($("thisPlay"), !ended);
  transcriptField.placeholder = placeholder();

  const previewing = mode === "ready" && lastPreview != null;
  const canSave = Boolean(previewing && lastPreview?.canConfirm);
  show(previewBtn, !previewing);
  show(editBtn, previewing);
  confirmBtn.disabled = !canSave;
  confirmBtn.classList.toggle("h-double", canSave);
  confirmBtn.classList.toggle("h-single", !canSave);
  show($("storyCard"), previewing);
  if (previewing && lastPreview) {
    $("storyBefore").textContent = lastPreview.story.before;
    $("storyHappened").textContent = lastPreview.story.happened;
    $("storyNext").textContent = lastPreview.story.next.replace(/^Next:\s*/, "");
  }

  show($("msg"), Boolean(messageText));
  $("msg").textContent = messageText;

  const stem = fileStem(game.opponent);
  $("fileName").textContent = stem;
  const downloadName = csvFilename(game.opponent);
  $("csv").dataset.download = downloadName;
  $("finalCsv").dataset.download = downloadName;
  if (document.activeElement !== opponentInput) opponentInput.value = game.opponent;
}

function resetToDictate() {
  mode = "dictate";
  lastPreview = null;
  lastKey = "";
}

function previewNow() {
  const text = transcriptText();
  transcriptField.blur();
  if (!text) {
    resetToDictate();
    messageText = "";
    render();
    return;
  }
  const data = previewSnap(targetGame(), text);
  const hasRow = data.canConfirm || data.play != null;
  if (!hasRow) {
    resetToDictate();
    messageText = data.ask || data.story.happened;
    render();
    transcriptField.focus();
    return;
  }
  mode = "ready";
  lastPreview = data;
  lastKey = text;
  messageText = data.canConfirm ? "" : data.ask;
  render();
}

function commitNow() {
  const text = transcriptText();
  if (mode !== "ready" || !lastPreview?.canConfirm || text !== lastKey) {
    resetToDictate();
    render();
    return;
  }
  const base = targetGame();
  const again = previewSnap(base, text);
  if (!again.canConfirm || again.kind !== lastPreview.kind) {
    resetToDictate();
    render();
    return;
  }
  game = replacing ? confirmReplacing(game, text) : confirmSnap(base, text);
  replacing = false;
  resetToDictate();
  transcriptField.value = "";
  messageText = "";
  persist();
  render();
  void liveBoxPublisher.publish();
  if (game.phase !== "final") transcriptField.focus();
}

const liveBoxPublisher = createLiveBoxPublisher({
  getGame: () => game,
  onError: (msg) => {
    messageText = msg;
    render();
  },
});

function editNote() {
  mode = "dictate";
  lastPreview = null;
  lastKey = "";
  messageText = "";
  render();
  selectNote();
}

function editPrevious() {
  if (game.plays.length === 0) return;
  const note = game.transcripts[game.transcripts.length - 1] ?? "";
  replacing = true;
  transcriptField.value = note;
  editNote();
}

function downloadCsv() {
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
    messageText = err instanceof Error ? err.message : String(err);
    render();
  }
}

startOpponent.addEventListener("input", () => {
  continueBtn.disabled = startOpponent.value.trim() === "";
});

startOpponent.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !continueBtn.disabled) continueBtn.click();
});

continueBtn.addEventListener("click", () => {
  const name = startOpponent.value.trim();
  if (!name) return;
  game = { ...game, opponent: name, started: true };
  persist();
  render();
  transcriptField.focus();
});

transcriptField.addEventListener("input", () => {
  if (mode === "dictate" && !lastPreview && !messageText) return;
  resetToDictate();
  messageText = "";
  render();
});

previewBtn.addEventListener("click", () => {
  previewNow();
});

editBtn.addEventListener("click", () => {
  editNote();
});

confirmBtn.addEventListener("click", () => {
  commitNow();
});

$("editPrevious").addEventListener("click", () => {
  editPrevious();
});

opponentInput.addEventListener("input", () => {
  const name = opponentInput.value.trim();
  if (!name || name === game.opponent) return;
  game = { ...game, opponent: name };
  if (mode === "ready") {
    const data = previewSnap(targetGame(), transcriptText());
    if (data.canConfirm) lastPreview = data;
  }
  persist();
  render();
});

opponentInput.addEventListener("change", () => {
  void liveBoxPublisher.publish();
});

$("csv").addEventListener("click", () => {
  downloadCsv();
});

$("finalCsv").addEventListener("click", () => {
  downloadCsv();
});

$("start").addEventListener("click", () => {
  modalOpen = true;
  render();
});

$("cancelStart").addEventListener("click", () => {
  modalOpen = false;
  render();
});

$("doStart").addEventListener("click", () => {
  game = startOver({ ...game, started: true });
  replacing = false;
  resetToDictate();
  transcriptField.value = "";
  messageText = "";
  modalOpen = false;
  persist();
  render();
  void liveBoxPublisher.publish({ allowEmpty: true });
  transcriptField.focus();
});

continueBtn.disabled = startOpponent.value.trim() === "";
render();
if (game.started && game.phase !== "final") transcriptField.focus();
