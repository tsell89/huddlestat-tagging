import { nextDraftAfterPlay, type PlaylistData } from "../index.js";
import { padClassMatches } from "./padClass.js";
import type { PbpGameMeta, ReplayMismatch } from "./types.js";

const SITUATION_FIELDS = [
  "down",
  "distance",
  "yardLine",
  "odk",
] as const satisfies readonly (keyof PlaylistData)[];

export function replayChainMismatches(
  plays: PlaylistData[],
  meta: PbpGameMeta,
  maxReport = 5,
): ReplayMismatch[] {
  const skip = new Set(meta.skipReplayAfter ?? []);
  const mismatches: ReplayMismatch[] = [];

  for (let i = 0; i < plays.length - 1; i++) {
    const play = plays[i]!;
    if (skip.has(play.playNumber)) continue;

    const nextSaved = plays[i + 1]!;
    const draft = nextDraftAfterPlay(
      play,
      nextSaved.playNumber,
      meta.teamOffense,
      { rules: meta.rules, overtime: meta.overtime },
    );

    for (const field of SITUATION_FIELDS) {
      if (draft[field] !== nextSaved[field]) {
        mismatches.push({
          afterPlayNumber: play.playNumber,
          field,
          expected: nextSaved[field],
          actual: draft[field],
          savedPlayType: nextSaved.playType,
          savedResult: nextSaved.result,
        });
        if (mismatches.length >= maxReport) return mismatches;
      }
    }

    if (!padClassMatches(draft, nextSaved)) {
      mismatches.push({
        afterPlayNumber: play.playNumber,
        field: "padClass",
        expected: `${nextSaved.playType}/${nextSaved.odk}`,
        actual: `${draft.playType}/${draft.odk}`,
        savedPlayType: nextSaved.playType,
        savedResult: nextSaved.result,
      });
      if (mismatches.length >= maxReport) return mismatches;
    }
  }

  return mismatches;
}

export function formatReplayFailures(mismatches: ReplayMismatch[]): string {
  return mismatches
    .map(
      (m) =>
        `after play #${m.afterPlayNumber}: ${m.field} expected ${JSON.stringify(m.expected)} got ${JSON.stringify(m.actual)} (saved ${m.savedPlayType}/${m.savedResult})`,
    )
    .join("\n");
}
