import {
  ODK,
  PlayType,
  displayYardLine,
  formatDownDistance,
  type PlaylistData,
} from "@huddlestat/shared";

/** Human-readable situation for the fixed header (no hash on kickoff/special teams). */
export function formatSituationLine(draft: PlaylistData): string {
  const yl = displayYardLine(draft.yardLine);

  if (
    draft.playType === PlayType.Kickoff ||
    (draft.odk === ODK.Kicking &&
      draft.down === 0 &&
      draft.playType !== PlayType.FieldGoal)
  ) {
    return `Kickoff @ ${yl}`;
  }

  if (draft.playType === PlayType.KickoffReceive) {
    return `KO return @ ${yl}`;
  }

  if (draft.playType === PlayType.Punt || draft.playType === PlayType.PuntReceive) {
    return `Punt @ ${yl}`;
  }

  if (draft.playType === PlayType.FieldGoal) {
    return `FG @ ${yl}`;
  }

  if (draft.down === 0) {
    return `@ ${yl}`;
  }

  return `${formatDownDistance(draft.down, draft.distance)} @ ${yl}`;
}
