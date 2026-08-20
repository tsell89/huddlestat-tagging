import { StyleSheet, Text, View } from "react-native";
import { Result, type PlaylistData, type YardLine } from "@huddlestat/shared";
import { TapGrid } from "@/components/tagging/TapGrid";
import { OffensePlayerSection } from "@/components/tagging/OffensePlayerSection";
import type { LocalPlay } from "@/lib/db/types";
import { PuntReturnSpotsPanel } from "@/components/tagging/PuntReturnSpots";
import { BlockedKickRecoverySpotsPanel } from "@/components/tagging/BlockedKickRecoverySpots";
import { PenaltySpotPanel } from "@/components/tagging/PenaltySpotPanel";
import { FieldPositionSlider } from "@/components/tagging/FieldPositionSlider";
import {
  applyResultChange,
  getAlternateResultsForPlayType,
  getVisiblePlayerSlots,
  type PlayerSlotKey,
} from "@/lib/tagging/playConfig";
import {
  downedRatioToYardLine,
  downedYardLineToRatio,
  type PuntSpots,
} from "@/lib/tagging/puntReturn";
import type { BlockedKickRecoverySpots } from "@/lib/tagging/blockedKickRecovery";
import type { DefendingEnd } from "@/lib/tagging/defendingEnd";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type PuntPadProps = {
  draft: PlaylistData;
  onChange: (draft: PlaylistData) => void;
  activePlayerSlot: PlayerSlotKey | null;
  onActivePlayerSlotChange: (slot: PlayerSlotKey | null) => void;
  gamePlays: LocalPlay[];
  puntSpots: PuntSpots;
  onPuntSpotsChange: (spots: PuntSpots) => void;
  blockedSpots: BlockedKickRecoverySpots;
  onBlockedSpotsChange: (spots: BlockedKickRecoverySpots) => void;
  penaltyFoulSpot: YardLine;
  onPenaltyFoulSpotChange: (spot: YardLine) => void;
  defendingEnd?: DefendingEnd;
};

export function PuntPad({
  draft,
  onChange,
  activePlayerSlot,
  onActivePlayerSlotChange,
  gamePlays,
  puntSpots,
  onPuntSpotsChange,
  blockedSpots,
  onBlockedSpotsChange,
  penaltyFoulSpot,
  onPenaltyFoulSpotChange,
  defendingEnd = "left",
}: PuntPadProps) {
  const alternates = getAlternateResultsForPlayType(draft.playType);

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
          columns={5}
          size="dense"
        />
      </View>

      {draft.result === Result.Return ? (
        <View style={styles.section}>
          <PuntReturnSpotsPanel
            spots={puntSpots.returnSpots}
            onChange={(returnSpots) =>
              onPuntSpotsChange({ ...puntSpots, returnSpots })
            }
            defendingEnd={defendingEnd}
          />
        </View>
      ) : draft.result === Result.Downed ? (
        <View style={styles.section}>
          <FieldPositionSlider
            label="Downed at"
            value={puntSpots.downedAt}
            onChange={(downedAt) =>
              onPuntSpotsChange({ ...puntSpots, downedAt })
            }
            ratioForValue={downedYardLineToRatio}
            valueForRatio={downedRatioToYardLine}
            leftTick="−1"
            centerTick="50"
            rightTick="+1"
            defendingEnd={defendingEnd}
          />
        </View>
      ) : draft.result === Result.Touchback ? (
        <View style={styles.note}>
          <Text style={styles.noteText}>
            Touchback — receiving team @ Own 20
          </Text>
        </View>
      ) : draft.result === Result.Blocked ? (
        <View style={styles.section}>
          <BlockedKickRecoverySpotsPanel
            spots={blockedSpots}
            onChange={onBlockedSpotsChange}
            defendingEnd={defendingEnd}
          />
        </View>
      ) : draft.result === Result.Penalty ? (
        <View style={styles.section}>
          <PenaltySpotPanel
            foulSpot={penaltyFoulSpot}
            onChange={onPenaltyFoulSpotChange}
            defendingEnd={defendingEnd}
          />
        </View>
      ) : null}

      <OffensePlayerSection
        draft={draft}
        onChange={onChange}
        activePlayerSlot={activePlayerSlot}
        onActivePlayerSlotChange={onActivePlayerSlotChange}
        gamePlays={gamePlays}
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
  note: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  noteText: {
    fontSize: 13,
    color: LAYOUT.colors.textMuted,
    fontStyle: "italic",
  },
});
