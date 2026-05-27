import { StyleSheet, View } from "react-native";
import { Result, type PlaylistData, type YardLine } from "@huddlestat/shared";
import { TapGrid } from "@/components/tagging/TapGrid";
import { TackleSpotPanel } from "@/components/tagging/TackleSpotPanel";
import { FumbleRecoverySpotsPanel } from "@/components/tagging/FumbleRecoverySpots";
import { PenaltySpotPanel } from "@/components/tagging/PenaltySpotPanel";
import { OffensePlayerSection } from "@/components/tagging/OffensePlayerSection";
import {
  applyResultChange,
  getAlternateResultsForPlayType,
  getVisiblePlayerSlots,
  needsTackleSpot,
  type PlayerSlotKey,
} from "@/lib/tagging/playConfig";
import {
  isTouchdownTackleResult,
  type TackleEnd,
} from "@/lib/tagging/tackleSpot";
import type { FumbleRecoverySpots } from "@/lib/tagging/fumbleRecovery";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type RunPadProps = {
  draft: PlaylistData;
  onChange: (draft: PlaylistData) => void;
  activePlayerSlot: PlayerSlotKey | null;
  onActivePlayerSlotChange: (slot: PlayerSlotKey | null) => void;
  tackleEnd: TackleEnd;
  onTackleEndChange: (end: TackleEnd) => void;
  fumbleSpots: FumbleRecoverySpots;
  onFumbleSpotsChange: (spots: FumbleRecoverySpots) => void;
  penaltyFoulSpot: YardLine;
  onPenaltyFoulSpotChange: (spot: YardLine) => void;
};

export function RunPad({
  draft,
  onChange,
  activePlayerSlot,
  onActivePlayerSlotChange,
  tackleEnd,
  onTackleEndChange,
  fumbleSpots,
  onFumbleSpotsChange,
  penaltyFoulSpot,
  onPenaltyFoulSpotChange,
}: RunPadProps) {
  const alternates = getAlternateResultsForPlayType(draft.playType);
  const showTackleSpot = needsTackleSpot(draft.playType, draft.result);

  return (
    <View style={styles.pad}>
      <View style={styles.resultWrap}>
        <TapGrid
          options={alternates}
          value={draft.result}
          onChange={(result) => {
            onChange(applyResultChange(draft, result));
            const slots = getVisiblePlayerSlots(draft.playType, result);
            onActivePlayerSlotChange(slots[0] ?? null);
          }}
          columns={4}
          size="dense"
        />
      </View>

      {showTackleSpot ? (
        <View style={styles.section}>
          <TackleSpotPanel
            ballSpot={draft.yardLine}
            end={tackleEnd}
            onChange={onTackleEndChange}
            touchdownMode={isTouchdownTackleResult(draft.result)}
          />
        </View>
      ) : draft.result === Result.Fumble ? (
        <View style={styles.section}>
          <FumbleRecoverySpotsPanel
            spots={fumbleSpots}
            onChange={onFumbleSpotsChange}
          />
        </View>
      ) : draft.result === Result.Penalty ? (
        <View style={styles.section}>
          <PenaltySpotPanel
            foulSpot={penaltyFoulSpot}
            onChange={onPenaltyFoulSpotChange}
          />
        </View>
      ) : null}

      <OffensePlayerSection
        draft={draft}
        onChange={onChange}
        activePlayerSlot={activePlayerSlot}
        onActivePlayerSlotChange={onActivePlayerSlotChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    flex: 1,
    gap: 6,
    minHeight: 0,
  },
  resultWrap: {
    backgroundColor: LAYOUT.colors.sectionBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LAYOUT.colors.sectionBorder,
    padding: LAYOUT.compactSectionPadding,
  },
  section: {
    backgroundColor: LAYOUT.colors.sectionBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LAYOUT.colors.sectionBorder,
    padding: LAYOUT.compactSectionPadding,
  },
  deferredNote: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  deferredText: {
    fontSize: 13,
    color: LAYOUT.colors.textMuted,
    fontStyle: "italic",
  },
});
