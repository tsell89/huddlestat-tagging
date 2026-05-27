import { StyleSheet, Text, View } from "react-native";
import { ODK, PlayType, type PlaylistData } from "@huddlestat/shared";
import { TapGrid } from "@/components/tagging/TapGrid";
import { OffensePlayerSection } from "@/components/tagging/OffensePlayerSection";
import {
  applyResultChange,
  applyScoringPlayTypeChange,
  getAlternateResultsForPlayType,
  getVisiblePlayerSlots,
  type PlayerSlotKey,
  type ScoringPlayType,
} from "@/lib/tagging/playConfig";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type ScoringPadProps = {
  draft: PlaylistData;
  onChange: (draft: PlaylistData) => void;
  activePlayerSlot: PlayerSlotKey | null;
  onActivePlayerSlotChange: (slot: PlayerSlotKey | null) => void;
};

const OFFENSE_SCORING_TYPES = [PlayType.ExtraPoint, PlayType.TwoPoint] as const;
const DEFENSE_SCORING_TYPES = [
  PlayType.ExtraPointBlock,
  PlayType.TwoPointBlock,
] as const;

function scoringTypeOptions(draft: PlaylistData): readonly ScoringPlayType[] {
  return draft.odk === ODK.Defense
    ? DEFENSE_SCORING_TYPES
    : OFFENSE_SCORING_TYPES;
}

function scoringBadgeLabel(playType: PlaylistData["playType"]): string {
  if (playType === PlayType.TwoPoint || playType === PlayType.TwoPointBlock) {
    return "2 Pt.";
  }
  return "XP";
}

export function ScoringPad({
  draft,
  onChange,
  activePlayerSlot,
  onActivePlayerSlotChange,
}: ScoringPadProps) {
  const typeOptions = scoringTypeOptions(draft);
  const resultOptions = getAlternateResultsForPlayType(draft.playType);

  return (
    <View style={styles.pad}>
      <View style={styles.topRow}>
        <View style={styles.scoringBadge}>
          <Text style={styles.scoringBadgeText}>
            {scoringBadgeLabel(draft.playType)}
          </Text>
        </View>
        <View style={styles.typeWrap}>
          <TapGrid
            options={typeOptions}
            value={draft.playType as ScoringPlayType}
            onChange={(playType) => {
              const next = applyScoringPlayTypeChange(draft, playType);
              onChange(next);
              onActivePlayerSlotChange(
                getVisiblePlayerSlots(playType, next.result)[0] ?? null,
              );
            }}
            columns={2}
            size="dense"
          />
        </View>
        <View style={styles.resultWrap}>
          <TapGrid
            options={resultOptions}
            value={draft.result}
            onChange={(result) => {
              onChange(applyResultChange(draft, result));
              const slots = getVisiblePlayerSlots(draft.playType, result);
              onActivePlayerSlotChange(slots[0] ?? null);
            }}
            columns={1}
            size="dense"
          />
        </View>
      </View>

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
    paddingHorizontal: LAYOUT.padding.screen,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 6,
    minHeight: 0,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scoringBadge: {
    backgroundColor: LAYOUT.colors.navy,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: LAYOUT.compactTapTarget,
    justifyContent: "center",
  },
  scoringBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  typeWrap: {
    flex: 1,
  },
  resultWrap: {
    minWidth: 72,
  },
});
