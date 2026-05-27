import { StyleSheet, Text, View } from "react-native";
import { Result, type PlaylistData } from "@huddlestat/shared";
import { TapGrid } from "@/components/tagging/TapGrid";
import { TackleSpotPanel } from "@/components/tagging/TackleSpotPanel";
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
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type RunPadProps = {
  draft: PlaylistData;
  onChange: (draft: PlaylistData) => void;
  activePlayerSlot: PlayerSlotKey | null;
  onActivePlayerSlotChange: (slot: PlayerSlotKey | null) => void;
  tackleEnd: TackleEnd;
  onTackleEndChange: (end: TackleEnd) => void;
};

export function RunPad({
  draft,
  onChange,
  activePlayerSlot,
  onActivePlayerSlotChange,
  tackleEnd,
  onTackleEndChange,
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
        <View style={styles.deferredNote}>
          <Text style={styles.deferredText}>
            Fumble recovery spots — Package H
          </Text>
        </View>
      ) : draft.result === Result.Penalty ? (
        <View style={styles.deferredNote}>
          <Text style={styles.deferredText}>
            Penalty spot — Package H
          </Text>
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
