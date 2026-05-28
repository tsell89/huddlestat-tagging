# Hudl CSV → PlaylistData

Column order matches `PLAYLIST_DATA_HEADERS` in `packages/shared/src/index.ts`.

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
| COMPLETION | `completion` | kickoff `catch:\|end:`, punt `recv:\|end:`, etc. |

Ingest: `node packages/shared/scripts/ingest-hudl-csv.mjs <csv> <gameId> <teamCode>`.
