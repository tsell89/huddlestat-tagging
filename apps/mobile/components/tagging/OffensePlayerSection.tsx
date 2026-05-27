import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { JerseyQuickGrid } from "@/components/tagging/JerseyQuickGrid";
import type { LocalPlay } from "@/lib/db/types";
import { buildJerseyGridRankings } from "@/lib/tagging/jerseyGridRank";
import {
  getPlayerSlotLabel,
  getVisiblePlayerSlots,
  type PlayerSlotKey,
} from "@/lib/tagging/playConfig";
import type { PlaylistData, PlayerRef } from "@huddlestat/shared";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type OffensePlayerSectionProps = {
  draft: PlaylistData;
  onChange: (draft: PlaylistData) => void;
  activePlayerSlot: PlayerSlotKey | null;
  onActivePlayerSlotChange: (slot: PlayerSlotKey | null) => void;
  gamePlays: LocalPlay[];
};

function getSlotValue(draft: PlaylistData, slot: PlayerSlotKey): PlayerRef {
  return draft[slot] as PlayerRef;
}

function setSlotJersey(
  draft: PlaylistData,
  slot: PlayerSlotKey,
  jersey: string,
): PlaylistData {
  const current = getSlotValue(draft, slot);
  return {
    ...draft,
    [slot]: { ...current, jersey, name: current.name || "" },
  };
}

export function OffensePlayerSection({
  draft,
  onChange,
  activePlayerSlot,
  onActivePlayerSlotChange,
  gamePlays,
}: OffensePlayerSectionProps) {
  const visibleSlots = getVisiblePlayerSlots(draft.playType, draft.result);
  const activeSlot =
    activePlayerSlot && visibleSlots.includes(activePlayerSlot)
      ? activePlayerSlot
      : (visibleSlots[0] ?? null);

  const jerseyEntries = useMemo(
    () => (activeSlot ? buildJerseyGridRankings(gamePlays, activeSlot) : []),
    [activeSlot, gamePlays],
  );

  if (visibleSlots.length === 0) return null;

  const activeJersey = activeSlot
    ? getSlotValue(draft, activeSlot).jersey
    : "";

  return (
    <>
      <View style={styles.playerRow}>
        {visibleSlots.map((slot) => {
          const ref = getSlotValue(draft, slot);
          const active = activeSlot === slot;
          const label = getPlayerSlotLabel(slot, draft.playType, draft.result);
          return (
            <Pressable
              key={slot}
              style={[styles.playerSlot, active && styles.playerSlotActive]}
              onPress={() => onActivePlayerSlotChange(slot)}
            >
              <Text style={styles.playerSlotLabel}>{label}</Text>
              <Text style={styles.playerSlotValue}>
                {ref.jersey ? `#${ref.jersey}` : "—"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeSlot ? (
        <View style={styles.jerseyWrap}>
          <JerseyQuickGrid
            entries={jerseyEntries}
            slotLabel={getPlayerSlotLabel(
              activeSlot,
              draft.playType,
              draft.result,
            )}
            selectedJersey={activeJersey}
            onSelectJersey={(jersey) => {
              onChange(setSlotJersey(draft, activeSlot, jersey));
              const idx = visibleSlots.indexOf(activeSlot);
              const nextSlot = visibleSlots[idx + 1];
              if (nextSlot) {
                onActivePlayerSlotChange(nextSlot);
              }
            }}
          />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  playerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  playerSlot: {
    minWidth: "22%",
    flexGrow: 1,
    backgroundColor: LAYOUT.colors.sectionBg,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: LAYOUT.colors.sectionBorder,
    paddingVertical: 6,
    minHeight: LAYOUT.compactTapTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  playerSlotActive: {
    borderColor: LAYOUT.colors.navy,
    backgroundColor: "#eff6ff",
  },
  playerSlotLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: LAYOUT.colors.textMuted,
    textTransform: "uppercase",
  },
  playerSlotValue: {
    fontSize: 16,
    fontWeight: "800",
    color: LAYOUT.colors.textPrimary,
  },
  jerseyWrap: {
    flex: 1,
    minHeight: 0,
    backgroundColor: LAYOUT.colors.sectionBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LAYOUT.colors.sectionBorder,
    padding: LAYOUT.compactSectionPadding,
  },
});
