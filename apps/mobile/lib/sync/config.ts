import Constants from "expo-constants";

const syncApiUrl = process.env.EXPO_PUBLIC_SYNC_API_URL ?? "";
const syncApiKey = process.env.EXPO_PUBLIC_SYNC_API_KEY ?? "";
const webBaseUrl = process.env.EXPO_PUBLIC_WEB_BASE_URL ?? "http://localhost:3000";

export function getSyncApiUrl(): string | null {
  if (!syncApiUrl) return null;
  return syncApiUrl.replace(/\/$/, "");
}

export function getSyncApiKey(): string | null {
  return syncApiKey || null;
}

export function getWebBaseUrl(): string {
  return webBaseUrl.replace(/\/$/, "");
}

export function getLiveGameUrl(slug: string): string {
  return `${getWebBaseUrl()}/game/${slug}`;
}

/** Shown in the sync bar so you can confirm Expo picked up .env */
export function getSyncApiUrlLabel(): string | null {
  if (!syncApiUrl) return null;
  try {
    return new URL(syncApiUrl).host;
  } catch {
    return syncApiUrl;
  }
}

/**
 * Physical iPad cannot reach localhost on the dev machine.
 */
export function getDeviceSyncWarning(): string | null {
  if (!Constants.isDevice) return null;
  if (!syncApiUrl) return null;

  if (
    syncApiUrl.includes("127.0.0.1") ||
    syncApiUrl.includes("localhost")
  ) {
    return "127.0.0.1 is the iPad, not your Mac. Set EXPO_PUBLIC_SYNC_API_URL to http://YOUR_MAC_LAN_IP:3001 (see apps/mobile/.env.example).";
  }

  return null;
}

export function isCloudSyncConfigured(): boolean {
  return Boolean(getSyncApiUrl() && getSyncApiKey());
}
