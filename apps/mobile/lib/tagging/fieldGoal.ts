import type { PlaylistData, YardLine } from "@huddlestat/shared";
import { yardsToOpponentGoal } from "@/lib/tagging/fieldPosition100";

export const FG_NO_GOOD_IN_FIELD = "In field" as const;
export const FG_NO_GOOD_INTO_END_ZONE = "Into end zone" as const;

export const FG_NO_GOOD_CHOICES = [
  FG_NO_GOOD_IN_FIELD,
  FG_NO_GOOD_INTO_END_ZONE,
] as const;

export type FgNoGoodChoice = (typeof FG_NO_GOOD_CHOICES)[number];

/** Scrimmage kick attempt distance: yards to goal + 10 (spec §2.6). */
export function fgAttemptYards(ballSpot: YardLine): number {
  return yardsToOpponentGoal(ballSpot) + 10;
}

export function encodeFgNoGoodSpotEncoding(choice: FgNoGoodChoice): string {
  return choice === FG_NO_GOOD_INTO_END_ZONE ? "end:TB" : "end:field";
}

export function decodeFgNoGoodSpotEncoding(
  spotEncoding?: string,
): FgNoGoodChoice {
  if (spotEncoding === "end:TB") return FG_NO_GOOD_INTO_END_ZONE;
  return FG_NO_GOOD_IN_FIELD;
}

export function isFgNoGoodSpotEncoding(spotEncoding?: string): boolean {
  return spotEncoding === "end:field" || spotEncoding === "end:TB";
}

export function applyFieldGoalKickYards(draft: PlaylistData): PlaylistData {
  return {
    ...draft,
    kickYards: fgAttemptYards(draft.yardLine),
  };
}
