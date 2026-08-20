import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import {
  PlayType,
  Result,
  defaultKickoffPlay,
  deriveScoreFromPlays,
  type GamePhase,
  normalizePlayOnSave,
  shouldFinalizeOtGame,
  type PlaylistData,
} from "@huddlestat/shared";
import { SyncStatusBar } from "@/components/SyncStatusBar";
import { PlayLogSidebar } from "@/components/tagging/PlayLogSidebar";
import { GamePhaseBar } from "@/components/tagging/GamePhaseBar";
import { StartOtModal } from "@/components/tagging/StartOtModal";
import { TaggingHeader } from "@/components/tagging/TaggingHeader";
import { TaggingPad } from "@/components/tagging/TaggingPad";
import {
  finalizeLocalGame,
  getLocalGame,
  updateLocalGamePhase,
  updateLocalGameStatus,
  updateLocalOtPossession,
  updateLocalScore,
} from "@/lib/db/games";
import {
  countUnsyncedPlays,
  getNextPlayNumber,
  listPlaysForGame,
  saveLocalPlay,
  updateLocalPlay,
} from "@/lib/db/plays";
import type { LocalGame, LocalPlay } from "@/lib/db/types";
import {
  ensureOffensePadDraft,
  getVisiblePlayerSlots,
  type PlayerSlotKey,
} from "@/lib/tagging/playConfig";
import {
  applyKickoffSpotsToDraft,
  defaultKickoffReturnSpots,
  initKickoffSpotsFromDraft,
  touchbackDraftPatch,
  type KickoffReturnSpots,
} from "@/lib/tagging/kickoffReturn";
import {
  applyPuntSpotsToDraft,
  defaultPuntSpots,
  initPuntSpotsFromDraft,
  type PuntSpots,
} from "@/lib/tagging/puntReturn";
import {
  applyTackleSpotToDraft,
  initTackleEndFromDraft,
  needsTackleSpot,
  type TackleEnd,
} from "@/lib/tagging/tackleSpot";
import {
  applyInterceptionSpotsToDraft,
  initInterceptionSpotsFromDraft,
  type InterceptionReturnSpots,
} from "@/lib/tagging/interceptionReturn";
import {
  applyFumbleSpotsToDraft,
  initFumbleSpotsFromDraft,
  type FumbleRecoverySpots,
} from "@/lib/tagging/fumbleRecovery";
import {
  applyBlockedKickSpotsToDraft,
  initBlockedKickSpotsFromDraft,
  type BlockedKickRecoverySpots,
} from "@/lib/tagging/blockedKickRecovery";
import {
  applyPenaltyDraftToPlay,
  initPenaltyDraftFromPlay,
  type PenaltyDraftFields,
} from "@/lib/tagging/penaltySpot";
import { LAYOUT } from "@/lib/tagging/layoutConstants";
import {
  applyKickoffRole,
  firstKickoffPlayerSlot,
  getKickoffRole,
  isKickoffDraft,
  kickoffRoleFromDraft,
  persistOpeningKickoffRole,
  recordOpeningKickoffRole,
  resolveKickoffRoleAfterSave,
  secondHalfKickoffRole,
  setKickoffRole,
  type KickoffRole,
} from "@/lib/tagging/kickoffRole";
import {
  getDefendingEnd,
  persistOpeningDefendingEnd,
  recordOpeningDefendingEnd,
  secondHalfDefendingEnd,
  setDefendingEnd,
  type DefendingEnd,
} from "@/lib/tagging/defendingEndPersist";
import { defendingEndAfterQuarterBreak } from "@/lib/tagging/defendingEnd";
import { isAdvancingTowardOpponent } from "@/lib/tagging/directionOfPlay";
import type { CatchUpHint } from "@/lib/tagging/catchUpHint";
import { applyPasserLeaderDefault } from "@/lib/tagging/jerseyGridRank";
import {
  defaultOtOpeningDraft,
  nextDraftAfterPlayForGame,
  nextDraftForGame,
} from "@/lib/tagging/nextDraftForGame";
import { useSync } from "@/context/sync-context";
import {
  publishIfConfigured,
  type SnapshotKind,
} from "@/lib/sync/engine";
import {
  logQaCursorEvent,
  logQaPhaseEvent,
  logQaSaveEvent,
  type QaSaveMode,
} from "@/lib/qa/logger";
import { QaLogExportButton } from "@/components/QaLogExportButton";
import { catchUpHintMessage } from "@/lib/tagging/catchUpHint";
import { DirectionOfPlayControl } from "@/components/tagging/DirectionOfPlayControl";

function playToDraft(play: LocalPlay): PlaylistData {
  return {
    playNumber: play.playNumber,
    quarter: play.quarter,
    odk: play.odk,
    yardLine: play.yardLine,
    down: play.down,
    distance: play.distance,
    hash: play.hash,
    gainLoss: play.gainLoss,
    passer: play.passer,
    receiver: play.receiver,
    rusher: play.rusher,
    result: play.result,
    team: play.team,
    tackler1: play.tackler1,
    tackler2: play.tackler2,
    recoveredBy: play.recoveredBy,
    returnYards: play.returnYards,
    returner: play.returner,
    playType: play.playType,
    kicker: play.kicker,
    kickYards: play.kickYards,
    interceptedBy: play.interceptedBy,
    spotEncoding: play.spotEncoding,
  };
}

function withKickoffRole(draft: PlaylistData, role: KickoffRole): PlaylistData {
  return isKickoffDraft(draft) ? applyKickoffRole(draft, role) : draft;
}

function withQuarterFromLast(
  draft: PlaylistData,
  lastQuarter: number,
): PlaylistData {
  return { ...draft, quarter: lastQuarter };
}

async function applyScoreAfterSave(
  localGameId: string,
  allPlays: LocalPlay[],
  currentGame: LocalGame,
): Promise<LocalGame> {
  const score = deriveScoreFromPlays(allPlays.map(playToDraft));
  await updateLocalScore(localGameId, score.us, score.them);

  if (shouldFinalizeOtGame(allPlays.map(playToDraft), currentGame.phase, score)) {
    await finalizeLocalGame(localGameId);
    return {
      ...currentGame,
      homeScore: score.us,
      awayScore: score.them,
      phase: "FINAL",
      status: "final",
    };
  }

  return {
    ...currentGame,
    homeScore: score.us,
    awayScore: score.them,
  };
}

function quarterForRegulationPhase(phase: GamePhase): number | null {
  if (phase === "Q1") return 1;
  if (phase === "Q2") return 2;
  if (phase === "Q3") return 3;
  if (phase === "Q4") return 4;
  if (phase === "OT") return 5;
  return null;
}

function buildLiveDraft(
  plays: LocalPlay[],
  nextNum: number,
  teamCode: string,
  kickoffRole: KickoffRole,
  phase: GamePhase,
): PlaylistData {
  const last = plays[plays.length - 1];
  const phaseQuarter = quarterForRegulationPhase(phase);
  if (last) {
    const lastQuarter = phaseQuarter ?? last.quarter;
    return withQuarterFromLast(
      ensureOffensePadDraft(
        withKickoffRole(
          nextDraftForGame(playToDraft(last), nextNum, teamCode, phase),
          kickoffRole,
        ),
      ),
      lastQuarter,
    );
  }
  return withKickoffRole(
    defaultKickoffPlay(nextNum, teamCode, {
      result: Result.Return,
      quarter: phaseQuarter ?? 1,
    }),
    kickoffRole,
  );
}

function initLiveBallSpotsFromDraft(draft: PlaylistData | null) {
  return {
    intSpots: initInterceptionSpotsFromDraft(draft),
    fumbleSpots: initFumbleSpotsFromDraft(draft),
    blockedSpots: initBlockedKickSpotsFromDraft(draft),
    penalty: initPenaltyDraftFromPlay(draft),
  };
}

function applySpotDraft(
  draft: PlaylistData,
  kickoff: KickoffReturnSpots,
  punt: PuntSpots,
  end: TackleEnd,
  intSpots: InterceptionReturnSpots,
  fumbleSpots: FumbleRecoverySpots,
  blockedSpots: BlockedKickRecoverySpots,
  penalty: PenaltyDraftFields,
) {
  return applyPenaltyDraftToPlay(
    applyBlockedKickSpotsToDraft(
      applyFumbleSpotsToDraft(
        applyInterceptionSpotsToDraft(
          applyTackleSpotToDraft(
            applyPuntSpotsToDraft(
              applyKickoffSpotsToDraft(ensureOffensePadDraft(draft), kickoff),
              punt,
            ),
            end,
          ),
          intSpots,
        ),
        fumbleSpots,
      ),
      blockedSpots,
    ),
    penalty,
  );
}

function finalizeTaggingDraft(
  draft: PlaylistData,
  gamePlays: LocalPlay[],
  kickoff: KickoffReturnSpots,
  punt: PuntSpots,
  end: TackleEnd,
  intSpots: InterceptionReturnSpots,
  fumbleSpots: FumbleRecoverySpots,
  blockedSpots: BlockedKickRecoverySpots,
  penalty: PenaltyDraftFields,
): PlaylistData {
  return applyPasserLeaderDefault(
    applySpotDraft(
      draft,
      kickoff,
      punt,
      end,
      intSpots,
      fumbleSpots,
      blockedSpots,
      penalty,
    ),
    gamePlays,
  );
}

function firstPlayerSlot(draft: PlaylistData): PlayerSlotKey | null {
  const slots = getVisiblePlayerSlots(draft.playType, draft.result);
  return slots[0] ?? null;
}

function canSaveDraft(draft: PlaylistData): boolean {
  if (!draft.playType || !draft.result) return false;
  // Gate 3: require jersey on each visible slot before save
  return true;
}

async function persistKickoffRoleIfChanged(
  gameId: string,
  nextRole: KickoffRole,
  currentRole: KickoffRole,
  setRole: (role: KickoffRole) => void,
): Promise<void> {
  if (nextRole === currentRole) return;
  await setKickoffRole(gameId, nextRole);
  setRole(nextRole);
}

export default function TaggingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refreshCounts, publishSnapshot, playsToSync } = useSync();

  function triggerPublish(localGameId: string, snapshotKind: SnapshotKind) {
    void publishIfConfigured(localGameId, snapshotKind)
      .then(() => refreshCounts())
      .catch(() => refreshCounts());
  }
  const [game, setGame] = useState<LocalGame | null>(null);
  const [plays, setPlays] = useState<LocalPlay[]>([]);
  const [draft, setDraft] = useState<PlaylistData | null>(null);
  const [nextPlayNumber, setNextPlayNumber] = useState(1);
  const [saving, setSaving] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [activePlayerSlot, setActivePlayerSlot] =
    useState<PlayerSlotKey | null>(null);
  const [editingPlayId, setEditingPlayId] = useState<string | null>(null);
  const [catchUpMode, setCatchUpMode] = useState(false);
  const [catchUpHint, setCatchUpHint] = useState<CatchUpHint | null>(null);
  const [showOtModal, setShowOtModal] = useState(false);
  const [kickoffSpots, setKickoffSpots] = useState<KickoffReturnSpots>(() =>
    initKickoffSpotsFromDraft(null),
  );
  const [puntSpots, setPuntSpots] = useState<PuntSpots>(() =>
    initPuntSpotsFromDraft(null),
  );
  const [kickoffRole, setKickoffRoleState] = useState<KickoffRole>("kick");
  const [defendingEnd, setDefendingEndState] = useState<DefendingEnd>("left");
  const [showDirectionModal, setShowDirectionModal] = useState(false);
  const [tackleEnd, setTackleEnd] = useState<TackleEnd>(() =>
    initTackleEndFromDraft(defaultKickoffPlay(1, "WHS")),
  );
  const [intSpots, setIntSpots] = useState<InterceptionReturnSpots>(() =>
    initInterceptionSpotsFromDraft(null),
  );
  const [fumbleSpots, setFumbleSpots] = useState<FumbleRecoverySpots>(() =>
    initFumbleSpotsFromDraft(null),
  );
  const [blockedSpots, setBlockedSpots] = useState<BlockedKickRecoverySpots>(() =>
    initBlockedKickSpotsFromDraft(null),
  );
  const [penalty, setPenalty] = useState<PenaltyDraftFields>(() =>
    initPenaltyDraftFromPlay(null),
  );
  const offLiveRef = useRef(false);

  useEffect(() => {
    offLiveRef.current = editingPlayId !== null || catchUpMode;
  }, [editingPlayId, catchUpMode]);

  const load = useCallback(async () => {
    if (!id) return;
    const g = await getLocalGame(id);
    if (!g) {
      router.replace("/");
      return;
    }
    setGame(g);
    const existing = await listPlaysForGame(id);
    setPlays(existing);
    setUnsyncedCount(await countUnsyncedPlays(id));
    const nextNum = await getNextPlayNumber(id);
    setNextPlayNumber(nextNum);
    const role = await getKickoffRole(id);
    setKickoffRoleState(role);
    const endOrient = await getDefendingEnd(id);
    setDefendingEndState(endOrient);
    if (existing.length > 0) {
      const first = existing[0];
      const openingFromPlay =
        first.playType === PlayType.KickoffReceive ? "receive" : "kick";
      if (first.playType === PlayType.Kickoff || first.playType === PlayType.KickoffReceive) {
        await recordOpeningKickoffRole(id, openingFromPlay);
      }
      // Only backfill opening from current end while still in Q1 (pre-flip).
      if (g.phase === "Q1") {
        await recordOpeningDefendingEnd(id, endOrient);
      }
    }

    if (!offLiveRef.current) {
      const liveDraft = buildLiveDraft(
        existing,
        nextNum,
        g.teamCode,
        role,
        g.phase,
      );
      const kickoff = initKickoffSpotsFromDraft(liveDraft);
      const punt = initPuntSpotsFromDraft(liveDraft);
      setKickoffSpots(kickoff);
      setPuntSpots(punt);
      const end = initTackleEndFromDraft(liveDraft);
      setTackleEnd(end);
      const liveBall = initLiveBallSpotsFromDraft(liveDraft);
      setIntSpots(liveBall.intSpots);
      setFumbleSpots(liveBall.fumbleSpots);
      setBlockedSpots(liveBall.blockedSpots);
      setPenalty(liveBall.penalty);
      setDraft(
        finalizeTaggingDraft(
          liveDraft,
          existing,
          kickoff,
          punt,
          end,
          liveBall.intSpots,
          liveBall.fumbleSpots,
          liveBall.blockedSpots,
          liveBall.penalty,
        ),
      );
      setActivePlayerSlot(firstPlayerSlot(liveDraft));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
      void refreshCounts();
    }, [load, refreshCounts]),
  );

  // Keep header in sync when SyncStatusBar / background sync finishes
  useEffect(() => {
    if (!id) return;
    void (async () => {
      setUnsyncedCount(await countUnsyncedPlays(id));
      const existing = await listPlaysForGame(id);
      setPlays(existing);
    })();
  }, [id, playsToSync]);

  function resumeLiveTagging() {
    if (!game) return;
    setEditingPlayId(null);
    setCatchUpMode(false);
    setCatchUpHint(null);
    void logQaCursorEvent({
      game,
      action: "resume-live",
      nextPlayNumber: nextPlayNumber,
    });
    const liveDraft = buildLiveDraft(
      plays,
      nextPlayNumber,
      game.teamCode,
      kickoffRole,
      game.phase,
    );
    const kickoff = initKickoffSpotsFromDraft(liveDraft);
    const punt = initPuntSpotsFromDraft(liveDraft);
    setKickoffSpots(kickoff);
    setPuntSpots(punt);
    const end = initTackleEndFromDraft(liveDraft);
    setTackleEnd(end);
    const liveBall = initLiveBallSpotsFromDraft(liveDraft);
    setIntSpots(liveBall.intSpots);
    setFumbleSpots(liveBall.fumbleSpots);
    setBlockedSpots(liveBall.blockedSpots);
    setPenalty(liveBall.penalty);
    setDraft(
      finalizeTaggingDraft(
        liveDraft,
        plays,
        kickoff,
        punt,
        end,
        liveBall.intSpots,
        liveBall.fumbleSpots,
        liveBall.blockedSpots,
        liveBall.penalty,
      ),
    );
    setActivePlayerSlot(firstPlayerSlot(liveDraft));
  }

  function handleSelectPlay(play: LocalPlay) {
    if (!game) return;
    void logQaCursorEvent({
      game,
      action: "edit-play",
      mode: "edit",
      playNumber: play.playNumber,
    });
    setEditingPlayId(play.id);
    setCatchUpMode(false);
    setCatchUpHint(null);
    const d = playToDraft(play);
    const kickoff = initKickoffSpotsFromDraft(d);
    const punt = initPuntSpotsFromDraft(d);
    setKickoffSpots(kickoff);
    setPuntSpots(punt);
    const end = initTackleEndFromDraft(d);
    setTackleEnd(end);
    const liveBall = initLiveBallSpotsFromDraft(d);
    setIntSpots(liveBall.intSpots);
    setFumbleSpots(liveBall.fumbleSpots);
    setBlockedSpots(liveBall.blockedSpots);
    setPenalty(liveBall.penalty);
    setDraft(
      finalizeTaggingDraft(
        d,
        plays,
        kickoff,
        punt,
        end,
        liveBall.intSpots,
        liveBall.fumbleSpots,
        liveBall.blockedSpots,
        liveBall.penalty,
      ),
    );
    setActivePlayerSlot(firstPlayerSlot(d));
  }

  function handleCatchUp() {
    if (!game) return;
    setCatchUpMode(true);
    setCatchUpHint("generic");
    setEditingPlayId(null);
    void logQaCursorEvent({
      game,
      action: "catch-up-start",
      mode: "catch-up",
      catchUpHint: "generic",
      nextPlayNumber: nextPlayNumber,
    });
    const d = buildLiveDraft(
      plays,
      nextPlayNumber,
      game.teamCode,
      kickoffRole,
      game.phase,
    );
    const withNum = { ...d, playNumber: nextPlayNumber };
    const kickoff = initKickoffSpotsFromDraft(withNum);
    const punt = initPuntSpotsFromDraft(withNum);
    setKickoffSpots(kickoff);
    setPuntSpots(punt);
    const end = initTackleEndFromDraft(withNum);
    setTackleEnd(end);
    const liveBall = initLiveBallSpotsFromDraft(withNum);
    setIntSpots(liveBall.intSpots);
    setFumbleSpots(liveBall.fumbleSpots);
    setBlockedSpots(liveBall.blockedSpots);
    setPenalty(liveBall.penalty);
    setDraft(
      finalizeTaggingDraft(
        withNum,
        plays,
        kickoff,
        punt,
        end,
        liveBall.intSpots,
        liveBall.fumbleSpots,
        liveBall.blockedSpots,
        liveBall.penalty,
      ),
    );
    setActivePlayerSlot(firstPlayerSlot(withNum));
  }

  function startQuarterReview(hint: CatchUpHint) {
    if (game) {
      void logQaCursorEvent({
        game,
        action: "quarter-review",
        mode: "catch-up",
        catchUpHint: hint,
      });
    }
    setCatchUpMode(true);
    setCatchUpHint(hint);
    setEditingPlayId(null);
  }

  async function startHalftimeCatchUp() {
    if (!game || !id) return;
    setCatchUpMode(true);
    setCatchUpHint("halftime-kickoff");
    setEditingPlayId(null);
    const role = await secondHalfKickoffRole(id);
    await setKickoffRole(id, role);
    setKickoffRoleState(role);
    const endOrient = await secondHalfDefendingEnd(id);
    await setDefendingEnd(id, endOrient);
    setDefendingEndState(endOrient);
    const d = withKickoffRole(
      defaultKickoffPlay(nextPlayNumber, game.teamCode, {
        quarter: 3,
        yardLine: -40,
        result: Result.Return,
      }),
      role,
    );
    const withNum = { ...d, playNumber: nextPlayNumber };
    const kickoff = initKickoffSpotsFromDraft(withNum);
    const punt = initPuntSpotsFromDraft(withNum);
    setKickoffSpots(kickoff);
    setPuntSpots(punt);
    const end = initTackleEndFromDraft(withNum);
    setTackleEnd(end);
    const liveBall = initLiveBallSpotsFromDraft(withNum);
    setIntSpots(liveBall.intSpots);
    setFumbleSpots(liveBall.fumbleSpots);
    setBlockedSpots(liveBall.blockedSpots);
    setPenalty(liveBall.penalty);
    setDraft(
      finalizeTaggingDraft(
        withNum,
        plays,
        kickoff,
        punt,
        end,
        liveBall.intSpots,
        liveBall.fumbleSpots,
        liveBall.blockedSpots,
        liveBall.penalty,
      ),
    );
    setActivePlayerSlot(firstPlayerSlot(withNum));
  }

  async function applyPhaseChange(next: GamePhase) {
    if (!id || !game) return;
    const phaseBefore = game.phase;
    async function recordPhase(
      phaseAfter: GamePhase,
      extra?: { banner?: string | null; otPossession?: "us" | "them" },
    ) {
      await logQaPhaseEvent({
        game: { ...game!, phase: phaseAfter },
        action: `${phaseBefore}→${phaseAfter}`,
        phaseBefore,
        phaseAfter,
        banner: extra?.banner,
        otPossession: extra?.otPossession,
      });
    }
    if (next === "OT") {
      setShowOtModal(true);
      return;
    }
    if (next === "FINAL") {
      if (game.phase === "Q4") {
        startQuarterReview("quarter-review-q4");
      }
      await finalizeLocalGame(id);
      setGame({ ...game, phase: "FINAL", status: "final" });
      await recordPhase("FINAL", {
        banner: catchUpHintMessage("quarter-review-q4"),
      });
      triggerPublish(id, "final");
      return;
    }
    if (next === "HALFTIME" && game.phase === "Q2") {
      await updateLocalGamePhase(id, "HALFTIME");
      setGame({ ...game, phase: "HALFTIME" });
      startQuarterReview("quarter-review-q2");
      await recordPhase("HALFTIME", {
        banner: catchUpHintMessage("quarter-review-q2"),
      });
      triggerPublish(id, "halftime");
      return;
    }
    if (next === "Q3" && game.phase === "HALFTIME") {
      await updateLocalGamePhase(id, "Q3");
      setGame({ ...game, phase: "Q3" });
      startHalftimeCatchUp();
      await recordPhase("Q3", {
        banner: catchUpHintMessage("halftime-kickoff"),
      });
      triggerPublish(id, "live");
      return;
    }
    const q = quarterForRegulationPhase(next);
    await updateLocalGamePhase(id, next);
    const updated = { ...game, phase: next };
    setGame(updated);
    if (game.phase === "Q1" && next === "Q2") {
      // Lock opening from pre-flip end if the tagger never touched the control.
      await recordOpeningDefendingEnd(id, defendingEnd);
      const flipped = defendingEndAfterQuarterBreak(
        game.phase,
        next,
        defendingEnd,
      )!;
      await setDefendingEnd(id, flipped);
      setDefendingEndState(flipped);
      startQuarterReview("quarter-review-q1");
    } else if (game.phase === "Q3" && next === "Q4") {
      const flipped = defendingEndAfterQuarterBreak(
        game.phase,
        next,
        defendingEnd,
      )!;
      await setDefendingEnd(id, flipped);
      setDefendingEndState(flipped);
      startQuarterReview("quarter-review-q3");
    }
    await recordPhase(next);
    if (q !== null && draft) {
      setDraft({ ...draft, quarter: q });
    }
    if (next === "Q1" && game.status === "pregame") {
      await updateLocalGameStatus(id, "live");
      setGame({ ...updated, status: "live" });
    }
  }

  async function handleStartOt(choice: {
    possession: "us" | "them";
    defendingEnd: DefendingEnd;
  }) {
    if (!id || !game) return;
    const { possession: otPossession, defendingEnd: otEnd } = choice;
    setShowOtModal(false);
    await updateLocalGamePhase(id, "OT");
    await updateLocalOtPossession(id, otPossession);
    await setDefendingEnd(id, otEnd);
    setDefendingEndState(otEnd);
    if (game.status !== "live" && game.status !== "final") {
      await updateLocalGameStatus(id, "live");
    }
    const otDraft = defaultOtOpeningDraft(
      nextPlayNumber,
      game.teamCode,
      otPossession,
    );
    const kickoff = initKickoffSpotsFromDraft(otDraft);
    const punt = initPuntSpotsFromDraft(otDraft);
    setKickoffSpots(kickoff);
    setPuntSpots(punt);
    const end = initTackleEndFromDraft(otDraft);
    setTackleEnd(end);
    const liveBall = initLiveBallSpotsFromDraft(otDraft);
    setIntSpots(liveBall.intSpots);
    setFumbleSpots(liveBall.fumbleSpots);
    setBlockedSpots(liveBall.blockedSpots);
    setPenalty(liveBall.penalty);
    setDraft(
      finalizeTaggingDraft(
        ensureOffensePadDraft(otDraft),
        plays,
        kickoff,
        punt,
        end,
        liveBall.intSpots,
        liveBall.fumbleSpots,
        liveBall.blockedSpots,
        liveBall.penalty,
      ),
    );
    setActivePlayerSlot(firstPlayerSlot(otDraft));
    setGame({
      ...game,
      phase: "OT",
      otPossession,
      status: game.status === "pregame" ? "live" : game.status,
    });
    await logQaPhaseEvent({
      game: {
        ...game,
        phase: "OT",
        otPossession,
        status: game.status === "pregame" ? "live" : game.status,
      },
      action: `${game.phase}→OT`,
      phaseBefore: game.phase,
      phaseAfter: "OT",
      otPossession,
    });
  }

  function handleKickoffRoleChange(role: KickoffRole) {
    setKickoffRoleState(role);
    if (id) {
      void persistOpeningKickoffRole(id, role, plays.length);
      void setKickoffRole(id, role);
    }
    if (!draft || !isKickoffDraft(draft)) return;
    const next = applyKickoffRole(draft, role);
    setDraft(next);
    setActivePlayerSlot(firstKickoffPlayerSlot(next));
  }

  function handleDefendingEndChange(end: DefendingEnd) {
    setDefendingEndState(end);
    if (id) {
      void persistOpeningDefendingEnd(id, end, plays.length, game?.phase);
      void setDefendingEnd(id, end);
    }
  }

  function handleKickoffSpotsChange(spots: KickoffReturnSpots) {
    setKickoffSpots(spots);
    setDraft((d) => (d ? applyKickoffSpotsToDraft(d, spots) : d));
  }

  function handlePuntSpotsChange(spots: PuntSpots) {
    setPuntSpots(spots);
    setDraft((d) => (d ? applyPuntSpotsToDraft(d, spots) : d));
  }

  function handleTackleEndChange(end: TackleEnd) {
    setTackleEnd(end);
    setDraft((d) => (d ? applyTackleSpotToDraft(d, end) : d));
  }

  function handleIntSpotsChange(spots: InterceptionReturnSpots) {
    setIntSpots(spots);
    setDraft((d) => (d ? applyInterceptionSpotsToDraft(d, spots) : d));
  }

  function handleFumbleSpotsChange(spots: FumbleRecoverySpots) {
    setFumbleSpots(spots);
    setDraft((d) => (d ? applyFumbleSpotsToDraft(d, spots) : d));
  }

  function handleBlockedSpotsChange(spots: BlockedKickRecoverySpots) {
    setBlockedSpots(spots);
    setDraft((d) => (d ? applyBlockedKickSpotsToDraft(d, spots) : d));
  }

  function handlePenaltyChange(next: PenaltyDraftFields) {
    setPenalty(next);
    setDraft((d) => (d ? applyPenaltyDraftToPlay(d, next) : d));
  }

  function handleDraftChange(next: PlaylistData) {
    const isKickoff =
      next.playType === PlayType.Kickoff ||
      next.playType === PlayType.KickoffReceive;
    const isPunt =
      next.playType === PlayType.Punt ||
      next.playType === PlayType.PuntReceive;

    if (isKickoff && next.result === Result.Touchback) {
      setKickoffSpots(defaultKickoffReturnSpots());
      setDraft(touchbackDraftPatch(next));
      return;
    }

    if (isKickoff && next.result === Result.Return) {
      setDraft(applyKickoffSpotsToDraft(next, kickoffSpots));
      return;
    }

    if (isPunt && next.result === Result.Touchback) {
      setPuntSpots(defaultPuntSpots(next.yardLine));
      setDraft(touchbackDraftPatch(next));
      return;
    }

    if (
      isPunt &&
      (next.result === Result.Return ||
        next.result === Result.Downed ||
        next.result === Result.FairCatch)
    ) {
      const spotInputsChanged =
        draft?.playType !== next.playType ||
        draft?.result !== next.result ||
        draft?.yardLine !== next.yardLine;

      if (spotInputsChanged) {
        const spots = initPuntSpotsFromDraft(next);
        setPuntSpots(spots);
        setDraft(applyPuntSpotsToDraft(next, spots));
      } else {
        setDraft(applyPuntSpotsToDraft(next, puntSpots));
      }
      return;
    }

    if (
      (next.playType === PlayType.Punt ||
        next.playType === PlayType.PuntReceive) &&
      next.result === Result.Blocked
    ) {
      const spotInputsChanged =
        draft?.playType !== next.playType ||
        draft?.result !== next.result ||
        draft?.yardLine !== next.yardLine;

      if (spotInputsChanged) {
        const spots = initBlockedKickSpotsFromDraft(next);
        setBlockedSpots(spots);
        setDraft(applyBlockedKickSpotsToDraft(next, spots));
      } else {
        setDraft(applyBlockedKickSpotsToDraft(next, blockedSpots));
      }
      return;
    }

    if (isPunt && next.result === Result.Penalty) {
      const spotInputsChanged =
        draft?.playType !== next.playType ||
        draft?.result !== next.result ||
        draft?.yardLine !== next.yardLine;

      if (spotInputsChanged) {
        const foul = initPenaltyDraftFromPlay(next);
        setPenalty(foul);
        setDraft(applyPenaltyDraftToPlay(next, foul));
      } else {
        setDraft(applyPenaltyDraftToPlay(next, penalty));
      }
      return;
    }

    if (isPunt) {
      setDraft(next);
      return;
    }

    if (
      next.playType === PlayType.Pass &&
      next.result === Result.Interception
    ) {
      const spotInputsChanged =
        draft?.playType !== next.playType ||
        draft?.result !== next.result ||
        draft?.yardLine !== next.yardLine;

      if (spotInputsChanged) {
        const spots = initInterceptionSpotsFromDraft(next);
        setIntSpots(spots);
        setDraft(applyInterceptionSpotsToDraft(next, spots));
      } else {
        setDraft(applyInterceptionSpotsToDraft(next, intSpots));
      }
      return;
    }

    if (
      (next.playType === PlayType.Run || next.playType === PlayType.Pass) &&
      next.result === Result.Fumble
    ) {
      const spotInputsChanged =
        draft?.playType !== next.playType ||
        draft?.result !== next.result ||
        draft?.yardLine !== next.yardLine;

      if (spotInputsChanged) {
        const spots = initFumbleSpotsFromDraft(next);
        setFumbleSpots(spots);
        setDraft(applyFumbleSpotsToDraft(next, spots));
      } else {
        setDraft(applyFumbleSpotsToDraft(next, fumbleSpots));
      }
      return;
    }

    if (
      (next.playType === PlayType.Run ||
        next.playType === PlayType.Pass ||
        next.playType === PlayType.FieldGoal) &&
      next.result === Result.Penalty
    ) {
      const spotInputsChanged =
        draft?.playType !== next.playType ||
        draft?.result !== next.result ||
        draft?.yardLine !== next.yardLine;

      if (spotInputsChanged) {
        const foul = initPenaltyDraftFromPlay(next);
        setPenalty(foul);
        setDraft(applyPenaltyDraftToPlay(next, foul));
      } else {
        setDraft(applyPenaltyDraftToPlay(next, penalty));
      }
      return;
    }

    if (
      next.playType === PlayType.FieldGoal &&
      next.result === Result.Blocked
    ) {
      const spotInputsChanged =
        draft?.playType !== next.playType ||
        draft?.result !== next.result ||
        draft?.yardLine !== next.yardLine;

      if (spotInputsChanged) {
        const spots = initBlockedKickSpotsFromDraft(next);
        setBlockedSpots(spots);
        setDraft(applyBlockedKickSpotsToDraft(next, spots));
      } else {
        setDraft(applyBlockedKickSpotsToDraft(next, blockedSpots));
      }
      return;
    }

    if (needsTackleSpot(next.playType, next.result)) {
      const spotInputsChanged =
        draft?.playType !== next.playType ||
        draft?.result !== next.result ||
        draft?.yardLine !== next.yardLine;

      if (spotInputsChanged) {
        const end = initTackleEndFromDraft(next);
        setTackleEnd(end);
        setDraft(applyTackleSpotToDraft(next, end));
      } else {
        setDraft(applyTackleSpotToDraft(next, tackleEnd));
      }
      return;
    }

    setDraft(next);
  }

  async function handleSavePlay() {
    if (!id || !draft || !game || !canSaveDraft(draft)) return;
    const phaseBefore = game.phase;
    const saveMode: QaSaveMode = editingPlayId
      ? "edit"
      : catchUpMode
        ? "catch-up"
        : "live";
    const saveKind = editingPlayId ? "update" : "insert";
    setSaving(true);
    try {
      const toSave = normalizePlayOnSave(draft);
      const scoreBefore = { us: game.homeScore, them: game.awayScore };
      let updatedGame = game;
      let savedPlayForLog: PlaylistData = toSave;
      let nextDraftForLog: PlaylistData | null = null;
      let nextKickoffRoleForLog = kickoffRole;
      if (editingPlayId) {
        const updated = await updateLocalPlay(editingPlayId, toSave);
        const newPlays = plays.map((p) =>
          p.id === editingPlayId ? updated : p,
        );
        setPlays(newPlays);
        setEditingPlayId(null);
        setCatchUpMode(false);
        setCatchUpHint(null);
        const nextNum = await getNextPlayNumber(id);
        setNextPlayNumber(nextNum);
        const lastPlay = newPlays[newPlays.length - 1];
        const phaseQuarter = quarterForRegulationPhase(game.phase);
        const quarter = phaseQuarter ?? lastPlay.quarter;
        const chainSource = playToDraft(lastPlay);
        const nextChainDraft = withQuarterFromLast(
          ensureOffensePadDraft(
            nextDraftForGame(chainSource, nextNum, game.teamCode, game.phase),
          ),
          quarter,
        );
        const nextKickoffRole = resolveKickoffRoleAfterSave(
          chainSource,
          nextChainDraft,
          kickoffRole,
        );
        await persistKickoffRoleIfChanged(
          id,
          nextKickoffRole,
          kickoffRole,
          setKickoffRoleState,
        );
        const liveDraft = withKickoffRole(nextChainDraft, nextKickoffRole);
        nextDraftForLog = liveDraft;
        nextKickoffRoleForLog = nextKickoffRole;
        savedPlayForLog = toSave;
        const kickoff = initKickoffSpotsFromDraft(liveDraft);
        const punt = initPuntSpotsFromDraft(liveDraft);
        setKickoffSpots(kickoff);
        setPuntSpots(punt);
        const end = initTackleEndFromDraft(liveDraft);
        setTackleEnd(end);
        const liveBall = initLiveBallSpotsFromDraft(liveDraft);
        setIntSpots(liveBall.intSpots);
        setFumbleSpots(liveBall.fumbleSpots);
        setBlockedSpots(liveBall.blockedSpots);
        setPenalty(liveBall.penalty);
        setDraft(
          finalizeTaggingDraft(
            liveDraft,
            newPlays,
            kickoff,
            punt,
            end,
            liveBall.intSpots,
            liveBall.fumbleSpots,
            liveBall.blockedSpots,
            liveBall.penalty,
          ),
        );
        setActivePlayerSlot(firstPlayerSlot(liveDraft));
        updatedGame = await applyScoreAfterSave(id, newPlays, game);
        setGame(updatedGame);
      } else {
        if (isKickoffDraft(toSave)) {
          await persistOpeningKickoffRole(
            id,
            kickoffRoleFromDraft(toSave),
            plays.length,
          );
        }
        await persistOpeningDefendingEnd(
          id,
          defendingEnd,
          plays.length,
          game.phase,
        );
        const saved = await saveLocalPlay(id, toSave);
        const newPlays = [...plays, saved];
        setPlays(newPlays);
        const nextNum = draft.playNumber + 1;
        setNextPlayNumber(nextNum);
        const nextChainDraft = withQuarterFromLast(
          ensureOffensePadDraft(
            nextDraftAfterPlayForGame(toSave, nextNum, game.teamCode, game.phase),
          ),
          toSave.quarter,
        );
        const nextKickoffRole = resolveKickoffRoleAfterSave(
          toSave,
          nextChainDraft,
          kickoffRole,
        );
        await persistKickoffRoleIfChanged(
          id,
          nextKickoffRole,
          kickoffRole,
          setKickoffRoleState,
        );
        const next = withKickoffRole(nextChainDraft, nextKickoffRole);
        nextDraftForLog = next;
        nextKickoffRoleForLog = nextKickoffRole;
        savedPlayForLog = toSave;
        const kickoff = initKickoffSpotsFromDraft(next);
        const punt = initPuntSpotsFromDraft(next);
        setKickoffSpots(kickoff);
        setPuntSpots(punt);
        const end = initTackleEndFromDraft(next);
        setTackleEnd(end);
        const liveBall = initLiveBallSpotsFromDraft(next);
        setIntSpots(liveBall.intSpots);
        setFumbleSpots(liveBall.fumbleSpots);
        setBlockedSpots(liveBall.blockedSpots);
        setPenalty(liveBall.penalty);
        setDraft(
          finalizeTaggingDraft(
            next,
            newPlays,
            kickoff,
            punt,
            end,
            liveBall.intSpots,
            liveBall.fumbleSpots,
            liveBall.blockedSpots,
            liveBall.penalty,
          ),
        );
        setActivePlayerSlot(firstPlayerSlot(next));
        setCatchUpMode(false);
        setCatchUpHint(null);
        updatedGame = await applyScoreAfterSave(id, newPlays, game);
        setGame(updatedGame);
      }
      setUnsyncedCount(await countUnsyncedPlays(id));
      await refreshCounts();

      if (nextDraftForLog) {
        void logQaSaveEvent({
          game: updatedGame,
          savedPlay: savedPlayForLog,
          nextDraft: nextDraftForLog,
          mode: saveMode,
          catchUpHint,
          kickoffRole: nextKickoffRoleForLog,
          phaseBefore,
          phaseAfter: updatedGame.phase,
          scoreAfter: `${updatedGame.homeScore}–${updatedGame.awayScore}`,
          saveKind,
        });
      }

      const scoreChanged =
        updatedGame.homeScore !== scoreBefore.us ||
        updatedGame.awayScore !== scoreBefore.them;

      if (updatedGame.phase === "FINAL" && game.phase !== "FINAL") {
        triggerPublish(id, "final");
      } else if (scoreChanged) {
        triggerPublish(id, "live");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!game || !draft) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading game…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SyncStatusBar localGameId={id} />

      <TaggingHeader
        game={game}
        draft={draft}
        unsyncedCount={unsyncedCount}
        undoEnabled={false}
        defendingEnd={defendingEnd}
        advancingTowardOpponent={isAdvancingTowardOpponent(
          draft,
          isKickoffDraft(draft) ? kickoffRoleFromDraft(draft) : kickoffRole,
        )}
        onDirectionPress={() => setShowDirectionModal(true)}
      />

      <GamePhaseBar phase={game.phase} onPhasePress={(p) => void applyPhaseChange(p)} />

      <View style={styles.qaExportRow}>
        <QaLogExportButton localGameId={id!} slug={game.slug} compact />
      </View>

      <StartOtModal
        visible={showOtModal}
        onClose={() => setShowOtModal(false)}
        onChoose={(choice) => void handleStartOt(choice)}
        usLabel={game.teamCode}
        themLabel={game.opponent}
      />

      <Modal
        visible={showDirectionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDirectionModal(false)}
      >
        <View style={styles.directionBackdrop}>
          <View style={styles.directionCard}>
            <Text style={styles.directionTitle}>Direction of play</Text>
            <DirectionOfPlayControl
              defendingEnd={defendingEnd}
              onChange={handleDefendingEndChange}
              usLabel={game.teamCode}
              themLabel={game.opponent}
              advancingTowardOpponent={isAdvancingTowardOpponent(
                draft,
                isKickoffDraft(draft) ? kickoffRoleFromDraft(draft) : kickoffRole,
              )}
            />
            <Pressable
              style={styles.directionDone}
              onPress={() => setShowDirectionModal(false)}
            >
              <Text style={styles.directionDoneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={styles.main}>
        <View style={styles.taggingColumn}>
          <TaggingPad
            draft={draft}
            onChange={handleDraftChange}
            activePlayerSlot={activePlayerSlot}
            onActivePlayerSlotChange={setActivePlayerSlot}
            gamePlays={plays}
            kickoffSpots={kickoffSpots}
            onKickoffSpotsChange={handleKickoffSpotsChange}
            kickoffRole={
              isKickoffDraft(draft) ? kickoffRoleFromDraft(draft) : kickoffRole
            }
            onKickoffRoleChange={handleKickoffRoleChange}
            defendingEnd={defendingEnd}
            onDefendingEndChange={handleDefendingEndChange}
            usLabel={game.teamCode}
            themLabel={game.opponent}
            puntSpots={puntSpots}
            onPuntSpotsChange={handlePuntSpotsChange}
            tackleEnd={tackleEnd}
            onTackleEndChange={handleTackleEndChange}
            intSpots={intSpots}
            onIntSpotsChange={handleIntSpotsChange}
            fumbleSpots={fumbleSpots}
            onFumbleSpotsChange={handleFumbleSpotsChange}
            blockedSpots={blockedSpots}
            onBlockedSpotsChange={handleBlockedSpotsChange}
            penalty={penalty}
            onPenaltyChange={handlePenaltyChange}
          />
        </View>

        <PlayLogSidebar
          plays={plays}
          nextPlayNumber={nextPlayNumber}
          editingPlayId={editingPlayId}
          catchUpMode={catchUpMode}
          catchUpHint={catchUpHint}
          saving={saving}
          saveDisabled={!canSaveDraft(draft)}
          onCatchUp={handleCatchUp}
          onSelectPlay={handleSelectPlay}
          onResumeLive={resumeLiveTagging}
          onSave={() => void handleSavePlay()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LAYOUT.colors.panelBg,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 18,
    color: LAYOUT.colors.textMuted,
  },
  qaExportRow: {
    paddingHorizontal: LAYOUT.padding.screen,
    paddingVertical: 4,
    backgroundColor: "#0f172a",
  },
  main: {
    flex: 1,
    flexDirection: "row",
  },
  taggingColumn: {
    flex: LAYOUT.taggingPadFlex,
  },
  directionBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  directionCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    gap: 14,
  },
  directionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: LAYOUT.colors.textPrimary,
  },
  directionDone: {
    alignSelf: "stretch",
    backgroundColor: LAYOUT.colors.navy,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  directionDoneText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
