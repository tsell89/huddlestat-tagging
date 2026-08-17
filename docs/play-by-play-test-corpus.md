# Play-by-play test corpus

Node-only regression corpus for [`nextDraftAfterPlay`](../packages/shared/src/playChain.ts), [`advanceSituation`](../packages/shared/src/playChain.ts), and field-position invariants. Complements synthetic tests in [`playChain.test.ts`](../packages/shared/src/playChain.test.ts).

**Related:** [ipad-tagging-spec.md](./ipad-tagging-spec.md) §6 transition matrix · [field-position-model.md](./field-position-model.md) · [overtime-rules.md](./overtime-rules.md) · [pbp-exception-ux.md](./pbp-exception-ux.md)

**Out of scope:** Platform sync API, Gate 3 roster, `PlaylistData` schema changes (unless a replay failure proves breakage), iPad/Expo tests.

---

## Gentle failure principle

When automation finds unsupported or ambiguous state, the tagger must keep going: clear UI message, sensible default pad, post-game fix path — never silent wrong down/distance. See [pbp-exception-ux.md](./pbp-exception-ux.md).

---

## Source matrix

| Source | URL / access | Games | OT | Halftime / quarter | Next situation in feed | Mapper | License OK? |
|--------|----------------|-------|-----|-------------------|------------------------|--------|-------------|
| **Hudl playlist CSV** | Team export; `PLAYLIST_DATA_HEADERS` | Any full game | If tagged | Infer from sequence | **Low** | Yes (your export) |
| **CFBD API** | [collegefootballdata.com](https://collegefootballdata.com) `GET /plays` | Thousands/season | Yes | `period`, drives | **Med–High** | Yes, redacted derived JSONL |
| **sportsdataverse / cfbfastR** | [releases](https://github.com/sportsdataverse/sportsdataverse-data/releases/tag/cfbfastR_cfb_pbp) | 6k+/season | Yes | `half`, `period` | **Med** | Same as CFBD |
| **nflverse / nflfastR** | [nflverse-data](https://github.com/nflverse/nflverse-data/releases) CC-BY-4.0 | NFL 1999+ | Yes (`qtr`>4) | `qtr`, clock | **Med** | Yes + attribution |
| **ESPN JSON (pbp-data)** | [saiemgilani/pbp-data](https://github.com/saiemgilani/pbp-data) | 15k+ | Varies | Header | **High** | Local research only |
| **Hand scenarios** | `fixtures/pbp/scenarios/` | 2–3 drives | By design | In `meta` | **Low** | Yes |

### First games in corpus

| # | `gameId` | Source | Purpose |
|---|----------|--------|---------|
| 1 | `hudl-spec-2-4` | Hudl-shaped §2.4 canonical | Gold replay anchor |
| 2 | `cfbd-chaos-penalties` | CFBD-derived (redacted) | Penalties, replay down |
| 3 | `cfbd-overtime-ncaa` | CFBD-derived | NCAA OT period flip |
| 4 | `cfbd-normal-drives` | CFBD-derived | KO TB, punt ODK flip (`Punt Rec`, `odk: D` play 6), FG drive |
| 5 | `scenarios/package-h-edge-plays` | Hand-authored | Package H live-ball |
| 6 | `scenarios/overtime-hs-drive` | Hand-authored | **HS OT** — 1st & goal @ Opp 10, no kickoff between possessions |

### Hand scenarios (`fixtures/pbp/scenarios/`)

| File | Rules | Asserts / purpose |
|------|-------|-------------------|
| `halftime-kickoff.json` | HS | FG → 2H kickoff return (`halftimeAfterPlay` in meta — product only) |
| `overtime-hs-drive.json` | HS | TD+XP → alternating OT possession @ ±10 |
| `overtime-ncaa-drive.json` | NCAA | OT kickoff / touchback anchor |
| `overtime-nfl-drive.json` | NFL | NFL-tagged kickoff model |
| `package-h-edge-plays.json` | HS | Blocked punt recovery, FG miss touchback |
| `punt-odk-flip.json` | HS | 4th-down punt downed → next `odk: D`, `Punt Rec` TB → Opp 20 D |
| `odk-d-scrimmage.json` | HS | We kick to Opp 25; their rush to Opp 32 is +7 / 2nd & 3 / still D |
| `kickoff-return-td-scoring.json` | HS | KO Rec `end:TD` → next snap scoring pad (Extra Pt.) |
| `defensive-special-td-catalog.json` | HS | INT / special-teams return TD → scoring pad (skip replay after XP rows) |
| `onside-recovery.json` | HS | Short kick + recovery spot (Package H live-ball path) |

**Overtime:** HS uses alternating possessions from the **opponent 10** (`+10` / `−10`), not college/NFL kickoff periods. See [overtime-rules.md](./overtime-rules.md).

**Product meta excluded from replay:** kickoff role (UX-14), quarter-break catch-up UI — chain tests compare situation + pad class only.

**iPad pad/SAVE/phase (not this corpus):** Headless tagging session tests live in `apps/mobile/lib/tagging/taggingSession.ts` (+ `taggingSessionRecipes.ts`). They dispatch the same pad actions, SAVE, and phase-bar steps as the iPad screen. Do **not** encode pad taps as `plays.jsonl` — the PBP corpus starts from already-complete `PlaylistData` and replays `playChain` only.

---

## Corpus layout

```
packages/shared/fixtures/pbp/
  README.md
  mapping/
    hudl-csv.md
    cfbd.md
    nflverse.md
  games/<gameId>/
    meta.json
    plays.jsonl
    expectations.jsonl   # optional
  scenarios/*.json
```

Tests: `packages/shared/src/pbp/*.ts` — run via `npm run test:pbp`.

---

## Test types

| Type | File | Behavior |
|------|------|----------|
| Replay chain | `pbpReplay.test.ts` | `nextDraftAfterPlay(play[i])` vs `play[i+1]` situation + pad class |
| Invariants | `pbpInvariants.test.ts` | gainLoss, touchback @ Own 20, COP, sack semantics |
| Scenarios | `pbpScenarios.test.ts` | Short JSON drives in `scenarios/` |

**Policy:** Chain (`nextDraftAfterPlay`) is source of truth. Feed down/distance in `expectations.jsonl` with `trustFeed: true` is mapper QA only — never auto-fix chain.

---

## Gap taxonomy

| Priority | Bucket | Action |
|----------|--------|--------|
| **P0** | Chain bug | Fix `playChain.ts` + unit/scenario regression |
| **P0** | Mapper bug | Fix `mapping/*.md` + mapper; re-export `plays.jsonl` |
| **P1** | Schema gap | Rare spec + schema change |
| **P1** | Unsupported play | Document + [pbp-exception-ux.md](./pbp-exception-ux.md) |
| **P1** | Ambiguous feed | Flag `review: true`; no auto-correct |
| **P2** | Game-state gap | `meta.json` halftime/OT/score (PBP-2/3) |
| **P2** | Product meta | e.g. kickoff role UX-14 — exclude from replay |

---

## Session decisions (locked)

1. **Fields:** Chain-minimum for API games; full 31-column for Hudl gold.
2. **Trust:** Recompute via chain; feed D/D optional cross-check only.
3. **Kneel/spike/timeout:** `Result.Timeout` or `skipReplay` in meta.
4. **Redaction:** `TEAM_A` / `OPP` in committed API-derived fixtures.
5. **First games:** Table above.

---

## Tickets

| Ticket | Status |
|--------|--------|
| **PBP-0** | README, `hudl-spec-2-4`, replay test, `test:pbp` |
| **PBP-1** | CFBD mapper + 3 college `games/` |
| **PBP-2** | Halftime meta + `scenarios/halftime-kickoff.json` |
| **PBP-3** | OT scenarios NCAA / NFL / **HS** (`overtime-hs-drive.json`) + chain `PlayChainOptions` |
| **PBP-4** | [pbp-exception-ux.md](./pbp-exception-ux.md) |
| **PBP-5** | CI runs `npm run test:pbp` |
| **PBP-6** | WS2 chain scenarios: `punt-odk-flip`, `kickoff-return-td-scoring`, `defensive-special-td-catalog`, `onside-recovery` |

---

## How to add a game

1. Add `games/<gameId>/meta.json` and `plays.jsonl` (one JSON object per line, sorted by `playNumber`).
2. Run `npm run test:pbp --workspace=@huddlestat/shared`.
3. On mismatch, classify per gap taxonomy; fix chain or mapper, not both blindly.

### Hudl CSV ingest (optional)

```bash
node packages/shared/scripts/ingest-hudl-csv.mjs path/to/export.csv games/my-game-id TEAM_A
```

### CFBD refresh (optional, requires API key)

```bash
CFBD_API_KEY=... node packages/shared/scripts/ingest-cfbd.mjs <gameId> TEAM_A
```

---

## Mapping docs

- [fixtures/pbp/mapping/hudl-csv.md](../packages/shared/fixtures/pbp/mapping/hudl-csv.md)
- [fixtures/pbp/mapping/cfbd.md](../packages/shared/fixtures/pbp/mapping/cfbd.md)
- [fixtures/pbp/mapping/nflverse.md](../packages/shared/fixtures/pbp/mapping/nflverse.md)
