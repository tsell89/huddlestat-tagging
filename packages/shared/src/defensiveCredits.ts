import { ODK, Result, type PlayerRef } from "./constants.js";
import type { PlaylistData } from "./index.js";

export type DefensiveCreditAccumulator = {
  soloTackles: number;
  assistTackles: number;
  tacklesForLoss: number;
  sacks: number;
};

function jerseyKey(ref: PlayerRef): string | null {
  const jersey = ref.jersey.trim();
  return jersey ? jersey : null;
}

export function isTackleForLossPlay(play: PlaylistData): boolean {
  if (play.odk !== ODK.Defense) return false;
  if (play.result === Result.Sack) return true;
  return play.gainLoss < 0 && play.result === Result.Rush;
}

function ensureCredit(
  map: Map<string, DefensiveCreditAccumulator>,
  jersey: string,
): DefensiveCreditAccumulator {
  let row = map.get(jersey);
  if (!row) {
    row = {
      soloTackles: 0,
      assistTackles: 0,
      tacklesForLoss: 0,
      sacks: 0,
    };
    map.set(jersey, row);
  }
  return row;
}

/** Apply locked A1–A5 tackle / TFL / sack credits for one defensive play. */
export function applyDefensiveCreditsToMap(
  play: PlaylistData,
  map: Map<string, DefensiveCreditAccumulator>,
): void {
  if (play.odk !== ODK.Defense) return;

  const t1 = jerseyKey(play.tackler1);
  const t2 = jerseyKey(play.tackler2);
  const tfl = isTackleForLossPlay(play);
  const isSack = play.result === Result.Sack;

  if (tfl && t1 && t2) {
    ensureCredit(map, t1).assistTackles += 1;
    ensureCredit(map, t2).assistTackles += 1;
  } else if (t1 && t2) {
    ensureCredit(map, t1).soloTackles += 1;
    ensureCredit(map, t2).assistTackles += 1;
  } else if (t1) {
    ensureCredit(map, t1).soloTackles += 1;
  } else if (t2) {
    ensureCredit(map, t2).soloTackles += 1;
  }

  if (tfl) {
    if (t1 && t2) {
      ensureCredit(map, t1).tacklesForLoss += 1;
      ensureCredit(map, t2).tacklesForLoss += 1;
    } else {
      const credit = t1 ?? t2;
      if (credit) ensureCredit(map, credit).tacklesForLoss += 1;
    }
  }

  if (isSack) {
    if (t1 && t2) {
      ensureCredit(map, t1).sacks += 0.5;
      ensureCredit(map, t2).sacks += 0.5;
    } else {
      const credit = t1 ?? t2;
      if (credit) ensureCredit(map, credit).sacks += 1;
    }
  }
}
