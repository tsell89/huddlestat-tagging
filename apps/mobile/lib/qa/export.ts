import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { exportQaLogJsonl } from "@/lib/db/qaLog";

function qaExportFilename(slug: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const safeSlug = slug.replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 40);
  return `qa-${date}-${safeSlug}.jsonl`;
}

/** Write JSONL to cache and open iOS share sheet (AirDrop, Files, etc.). */
export async function shareQaLogFile(
  localGameId: string,
  slug: string,
): Promise<{ filename: string; lineCount: number }> {
  const jsonl = await exportQaLogJsonl(localGameId);
  const lines = jsonl.trim() ? jsonl.trim().split("\n").length : 0;
  if (lines === 0) {
    throw new Error("No QA log entries yet — tag and save at least one play.");
  }

  const filename = qaExportFilename(slug);
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error("Device cache directory is unavailable.");
  }
  const uri = `${cacheDir}${filename}`;
  await FileSystem.writeAsStringAsync(uri, jsonl, { encoding: "utf8" });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(uri, {
    mimeType: "application/x-ndjson",
    dialogTitle: "Export QA log",
    UTI: "public.json",
  });

  return { filename, lineCount: lines };
}
