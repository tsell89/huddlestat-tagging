import { isLegalScrimmageDistance, yardsToScoringGoal } from "./fieldPosition100.js";
import {
  nextDraftAfterPlay,
  type PlayChainOptions,
} from "./playChain.js";
import type { PlaylistData } from "./index.js";

export type SituationInvariantViolation = {
  playNumber: number;
  rule: string;
  detail: string;
};

/** Reject 2nd & 6 at Opp 4 (O) / Own 4 (D) and any scrimmage distance past the scoring goal. */
export function checkSituationDistanceToGoal(
  sit: Pick<PlaylistData, "down" | "distance" | "yardLine" | "playNumber"> & {
    odk?: PlaylistData["odk"];
  },
): SituationInvariantViolation[] {
  const odk = sit.odk ?? "O";
  if (sit.down === 0) return [];
  if (isLegalScrimmageDistance(sit.down, sit.distance, sit.yardLine, odk)) {
    return [];
  }
  const toGoal = yardsToScoringGoal(sit.yardLine, odk);
  return [
    {
      playNumber: sit.playNumber,
      rule: "distance_cap_to_goal",
      detail: `${sit.down} & ${sit.distance} at YL ${sit.yardLine} exceeds ${toGoal} yards to scoring goal`,
    },
  ];
}

/** Walk saved snaps and every nextDraftAfterPlay output. */
export function checkChainDistanceInvariants(
  plays: PlaylistData[],
  options?: PlayChainOptions & { teamOffense?: string },
): SituationInvariantViolation[] {
  const out: SituationInvariantViolation[] = [];
  const team = options?.teamOffense ?? plays[0]?.team ?? "TEAM";

  for (const play of plays) {
    out.push(...checkSituationDistanceToGoal(play));
  }

  for (let i = 0; i < plays.length; i++) {
    const play = plays[i]!;
    const nextNum = plays[i + 1]?.playNumber ?? play.playNumber + 1;
    const draft = nextDraftAfterPlay(play, nextNum, team, {
      rules: options?.rules,
      overtime: options?.overtime,
    });
    out.push(
      ...checkSituationDistanceToGoal({
        playNumber: draft.playNumber,
        down: draft.down,
        distance: draft.distance,
        yardLine: draft.yardLine,
        odk: draft.odk,
      }),
    );
  }

  return out;
}
