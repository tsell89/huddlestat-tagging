import { ODK, PlayType, type PlaylistData } from "../index.js";

/** Pad routing class for replay comparison (mirrors iPad playConfig intent). */
export type PadClass =
  | "kickoff"
  | "offense"
  | "punt"
  | "field_goal"
  | "scoring"
  | "empty";

export function padClassForPlay(play: PlaylistData): PadClass {
  const { playType, odk } = play;
  if (playType === PlayType.Kickoff || playType === PlayType.KickoffReceive) {
    return "kickoff";
  }
  if (
    playType === PlayType.ExtraPoint ||
    playType === PlayType.ExtraPointBlock ||
    playType === PlayType.TwoPoint ||
    playType === PlayType.TwoPointBlock
  ) {
    return "scoring";
  }
  if (playType === PlayType.Punt || playType === PlayType.PuntReceive) {
    return "punt";
  }
  if (playType === PlayType.FieldGoal) {
    return "field_goal";
  }
  if (playType === PlayType.Run || playType === PlayType.Pass) {
    return "offense";
  }
  if (playType === "" && (odk === ODK.Offense || odk === ODK.Defense)) {
    return "offense";
  }
  if (playType === "" && odk === ODK.Kicking) {
    return "kickoff";
  }
  return "empty";
}

/** Chain draft may leave playType empty before user picks Run/Pass/FG. */
export function padClassMatches(draft: PlaylistData, saved: PlaylistData): boolean {
  const draftClass = padClassForPlay(draft);
  const savedClass = padClassForPlay(saved);
  if (draftClass === savedClass) return true;
  if (draft.odk !== saved.odk) return false;
  // Pre-pad routing: chain returns offense shell; tagger picks FG/Punt/Run/Pass
  if (draftClass === "offense" && savedClass === "field_goal") return true;
  if (draftClass === "offense" && savedClass === "punt") return true;
  if (draftClass === "offense" && savedClass === "offense") return true;
  if (draftClass === "kickoff" && savedClass === "kickoff") return true;
  if (draftClass === "empty" && savedClass === "offense") return true;
  return false;
}
