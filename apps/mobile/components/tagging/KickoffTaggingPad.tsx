import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Result, type PlaylistData, type PlayerRef } from "@huddlestat/shared";
import { TapGrid } from "@/components/tagging/TapGrid";
import { KickoffReturnSpotsPanel } from "@/components/tagging/KickoffReturnSpots";
import { DirectionOfPlayControl } from "@/components/tagging/DirectionOfPlayControl";
import { JerseyQuickGrid } from "@/components/tagging/JerseyQuickGrid";
import type { LocalPlay } from "@/lib/db/types";
import { buildJerseyGridRankings } from "@/lib/tagging/jerseyGridRank";
import {
  applyResultChange,
  getAlternateResultsForPlayType,
  getVisiblePlayerSlots,
  type PlayerSlotKey,
} from "@/lib/tagging/playConfig";
import type { KickoffReturnSpots } from "@/lib/tagging/kickoffReturn";
import { kickoffSlotLabel } from "@/lib/tagging/kickoffReturn";
import type { KickoffRole } from "@/lib/tagging/kickoffRole";
import type { DefendingEnd } from "@/lib/tagging/defendingEnd";
import { isAdvancingTowardOpponent } from "@/lib/tagging/directionOfPlay";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

const KICKOFF_ROLE_OPTIONS = ["We kick", "We receive"] as const;

type KickoffTaggingPadProps = {
  draft: PlaylistData;
  onChange: (draft: PlaylistData) => void;
  kickoffSpots: KickoffReturnSpots;
  onKickoffSpotsChange: (spots: KickoffReturnSpots) => void;
  kickoffRole: KickoffRole;
  onKickoffRoleChange: (role: KickoffRole) => void;
  defendingEnd: DefendingEnd;
  onDefendingEndChange: (end: DefendingEnd) => void;
  usLabel: string;
  themLabel: string;
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

export function KickoffTaggingPad({
  draft,
  onChange,
  kickoffSpots,
  onKickoffSpotsChange,
  kickoffRole,
  onKickoffRoleChange,
  defendingEnd,
  onDefendingEndChange,
  usLabel,
  themLabel,
  activePlayerSlot,
  onActivePlayerSlotChange,
  gamePlays,
}: KickoffTaggingPadProps) {
  const allAlternates = getAlternateResultsForPlayType(draft.playType);
  const alternates =
    draft.result === Result.Touchback
      ? allAlternates.filter((r) => r !== Result.Touchback)
      : allAlternates.filter(
          (r) => r !== Result.Touchback && r !== Result.Return,
        );
  const visibleSlots = getVisiblePlayerSlots(draft.playType, draft.result);
  const showReturnSpots = draft.result === Result.Return;
  const activeSlot =
    activePlayerSlot && visibleSlots.includes(activePlayerSlot)
      ? activePlayerSlot
      : (visibleSlots[0] ?? null);

  const activeJersey = activeSlot
    ? getSlotValue(draft, activeSlot).jersey
    : "";

  const jerseyEntries = useMemo(
    () => (activeSlot ? buildJerseyGridRankings(gamePlays, activeSlot) : []),
    [activeSlot, gamePlays],
  );

  const advancing = isAdvancingTowardOpponent(draft, kickoffRole);

  return (
    <View style={styles.pad}>
      <View style={styles.roleRow}>
        <TapGrid
          options={KICKOFF_ROLE_OPTIONS}
          value={kickoffRole === "kick" ? "We kick" : "We receive"}
          onChange={(label) => {
            onKickoffRoleChange(label === "We kick" ? "kick" : "receive");
          }}
          columns={2}
          size="dense"
        />
      </View>

      <View style={styles.roleRow}>
        <DirectionOfPlayControl
          defendingEnd={defendingEnd}
          onChange={onDefendingEndChange}
          usLabel={usLabel}
          themLabel={themLabel}
          advancingTowardOpponent={advancing}
        />
      </View>

      <View style={styles.topRow}>
        <View style={styles.koBadge}>
          <Text style={styles.koBadgeText}>Kickoff</Text>
        </View>
        <View style={styles.resultWrap}>
          <TapGrid
            options={alternates}
            value={draft.result}
            onChange={(result) => {
              onChange(applyResultChange(draft, result));
              const slots = getVisiblePlayerSlots(draft.playType, result);
              onActivePlayerSlotChange(slots[0] ?? null);
            }}
            columns={3}
            size="dense"
          />
        </View>
      </View>

      {showReturnSpots ? (
        <View style={styles.section}>
          <KickoffReturnSpotsPanel
            spots={kickoffSpots}
            onChange={onKickoffSpotsChange}
            defendingEnd={defendingEnd}
            onTouchback={() => {
              onChange(applyResultChange(draft, Result.Touchback));
              onActivePlayerSlotChange("kicker");
            }}
          />
        </View>
      ) : draft.result === Result.Touchback ? (
        <View style={styles.touchbackNote}>
          <Text style={styles.touchbackText}>
            Touchback — no catch or return to tag
          </Text>
        </View>
      ) : null}

      <View style={styles.playerRow}>
        {visibleSlots.map((slot) => {
          const ref = getSlotValue(draft, slot);
          const active = activeSlot === slot;
          const label = kickoffSlotLabel(slot);
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
            slotLabel={kickoffSlotLabel(activeSlot)}
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
  roleRow: {
    backgroundColor: LAYOUT.colors.sectionBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LAYOUT.colors.sectionBorder,
    padding: LAYOUT.compactSectionPadding,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  koBadge: {
    backgroundColor: LAYOUT.colors.navy,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: LAYOUT.compactTapTarget,
    justifyContent: "center",
  },
  koBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  resultWrap: {
    flex: 1,
  },
  section: {
    backgroundColor: LAYOUT.colors.sectionBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LAYOUT.colors.sectionBorder,
    padding: LAYOUT.compactSectionPadding,
  },
  touchbackNote: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  touchbackText: {
    fontSize: 13,
    color: LAYOUT.colors.textMuted,
    fontStyle: "italic",
  },
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
