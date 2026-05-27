import {
  ODK,
  PlayType,
  Result,
  TWO_POINT_YARD_LINE,
  XP_YARD_LINE,
  type PlaylistData,
  type YardLine,
} from "@huddlestat/shared";
import {
  applyFieldGoalKickYards,
  decodeFgNoGoodCompletion,
  encodeFgNoGoodCompletion,
  fgAttemptYards,
  FG_NO_GOOD_IN_FIELD,
  isFgNoGoodCompletion,
} from "@/lib/tagging/fieldGoal";
import { hudlToFieldPosition } from "@/lib/tagging/fieldPosition100";
import { touchbackDraftPatch } from "@/lib/tagging/kickoffReturn";
import { needsTackleSpot } from "@/lib/tagging/tackleSpot";
import { POSITION_GROUPS as POSITION_GROUP_MAP } from "./positionGroups";

export { needsTackleSpot } from "@/lib/tagging/tackleSpot";

/** HS max field-goal attempt distance (yards to goal + 10). */
export const MAX_FG_RANGE = 62;

export { fgAttemptYards } from "@/lib/tagging/fieldGoal";

/** Opp 40 yard line on the internal 0–100 axis. */
const OPP_40_POSITION = 60;

/** Play types on OffensePad PlayTypeRow (Run · Pass · Punt · FG). */
export const OFFENSE_PLAY_TYPES = [
  PlayType.Run,
  PlayType.Pass,
  PlayType.Punt,
  PlayType.FieldGoal,
] as const;

export type OffensePlayType = (typeof OFFENSE_PLAY_TYPES)[number];

/** Scoring play types routed to ScoringPad (not OffensePad). */
export const SCORING_PLAY_TYPES = [
  PlayType.ExtraPoint,
  PlayType.TwoPoint,
  PlayType.ExtraPointBlock,
  PlayType.TwoPointBlock,
] as const;

export type ScoringPlayType = (typeof SCORING_PLAY_TYPES)[number];

export function isScoringPlayType(
  playType: PlaylistData["playType"],
): playType is ScoringPlayType {
  return (
    playType === PlayType.ExtraPoint ||
    playType === PlayType.TwoPoint ||
    playType === PlayType.ExtraPointBlock ||
    playType === PlayType.TwoPointBlock
  );
}

export type PlayTypeTapSize = "large" | "medium" | "small" | "tiny";

export type PlayTypeTapSizes = Record<OffensePlayType, PlayTypeTapSize>;

/** Primary play types shown on the legacy tagging pad */
export const PRIMARY_PLAY_TYPES = [
  PlayType.Run,
  PlayType.Pass,
  PlayType.Kickoff,
  PlayType.Punt,
  PlayType.FieldGoal,
] as const;

export type PrimaryPlayType = (typeof PRIMARY_PLAY_TYPES)[number];

export type PlayerSlotKey =
  | "rusher"
  | "passer"
  | "receiver"
  | "tackler1"
  | "tackler2"
  | "kicker"
  | "returner"
  | "interceptedBy"
  | "recoveredBy";

export type YardsMode = "gain" | "return" | "kick" | "none";

export function isOffensePadPlayType(
  playType: PlaylistData["playType"],
): playType is OffensePlayType {
  return (
    playType === PlayType.Run ||
    playType === PlayType.Pass ||
    playType === PlayType.Punt ||
    playType === PlayType.FieldGoal
  );
}

export function shouldShowOffensePad(draft: PlaylistData): boolean {
  if (isScoringPlayType(draft.playType)) return false;
  return (
    isOffensePadPlayType(draft.playType) ||
    (draft.odk === ODK.Offense && draft.down >= 1 && !draft.playType)
  );
}

/** New offensive series defaults to RunPad with Rush selected. */
export function ensureOffensePadDraft(draft: PlaylistData): PlaylistData {
  if (isScoringPlayType(draft.playType)) return draft;
  if (draft.odk === ODK.Offense && draft.down >= 1 && !draft.playType) {
    return applyPlayTypeChange(draft, PlayType.Run);
  }
  return draft;
}

function fgInRange(yardLine: YardLine): boolean {
  return fgAttemptYards(yardLine) <= MAX_FG_RANGE;
}

/**
 * Situational tap sizes for OffensePad PlayTypeRow (spec §4.2).
 */
export function getPlayTypeTapSizes(
  down: number,
  yardLine: YardLine,
  distance: number,
): PlayTypeTapSizes {
  const pos = hudlToFieldPosition(yardLine);
  const ownSide = pos < 50;
  const beforeOpp40 = pos < OPP_40_POSITION;
  const insideOpp40 = pos >= OPP_40_POSITION;
  const fourthDown = down === 4;
  const shortFourth = fourthDown && distance <= 2;

  if (shortFourth) {
    return {
      [PlayType.Run]: "medium",
      [PlayType.Pass]: "medium",
      [PlayType.Punt]: "medium",
      [PlayType.FieldGoal]: fgInRange(yardLine) ? "medium" : "tiny",
    };
  }

  if (fourthDown && beforeOpp40) {
    const fg = fgInRange(yardLine) ? "medium" : "small";
    return {
      [PlayType.Run]: "medium",
      [PlayType.Pass]: "medium",
      [PlayType.Punt]: "large",
      [PlayType.FieldGoal]: fg,
    };
  }

  if (fourthDown && insideOpp40) {
    const fg = fgInRange(yardLine) ? "medium" : "tiny";
    return {
      [PlayType.Run]: "medium",
      [PlayType.Pass]: "medium",
      [PlayType.Punt]: "tiny",
      [PlayType.FieldGoal]: fg,
    };
  }

  if (ownSide) {
    return {
      [PlayType.Run]: "large",
      [PlayType.Pass]: "large",
      [PlayType.Punt]: "small",
      [PlayType.FieldGoal]: "tiny",
    };
  }

  const fg = fgInRange(yardLine) ? "medium" : "small";
  return {
    [PlayType.Run]: "large",
    [PlayType.Pass]: "large",
    [PlayType.Punt]: "tiny",
    [PlayType.FieldGoal]: fg,
  };
}

/** Position groups for roster sort (Gate 3 — you will tune these lists) */
export const POSITION_GROUPS: Record<PlayerSlotKey, readonly string[]> =
  POSITION_GROUP_MAP;

/**
 * When a play type is chosen, auto-set the default result (e.g. Run → Rush).
 * User then picks alternates (TD, fumble, etc.) from a small modifier row.
 */
export function getDefaultResultForPlayType(
  playType: PlaylistData["playType"],
): PlaylistData["result"] {
  switch (playType) {
    case PlayType.Run:
      return Result.Rush;
    case PlayType.Pass:
      return Result.Complete;
    case PlayType.Kickoff:
    case PlayType.KickoffReceive:
      return Result.Return;
    case PlayType.Punt:
    case PlayType.PuntReceive:
      return Result.Downed;
    case PlayType.FieldGoal:
      return Result.Good;
    case PlayType.ExtraPoint:
    case PlayType.TwoPoint:
      return Result.Good;
    case PlayType.ExtraPointBlock:
    case PlayType.TwoPointBlock:
      return Result.Blocked;
    default:
      return "";
  }
}

/**
 * Alternate results / modifiers valid for this play type.
 * Never mixes incompatible types (no Rush on Pass, no Complete on Run).
 */
export function getAlternateResultsForPlayType(
  playType: PlaylistData["playType"],
): readonly PlaylistData["result"][] {
  switch (playType) {
    case PlayType.Run:
      return [
        Result.Rush,
        Result.RushTd,
        Result.Fumble,
        Result.Penalty,
      ];
    case PlayType.Pass:
      return [
        Result.Complete,
        Result.CompleteTd,
        Result.Incomplete,
        Result.Sack,
        Result.Interception,
        Result.TippedPass,
        Result.Penalty,
      ];
    case PlayType.Kickoff:
    case PlayType.KickoffReceive:
      return [Result.Return, Result.Touchback, Result.Penalty];
    case PlayType.Punt:
    case PlayType.PuntReceive:
      return [Result.Downed, Result.Return, Result.Touchback, Result.Blocked, Result.Penalty];
    case PlayType.FieldGoal:
      return [Result.Good, Result.NoGood, Result.Blocked, Result.Penalty];
    case PlayType.ExtraPoint:
    case PlayType.TwoPoint:
      return [Result.Good];
    case PlayType.ExtraPointBlock:
    case PlayType.TwoPointBlock:
      return [Result.Blocked];
    default:
      return [];
  }
}

/** Which player slots appear for this type + result (never show irrelevant slots). */
export function getVisiblePlayerSlots(
  playType: PlaylistData["playType"],
  result: PlaylistData["result"],
): PlayerSlotKey[] {
  if (!playType) return [];

  switch (playType) {
    case PlayType.Run:
      if (result === Result.RushTd) return ["rusher"];
      if (result === Result.Fumble) return ["rusher", "recoveredBy"];
      if (result === Result.Penalty) return ["rusher"];
      return ["rusher", "tackler1"];
    case PlayType.Pass:
      if (result === Result.Incomplete) return ["passer"];
      if (result === Result.TippedPass) return ["passer", "tackler1"];
      if (result === Result.Interception) return ["passer", "interceptedBy", "tackler1"];
      if (result === Result.Sack) return ["rusher", "tackler1"];
      if (result === Result.CompleteTd) return ["passer", "receiver"];
      if (result === Result.Penalty) return ["passer"];
      return ["passer", "receiver", "tackler1"];
    case PlayType.Kickoff:
      if (result === Result.Touchback) return ["kicker"];
      if (result === Result.Return) {
        return ["kicker", "returner", "tackler1", "tackler2"];
      }
      return ["kicker"];
    case PlayType.KickoffReceive:
      if (result === Result.Return) return ["returner"];
      return ["kicker"];
    case PlayType.Punt:
      return ["kicker"];
    case PlayType.PuntReceive:
      if (result === Result.Return) return ["returner"];
      return [];
    case PlayType.FieldGoal:
      return ["kicker"];
    case PlayType.ExtraPoint:
    case PlayType.TwoPoint:
      return ["kicker"];
    case PlayType.ExtraPointBlock:
    case PlayType.TwoPointBlock:
      return ["tackler1"];
    default:
      return [];
  }
}

/** Whether yards UI is shown and which field it maps to */
export function getYardsMode(
  playType: PlaylistData["playType"],
  result: PlaylistData["result"],
): YardsMode {
  if (!playType) return "none";

  switch (playType) {
    case PlayType.Run:
    case PlayType.Pass:
      if (needsTackleSpot(playType, result)) {
        return "none";
      }
      if (
        result === Result.Incomplete ||
        result === Result.TippedPass ||
        result === Result.Penalty ||
        result === Result.Interception ||
        result === Result.Fumble
      ) {
        return "none";
      }
      return "none";
    case PlayType.Kickoff:
    case PlayType.KickoffReceive:
      return result === Result.Return ? "return" : "none";
    case PlayType.Punt:
      return "kick";
    case PlayType.PuntReceive:
      return result === Result.Return ? "return" : "none";
    case PlayType.FieldGoal:
      return "none";
    case PlayType.ExtraPoint:
    case PlayType.TwoPoint:
    case PlayType.ExtraPointBlock:
    case PlayType.TwoPointBlock:
      return "none";
    default:
      return "none";
  }
}

/** Slider bounds from current ball spot — max gain = yards to opponent goal (pos 100). */
export function yardsSliderRange(yardLine: YardLine): { min: number; max: number } {
  const pos = hudlToFieldPosition(yardLine);
  const toGoal = 100 - pos;
  const maxGain = Math.min(99, Math.max(1, toGoal));
  const maxLoss = Math.min(99, Math.max(1, pos - 1));
  return {
    min: -maxLoss,
    max: maxGain,
  };
}

/**
 * Switch play type mid-snap (Run ↔ Pass or to Punt/FG).
 * Preserves down, distance, yardLine; resets result-specific fields.
 */
export function applyPlayTypeChange(
  draft: PlaylistData,
  playType: PlaylistData["playType"],
): PlaylistData {
  const result = getDefaultResultForPlayType(playType);
  const next: PlaylistData = {
    ...draft,
    playType,
    result,
    gainLoss: 0,
    completion: undefined,
    returnYards: undefined,
    kickYards: undefined,
    passer: emptyIfHidden("passer", playType, result, draft.passer),
    receiver: emptyIfHidden("receiver", playType, result, draft.receiver),
    rusher: emptyIfHidden("rusher", playType, result, draft.rusher),
    tackler1: emptyIfHidden("tackler1", playType, result, draft.tackler1),
    tackler2: emptyIfHidden("tackler2", playType, result, draft.tackler2),
    kicker: emptyIfHidden("kicker", playType, result, draft.kicker),
    returner: emptyIfHidden("returner", playType, result, draft.returner),
    interceptedBy: emptyIfHidden("interceptedBy", playType, result, draft.interceptedBy),
    recoveredBy: emptyIfHidden("recoveredBy", playType, result, draft.recoveredBy),
  };

  if (result === Result.Touchback) {
    return touchbackDraftPatch({
      ...next,
      returner: { jersey: "", name: "" },
    });
  }

  if (playType === PlayType.FieldGoal) {
    return applyFieldGoalKickYards(next);
  }

  return next;
}

/** Switch XP ↔ 2pt (or block variants) on ScoringPad. */
export function applyScoringPlayTypeChange(
  draft: PlaylistData,
  playType: ScoringPlayType,
): PlaylistData {
  const result = getDefaultResultForPlayType(playType);
  const twoPoint =
    playType === PlayType.TwoPoint || playType === PlayType.TwoPointBlock;
  const yardLine = twoPoint ? TWO_POINT_YARD_LINE : XP_YARD_LINE;
  const distance = twoPoint ? 2 : 1;
  return {
    ...draft,
    playType,
    result,
    yardLine,
    distance,
    gainLoss: 0,
    completion: undefined,
    kicker: emptyIfHidden("kicker", playType, result, draft.kicker),
    tackler1: emptyIfHidden("tackler1", playType, result, draft.tackler1),
    tackler2: emptyIfHidden("tackler2", playType, result, draft.tackler2),
  };
}

/** Whether saved completion string matches the active play type + result. */
function completionMatchesResult(
  playType: PlaylistData["playType"],
  result: PlaylistData["result"],
  completion?: string,
): boolean {
  if (!completion) return false;
  if (result === Result.Interception) return completion.startsWith("catch:");
  if (result === Result.Fumble) return completion.startsWith("fumble:");
  if (result === Result.Penalty) return completion.startsWith("foul:");
  if (
    result === Result.Blocked &&
    (playType === PlayType.Punt || playType === PlayType.FieldGoal)
  ) {
    return completion.startsWith("recover:");
  }
  if (needsTackleSpot(playType, result)) {
    return completion.startsWith("tackle:");
  }
  if (playType === PlayType.Punt && result === Result.Return) {
    return completion.startsWith("recv:");
  }
  if (playType === PlayType.Punt && result === Result.Downed) {
    return (
      completion.startsWith("end:") &&
      !completion.startsWith("recv:") &&
      !isFgNoGoodCompletion(completion)
    );
  }
  if (playType === PlayType.FieldGoal && result === Result.NoGood) {
    return isFgNoGoodCompletion(completion);
  }
  if (
    (playType === PlayType.Kickoff || playType === PlayType.KickoffReceive) &&
    result === Result.Return
  ) {
    return completion.startsWith("catch:");
  }
  return false;
}

export function applyResultChange(
  draft: PlaylistData,
  result: PlaylistData["result"],
): PlaylistData {
  const { playType } = draft;
  const noGain =
    result === Result.Incomplete || result === Result.TippedPass;
  const keepCompletion =
    !noGain &&
    draft.result === result &&
    completionMatchesResult(playType, result, draft.completion);
  const next: PlaylistData = {
    ...draft,
    result,
    gainLoss: noGain ? 0 : draft.gainLoss,
    completion: keepCompletion ? draft.completion : undefined,
    tackler1: emptyIfHidden("tackler1", playType, result, draft.tackler1),
    tackler2: emptyIfHidden("tackler2", playType, result, draft.tackler2),
    receiver: emptyIfHidden("receiver", playType, result, draft.receiver),
    rusher: emptyIfHidden("rusher", playType, result, draft.rusher),
    interceptedBy: emptyIfHidden("interceptedBy", playType, result, draft.interceptedBy),
    recoveredBy: emptyIfHidden("recoveredBy", playType, result, draft.recoveredBy),
    returner: emptyIfHidden("returner", playType, result, draft.returner),
  };

  if (result === Result.Touchback) {
    return touchbackDraftPatch(next);
  }

  if (playType === PlayType.FieldGoal) {
    if (result === Result.NoGood) {
      next.completion = encodeFgNoGoodCompletion(
        isFgNoGoodCompletion(draft.completion)
          ? decodeFgNoGoodCompletion(draft.completion)
          : FG_NO_GOOD_IN_FIELD,
      );
    } else if (isFgNoGoodCompletion(draft.completion)) {
      next.completion = undefined;
    }
    return applyFieldGoalKickYards(next);
  }

  return next;
}

export function getPlayerSlotLabel(
  slot: PlayerSlotKey,
  playType: PlaylistData["playType"],
  result: PlaylistData["result"],
): string {
  if (
    playType === PlayType.Pass &&
    result === Result.TippedPass &&
    slot === "tackler1"
  ) {
    return "PBU";
  }
  return PLAYER_SLOT_LABELS[slot];
}

function emptyIfHidden(
  slot: PlayerSlotKey,
  playType: PlaylistData["playType"],
  result: PlaylistData["result"],
  current: PlaylistData[PlayerSlotKey],
): PlaylistData[PlayerSlotKey] {
  const visible = getVisiblePlayerSlots(playType, result);
  if (!visible.includes(slot)) {
    return { jersey: "", name: "" };
  }
  return current;
}

export const PLAYER_SLOT_LABELS: Record<PlayerSlotKey, string> = {
  rusher: "Rusher",
  passer: "Passer",
  receiver: "Receiver",
  tackler1: "Tackler",
  tackler2: "Tackler 2",
  kicker: "Kicker",
  returner: "Returner",
  interceptedBy: "INT by",
  recoveredBy: "Recovered",
};
