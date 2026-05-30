import {
  PLAYLIST_DATA_HEADERS,
  emptyPlayerRef,
  playlistDataSchema,
  type PlaylistData,
} from "../index.js";

function playerRef(
  jersey: string | undefined,
  name: string | undefined,
): { jersey: string; name: string } {
  return { jersey: jersey ?? "", name: name ?? "" };
}

/** Parse one CSV row (already split; handles quoted fields minimally). */
export function rowToPlaylistData(
  cells: string[],
  team: string,
): PlaylistData {
  const map = Object.fromEntries(
    PLAYLIST_DATA_HEADERS.map((h, i) => [h, cells[i] ?? ""]),
  );

  const returnYardsRaw = map["RET YARDS"]?.trim();
  const kickYardsRaw = map["KICK YARDS"]?.trim();
  const spotEncodingRaw = map.COMPLETION?.trim();
  const quarterRaw = map.QTR?.trim();

  return playlistDataSchema.parse({
    playNumber: Number(map["PLAY #"]),
    quarter:
      quarterRaw !== "" && quarterRaw !== undefined
        ? Number(quarterRaw)
        : 1,
    odk: map.ODK,
    yardLine: Number(map["YARD LN"]),
    down: Number(map.DN),
    distance: Number(map.DIST),
    hash: map.HASH,
    gainLoss: Number(map["GN/LS"]),
    passer: playerRef(map.PASSER_Jersey, map.PASSER_Name),
    receiver: playerRef(map.RECEIVER_Jersey, map.RECEIVER_Name),
    rusher: playerRef(map.RUSHER_Jersey, map.RUSHER_Name),
    result: map.RESULT || "",
    team: map.TEAM || team,
    tackler1: playerRef(map.TACKLER1_Jersey, map.TACKLER1_Name),
    tackler2: playerRef(map.TACKLER2_Jersey, map.TACKLER2_Name),
    recoveredBy: playerRef(map["RECOVERED BY_Jersey"], map["RECOVERED BY_Name"]),
    returnYards:
      returnYardsRaw !== "" && returnYardsRaw !== undefined
        ? Number(returnYardsRaw)
        : undefined,
    returner: playerRef(map.RETURNER_Jersey, map.RETURNER_Name),
    playType: map["PLAY TYPE"] || "",
    kicker: playerRef(map.KICKER_Jersey, map.KICKER_Name),
    kickYards:
      kickYardsRaw !== "" && kickYardsRaw !== undefined
        ? Number(kickYardsRaw)
        : undefined,
    interceptedBy: playerRef(
      map["INTERCEPTED BY_Jersey"],
      map["INTERCEPTED BY_Name"],
    ),
    spotEncoding: spotEncodingRaw || undefined,
  });
}

/** Simple CSV line split (no embedded commas in quoted fields for Hudl exports). */
export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  return cells;
}

export function parseHudlCsv(text: string, team: string): PlaylistData[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  let start = 0;
  const firstCells = parseCsvLine(lines[0]!);
  if (firstCells[0] === "PLAY #") start = 1;

  return lines.slice(start).map((line) => {
    const cells = parseCsvLine(line);
    return rowToPlaylistData(cells, team);
  });
}
