import { StyleSheet, View } from "react-native";
import { PlayType, type PlaylistData } from "@huddlestat/shared";
import { PlayTypeRow } from "@/components/tagging/PlayTypeRow";
import { FGPad } from "@/components/tagging/FGPad";
import { PassPad } from "@/components/tagging/PassPad";
import { PuntPad } from "@/components/tagging/PuntPad";
import { RunPad } from "@/components/tagging/RunPad";
import type { LocalPlay } from "@/lib/db/types";
import { applyPasserLeaderDefault } from "@/lib/tagging/jerseyGridRank";
import {
  applyPlayTypeChange,
  ensureOffensePadDraft,
  getVisiblePlayerSlots,
  type OffensePlayType,
  type PlayerSlotKey,
} from "@/lib/tagging/playConfig";
import type { PuntSpots } from "@/lib/tagging/puntReturn";
import type { TackleEnd } from "@/lib/tagging/tackleSpot";
import type { InterceptionReturnSpots } from "@/lib/tagging/interceptionReturn";
import type { FumbleRecoverySpots } from "@/lib/tagging/fumbleRecovery";
import type { BlockedKickRecoverySpots } from "@/lib/tagging/blockedKickRecovery";
import type { DefendingEnd } from "@/lib/tagging/defendingEnd";
import type { YardLine } from "@huddlestat/shared";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type OffensePadProps = {
  draft: PlaylistData;
  onChange: (draft: PlaylistData) => void;
  activePlayerSlot: PlayerSlotKey | null;
  onActivePlayerSlotChange: (slot: PlayerSlotKey | null) => void;
  gamePlays: LocalPlay[];
  tackleEnd: TackleEnd;
  onTackleEndChange: (end: TackleEnd) => void;
  puntSpots: PuntSpots;
  onPuntSpotsChange: (spots: PuntSpots) => void;
  intSpots: InterceptionReturnSpots;
  onIntSpotsChange: (spots: InterceptionReturnSpots) => void;
  fumbleSpots: FumbleRecoverySpots;
  onFumbleSpotsChange: (spots: FumbleRecoverySpots) => void;
  blockedSpots: BlockedKickRecoverySpots;
  onBlockedSpotsChange: (spots: BlockedKickRecoverySpots) => void;
  penaltyFoulSpot: YardLine;
  onPenaltyFoulSpotChange: (spot: YardLine) => void;
  defendingEnd?: DefendingEnd;
};

export function OffensePad({
  draft,
  onChange,
  activePlayerSlot,
  onActivePlayerSlotChange,
  gamePlays,
  tackleEnd,
  onTackleEndChange,
  puntSpots,
  onPuntSpotsChange,
  intSpots,
  onIntSpotsChange,
  fumbleSpots,
  onFumbleSpotsChange,
  blockedSpots,
  onBlockedSpotsChange,
  penaltyFoulSpot,
  onPenaltyFoulSpotChange,
  defendingEnd = "left",
}: OffensePadProps) {
  function handlePlayTypeChange(playType: OffensePlayType) {
    const next = applyPasserLeaderDefault(
      applyPlayTypeChange(draft, playType),
      gamePlays,
    );
    onChange(next);
    onActivePlayerSlotChange(
      getVisiblePlayerSlots(playType, next.result)[0] ?? null,
    );
  }

  const bodyDraft = ensureOffensePadDraft(draft);

  return (
    <View style={styles.shell}>
      <PlayTypeRow draft={bodyDraft} onChange={handlePlayTypeChange} />

      {bodyDraft.playType === PlayType.Run ? (
        <RunPad
          draft={bodyDraft}
          onChange={onChange}
          activePlayerSlot={activePlayerSlot}
          onActivePlayerSlotChange={onActivePlayerSlotChange}
          gamePlays={gamePlays}
          tackleEnd={tackleEnd}
          onTackleEndChange={onTackleEndChange}
          fumbleSpots={fumbleSpots}
          onFumbleSpotsChange={onFumbleSpotsChange}
          penaltyFoulSpot={penaltyFoulSpot}
          onPenaltyFoulSpotChange={onPenaltyFoulSpotChange}
          defendingEnd={defendingEnd}
        />
      ) : bodyDraft.playType === PlayType.Pass ? (
        <PassPad
          draft={bodyDraft}
          onChange={onChange}
          activePlayerSlot={activePlayerSlot}
          onActivePlayerSlotChange={onActivePlayerSlotChange}
          gamePlays={gamePlays}
          tackleEnd={tackleEnd}
          onTackleEndChange={onTackleEndChange}
          intSpots={intSpots}
          onIntSpotsChange={onIntSpotsChange}
          penaltyFoulSpot={penaltyFoulSpot}
          onPenaltyFoulSpotChange={onPenaltyFoulSpotChange}
          defendingEnd={defendingEnd}
        />
      ) : bodyDraft.playType === PlayType.Punt ? (
        <PuntPad
          draft={bodyDraft}
          onChange={onChange}
          activePlayerSlot={activePlayerSlot}
          onActivePlayerSlotChange={onActivePlayerSlotChange}
          gamePlays={gamePlays}
          puntSpots={puntSpots}
          onPuntSpotsChange={onPuntSpotsChange}
          blockedSpots={blockedSpots}
          onBlockedSpotsChange={onBlockedSpotsChange}
          penaltyFoulSpot={penaltyFoulSpot}
          onPenaltyFoulSpotChange={onPenaltyFoulSpotChange}
          defendingEnd={defendingEnd}
        />
      ) : bodyDraft.playType === PlayType.FieldGoal ? (
        <FGPad
          draft={bodyDraft}
          onChange={onChange}
          activePlayerSlot={activePlayerSlot}
          onActivePlayerSlotChange={onActivePlayerSlotChange}
          gamePlays={gamePlays}
          blockedSpots={blockedSpots}
          onBlockedSpotsChange={onBlockedSpotsChange}
          penaltyFoulSpot={penaltyFoulSpot}
          onPenaltyFoulSpotChange={onPenaltyFoulSpotChange}
          defendingEnd={defendingEnd}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    paddingHorizontal: LAYOUT.padding.screen,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 6,
    minHeight: 0,
  },
});
