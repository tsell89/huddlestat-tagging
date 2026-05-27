import Constants from "expo-constants";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL ?? "";
const webBaseUrl = process.env.EXPO_PUBLIC_WEB_BASE_URL ?? "http://localhost:3000";

export function getConvexUrl(): string | null {
  return convexUrl || null;
}

export function getWebBaseUrl(): string {
  return webBaseUrl.replace(/\/$/, "");
}

export function getLiveGameUrl(slug: string): string {
  return `${getWebBaseUrl()}/game/${slug}`;
}

function isLocalConvexUrl(url: string): boolean {
  return (
    url.startsWith("http://") &&
    !url.includes(".convex.cloud") &&
    !url.includes(".convex.site")
  );
}

/** Shown in the sync bar so you can confirm Expo picked up .env */
export function getConvexUrlLabel(): string | null {
  if (!convexUrl) return null;
  try {
    return new URL(convexUrl).host;
  } catch {
    return convexUrl;
  }
}

/**
 * Physical iPad cannot use localhost for Convex, and local `npx convex dev`
 * over plain HTTP often cannot complete WebSocket sync from Expo Go.
 */
export function getDeviceSyncWarning(): string | null {
  if (!Constants.isDevice) return null;
  if (
    convexUrl.includes("127.0.0.1") ||
    convexUrl.includes("localhost")
  ) {
    return "127.0.0.1 is the iPad, not your Mac. Use a https://….convex.cloud dev URL in EXPO_PUBLIC_CONVEX_URL (see apps/mobile/.env.example).";
  }
  if (isLocalConvexUrl(convexUrl)) {
    return `Local Convex at ${getConvexUrlLabel() ?? "your Mac"} usually cannot sync from a physical iPad. Use a cloud dev URL (https://….convex.cloud) in EXPO_PUBLIC_CONVEX_URL.`;
  }
  return null;
}
