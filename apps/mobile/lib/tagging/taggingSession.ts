import {
  PlayType,
  Result,
  defaultKickoffPlay,
  deriveScoreFromPlays,
  normalizePlayOnSave,
  shouldFinalizeOtGame,
  type GamePhase,
  type GameStatus,
  type OtPossession,
  type PlaylistData,
  type YardLine,
} from "@huddlestat/shared";
import { formatQaHeaderLine } from "../qa/format";
import { padLabelForDraft } from "../qa/padLabel";
import {
  applyBlockedKickSpotsToDraft,
  initBlockedKickSpotsFromDraft,
  type BlockedKickRecoverySpots,
} from "./blockedKickRecovery";
import {
  applyFumbleSpotsToDraft,
  initFumbleSpotsFromDraft,
  isPendingFumbleReturnConfirm,
  type FumbleRecoverySpots,
} from "./fumbleRecovery";
import {
  applyInterceptionSpotsToDraft,
  initInterceptionSpotsFromDraft,
  type InterceptionReturnSpots,
} from "./interceptionReturn";
import { applyJerseyLeaderDefaults } from "./jerseyGridRank";
import {
  applyKickoffRole,
  isKickoffDraft,
  kickoffRoleFromDraft,
  resolveKickoffRoleAfterSave,
  secondHalfKickoffRoleFromOpening,
  type KickoffRole,
} from "./kickoffRoleResolve";
import {
  applyKickoffSpotsToDraft,
  defaultKickoffReturnSpots,
  initKickoffSpotsFromDraft,
  touchbackDraftPatch,
  type KickoffReturnSpots,
} from "./kickoffReturn";
import {
  defaultOtOpeningDraft,
  nextDraftAfterPlayForGame,
  nextDraftForGame,
} from "./nextDraftForGame";
import { applyPenaltySpotToDraft, initPenaltyFoulSpotFromDraft } from "./penaltySpot";
import { phaseAdvanceAction } from "./phaseAdvance";
import {
  applyPlayTypeChange,
  applyResultChange,
  applyScoringPlayTypeChange,
  ensureOffensePadDraft,
  getVisiblePlayerSlots,
  isScoringPlayType,
  type PlayerSlotKey,
  type ScoringPlayType,
} from "./playConfig";
import {
  applyPuntSpotsToDraft,
  defaultPuntSpots,
  initPuntSpotsFromDraft,
  type PuntSpots,
} from "./puntReturn";
import {
  applyTackleSpotToDraft,
  initTackleEndFromDraft,
  isPendingTackleConfirm,
  needsTackleSpot,
  type TackleEnd,
} from "./tackleSpot";

export type TaggingSpots = {
  kickoffSpots: KickoffReturnSpots;
  puntSpots: PuntSpots;
  tackleEnd: TackleEnd;
  intSpots: InterceptionReturnSpots;
  fumbleSpots: FumbleRecoverySpots;
  blockedSpots: BlockedKickRecoverySpots;
  penaltyFoulSpot: YardLine;
};

export type TaggingSession = TaggingSpots & {
  teamCode: string;
  openingKickoffRole: KickoffRole;
  kickoffRole: KickoffRole;
  phase: GamePhase;
  otPossession: OtPossession | null;
  status: GameStatus;
  plays: PlaylistData[];
  draft: PlaylistData;
};

export type TaggingAction =
  | { type: "playType"; playType: PlaylistData["playType"] }
  | { type: "result"; result: PlaylistData["result"] }
  | { type: "tackle"; end: TackleEnd }
  | { type: "kickoffSpots"; spots: Partial<KickoffReturnSpots> }
  | { type: "puntSpots"; spots: Partial<PuntSpots> }
  | { type: "fumbleSpots"; spots: Partial<FumbleRecoverySpots> }
  | { type: "intSpots"; spots: Partial<InterceptionReturnSpots> }
  | { type: "blockedSpots"; spots: Partial<BlockedKickRecoverySpots> }
  | { type: "penaltySpot"; foulSpot: YardLine }
  | { type: "jersey"; slot: PlayerSlotKey; jersey: string }
  | { type: "kickoffRole"; role: KickoffRole }
  | { type: "save" }
  | { type: "phaseAdvance" }
  | { type: "startOt"; possession: OtPossession };

export type TaggingSnapshot = {
  header: string;
  pad: string;
  phase: GamePhase;
  kickoffRole: KickoffRole;
  canSave: boolean;
  score: { us: number; them: number };
  playCount: number;
  visibleSlots: PlayerSlotKey[];
};

const DEFAULT_TEAM = "SHS";

export function withKickoffRole(
  draft: PlaylistData,
  role: KickoffRole,
): PlaylistData {
  return isKickoffDraft(draft) ? applyKickoffRole(draft, role) : draft;
}

export function withQuarterFromLast(
  draft: PlaylistData,
  lastQuarter: number,
): PlaylistData {
  return { ...draft, quarter: lastQuarter };
}

export function quarterForRegulationPhase(phase: GamePhase): number | null {
  if (phase === "Q1") return 1;
  if (phase === "Q2") return 2;
  if (phase === "Q3") return 3;
  if (phase === "Q4") return 4;
  if (phase === "OT") return 5;
  return null;
}

export function buildLiveDraft(
  plays: PlaylistData[],
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
          nextDraftForGame(last, nextNum, teamCode, phase),
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

export function initLiveBallSpotsFromDraft(draft: PlaylistData | null) {
  return {
    intSpots: initInterceptionSpotsFromDraft(draft),
    fumbleSpots: initFumbleSpotsFromDraft(draft),
    blockedSpots: initBlockedKickSpotsFromDraft(draft),
    penaltyFoulSpot: initPenaltyFoulSpotFromDraft(draft),
  };
}

export function initSpotsFromDraft(draft: PlaylistData): TaggingSpots {
  const liveBall = initLiveBallSpotsFromDraft(draft);
  return {
    kickoffSpots: initKickoffSpotsFromDraft(draft),
    puntSpots: initPuntSpotsFromDraft(draft),
    tackleEnd: initTackleEndFromDraft(draft),
    ...liveBall,
  };
}

export function applySpotDraft(
  draft: PlaylistData,
  kickoff: KickoffReturnSpots,
  punt: PuntSpots,
  end: TackleEnd,
  intSpots: InterceptionReturnSpots,
  fumbleSpots: FumbleRecoverySpots,
  blockedSpots: BlockedKickRecoverySpots,
  penaltyFoulSpot: number,
): PlaylistData {
  return applyPenaltySpotToDraft(
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
    penaltyFoulSpot as PlaylistData["yardLine"],
  );
}

export function finalizeTaggingDraft(
  draft: PlaylistData,
  gamePlays: PlaylistData[],
  kickoff: KickoffReturnSpots,
  punt: PuntSpots,
  end: TackleEnd,
  intSpots: InterceptionReturnSpots,
  fumbleSpots: FumbleRecoverySpots,
  blockedSpots: BlockedKickRecoverySpots,
  penaltyFoulSpot: number,
): PlaylistData {
  return applyJerseyLeaderDefaults(
    applySpotDraft(
      draft,
      kickoff,
      punt,
      end,
      intSpots,
      fumbleSpots,
      blockedSpots,
      penaltyFoulSpot,
    ),
    gamePlays,
  );
}

export function canSaveDraft(
  draft: PlaylistData,
  tackleEnd: TackleEnd,
  fumbleSpots?: FumbleRecoverySpots,
): boolean {
  if (!draft.playType || !draft.result) return false;
  if (
    needsTackleSpot(draft.playType, draft.result) &&
    isPendingTackleConfirm(tackleEnd)
  ) {
    return false;
  }
  if (
    draft.result === Result.Fumble &&
    fumbleSpots &&
    isPendingFumbleReturnConfirm(fumbleSpots)
  ) {
    return false;
  }
  return true;
}

function spotInputsChanged(
  prev: PlaylistData,
  next: PlaylistData,
): boolean {
  return (
    prev.playType !== next.playType ||
    prev.result !== next.result ||
    prev.yardLine !== next.yardLine
  );
}

/** Same pad-draft side effects as TaggingScreen.handleDraftChange. */
export function applyPadDraftChange(
  prev: Pick<TaggingSession, "draft" | keyof TaggingSpots>,
  next: PlaylistData,
): Pick<TaggingSession, "draft" | keyof TaggingSpots> {
  const isKickoff =
    next.playType === PlayType.Kickoff ||
    next.playType === PlayType.KickoffReceive;
  const isPunt = next.playType === PlayType.Punt;
  const changed = spotInputsChanged(prev.draft, next);

  if (isKickoff && next.result === Result.Touchback) {
    return {
      ...prev,
      kickoffSpots: defaultKickoffReturnSpots(next.playType === PlayType.Kickoff),
      draft: touchbackDraftPatch(next),
    };
  }

  if (isKickoff && next.result === Result.Return) {
    return {
      ...prev,
      draft: applyKickoffSpotsToDraft(next, prev.kickoffSpots),
    };
  }

  if (isPunt && next.result === Result.Touchback) {
    return {
      ...prev,
      puntSpots: defaultPuntSpots(next.yardLine),
      draft: touchbackDraftPatch(next),
    };
  }

  if (
    isPunt &&
    (next.result === Result.Return || next.result === Result.Downed)
  ) {
    if (changed) {
      const spots = initPuntSpotsFromDraft(next);
      return {
        ...prev,
        puntSpots: spots,
        draft: applyPuntSpotsToDraft(next, spots),
      };
    }
    return {
      ...prev,
      draft: applyPuntSpotsToDraft(next, prev.puntSpots),
    };
  }

  if (isPunt && next.result === Result.Blocked) {
    if (changed) {
      const spots = initBlockedKickSpotsFromDraft(next);
      return {
        ...prev,
        blockedSpots: spots,
        draft: applyBlockedKickSpotsToDraft(next, spots),
      };
    }
    return {
      ...prev,
      draft: applyBlockedKickSpotsToDraft(next, prev.blockedSpots),
    };
  }

  if (isPunt && next.result === Result.Penalty) {
    if (changed) {
      const foul = initPenaltyFoulSpotFromDraft(next);
      return {
        ...prev,
        penaltyFoulSpot: foul,
        draft: applyPenaltySpotToDraft(next, foul),
      };
    }
    return {
      ...prev,
      draft: applyPenaltySpotToDraft(
        next,
        prev.penaltyFoulSpot as PlaylistData["yardLine"],
      ),
    };
  }

  if (isPunt) {
    return { ...prev, draft: next };
  }

  if (next.playType === PlayType.Pass && next.result === Result.Interception) {
    if (changed) {
      const spots = initInterceptionSpotsFromDraft(next);
      return {
        ...prev,
        intSpots: spots,
        draft: applyInterceptionSpotsToDraft(next, spots),
      };
    }
    return {
      ...prev,
      draft: applyInterceptionSpotsToDraft(next, prev.intSpots),
    };
  }

  if (
    (next.playType === PlayType.Run || next.playType === PlayType.Pass) &&
    next.result === Result.Fumble
  ) {
    if (changed) {
      const spots = initFumbleSpotsFromDraft(next);
      return {
        ...prev,
        fumbleSpots: spots,
        draft: applyFumbleSpotsToDraft(next, spots),
      };
    }
    return {
      ...prev,
      draft: applyFumbleSpotsToDraft(next, prev.fumbleSpots),
    };
  }

  if (
    (next.playType === PlayType.Run ||
      next.playType === PlayType.Pass ||
      next.playType === PlayType.FieldGoal) &&
    next.result === Result.Penalty
  ) {
    if (changed) {
      const foul = initPenaltyFoulSpotFromDraft(next);
      return {
        ...prev,
        penaltyFoulSpot: foul,
        draft: applyPenaltySpotToDraft(next, foul),
      };
    }
    return {
      ...prev,
      draft: applyPenaltySpotToDraft(
        next,
        prev.penaltyFoulSpot as PlaylistData["yardLine"],
      ),
    };
  }

  if (next.playType === PlayType.FieldGoal && next.result === Result.Blocked) {
    if (changed) {
      const spots = initBlockedKickSpotsFromDraft(next);
      return {
        ...prev,
        blockedSpots: spots,
        draft: applyBlockedKickSpotsToDraft(next, spots),
      };
    }
    return {
      ...prev,
      draft: applyBlockedKickSpotsToDraft(next, prev.blockedSpots),
    };
  }

  if (needsTackleSpot(next.playType, next.result)) {
    if (changed) {
      const end = initTackleEndFromDraft(next);
      return {
        ...prev,
        tackleEnd: end,
        draft: applyTackleSpotToDraft(next, end),
      };
    }
    return {
      ...prev,
      draft: applyTackleSpotToDraft(next, prev.tackleEnd),
    };
  }

  return { ...prev, draft: next };
}

function withFinalizedDraft(
  state: TaggingSession,
  draft: PlaylistData,
  plays: PlaylistData[] = state.plays,
): TaggingSession {
  const spots = initSpotsFromDraft(draft);
  return {
    ...state,
    ...spots,
    plays,
    draft: finalizeTaggingDraft(
      draft,
      plays,
      spots.kickoffSpots,
      spots.puntSpots,
      spots.tackleEnd,
      spots.intSpots,
      spots.fumbleSpots,
      spots.blockedSpots,
      spots.penaltyFoulSpot,
    ),
  };
}

function applyPlayTypeAction(
  state: TaggingSession,
  playType: PlaylistData["playType"],
): TaggingSession {
  const nextDraft =
    isScoringPlayType(state.draft.playType) && isScoringPlayType(playType)
      ? applyScoringPlayTypeChange(state.draft, playType as ScoringPlayType)
      : applyPlayTypeChange(state.draft, playType);
  const withJerseys = applyJerseyLeaderDefaults(nextDraft, state.plays);
  const applied = applyPadDraftChange(state, withJerseys);
  return { ...state, ...applied };
}

function applyResultAction(
  state: TaggingSession,
  result: PlaylistData["result"],
): TaggingSession {
  const nextDraft = applyJerseyLeaderDefaults(
    applyResultChange(state.draft, result),
    state.plays,
  );
  const applied = applyPadDraftChange(state, nextDraft);
  return { ...state, ...applied };
}

function saveLiveInsert(state: TaggingSession): TaggingSession {
  if (!canSaveDraft(state.draft, state.tackleEnd, state.fumbleSpots)) {
    return state;
  }

  const toSave = normalizePlayOnSave(state.draft);
  let openingKickoffRole = state.openingKickoffRole;
  if (isKickoffDraft(toSave) && state.plays.length === 0) {
    openingKickoffRole = kickoffRoleFromDraft(toSave);
  }

  const newPlays = [...state.plays, toSave];
  const nextNum = toSave.playNumber + 1;
  const nextChainDraft = withQuarterFromLast(
    ensureOffensePadDraft(
      nextDraftAfterPlayForGame(toSave, nextNum, state.teamCode, state.phase),
    ),
    toSave.quarter,
  );
  const nextKickoffRole = resolveKickoffRoleAfterSave(
    toSave,
    nextChainDraft,
    state.kickoffRole,
  );
  const next = withKickoffRole(nextChainDraft, nextKickoffRole);
  const score = deriveScoreFromPlays(newPlays);
  let phase = state.phase;
  let status: GameStatus =
    state.status === "pregame" && newPlays.length > 0 ? "live" : state.status;
  if (shouldFinalizeOtGame(newPlays, phase, score)) {
    phase = "FINAL";
    status = "final";
  }

  return withFinalizedDraft(
    {
      ...state,
      openingKickoffRole,
      kickoffRole: nextKickoffRole,
      phase,
      status,
    },
    next,
    newPlays,
  );
}

function applyPhaseAdvance(state: TaggingSession): TaggingSession {
  const score = deriveScoreFromPlays(state.plays);
  const action = phaseAdvanceAction(state.phase, score.us, score.them);
  if (!action) return state;

  const nextPhase = action.nextPhase;
  if (nextPhase === "OT") {
    // Header opens Start OT modal; phase changes only via startOt.
    return state;
  }

  if (nextPhase === "FINAL") {
    return {
      ...state,
      phase: "FINAL",
      status: "final",
    };
  }

  if (nextPhase === "HALFTIME") {
    return { ...state, phase: "HALFTIME" };
  }

  if (nextPhase === "Q3" && state.phase === "HALFTIME") {
    const role = secondHalfKickoffRoleFromOpening(state.openingKickoffRole);
    const draft = withKickoffRole(
      defaultKickoffPlay(state.draft.playNumber, state.teamCode, {
        quarter: 3,
        yardLine: -40,
        result: Result.Return,
      }),
      role,
    );
    return withFinalizedDraft(
      {
        ...state,
        phase: "Q3",
        kickoffRole: role,
        status: state.status === "pregame" ? "live" : state.status,
      },
      draft,
    );
  }

  const q = quarterForRegulationPhase(nextPhase);
  const stamped =
    q !== null ? { ...state.draft, quarter: q } : state.draft;
  return {
    ...state,
    phase: nextPhase,
    draft: stamped,
    status:
      nextPhase === "Q1" && state.status === "pregame" ? "live" : state.status,
  };
}

function applyStartOt(
  state: TaggingSession,
  possession: OtPossession,
): TaggingSession {
  const otDraft = ensureOffensePadDraft(
    defaultOtOpeningDraft(state.draft.playNumber, state.teamCode, possession),
  );
  return withFinalizedDraft(
    {
      ...state,
      phase: "OT",
      otPossession: possession,
      status: state.status === "pregame" ? "live" : state.status,
    },
    otDraft,
  );
}

export function startSession(opts: {
  teamCode?: string;
  openingKickoffRole: KickoffRole;
}): TaggingSession {
  const teamCode = opts.teamCode ?? DEFAULT_TEAM;
  const kickoffRole = opts.openingKickoffRole;
  const liveDraft = buildLiveDraft([], 1, teamCode, kickoffRole, "Q1");
  const spots = initSpotsFromDraft(liveDraft);
  return {
    teamCode,
    openingKickoffRole: kickoffRole,
    kickoffRole,
    phase: "Q1",
    otPossession: null,
    status: "pregame",
    plays: [],
    ...spots,
    draft: finalizeTaggingDraft(
      liveDraft,
      [],
      spots.kickoffSpots,
      spots.puntSpots,
      spots.tackleEnd,
      spots.intSpots,
      spots.fumbleSpots,
      spots.blockedSpots,
      spots.penaltyFoulSpot,
    ),
  };
}

export function sessionFromLiveState(input: {
  teamCode: string;
  openingKickoffRole: KickoffRole;
  kickoffRole: KickoffRole;
  phase: GamePhase;
  otPossession: OtPossession | null;
  status: GameStatus;
  plays: PlaylistData[];
  draft: PlaylistData;
  kickoffSpots: KickoffReturnSpots;
  puntSpots: PuntSpots;
  tackleEnd: TackleEnd;
  intSpots: InterceptionReturnSpots;
  fumbleSpots: FumbleRecoverySpots;
  blockedSpots: BlockedKickRecoverySpots;
  penaltyFoulSpot: YardLine;
}): TaggingSession {
  return { ...input };
}

export function openingKickoffRoleFromPlays(
  plays: PlaylistData[],
  currentRole: KickoffRole,
): KickoffRole {
  const first = plays[0];
  if (
    first &&
    (first.playType === PlayType.Kickoff ||
      first.playType === PlayType.KickoffReceive)
  ) {
    return first.playType === PlayType.KickoffReceive ? "receive" : "kick";
  }
  return currentRole;
}

export function reduceTaggingSession(
  state: TaggingSession,
  action: TaggingAction,
): TaggingSession {
  switch (action.type) {
    case "playType":
      return applyPlayTypeAction(state, action.playType);
    case "result":
      return applyResultAction(state, action.result);
    case "tackle": {
      const draft = applyTackleSpotToDraft(state.draft, action.end);
      return { ...state, tackleEnd: action.end, draft };
    }
    case "kickoffSpots": {
      const spots = { ...state.kickoffSpots, ...action.spots };
      return {
        ...state,
        kickoffSpots: spots,
        draft: applyKickoffSpotsToDraft(state.draft, spots),
      };
    }
    case "puntSpots": {
      const spots: PuntSpots = {
        ...state.puntSpots,
        ...action.spots,
        returnSpots: {
          ...state.puntSpots.returnSpots,
          ...action.spots.returnSpots,
        },
      };
      return {
        ...state,
        puntSpots: spots,
        draft: applyPuntSpotsToDraft(state.draft, spots),
      };
    }
    case "fumbleSpots": {
      const spots = { ...state.fumbleSpots, ...action.spots };
      return {
        ...state,
        fumbleSpots: spots,
        draft: applyFumbleSpotsToDraft(state.draft, spots),
      };
    }
    case "intSpots": {
      const spots = { ...state.intSpots, ...action.spots };
      return {
        ...state,
        intSpots: spots,
        draft: applyInterceptionSpotsToDraft(state.draft, spots),
      };
    }
    case "blockedSpots": {
      const spots = { ...state.blockedSpots, ...action.spots };
      return {
        ...state,
        blockedSpots: spots,
        draft: applyBlockedKickSpotsToDraft(state.draft, spots),
      };
    }
    case "penaltySpot":
      return {
        ...state,
        penaltyFoulSpot: action.foulSpot,
        draft: applyPenaltySpotToDraft(state.draft, action.foulSpot),
      };
    case "jersey": {
      const current = state.draft[action.slot];
      return {
        ...state,
        draft: {
          ...state.draft,
          [action.slot]: {
            ...current,
            jersey: action.jersey,
            name: current.name || "",
          },
        },
      };
    }
    case "kickoffRole": {
      const openingKickoffRole =
        state.plays.length === 0 ? action.role : state.openingKickoffRole;
      if (!isKickoffDraft(state.draft)) {
        return {
          ...state,
          openingKickoffRole,
          kickoffRole: action.role,
        };
      }
      const next = applyKickoffRole(state.draft, action.role);
      const spots = defaultKickoffReturnSpots(action.role === "kick");
      const withResult =
        next.result === Result.Return || next.result === Result.Touchback
          ? next
          : { ...next, result: Result.Return };
      return {
        ...state,
        openingKickoffRole,
        kickoffRole: action.role,
        kickoffSpots: spots,
        draft: applyKickoffSpotsToDraft(withResult, spots),
      };
    }
    case "save":
      return saveLiveInsert(state);
    case "phaseAdvance":
      return applyPhaseAdvance(state);
    case "startOt":
      return applyStartOt(state, action.possession);
  }
}

export function runActions(
  state: TaggingSession,
  actions: TaggingAction[],
): TaggingSession {
  return actions.reduce(reduceTaggingSession, state);
}

export function snapshot(state: TaggingSession): TaggingSnapshot {
  return {
    header: formatQaHeaderLine(state.draft, state.phase),
    pad: padLabelForDraft(state.draft),
    phase: state.phase,
    kickoffRole: state.kickoffRole,
    canSave: canSaveDraft(state.draft, state.tackleEnd, state.fumbleSpots),
    score: deriveScoreFromPlays(state.plays),
    playCount: state.plays.length,
    visibleSlots: getVisiblePlayerSlots(state.draft.playType, state.draft.result),
  };
}
