import { StyleSheet, Text, View } from "react-native";
import { FieldPositionSlider } from "@/components/tagging/FieldPositionSlider";
import {
  fieldRatioToYardLine,
  fieldYardLineToRatio,
  formatFieldPosition,
} from "@/lib/tagging/kickoffReturn";
import {
  computeTackleGainLoss,
  formatTackleEndDisplay,
  type TackleEnd,
} from "@/lib/tagging/tackleSpot";
import type { YardLine } from "@huddlestat/shared";
import { ODK, type PlaylistData } from "@huddlestat/shared";
import type { DefendingEnd } from "@/lib/tagging/defendingEnd";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type TackleSpotPanelProps = {
  ballSpot: YardLine;
  end: TackleEnd;
  onChange: (end: TackleEnd) => void;
  /** Rush TD / Complete TD — Touchdown end button on the right */
  touchdownMode: boolean;
  defendingEnd?: DefendingEnd;
  /** Possession ODK — D negates axis gain for display + chain. */
  odk?: PlaylistData["odk"];
};

export function TackleSpotPanel({
  ballSpot,
  end,
  onChange,
  touchdownMode,
  defendingEnd = "left",
  odk = ODK.Offense,
}: TackleSpotPanelProps) {
  const isTd = end.kind === "touchdown";
  const isSafety = end.kind === "safety";
  const hideTrack = isTd || isSafety;
  const sliderYardLine =
    end.kind === "yardline" ? end.yardLine : ballSpot;
  const gainLoss = computeTackleGainLoss(ballSpot, end, odk);

  const safetyAction = {
    label: "Safety",
    selected: isSafety,
    onPress: () =>
      onChange(
        isSafety
          ? { kind: "yardline", yardLine: ballSpot }
          : { kind: "safety" },
      ),
  };

  const touchdownAction = {
    label: "Touchdown",
    selected: isTd,
    onPress: () =>
      onChange(
        isTd
          ? { kind: "yardline", yardLine: ballSpot }
          : { kind: "touchdown" },
      ),
  };

  return (
    <View style={styles.panel}>
      <FieldPositionSlider
        label="Tackled at"
        value={sliderYardLine}
        onChange={(yardLine) => onChange({ kind: "yardline", yardLine })}
        ratioForValue={fieldYardLineToRatio}
        valueForRatio={fieldRatioToYardLine}
        leftTick="−1"
        centerTick="50"
        rightTick="+1"
        leftAction={touchdownMode ? undefined : safetyAction}
        rightAction={touchdownMode ? touchdownAction : undefined}
        hideTrack={hideTrack}
        displayValue={formatTackleEndDisplay(end)}
        defendingEnd={defendingEnd}
      />

      <View style={styles.computedRow}>
        <Text style={styles.computedLabel}>Gain / loss</Text>
        <Text style={styles.computedValue}>
          {gainLoss > 0 ? `+${gainLoss}` : gainLoss}
        </Text>
      </View>

      <Text style={styles.fromSpot}>
        From {formatFieldPosition(ballSpot)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 6,
  },
  computedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: LAYOUT.colors.navyLight,
  },
  computedLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: LAYOUT.colors.navy,
    textTransform: "uppercase",
  },
  computedValue: {
    fontSize: 22,
    fontWeight: "800",
    color: LAYOUT.colors.navy,
    fontVariant: ["tabular-nums"],
  },
  fromSpot: {
    fontSize: 11,
    color: LAYOUT.colors.placeholderText,
  },
});
