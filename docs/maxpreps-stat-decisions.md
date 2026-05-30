# MaxPreps stat decisions

Living decision log for HuddleStat → MaxPreps export semantics. **Product rules only** — implementation lives in separate chats.

**Related:** `packages/shared/src/maxPrepsBoxScore.ts` · `packages/shared/src/defensiveCredits.ts` · [field-position-model.md](./field-position-model.md) · [play-by-play-test-corpus.md](./play-by-play-test-corpus.md)

---

## Section A — shipped (do not re-decide)

Merged in huddlestat-tagging + huddlestat:

- `packages/shared/src/defensiveCredits.ts` — shared tackle / TFL / sack rules (A1–A5)
- `applyDefensiveCreditsToMap()` used by both `maxPrepsBoxScore.ts` and platform `seasonRollup.ts`
- Tackles: T1-only solo; T2-only solo; both → T1 solo + T2 assist; TFL+two → both assist + TFL +1 each
- Sacks: 0.5 each when two tacklers; full sack to one tackler when solo
- A4 sack yards: NOT on defensive rows — full loss credited to sacked player's rushing stats (passer fallback for legacy rows); no `SacksYardsLost` split on defenders
- Season rollups: `soloTackles`, `assistTackles`, `tackles` (= solo + assist) on player season stats
- MaxPreps export must not hard-fail on rollup/export mismatch (A7)

**Still open from A:** MaxPreps `Sacks` column may be integer-only in Hudl fixtures — 0.5 sacks may need serializer/import validation.

---

## Section B — context (locked, do not re-decide)

- **B1:** `official_saturday` `plays[]` = full 32-col HuddleStat iPad `PlaylistData` only. No Hudl `PlaylistData` re-import as commit input.
- **B2:** `PLAY TYPE`, `KICKER`, `KICK YARDS`, etc. are expected on committed plays (iPad source).
- MaxPreps `.txt` export = satellite utility (Hudl-parity upload opportunity), not a paid product pillar.
- HuddleStat play log = foundation; don't let MaxPreps/Hudl stat semantics drive our model.

---

## Section B — kicking & punting (B3–B11)

### B3. Punt yards when `KICK YARDS` is empty

**Decision:** Committed iPad punts **must** have explicit `kickYards` on save. Do not treat `Math.abs(gainLoss)` as the primary rule for new commits.

**Rules:**

1. **Primary:** use `play.kickYards` when present (iPad sets this for **Downed** and **Return** in `applyPuntSpotsToDraft`; fix punt touchback to populate kick distance to end zone).
2. **Backfill (shared):** if `kickYards` is missing, derive **play end spot** from **`spotEncoding`** when present, else from **`yardLine` + `gainLoss`** (see [ADR-0001](./adr/0001-spot-encoding-field-name.md)):
   - **Downed / fair catch:** `yardsAdvanced(yardLine, endSpot)` or `hudlToFieldPosition(yardLine) + kickYards`
   - **Return:** kick distance = line → catch spot; separate from return yards
   - **Touchback:** full distance from line of scrimmage to opponent goal on 0–100 axis (e.g. ball at 55 → **45** yards)
3. **Legacy fallback only:** `Math.abs(gainLoss)` when steps 1–2 cannot run and `gainLoss ≠ 0`.
4. **Excluded from all punter stats** (no `PuntNum`, `PuntYards`, `PuntLong`, `PuntInside20`): `result === Blocked`; fumble on punt pad before kick (including **bad snap = fumble**); tackle behind line / never kicked.

**Tests:** synthetic punt with populated `kickYards` wins over conflicting `gainLoss`; blocked/fumble punt rows do not increment punter totals.

---

### B4. `PuntInside20`

**Decision:** Derive from **play end spot** on the 0–100 axis — no tagging UI field.

**Rules:**

1. **Inside the 20 (HuddleStat / MaxPreps export):** field position **81–100** (opponent goal = 100). Position **80** (on the 20-yard line) does **not** count.
2. **Play end spot:** parse **`spotEncoding`** when present (`end:…`, `recv:…|end:…`, etc.); otherwise `endPosition = hudlToFieldPosition(yardLine) + kickYards`, and if `returnYards` is set on the punt row add `returnYards` (return end for dead-ball spot).
3. **By result:**
   - **Downed / fair catch:** end spot as above (fair catch = downed for stats — B4a)
   - **Return:** use **return end** spot, not catch spot (caught inside 20 but returned out → does **not** count)
   - **Touchback:** does **not** count
   - **Blocked / fumble / bad snap:** punt not credited — no inside-20
4. **Hudl parity:** we do **not** bend rules to match Hudl when definitions differ (e.g. Hudl may count “on the 20”). East Noble `#94` may export `PuntInside20 = 1` while Hudl golden says `2` — **acceptable**.

#### B4a. Fair catch

Fair catch = downed punt for punter stats; use fair-catch spot same as downed for `PuntInside20`.

---

### B5. CI fixtures — full 32-col `PlaylistData`

**Decision:** Two-game fixture strategy; not the 23-col partial CSV.

| Game | Playlist input | MaxPreps golden | `#94` tests |
|------|----------------|-----------------|-------------|
| **Snider vs Warsaw** | `Snider v Warsaw.xlsx` → committed JSONL | `fixtures/maxpreps/snider-vs-warsaw-2025-08-22.hudl.txt` | Kickoffs 5×60 TB (300 total), FG 1–2–40, PAT kick 1–3–1 — **no punts** in playlist |
| **Snider vs East Noble** | `Snider v East Noble.xlsx` → committed JSONL | `fixtures/maxpreps/snider-vs-east-noble-2025.hudl.txt` | Punts 4–138–43–2 (Hudl inside-20); **punt-only** for `#94` in MaxPreps |

**Rules:**

1. Input fixtures: full 32 Hudl columns (`PLAY TYPE`, `KICKER`, `KICK YARDS`, `QTR`, etc.).
2. Partial CSV (`snider-vs-warsaw-2025-08-22.playlist.csv`) stays for Section A rush/pass/tackle only.
3. Warsaw xlsx is an upgrade of the same 144 plays as partial CSV — source for Warsaw JSONL.
4. Golden asserts per game; do not expect Warsaw to test punts or East Noble to test `#94` KO/FG/PAT.

**Note:** `#94` Warsaw MaxPreps row `5|300|60|5` is **kickoff** stats (5 touchbacks × 60), not punt stats.

---

### B6. `PATKickingPoints`

**Decision:** Compute — always `PATKickingMade * 1`; never an independent source of truth.

**Rules:**

1. **Extra point kick only** (`playType === ExtraPoint`, kicker present): made → +1 `PATKickingMade`, +1 `PATKickingAtt`, +1 `PATKickingPoints`; missed → +1 `PATKickingAtt` only.
2. **Two-point conversions** (`playType === TwoPoint`): `PATRushingNum` / `PATReceivingNum` / `TotalConversionPoints` only — **never** increment `PATKicking*` columns.
3. **Blocked extra point:** treated as **missed kick** → `PATKickingAtt +1`, no make, no points (same as `No Good`).
4. Invariant: `PATKickingPoints === PATKickingMade`.

**Tests:** Warsaw `#94` → `1|3|1`; synthetic two **successful XP kicks** → `2|2|2` (not two-point plays).

---

### B7. MaxPreps export timing

**Decision:** **`official_saturday` only** for platform-generated MaxPreps `.txt`.

**Rules:**

1. Export source = `official_saturday` committed `plays[]` (32-col `PlaylistData`).
2. Do not generate MaxPreps box scores from `unofficial_friday` / in-progress sync in platform UI for v1.
3. Unofficial Friday-night MaxPreps upload (Hudl-parity) = **deferred** / separate work stream (see B11, work streams below).

---

### B8. Kickoff yards when `KICK YARDS` is missing

**Decision:** Do **not** use punt-style `Math.abs(gainLoss)` for kickoffs. Populate `kickYards` on iPad save + shared derivation; `0` only as last resort.

**Rules:**

1. iPad must populate `kickYards` on kickoff save (today kickoffs set `returnYards`/`gainLoss` but not `kickYards` — gap).
2. **Touchback:** gross `KickoffYards = 60` (HS kickoff spot → end zone on 0–100 axis).
3. **Return:** gross = kick spot → **catch spot** (same pattern as returned punts). **Never** use `gainLoss` as kick distance on returns.
4. **Onside / short kicks:** **deferred** — do not exclude from `KickoffYards` until play-type rules and Hudl modeling are locked (separate thread).
5. Derivation when missing: same play-end spot helpers as B3; `0` only when nothing derivable (legacy).

---

### B9. Kicking stats in `/season/[year]` rollups

**Decision:** **MaxPreps export only** for v1 — do not add punt/FG/PAT columns to season rollups yet.

Season rollups stay HuddleStat-native; kicking columns are satellite until a separate product decision defines season kicking summaries.

---

### B10. Shared module pattern

**Decision:** Extract `specialTeamsCredits.ts` mirroring `defensiveCredits.ts`.

**Rules:**

1. `packages/shared/src/specialTeamsCredits.ts`:
   - `SpecialTeamsCreditAccumulator`
   - `applySpecialTeamsCreditsToMap(play, map)`
   - Helpers: `derivePuntKickYards(play)`, `deriveKickoffKickYards(play)`, `derivePuntEndPosition(play)`, `isPuntInside20(play)`
2. `deriveMaxPrepsBoxScoreFromPlays` calls shared applier (same pattern as defensive credits).
3. Unit tests in `specialTeamsCredits.test.ts`; integration golden tests in `maxPrepsBoxScore.test.ts`.
4. **Net punting / net kickoff yards** (HuddleStat-native): gross kick distance minus return (touchback: subtract 20 for placement out to the 20; return with negative return yards increases net). **Not** in MaxPreps export columns — see B10a.

#### B10a. Net kicking yards (HuddleStat-only)

- **Gross** `kickYards` / MaxPreps `PuntYards` / `KickoffYards` = distance kicked (independent of return).
- **Net** = gross minus return effect (actual return yards on returns; **20** for touchback placement).
- Lives in play log / PBP test suite / future analytics — not MaxPreps `.txt`.

---

### B11. Reconciliation & flagging (product)

**Decision:** Any export vs reference mismatch is a **reconciliation signal**, not a hard failure. Surface **field deltas** and **play-level suspects** so taggers can fix Friday/Saturday mistakes and re-run.

**Scope:** MaxPreps export first; pattern applies to **any** stat reconciliation (Friday unofficial vs Saturday official, export vs Hudl golden, rollup vs box score).

**Rules:**

1. **Do not hard-fail** on derived vs golden mismatch (extends A7).
2. **Field-level report:** per jersey, list columns where `derived !== golden` (e.g. `#94.PuntInside20: derived 1, golden 2`).
3. **Play-level suspects:** for each mismatched stat, list plays that contribute under **our** rules and note borderline/excluded plays:
   - Example (East Noble `#94`): *Play 27 (Penalty, end position 80) — golden counts inside-20; we exclude (strict 81+). Play 26 counts for both.*
4. **Workflow:** tagger reviews flagged plays → fix on iPad → re-commit → re-export → reconciliation clears or shrinks.
5. **API shape (implementation):** e.g. `reconcileMaxPrepsExport(derived, golden, plays) → { deltas, suspectPlays[] }`.

**Canonical reconciliation test case:** East Noble `#94` `PuntInside20` derived **1** vs Hudl golden **2** — must emit play-level suspects, not fail CI silently or force Hudl-parity logic.

---

## Work streams (out of scope for B implementation chat)

These are separate features; B decisions above feed them but do not implement them here.

| Work stream | Description |
|-------------|-------------|
| **Hudl XL → computer** | Full 32-col Hudl playlist export ingested on **desktop** (historical Hudl workflow), converted to HuddleStat `PlaylistData` for fixtures/reference — not iPad commit input (B1). Warsaw + East Noble xlsx files are examples. |
| **Friday → Saturday reconciliation** | Compare `unofficial_friday` tagging to `official_saturday` commit; flag play-level diffs before official publish. |
| **`official_saturday` feature** | Commit gate, review UI, and publish path for official stats (platform); MaxPreps export only from this commit (B7). |
| **Play-end field rename** | **Accepted** — [ADR-0001](./adr/0001-spot-encoding-field-name.md): `completion` → `spotEncoding`; doc sweep before code rename |

---

## Open ambiguities (orchestration)

| ID | Topic | Status |
|----|--------|--------|
| B-A1 | Snider 32-col JSONL in repo | **Resolved** — source Warsaw + East Noble xlsx; convert to JSONL |
| B-A2 | Punt touchback kick yards | **Resolved** — B3 full distance to goal line |
| B-A3 | Blocked / fair-catch punts | **Resolved** — B3/B4/B4a |
| B-A4 | Blocked PAT | **Resolved** — B6 missed kick |
| B-A5 | Inside-20 boundary | **Resolved** — B4 strict 81–100; Hudl mismatch OK |
| B-A6 | Fractional sacks (from A) | Still open — serializer/import validation |
| B-A7 | iPad local unofficial export | Deferred — B11 / Friday work stream |
| B-A8 | 2pt vs PAT in Snider golden | **Resolved** — B6; Warsaw golden covers XP not 2pt for `#94` |
| B-A9 | Onside kick `KickoffYards` | **Deferred** — separate play-type thread |

---

## Suggested implementation order

1. **`specialTeamsCredits.ts` + unit tests** (B10, B3, B4, B8 logic)
2. **iPad save-path fixes** — punt touchback `kickYards`; kickoff `kickYards` (B3, B8)
3. **Refactor `maxPrepsBoxScore.ts`** — wire shared module; PAT invariant (B6)
4. **Fixtures** — convert Warsaw + East Noble xlsx → JSONL; golden tests (B5)
5. **`reconcileMaxPrepsExport`** + East Noble inside-20 mismatch test (B11)
6. **Platform export gate** — `official_saturday` only (B7)
7. **Defer:** season kicking rollups (B9), onside kicks (B-A9), unofficial Friday export (work stream)

---

## Fixture file locations (to add in implementation)

| Asset | Purpose |
|-------|---------|
| `fixtures/maxpreps/snider-vs-warsaw-2025-08-22.playlist.jsonl` | From Warsaw xlsx — `#94` KO/FG/PAT |
| `fixtures/maxpreps/snider-vs-east-noble-*.playlist.jsonl` | From East Noble xlsx — `#94` punts |
| `fixtures/maxpreps/snider-vs-east-noble-2025.hudl.txt` | Golden MaxPreps row for `#94` punts + reconciliation |
| `fixtures/maxpreps/snider-vs-warsaw-2025-08-22.hudl.txt` | Existing golden — `#94` kickoff/FG/PAT |
| `fixtures/maxpreps/snider-vs-warsaw-2025-08-22.playlist.csv` | Partial — Section A only |
