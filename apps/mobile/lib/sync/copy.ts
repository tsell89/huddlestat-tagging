/** User-facing sync status (never say "mutation") */
export function playsToSyncLabel(count: number): string {
  if (count === 0) return "All plays synced";
  return `${count} play${count === 1 ? "" : "s"} to sync`;
}

export function playsToSyncHint(count: number): string {
  if (count === 0) return "";
  return `${count} play${count === 1 ? "" : "s"} waiting to sync`;
}
