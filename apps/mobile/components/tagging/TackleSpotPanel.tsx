import { StyleSheet, View } from "react-native";
import { TackleFieldSlider } from "@/components/tagging/TackleFieldSlider";
import type { TackleEnd } from "@/lib/tagging/tackleSpot";
import type { YardLine } from "@huddlestat/shared";

type TackleSpotPanelProps = {
  ballSpot: YardLine;
  end: TackleEnd;
  onChange: (end: TackleEnd) => void;
  allowTouchdown?: boolean;
  /** @deprecated Safety/TD via slider extremes — kept for RunPad/PassPad API */
  touchdownMode?: boolean;
};

export function TackleSpotPanel({
  ballSpot,
  end,
  onChange,
  allowTouchdown,
}: TackleSpotPanelProps) {
  return (
    <View style={styles.panel}>
      <TackleFieldSlider
        ballSpot={ballSpot}
        end={end}
        onChange={onChange}
        allowTouchdown={allowTouchdown}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 4,
  },
});
