import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

/** Extra scroll slack so Start tagging stays above the iPad keyboard. */
const KEYBOARD_SCROLL_PADDING = 280;

export default function NewGameScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const opponentRef = useRef<TextInputType>(null);
  const [teamCode, setTeamCode] = useState("SHS");
  const [opponent, setOpponent] = useState("");
  const [saving, setSaving] = useState(false);

  function scrollSubmitIntoView() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      scrollSubmitIntoView,
    );
    return () => show.remove();
  }, []);

  async function handleCreate() {
    if (!teamCode.trim() || !opponent.trim()) return;
    Keyboard.dismiss();
    setSaving(true);
    try {
      const game = await createLocalGame(teamCode, opponent);
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
            paddingTop: insets.top + 48,
            paddingBottom: insets.bottom + KEYBOARD_SCROLL_PADDING,
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

        <View style={styles.card}>
          <Text style={styles.title}>New game</Text>
          <Text style={styles.subtitle}>
            Saved locally first. Stats publish to the web at halftime, after
            scoring plays, and at the final whistle.
          </Text>

          <View style={styles.fieldRow}>
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

            <View style={styles.field}>
              <Text style={styles.label}>Opponent</Text>
              <TextInput
                ref={opponentRef}
                style={styles.input}
                value={opponent}
                onChangeText={setOpponent}
                placeholder="Rival High"
                returnKeyType="done"
                onFocus={scrollSubmitIntoView}
                onSubmitEditing={() => void handleCreate()}
              />
            </View>
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
    justifyContent: "flex-start",
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
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 20,
    marginTop: 8,
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
  fieldRow: {
    flexDirection: "row",
    gap: 16,
  },
  field: {
    flex: 1,
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
