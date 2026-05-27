import { Stack } from "expo-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useEffect } from "react";
import * as ScreenOrientation from "expo-screen-orientation";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { DbProvider } from "@/context/db-context";
import { SyncProvider } from "@/context/sync-context";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

function LoadingShell() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#1e3a5f" />
      <Text style={styles.loadingText}>Loading local database…</Text>
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE,
    );
  }, []);

  const stack = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="game/new" />
      <Stack.Screen name="game/[id]" />
    </Stack>
  );

  const inner = (
    <DbProvider fallback={<LoadingShell />}>
      <SyncProvider client={convex}>{stack}</SyncProvider>
    </DbProvider>
  );

  if (!convex) {
    return inner;
  }

  return <ConvexProvider client={convex}>{inner}</ConvexProvider>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#64748b",
  },
});
