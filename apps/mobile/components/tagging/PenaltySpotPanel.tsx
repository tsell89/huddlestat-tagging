import { StyleSheet, Text, View } from "react-native";
import { FieldPositionSlider } from "@/components/tagging/FieldPositionSlider";
import {
  HOLDING_YARDS,
  foulRatioToYardLine,
  foulYardLineToRatio,
} from "@/lib/tagging/penaltySpot";
import type { YardLine } from "@huddlestat/shared";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type PenaltySpotPanelProps = {
  foulSpot: YardLine;
  onChange: (foulSpot: YardLine) => void;
};

export function PenaltySpotPanel({ foulSpot, onChange }: PenaltySpotPanelProps) {
  return (
    <View style={styles.panel}>
      <FieldPositionSlider
        label="Spot of foul"
        value={foulSpot}
        onChange={onChange}
        ratioForValue={foulYardLineToRatio}
        valueForRatio={foulRatioToYardLine}
        leftTick="−1"
        centerTick="50"
        rightTick="+1"
      />
      <Text style={styles.note}>
        Holding — replay same down, −{HOLDING_YARDS} yd from foul spot
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 6 },
  note: {
    fontSize: 12,
    color: LAYOUT.colors.textMuted,
    fontStyle: "italic",
    paddingHorizontal: 4,
  },
});
