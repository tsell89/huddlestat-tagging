import { StyleSheet, View } from "react-native";
import { PlayType, type PlaylistData } from "@huddlestat/shared";
import { PlayTypeRow } from "@/components/tagging/PlayTypeRow";
import { FGPad } from "@/components/tagging/FGPad";
import { PassPad } from "@/components/tagging/PassPad";
import { PuntPad } from "@/components/tagging/PuntPad";
import { RunPad } from "@/components/tagging/RunPad";
import {
  applyPlayTypeChange,
  ensureOffensePadDraft,
  getVisiblePlayerSlots,
  type OffensePlayType,
  type PlayerSlotKey,
} from "@/lib/tagging/playConfig";
import type { PuntSpots } from "@/lib/tagging/puntReturn";
import type { TackleEnd } from "@/lib/tagging/tackleSpot";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type OffensePadProps = {
  draft: PlaylistData;
  onChange: (draft: PlaylistData) => void;
  activePlayerSlot: PlayerSlotKey | null;
  onActivePlayerSlotChange: (slot: PlayerSlotKey | null) => void;
  tackleEnd: TackleEnd;
  onTackleEndChange: (end: TackleEnd) => void;
  puntSpots: PuntSpots;
  onPuntSpotsChange: (spots: PuntSpots) => void;
};

export function OffensePad({
  draft,
  onChange,
  activePlayerSlot,
  onActivePlayerSlotChange,
  tackleEnd,
  onTackleEndChange,
  puntSpots,
  onPuntSpotsChange,
}: OffensePadProps) {
  function handlePlayTypeChange(playType: OffensePlayType) {
    const next = applyPlayTypeChange(draft, playType);
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
          tackleEnd={tackleEnd}
          onTackleEndChange={onTackleEndChange}
        />
      ) : bodyDraft.playType === PlayType.Pass ? (
        <PassPad
          draft={bodyDraft}
          onChange={onChange}
          activePlayerSlot={activePlayerSlot}
          onActivePlayerSlotChange={onActivePlayerSlotChange}
          tackleEnd={tackleEnd}
          onTackleEndChange={onTackleEndChange}
        />
      ) : bodyDraft.playType === PlayType.Punt ? (
        <PuntPad
          draft={bodyDraft}
          onChange={onChange}
          activePlayerSlot={activePlayerSlot}
          onActivePlayerSlotChange={onActivePlayerSlotChange}
          puntSpots={puntSpots}
          onPuntSpotsChange={onPuntSpotsChange}
        />
      ) : bodyDraft.playType === PlayType.FieldGoal ? (
        <FGPad
          draft={bodyDraft}
          onChange={onChange}
          activePlayerSlot={activePlayerSlot}
          onActivePlayerSlotChange={onActivePlayerSlotChange}
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
