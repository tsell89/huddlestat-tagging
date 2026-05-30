# Hudl CSV → PlaylistData

Column order matches `PLAYLIST_DATA_HEADERS` in `packages/shared/src/index.ts`.

## Export shapes

| Shape | Columns | `COMPLETION` | Source |
|-------|---------|--------------|--------|
| **Raw Hudl playlist** (xlsx/csv) | **23** | **Absent** | Hudl “Export Data” — Warsaw / East Noble xlsx verified 2026-05-30 |
| **HuddleStat 32-col playlist** | **32** | **Present** (col 32) | iPad commit / ingest / sync interchange |

Raw Hudl exports carry pass outcomes in **`RESULT`** only (`Complete`, `Incomplete`, …). Encoded spot strings (`catch:\|end:`, `tackle:\|end:`, …) are **written by iPad tagging** and appear on HuddleStat 32-col export — not in raw 23-col Hudl files.

See [ADR-0001](../../../../../docs/adr/0001-spot-encoding-field-name.md).

| CSV column | Field | Notes |
|------------|-------|-------|
| PLAY # | `playNumber` | int |
| QTR | `quarter` | 1–4 regulation, 5 = OT (HuddleStat extension; not in raw Hudl export) |
| ODK | `odk` | O / D / K |
| YARD LN | `yardLine` | signed Hudl int |
| DN | `down` | 0–4 |
| DIST | `distance` | int |
| HASH | `hash` | L / M / R |
| GN/LS | `gainLoss` | int |
| PASSER_* | `passer` | jersey + name |
| RECEIVER_* | `receiver` | |
| RUSHER_* | `rusher` | |
| RESULT | `result` | enum or empty |
| TEAM | `team` | |
| TACKLER1_* | `tackler1` | |
| TACKLER2_* | `tackler2` | |
| RECOVERED BY_* | `recoveredBy` | |
| RET YARDS | `returnYards` | optional int |
| RETURNER_* | `returner` | |
| PLAY TYPE | `playType` | enum or empty |
| KICKER_* | `kicker` | |
| KICK YARDS | `kickYards` | optional |
| INTERCEPTED BY_* | `interceptedBy` | |
| COMPLETION | `spotEncoding` | HuddleStat 32-col only. Not pass complete/incomplete. Kick return `catch:\|end:`, punt `recv:\|end:`, run/pass `tackle:\|end:`, etc. |

Ingest: `node packages/shared/scripts/ingest-hudl-csv.mjs <csv> <gameId> <teamCode>`.
