import { StyleSheet, View } from "react-native";
import { TackleFieldSlider } from "@/components/tagging/TackleFieldSlider";
import type { TackleEnd } from "@/lib/tagging/tackleSpot";
import { ODK, type PlaylistData, type YardLine } from "@huddlestat/shared";

type TackleSpotPanelProps = {
  ballSpot: YardLine;
  end: TackleEnd;
  onChange: (end: TackleEnd) => void;
  allowTouchdown?: boolean;
  odk?: PlaylistData["odk"];
  /** @deprecated Safety/TD via slider extremes — kept for RunPad/PassPad API */
  touchdownMode?: boolean;
};

export function TackleSpotPanel({
  ballSpot,
  end,
  onChange,
  allowTouchdown,
  odk = ODK.Offense,
}: TackleSpotPanelProps) {
  return (
    <View style={styles.panel}>
      <TackleFieldSlider
        ballSpot={ballSpot}
        end={end}
        onChange={onChange}
        allowTouchdown={allowTouchdown}
        odk={odk}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 4,
  },
});
