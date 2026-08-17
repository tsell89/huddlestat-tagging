import { PlayType, type PlaylistData } from "@huddlestat/shared";
import { KickoffTaggingPad } from "@/components/tagging/KickoffTaggingPad";
import { OffensePad } from "@/components/tagging/OffensePad";
import { ScoringPad } from "@/components/tagging/ScoringPad";
import type { LocalPlay } from "@/lib/db/types";
import {
  isScoringPlayType,
  type PlayerSlotKey,
} from "@/lib/tagging/playConfig";
import type { KickoffReturnSpots } from "@/lib/tagging/kickoffReturn";
import type { KickoffRole } from "@/lib/tagging/kickoffRole";
import type { PuntSpots } from "@/lib/tagging/puntReturn";
import type { TackleEnd } from "@/lib/tagging/tackleSpot";
import type { InterceptionReturnSpots } from "@/lib/tagging/interceptionReturn";
import type { FumbleRecoverySpots } from "@/lib/tagging/fumbleRecovery";
import type { BlockedKickRecoverySpots } from "@/lib/tagging/blockedKickRecovery";
import type { YardLine } from "@huddlestat/shared";

type TaggingPadProps = {
  draft: PlaylistData;
  onChange: (draft: PlaylistData) => void;
  activePlayerSlot: PlayerSlotKey | null;
  onActivePlayerSlotChange: (slot: PlayerSlotKey | null) => void;
  gamePlays: LocalPlay[];
  kickoffSpots: KickoffReturnSpots;
  onKickoffSpotsChange: (spots: KickoffReturnSpots) => void;
  kickoffRole: KickoffRole;
  onKickoffRoleChange: (role: KickoffRole) => void;
  puntSpots: PuntSpots;
  onPuntSpotsChange: (spots: PuntSpots) => void;
  tackleEnd: TackleEnd;
  onTackleEndChange: (end: TackleEnd) => void;
  intSpots: InterceptionReturnSpots;
  onIntSpotsChange: (spots: InterceptionReturnSpots) => void;
  fumbleSpots: FumbleRecoverySpots;
  onFumbleSpotsChange: (spots: FumbleRecoverySpots) => void;
  blockedSpots: BlockedKickRecoverySpots;
  onBlockedSpotsChange: (spots: BlockedKickRecoverySpots) => void;
  penaltyFoulSpot: YardLine;
  onPenaltyFoulSpotChange: (spot: YardLine) => void;
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

  if (isScoringPlayType(props.draft.playType)) {
    return <ScoringPad {...props} />;
  }

  return <OffensePad {...props} />;
}
