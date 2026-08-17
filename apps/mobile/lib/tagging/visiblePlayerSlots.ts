import { PlayType, Result, type PlaylistData } from "@huddlestat/shared";

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

export function isPlayerSlotVisibleOnPlay(
  play: Pick<PlaylistData, "playType" | "result">,
  slot: PlayerSlotKey,
): boolean {
  return getVisiblePlayerSlots(play.playType, play.result).includes(slot);
}

export function firstEmptyVisiblePlayerSlot(
  draft: PlaylistData,
): PlayerSlotKey | null {
  const slots = getVisiblePlayerSlots(draft.playType, draft.result);
  const empty = slots.find((slot) => {
    const ref = draft[slot] as { jersey?: string } | undefined;
    return !ref?.jersey?.trim();
  });
  return empty ?? slots[0] ?? null;
}
