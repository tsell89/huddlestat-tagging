import {
  PLAYLIST_DATA_HEADERS,
  toPlaylistDataRow,
  yardLineForHudlExport,
  type PlaylistData,
} from "@huddlestat/shared";

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Hudl 32-col file. Yard lines are flipped for defense and kickoff receive at export. */
export function serializeBrowserHudlCsv(plays: PlaylistData[]): string {
  const header = PLAYLIST_DATA_HEADERS.join(",");
  const rows = plays.map((play) =>
    toPlaylistDataRow({ ...play, yardLine: yardLineForHudlExport(play) })
      .map(escapeCsvCell)
      .join(","),
  );
  return [header, ...rows].join("\n");
}
