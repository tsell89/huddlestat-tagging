import { PlayType, type PlaylistData } from "@huddlestat/shared";
import { KickoffTaggingPad } from "@/components/tagging/KickoffTaggingPad";
import { OffensePad } from "@/components/tagging/OffensePad";
import {
  shouldShowOffensePad,
  type PlayerSlotKey,
} from "@/lib/tagging/playConfig";
import type { KickoffReturnSpots } from "@/lib/tagging/kickoffReturn";
import type { PuntSpots } from "@/lib/tagging/puntReturn";
import type { TackleEnd } from "@/lib/tagging/tackleSpot";

type TaggingPadProps = {
  draft: PlaylistData;
  onChange: (draft: PlaylistData) => void;
  activePlayerSlot: PlayerSlotKey | null;
  onActivePlayerSlotChange: (slot: PlayerSlotKey | null) => void;
  kickoffSpots: KickoffReturnSpots;
  onKickoffSpotsChange: (spots: KickoffReturnSpots) => void;
  puntSpots: PuntSpots;
  onPuntSpotsChange: (spots: PuntSpots) => void;
  tackleEnd: TackleEnd;
  onTackleEndChange: (end: TackleEnd) => void;
};

function isKickoffPlay(draft: PlaylistData): boolean {
  return (
    draft.playType === PlayType.Kickoff ||
    draft.playType === PlayType.KickoffReceive
  );
}

export function TaggingPad(props: TaggingPadProps) {
  if (isKickoffPlay(props.draft)) {
    return <KickoffTaggingPad {...props} />;
  }

  if (shouldShowOffensePad(props.draft)) {
    return <OffensePad {...props} />;
  }

  return null;
}
