import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from "react-native";
import { useCallback, useState } from "react";
import { countQaLogEntries } from "@/lib/db/qaLog";
import { shareQaLogFile } from "@/lib/qa/export";
import { useFocusEffect } from "expo-router";

type QaLogExportButtonProps = {
  localGameId: string;
  slug: string;
  compact?: boolean;
};

export function QaLogExportButton({
  localGameId,
  slug,
  compact = false,
}: QaLogExportButtonProps) {
  const [count, setCount] = useState(0);
  const [exporting, setExporting] = useState(false);

  const refresh = useCallback(async () => {
    setCount(await countQaLogEntries(localGameId));
  }, [localGameId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function handleExport() {
    setExporting(true);
    try {
      const { filename, lineCount } = await shareQaLogFile(localGameId, slug);
      Alert.alert(
        "QA log ready",
        `${lineCount} entries · ${filename}\n\nAirDrop or save to Files, then on Mac:\nnpm run qa:replay -- docs/qa-sessions/${filename}`,
      );
    } catch (err) {
      Alert.alert(
        "Export failed",
        err instanceof Error ? err.message : "Could not export QA log.",
      );
    } finally {
      setExporting(false);
    }
  }

  if (count === 0 && compact) return null;

  return (
    <Pressable
      style={[styles.btn, compact && styles.btnCompact]}
      onPress={() => void handleExport()}
      disabled={exporting || count === 0}
    >
      {exporting ? (
        <ActivityIndicator size="small" color="#1e3a5f" />
      ) : (
        <Text style={[styles.text, compact && styles.textCompact]}>
          {compact ? `QA log (${count})` : `Export QA log · ${count} entries`}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: "#e0e7ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#a5b4fc",
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  btnCompact: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  text: {
    color: "#1e3a5f",
    fontSize: 14,
    fontWeight: "600",
  },
  textCompact: {
    fontSize: 12,
  },
});
