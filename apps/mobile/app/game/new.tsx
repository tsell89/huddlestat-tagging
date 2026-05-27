import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInput as TextInputType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createLocalGame } from "@/lib/db/games";
import { registerGameForSync } from "@/lib/sync/engine";
import { useSync } from "@/context/sync-context";

export default function NewGameScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const cardTopY = useRef(0);
  const opponentFieldY = useRef(0);
  const opponentRef = useRef<TextInputType>(null);
  const [teamCode, setTeamCode] = useState("SHS");
  const [opponent, setOpponent] = useState("");
  const [saving, setSaving] = useState(false);
  const { refreshCounts, pushStats } = useSync();

  function scrollOpponentIntoView() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, cardTopY.current + opponentFieldY.current - 32),
        animated: true,
      });
    });
  }

  async function handleCreate() {
    if (!teamCode.trim() || !opponent.trim()) return;
    Keyboard.dismiss();
    setSaving(true);
    try {
      const game = await createLocalGame(teamCode, opponent);
      await registerGameForSync(game.id);
      await refreshCounts();
      void pushStats().catch(() => undefined);
      router.replace(`/game/${game.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.top}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Pressable onPress={() => router.replace("/")} style={styles.back}>
          <Text style={styles.backText}>← Games</Text>
        </Pressable>

        <View
          style={styles.card}
          onLayout={(e) => {
            cardTopY.current = e.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.title}>New game</Text>
          <Text style={styles.subtitle}>
            Saved locally first. Push stats when online to update the live web
            page.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Team code</Text>
            <TextInput
              style={styles.input}
              value={teamCode}
              onChangeText={setTeamCode}
              placeholder="SHS"
              autoCapitalize="characters"
              returnKeyType="next"
              onSubmitEditing={() => opponentRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View
            style={styles.field}
            onLayout={(e) => {
              opponentFieldY.current = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.label}>Opponent</Text>
            <TextInput
              ref={opponentRef}
              style={styles.input}
              value={opponent}
              onChangeText={setOpponent}
              placeholder="Rival High"
              returnKeyType="done"
              onFocus={scrollOpponentIntoView}
              onSubmitEditing={() => void handleCreate()}
            />
          </View>

          <Pressable
            style={[styles.createBtn, saving && styles.createBtnDisabled]}
            onPress={() => void handleCreate()}
            disabled={saving || !opponent.trim()}
          >
            <Text style={styles.createBtnText}>
              {saving ? "Creating…" : "Start tagging"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 40,
    minHeight: "100%",
  },
  back: {
    position: "absolute",
    top: 0,
    left: 40,
    zIndex: 1,
    paddingVertical: 8,
  },
  backText: {
    fontSize: 16,
    color: "#3b82f6",
    fontWeight: "500",
  },
  card: {
    alignSelf: "flex-start",
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 20,
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    lineHeight: 24,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    backgroundColor: "#fff",
  },
  createBtn: {
    backgroundColor: "#1e3a5f",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  createBtnDisabled: {
    opacity: 0.6,
  },
  createBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
