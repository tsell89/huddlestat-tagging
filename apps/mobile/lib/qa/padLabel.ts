import { ODK, PlayType, type PlaylistData } from "@huddlestat/shared";
import { isKickoffDraft } from "../tagging/kickoffRoleResolve";
import { defaultOffensePlayType } from "../tagging/playConfig";

const SCORING_TYPES = new Set<string>([
  PlayType.ExtraPoint,
  PlayType.ExtraPointBlock,
  PlayType.TwoPoint,
  PlayType.TwoPointBlock,
]);

/** Human pad name shown in QA logs (matches manual QA script vocabulary). */
export function padLabelForDraft(draft: PlaylistData): string {
  const playType =
    !draft.playType &&
    (draft.odk === ODK.Offense || draft.odk === ODK.Defense) &&
    draft.down >= 1
      ? defaultOffensePlayType(draft)
      : draft.playType;

  if (isKickoffDraft({ ...draft, playType })) return "Kickoff";
  if (SCORING_TYPES.has(playType)) return "Scoring";
  if (playType === PlayType.Punt || playType === PlayType.PuntReceive) {
    return playType === PlayType.PuntReceive ? "Punt Rec" : "Punt";
  }
  if (playType === PlayType.FieldGoal) return "FG";
  if (playType === PlayType.Pass) return "Pass";
  if (playType === PlayType.Run) return "Run";
  if (playType) return playType;
  return "Unknown";
}
