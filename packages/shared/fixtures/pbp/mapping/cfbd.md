# CFBD Play → PlaylistData

Mapper: `packages/shared/src/pbp/cfbdMapper.ts`. Offline ingest: `scripts/ingest-cfbd.mjs`.

## CFBD fields (typical)

| CFBD | PlaylistData | Notes |
|------|----------------|-------|
| `playNumber` / sort order | `playNumber` | 1-based in fixture |
| `offense` vs `meta.teamOffense` | `odk` | O if our team has ball |
| `down` | `down` | |
| `distance` | `distance` | |
| `yardsToGoal` | `yardLine` | via 0–100 → `fieldPositionToHudl` |
| `yardsGained` | `gainLoss` | sign from offense perspective |
| `playType` + `playText` | `playType`, `result` | lookup table |
| — | `spotEncoding` | synthesized per [field-position-model.md](../../../../../docs/field-position-model.md) |

## Play type mapping (subset)

| CFBD `playType` (contains) | `playType` | `result` |
|----------------------------|------------|----------|
| Kickoff | KO / KO Rec | Return / Touchback |
| Rush | Run | Rush |
| Pass Reception / Pass | Pass | Complete |
| Pass Incompletion | Pass | Incomplete |
| Sack | Pass | Sack |
| Penalty | Run or Pass | Penalty + `foul:{hudl}` |
| Field Goal Good | FG | Good |
| Field Goal Missed | FG | No Good + `end:field` or `end:TB` |
| Punt | Punt / Punt Rec | Downed / Return / Touchback |

## Penalties

- Holding / false start: `spotEncoding: foul:{hudlYardLine}` at spot of foul when parseable.
- Offset/declined: mark `expectations.jsonl` `review: true`; may `skipReplay` on that line.

## Rules tag

`meta.rules`: `NCAA` (college). HS touchback @ Own 20 still used in chain unless NFL fixture.
