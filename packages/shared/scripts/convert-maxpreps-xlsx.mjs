#!/usr/bin/env node
/**
 * Convert Hudl PlaylistData xlsx (32 col) to committed JSONL fixtures.
 * Usage: node scripts/convert-maxpreps-xlsx.mjs <xlsxPath> <outJsonlPath> [teamCode]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { rowToPlaylistData } = await import(
  join(root, "src/pbp/hudlCsv.ts")
);
const { PLAYLIST_DATA_HEADERS } = await import(join(root, "src/index.ts"));

const RESULT_ALIASES = {
  "Out of Bounds": "Downed",
  Block: "Blocked",
  Scramble: "Rush",
};

const PLAY_TYPE_ALIASES = {
  "2 Pt. Defend": "",
  "FG Block": "FG",
};

function normalizePlayType(raw) {
  const trimmed = raw.trim();
  if (PLAY_TYPE_ALIASES[trimmed] !== undefined) return PLAY_TYPE_ALIASES[trimmed];
  return trimmed;
}

function normalizeResult(raw) {
  const trimmed = raw.trim();
  if (RESULT_ALIASES[trimmed]) return RESULT_ALIASES[trimmed];
  if (trimmed.startsWith("Fumble")) return "Fumble";
  return trimmed;
}

function colToIdx(col) {
  let n = 0;
  for (const c of col) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

function parseXlsx(path) {
  const py = `
import zipfile, xml.etree.ElementTree as ET, re, json, sys
path = sys.argv[1]
with zipfile.ZipFile(path) as z:
    shared = ET.fromstring(z.read('xl/sharedStrings.xml'))
    strings = []
    for si in shared.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
        texts = si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
        strings.append(''.join(t.text or '' for t in texts))
    sheet = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    parsed = []
    max_col = 0
    for row in sheet.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
        row_num = int(row.get('r', '0'))
        cells = {}
        for c in row.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
            ref = c.get('r','')
            m = re.match(r'([A-Z]+)(\\d+)', ref)
            if not m: continue
            ci = 0
            for ch in m.group(1):
                ci = ci * 26 + (ord(ch) - ord('A') + 1)
            ci -= 1
            max_col = max(max_col, ci)
            t = c.get('t')
            v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
            val = v.text if v is not None else ''
            if t == 's':
                val = strings[int(val)]
            cells[ci] = val
        parsed.append((row_num, cells))
    rows = []
    for _, cells in sorted(parsed, key=lambda x: x[0]):
        row = [cells.get(i, '') for i in range(max_col + 1)]
        if any(row):
            rows.append(row)
    print(json.dumps(rows))
`;
  const out = execFileSync("python3", ["-c", py, path], { encoding: "utf8" });
  return JSON.parse(out);
}

function cellsForRow(header, row) {
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const cells = PLAYLIST_DATA_HEADERS.map((h) => {
    const i = idx[h];
    if (i === undefined) return "";
    return row[i] ?? "";
  });
  return cells;
}

const [xlsxPath, outPath, teamCode = "SHS"] = process.argv.slice(2);
if (!xlsxPath || !outPath) {
  console.error(
    "Usage: convert-maxpreps-xlsx.mjs <xlsxPath> <outJsonlPath> [teamCode]",
  );
  process.exit(1);
}

const rows = parseXlsx(xlsxPath);
const header = rows[0];
const plays = rows.slice(1).map((row) => {
  const cells = cellsForRow(header, row);
  const resultIdx = PLAYLIST_DATA_HEADERS.indexOf("RESULT");
  const hashIdx = PLAYLIST_DATA_HEADERS.indexOf("HASH");
  const playTypeIdx = PLAYLIST_DATA_HEADERS.indexOf("PLAY TYPE");
  const rawResult = cells[resultIdx]?.trim() ?? "";
  cells[resultIdx] = normalizeResult(rawResult);
  cells[playTypeIdx] = normalizePlayType(cells[playTypeIdx]?.trim() ?? "");
  if (!cells[hashIdx]?.trim()) cells[hashIdx] = "M";
  return rowToPlaylistData(cells, teamCode);
});

writeFileSync(outPath, plays.map((p) => JSON.stringify(p)).join("\n") + "\n");
console.log(`Wrote ${plays.length} plays to ${outPath}`);
