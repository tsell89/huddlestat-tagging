import { Pressable, StyleSheet, Text, View } from "react-native";
import { PlayType, type PlaylistData } from "@huddlestat/shared";
import {
  OFFENSE_PLAY_TYPES,
  getPlayTypeTapSizes,
  type OffensePlayType,
  type PlayTypeTapSize,
} from "@/lib/tagging/playConfig";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type PlayTypeRowProps = {
  draft: PlaylistData;
  onChange: (playType: OffensePlayType) => void;
  /** Compact strip when Run or Pass body is active */
  compact?: boolean;
};

const TAP_HEIGHT: Record<PlayTypeTapSize, number> = {
  large: LAYOUT.minTapTarget,
  medium: LAYOUT.compactTapTarget,
  small: 36,
  tiny: 28,
};

const TAP_FONT: Record<PlayTypeTapSize, number> = {
  large: 14,
  medium: 13,
  small: 12,
  tiny: 11,
};

const PLAY_TYPE_LABELS: Record<OffensePlayType, string> = {
  [PlayType.Run]: "Run",
  [PlayType.Pass]: "Pass",
  [PlayType.Punt]: "Punt",
  [PlayType.FieldGoal]: "FG",
};

function scaledSize(
  size: PlayTypeTapSize,
  compact: boolean,
): PlayTypeTapSize {
  if (!compact) return size;
  if (size === "large") return "medium";
  if (size === "medium") return "small";
  return "tiny";
}

export function PlayTypeRow({ draft, onChange, compact = false }: PlayTypeRowProps) {
  const sizes = getPlayTypeTapSizes(draft.down, draft.yardLine, draft.distance);
  const activeType = draft.playType as OffensePlayType | "";
  const isRunOrPass =
    activeType === PlayType.Run || activeType === PlayType.Pass;
  const rowCompact = compact || isRunOrPass;

  return (
    <View style={[styles.row, rowCompact && styles.rowCompact]}>
      {OFFENSE_PLAY_TYPES.map((playType) => {
        // Chain lands on Punt Rec after our 4th-down punt (Script E); highlight Punt.
        const selected =
          activeType === playType ||
          (playType === PlayType.Punt &&
            draft.playType === PlayType.PuntReceive);
        const size = scaledSize(sizes[playType], rowCompact);
        const height = TAP_HEIGHT[size];
        const fontSize = TAP_FONT[size];
        const muted = size === "tiny" && !selected;

        return (
          <Pressable
            key={playType}
            style={[
              styles.cell,
              { minHeight: height, flex: size === "large" ? 1.2 : 1 },
              selected && styles.cellSelected,
              muted && styles.cellMuted,
            ]}
            onPress={() => onChange(playType)}
          >
            <Text
              style={[
                styles.cellText,
                { fontSize },
                selected && styles.cellTextSelected,
                muted && styles.cellTextMuted,
              ]}
              numberOfLines={1}
            >
              {PLAY_TYPE_LABELS[playType]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
  },
  rowCompact: {
    gap: 4,
  },
  cell: {
    flex: 1,
    backgroundColor: LAYOUT.colors.placeholderBg,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: LAYOUT.colors.sectionBorder,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  cellSelected: {
    backgroundColor: LAYOUT.colors.navy,
    borderColor: LAYOUT.colors.navy,
  },
  cellMuted: {
    opacity: 0.75,
  },
  cellText: {
    fontWeight: "800",
    color: LAYOUT.colors.textPrimary,
    textAlign: "center",
  },
  cellTextSelected: {
    color: "#fff",
  },
  cellTextMuted: {
    fontWeight: "600",
    color: LAYOUT.colors.textMuted,
  },
});
