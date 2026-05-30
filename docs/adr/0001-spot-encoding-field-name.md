# ADR-0001: Rename `completion` to `spotEncoding`

**Status:** Accepted  
**Date:** 2026-05-30  
**Supersedes:** informal use of `PlaylistData.completion` in docs and code comments

---

## Context

### Two different “completion” concepts

| Concept | Where it lives | Examples |
|---------|----------------|-------|
| **Pass outcome** (caught vs not) | `result` | `Complete`, `Incomplete`, `Complete, TD`, `Sack` |
| **Spot-encoding string** (ball spots / play end) | Today: `PlaylistData.completion` | `catch:-5\|end:-25`, `recv:15\|end:-32`, `tackle:-31\|end:-23`, `foul:-42` |

Hudl’s playlist export header is literally **`COMPLETION`**, which reads like pass completion to anyone who knows football. Internal docs that say “derive from completion” are routinely misread as pass logic.

### What the spot string is (and is not)

- **Not** pass complete/incomplete — that is **`result` only**.
- **Optional** pipe-delimited auxiliary string for play-end and multi-spot chains.
- **Run / pass (today):** taggers mark **where the play ended** via `tackle:ballSpot|end:Y` (or `end:TD` / `end:SA`). We do **not** tag “caught at X, carried to Y” on complete passes. Total gain is `gainLoss` from snap spot → end spot.
- **Kick/punt returns:** taggers mark **catch/receive spot + return end** via `catch:|end:` or `recv:|end:` because return yards require both spots.
- **Interception returns:** use `catch:|end:` for the **live-ball return**, not for pass-completion geometry — same return pattern as kickoffs, not pass YAC.

**Future enhancement (out of scope):** yards-after-catch — e.g. caught at Opp 15, tackled at Opp 17. Would extend spot encoding or add fields; not tagged on iPad today.

### Hudl export provenance (verified 2026-05-30)

Inspected **`Snider v Warsaw.xlsx`** and **`Snider v East Noble.xlsx`** (team Hudl playlist exports):

| Property | Raw Hudl xlsx / 23-col CSV | HuddleStat 32-col playlist |
|----------|---------------------------|----------------------------|
| Column count | **23** | **32** |
| `COMPLETION` column | **Absent** | **Present** (column 32) |
| `QTR`, `PLAY TYPE`, `KICK YARDS`, … | **Absent** | **Present** (HuddleStat extensions) |
| Pass plays | `RESULT` = `Complete` / `Incomplete` only | Same; `spotEncoding` usually empty |
| Spot strings (`catch:\|end:`, …) | **Not in Hudl export** | Written by **iPad tagging** on save/export |

Repo fixture: `packages/shared/fixtures/maxpreps/snider-vs-warsaw-2025-08-22.playlist.csv` matches the 23-col Hudl shape (no `COMPLETION`).

### Three Hudl export surfaces (do not conflate)

| Export | Format | Granularity | “Completion” meaning |
|--------|--------|-------------|----------------------|
| **Playlist** (xlsx/csv) | 23-col raw Hudl | One row per **play** | **None** — no `COMPLETION` column |
| **HuddleStat playlist** | 32-col csv/json | One row per **play** | Column **`COMPLETION`** → internal **`spotEncoding`** (ball spots) |
| **MaxPreps stat upload** (`.txt`) | Pipe-delimited per **player** | Season/box **aggregates** | Column **`PassingComp`** = pass completions **count** (pairs with `PassingAtt`) |

MaxPreps `.txt` examples (Hudl → MaxPreps upload): `fixtures/maxpreps/snider-vs-warsaw-2025-08-22.hudl.txt`, `fixtures/maxpreps/snider-vs-east-noble-2025.hudl.txt`. These are **not** play logs — no `spotEncoding`, no play chain. Golden row **#94** Warsaw: `KickoffNum=5`, `KickoffYards=300`, `KickoffTouchbacks=5`, `FGMade=1`, `PATKickingMade=1`. Golden **#94** East Noble: `PuntNum=4`, `PuntYards=138`, `PuntInside20=2`.

**PassingComp** on jersey 14 (Warsaw QB) = **7** completions on **14** attempts — derived from play `result` values (`Complete`, …), not from the playlist `COMPLETION` / `spotEncoding` column.

**Conclusion:** `spotEncoding` is **first-class internal data** (SQLite, JSON, play chain, stats backfill). The name **`COMPLETION`** is a **CSV/export header** on HuddleStat’s 32-column interchange format — not something raw Hudl xlsx populates with `catch:|end:` tokens. Do not assume Hudl owns the semantics of our encoded strings.

### Pass UI (unchanged)

On **Pass** play type, result buttons are **`Complete`**, **`Incomplete`**, **`Complete, TD`**, etc. — no “pass” suffix (`PassPad` → `TapGrid` → `Result` enum strings). Play type already establishes context.

---

## Decision

1. **Canonical internal field name:** **`spotEncoding`** (`string | undefined` on `PlaylistData`).
2. **CSV/export boundary:** keep header **`COMPLETION`**; map `COMPLETION` ↔ `spotEncoding` in `hudlCsv.ts` / `toPlaylistDataRow` only.
3. **Pass terminology:** reserve “completion” for pass **`result`** values in prose when play type is not implied; never use “completion” for the spot string.
4. **Spot-encoding by play family:**

   | Play family | `spotEncoding` pattern | Tagger marks |
   |-------------|------------------------|--------------|
   | Kickoff return | `catch:X\|end:Y` | Catch spot + return end |
   | Punt return | `recv:X\|end:Y` | Receive spot + return end |
   | Run / pass (complete, sack, rush TD) | `tackle:LOS\|end:Y` (or `TD`/`SA`) | Snap spot + **play end only** |
   | Pass incomplete / tipped | *(empty)* | LOS unchanged; `gainLoss = 0` |
   | Punt downed, FG no-good | `end:Y`, `end:field`, `end:TB`, … | End spot only |
   | Penalty | `foul:Y` | Spot of foul |
   | Fumble / blocked kick | `fumble:…`, `recover:…` | Recovery chain |

5. **Implementation deferred:** this ADR accepts naming and doc rules; code/SQLite rename follows in a separate PR after doc sweep.

---

## Consequences

### Docs (done in same initiative as this ADR)

- Replace `completion` with `spotEncoding` in field-position, tagging spec, mapping docs, cursor rules.
- Retire phrasing “derive from completion”; use “parse `spotEncoding`” or “play end spot from `yardLine` + `gainLoss`”.
- Clarify §2.1: `catch:|end:` is **not** pass logic.

### Code (follow-up PR)

| Surface | Change |
|---------|--------|
| `playlistDataSchema` | `spotEncoding`; deprecate then remove `completion` |
| SQLite `plays` | `spot_encoding`; migrate from `completion` |
| JSON/JSONL fixtures | `"spotEncoding": "…"` |
| Encode/decode helpers | `*InCompletion` → `*SpotEncoding` |
| `PLAYLIST_DATA_HEADERS` | Header stays `COMPLETION`; comment maps to `spotEncoding` |

### Tests / fixtures to add (with implementation)

- One **32-col CSV** row with `COMPLETION=catch:-5|end:-25` for ingest regression (HuddleStat export shape, not raw Hudl xlsx).

---

## Alternatives rejected

| Name | Why rejected |
|------|--------------|
| `playSpots` | Implies structured object; collides with `KickoffReturnSpots`, `PuntReturnSpots` |
| `playEndDetail` | Too narrow (`foul:`, `fumble:` mid-chain) |
| `auxiliarySpots` | Awkward in stat rules |
| `playMetadata` | Too broad |
| `spotChain` | Collides with `playChain` |
| Keep `completion` + glossary | Ongoing confusion; fails coach/tagger/engineer clarity goal |

---

## Glossary

**Pass completion (result)** — Whether the pass was caught. Stored only in `result` (`Complete`, `Incomplete`, …). Not the spot string.

**Spot encoding (`spotEncoding`)** — Optional encoded string on a play row for ball spots and play-end locations. Parsed by `playChain` and special-teams modules. Hudl 32-col header: **`COMPLETION`**.

**Hudl 23-col export** — Raw playlist xlsx/csv from Hudl (Warsaw, East Noble). No `COMPLETION` column; pass outcomes in `RESULT` only.

**Hudl `COMPLETION` header** — Column 32 on HuddleStat 32-col export. Maps to `spotEncoding`. Not pass complete/incomplete.

---

## References

- `packages/shared/src/index.ts` — `PLAYLIST_DATA_HEADERS`, schema
- `packages/shared/src/pbp/hudlCsv.ts` — ingest mapping
- `packages/shared/fixtures/maxpreps/snider-vs-warsaw-2025-08-22.playlist.csv` — 23-col Hudl sample
- `docs/ipad-tagging-spec.md` §2.1 — ball spot chain
- `docs/field-position-model.md` — yard line model
