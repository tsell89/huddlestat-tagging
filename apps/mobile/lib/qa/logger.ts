import type { GamePhase, PlaylistData } from "@huddlestat/shared";
import type { LocalGame } from "@/lib/db/types";
import {
  appendQaLogEntry,
  hasQaSession,
} from "@/lib/db/qaLog";
import type { CatchUpHint } from "@/lib/tagging/catchUpHint";
import type { KickoffRole } from "@/lib/tagging/kickoffRole";
import { isKickoffDraft } from "@/lib/tagging/kickoffRole";
import {
  formatQaHeaderLine,
  formatQaSidebarLine,
  formatQaTagSummary,
} from "@/lib/qa/format";
import { padLabelForDraft } from "@/lib/qa/padLabel";
import { mirrorQaEntryToMac } from "@/lib/qa/devSink";
import Constants from "expo-constants";

export type QaSaveMode = "live" | "catch-up" | "edit";

const QA_BUILD =
  (Constants.expoConfig?.extra as { gitCommit?: string } | undefined)
    ?.gitCommit ?? "dev";

async function ensureSession(game: LocalGame): Promise<void> {
  if (await hasQaSession(game.id)) return;
  const session = {
    date: new Date().toISOString().slice(0, 10),
    branch: "device",
    commit: QA_BUILD,
    gameId: game.id,
    gameSlug: game.slug,
    teamCode: game.teamCode,
    opponent: game.opponent,
    automated: "none",
  };
  await appendQaLogEntry(game.id, "session", session);
  mirrorQaEntryToMac("session", session);
}

export async function logQaSaveEvent(input: {
  game: LocalGame;
  savedPlay: PlaylistData;
  nextDraft: PlaylistData;
  mode: QaSaveMode;
  catchUpHint: CatchUpHint | null;
  kickoffRole: KickoffRole;
  phaseBefore: GamePhase;
  phaseAfter: GamePhase;
  scoreAfter: string;
  saveKind: "insert" | "update";
}): Promise<void> {
  const {
    game,
    savedPlay,
    nextDraft,
    mode,
    catchUpHint,
    kickoffRole,
    phaseBefore,
    phaseAfter,
    scoreAfter,
    saveKind,
  } = input;

  await ensureSession(game);

  const payload = {
    saveKind,
    mode,
    catchUpHint,
    kickoffRoleToggle: isKickoffDraft(nextDraft) ? kickoffRole : undefined,
    phaseBefore,
    phaseAfter,
    quarterOnDraft: savedPlay.quarter,
    tagSummary: formatQaTagSummary(savedPlay),
    headerAfter: formatQaHeaderLine(nextDraft, phaseAfter),
    padAfter: padLabelForDraft(nextDraft),
    sidebarLast: formatQaSidebarLine(savedPlay),
    scoreAfter,
    gainLoss: savedPlay.gainLoss,
    savedPlay,
    nextDraft,
  };

  await appendQaLogEntry(game.id, "save", payload);
  mirrorQaEntryToMac("save", {
    gameSlug: game.slug,
    gameId: game.id,
    ...payload,
  });
}

export async function logQaPhaseEvent(input: {
  game: LocalGame;
  action: string;
  phaseBefore: GamePhase;
  phaseAfter: GamePhase;
  banner?: string | null;
  otPossession?: "us" | "them";
}): Promise<void> {
  await ensureSession(input.game);
  const payload = {
    gameSlug: input.game.slug,
    gameId: input.game.id,
    action: input.action,
    phaseBefore: input.phaseBefore,
    phaseAfter: input.phaseAfter,
    banner: input.banner ?? null,
    otPossession: input.otPossession,
  };
  await appendQaLogEntry(input.game.id, "phase", payload);
  mirrorQaEntryToMac("phase", payload);
}

export async function logQaCursorEvent(input: {
  game: LocalGame;
  action: string;
  mode?: QaSaveMode;
  catchUpHint?: CatchUpHint | null;
  nextPlayNumber?: number;
  playNumber?: number;
}): Promise<void> {
  await ensureSession(input.game);
  const payload = {
    gameSlug: input.game.slug,
    gameId: input.game.id,
    action: input.action,
    mode: input.mode,
    catchUpHint: input.catchUpHint ?? null,
    nextPlayNumber: input.nextPlayNumber,
    playNumber: input.playNumber,
  };
  await appendQaLogEntry(input.game.id, "cursor", payload);
  mirrorQaEntryToMac("cursor", payload);
}
