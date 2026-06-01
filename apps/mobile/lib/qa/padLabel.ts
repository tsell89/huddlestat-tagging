import { ODK, PlayType, type PlaylistData } from "@huddlestat/shared";
import { isKickoffDraft } from "../tagging/kickoffRoleResolve";

const SCORING_TYPES = new Set<string>([
  PlayType.ExtraPoint,
  PlayType.ExtraPointBlock,
  PlayType.TwoPoint,
  PlayType.TwoPointBlock,
]);

/** Human pad name shown in QA logs (matches manual QA script vocabulary). */
export function padLabelForDraft(draft: PlaylistData): string {
  if (isKickoffDraft(draft)) return "Kickoff";
  if (SCORING_TYPES.has(draft.playType)) return "Scoring";
  if (draft.playType === PlayType.Punt || draft.playType === PlayType.PuntReceive) {
    return draft.playType === PlayType.PuntReceive ? "Punt Rec" : "Punt";
  }
  if (draft.playType === PlayType.FieldGoal) return "FG";
  if (draft.playType === PlayType.Pass) return "Pass";
  if (draft.playType === PlayType.Run) return "Run";
  if (
    draft.odk === ODK.Offense &&
    draft.down >= 1 &&
    !draft.playType
  ) {
    return "Run";
  }
  if (draft.playType) return draft.playType;
  return "Unknown";
}
