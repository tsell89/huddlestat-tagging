import { StyleSheet, Text, View } from "react-native";
import { Result, type PlaylistData, type YardLine } from "@huddlestat/shared";
import { TapGrid } from "@/components/tagging/TapGrid";
import { OffensePlayerSection } from "@/components/tagging/OffensePlayerSection";
import type { LocalPlay } from "@/lib/db/types";
import { BlockedKickRecoverySpotsPanel } from "@/components/tagging/BlockedKickRecoverySpots";
import { PenaltySpotPanel } from "@/components/tagging/PenaltySpotPanel";
import {
  applyResultChange,
  getAlternateResultsForPlayType,
  getVisiblePlayerSlots,
  type PlayerSlotKey,
} from "@/lib/tagging/playConfig";
import {
  FG_NO_GOOD_CHOICES,
  applyFieldGoalKickYards,
  decodeFgNoGoodSpotEncoding,
  encodeFgNoGoodSpotEncoding,
  fgAttemptYards,
  type FgNoGoodChoice,
} from "@/lib/tagging/fieldGoal";
import { LAYOUT } from "@/lib/tagging/layoutConstants";
import type { BlockedKickRecoverySpots } from "@/lib/tagging/blockedKickRecovery";

type FGPadProps = {
  draft: PlaylistData;
  onChange: (draft: PlaylistData) => void;
  activePlayerSlot: PlayerSlotKey | null;
  onActivePlayerSlotChange: (slot: PlayerSlotKey | null) => void;
  gamePlays: LocalPlay[];
  blockedSpots: BlockedKickRecoverySpots;
  onBlockedSpotsChange: (spots: BlockedKickRecoverySpots) => void;
  penaltyFoulSpot: YardLine;
  onPenaltyFoulSpotChange: (spot: YardLine) => void;
};

function withKickYards(draft: PlaylistData): PlaylistData {
  return applyFieldGoalKickYards(draft);
}

export function FGPad({
  draft,
  onChange,
  activePlayerSlot,
  onActivePlayerSlotChange,
  gamePlays,
  blockedSpots,
  onBlockedSpotsChange,
  penaltyFoulSpot,
  onPenaltyFoulSpotChange,
}: FGPadProps) {
  const alternates = getAlternateResultsForPlayType(draft.playType);
  const attemptYards = fgAttemptYards(draft.yardLine);
  const noGoodChoice =
    draft.result === Result.NoGood
      ? decodeFgNoGoodSpotEncoding(draft.spotEncoding)
      : FG_NO_GOOD_CHOICES[0];

  return (
    <View style={styles.pad}>
      <View style={styles.topRow}>
        <View style={styles.fgBadge}>
          <Text style={styles.fgBadgeText}>FG</Text>
        </View>
        <View style={styles.resultWrap}>
          <TapGrid
            options={alternates}
            value={draft.result}
            onChange={(result) => {
              const next = withKickYards(applyResultChange(draft, result));
              onChange(next);
              const slots = getVisiblePlayerSlots(draft.playType, result);
              onActivePlayerSlotChange(slots[0] ?? null);
            }}
            columns={4}
            size="dense"
          />
        </View>
      </View>

      <View style={styles.attemptRow}>
        <Text style={styles.attemptLabel}>Attempt</Text>
        <Text style={styles.attemptValue}>{attemptYards} yd</Text>
      </View>

      {draft.result === Result.NoGood ? (
        <View style={styles.section}>
          <TapGrid
            options={FG_NO_GOOD_CHOICES}
            value={noGoodChoice}
            onChange={(choice: FgNoGoodChoice) => {
              onChange(
                withKickYards({
                  ...draft,
                  spotEncoding: encodeFgNoGoodSpotEncoding(choice),
                }),
              );
            }}
            columns={2}
            size="dense"
          />
          {noGoodChoice === FG_NO_GOOD_CHOICES[1] ? (
            <Text style={styles.subNote}>Touchback @ Own 20</Text>
          ) : null}
        </View>
      ) : draft.result === Result.Blocked ? (
        <View style={styles.section}>
          <BlockedKickRecoverySpotsPanel
            spots={blockedSpots}
            onChange={onBlockedSpotsChange}
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
        onChange={(next) => onChange(withKickYards(next))}
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
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fgBadge: {
    backgroundColor: LAYOUT.colors.navy,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: LAYOUT.compactTapTarget,
    justifyContent: "center",
  },
  fgBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  resultWrap: {
    flex: 1,
  },
  attemptRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    paddingHorizontal: 4,
  },
  attemptLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: LAYOUT.colors.textMuted,
    textTransform: "uppercase",
  },
  attemptValue: {
    fontSize: 18,
    fontWeight: "800",
    color: LAYOUT.colors.textPrimary,
  },
  section: {
    backgroundColor: LAYOUT.colors.sectionBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LAYOUT.colors.sectionBorder,
    padding: LAYOUT.compactSectionPadding,
    gap: 6,
  },
  subNote: {
    fontSize: 12,
    color: LAYOUT.colors.textMuted,
    fontStyle: "italic",
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
