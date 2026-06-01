# Hudl-canonical architecture — tagging repo

**Status:** Locked (2026-05-30)  
**Platform SSOT:** [../huddlestat-platform/docs/hudl-canonical-architecture.md](../huddlestat-platform/docs/hudl-canonical-architecture.md)  
**Related:** [maxpreps-stat-decisions.md](./maxpreps-stat-decisions.md) · [cloud-sync.md](./cloud-sync.md) · [hudl-canonical-locked-decisions.md](./hudl-canonical-locked-decisions.md) · [IMPLEMENTATION-PROMPT-HUDL-CANONICAL.md](./IMPLEMENTATION-PROMPT-HUDL-CANONICAL.md)

This repo owns **free MIT tagging** (`apps/mobile`) and **`@huddlestat/shared`**. It does **not** own Postgres season commits — but parsers and derivations must align with platform Hudl-canonical invariants.

## Canonical layer table (tagging-relevant)

| Layer / surface | Where in this repo | `plays[]` source | Stats engine | Label / role |
|-----------------|-------------------|------------------|--------------|--------------|
| Free MIT tagging | `apps/mobile` SQLite → CSV export | iPad tag | N/A (export only) | Upload to Hudl Friday night |
| Live unofficial (hosted) | `apps/mobile/lib/sync/publish.ts` | iPad milestone publish | `offensiveCredits` (C8) when implemented | **Unofficial** — never season |
| Unofficial derivation | `packages/shared` | iPad-shaped `PlaylistData` | defensive + special-teams credits; C8 when added | live / `unofficial_friday` only |
| Official ingest helpers | `packages/shared/src/pbp/hudlCsv.ts` | Hudl 32-col CSV/xlsx | **Hudl wins** — parse/store | Platform `official_saturday` |
| 23-col partial path | `parsePartialPlaylistCsv` in `maxPrepsBoxScore.ts` | Legacy Hudl export | Test/fixture only | **NOT** official commit input |
| MaxPreps parity math | `maxPrepsBoxScore.ts` | Test fixtures / optional platform parity | HuddleStat derivation | **NOT** primary MaxPreps path |
| MaxPreps upload (coach) | none in this repo | Hudl `.txt` download | Hudl — not HuddleStat | Document only |

## Locked rules (tagging repo)

1. **Free tier stays zero-config** — full 32-col Hudl CSV export works offline with no platform env vars.
2. **iPad tag is unofficial** — never product-copy or UX that says iPad re-tag after film = “official stats.”
3. **`parseHudlCsv` is the official ingest parser** — export `parseHudlCsv`, `parseCsvLine`, `rowToPlaylistData` from `@huddlestat/shared` for platform `hudlPlaylistCsv` wiring.
4. **`parsePartialPlaylistCsv` is 23-col test-only** — Section A / partial fixtures; never official commit path.
5. **No iPad-vs-Hudl diff tooling (C9)** — `reconcileMaxPrepsExport` is fixture/CI derived-vs-golden validation only.
6. **MaxPreps `.txt` primary = Hudl** — shared may derive parity `.txt` for tests; docs must not imply HuddleStat replaces Hudl MaxPreps export.
7. **`offensiveCredits` (C8)** — iPad-derived paths only; not for official Hudl-canonical display.

## Forbidden paths

```text
FORBIDDEN (this repo):
  parsePartialPlaylistCsv → documented as official_saturday ingest
  reconcileMaxPrepsExport → Friday unofficial_friday vs Saturday Hudl diff product
  iPad re-tag after film → “official stats” UX or export copy
  MaxPreps primary path docs → “HuddleStat replaces Hudl .txt”
  Season commit / official publish → apps/mobile
  Platform env vars → required for core offline CSV export

ALLOWED:
  apps/mobile → 32-col Hudl CSV export (PLAYLIST_DATA_HEADERS / ADR-0001)
  lib/sync/publish.ts → live unofficial milestone snapshots
  parseHudlCsv → platform official_saturday plays[]
  parsePartialPlaylistCsv → Section A rush/pass/tackle fixtures only
  deriveMaxPrepsBoxScoreFromPlays + reconcileMaxPrepsExport → CI golden tests
  looksLikePartial23ColPlaylist → reject partial shape (shared guard)
```

## Data flow (tagging + platform handoff)

```text
Friday (free MIT)
  iPad tag ──► SQLite ──► Hudl 32-col CSV export ──► coach uploads to Hudl

Friday (optional hosted)
  iPad tag ──► POST /v1/publish ──► live tables (Unofficial)

Saturday (platform — not this repo)
  Hudl 32-col export ──► parseHudlCsv ──► official_saturday commit
                       ──► /game/[slug] + /season/[year] show Official (D2 — no diff UI)

MaxPreps (coach)
  Hudl .txt download ──► MaxPreps Coach Admin (NOT HuddleStat-derived as primary)
```

## Code map

| Concern | Location |
|---------|----------|
| 32-col Hudl parse | `packages/shared/src/pbp/hudlCsv.ts` |
| 23-col partial parse | `packages/shared/src/maxPrepsBoxScore.ts` |
| Partial-shape guard | `packages/shared/src/hudlCanonical.ts` |
| MaxPreps derivation | `packages/shared/src/maxPrepsBoxScore.ts` |
| Fixture reconciliation | `packages/shared/src/reconcileMaxPrepsExport.ts` |
| 32-col export | `packages/shared/src/index.ts` → `PLAYLIST_DATA_HEADERS`, `toPlaylistDataRow` |
| iPad tagging | `apps/mobile/` |
| Cloud publish | `apps/mobile/lib/sync/` |
| Field position | `packages/shared/src/fieldPosition100.ts` |

## Test plan (maps to layer table)

| Row | Assertion / test |
|-----|------------------|
| Free MIT export | `hudlCsv.test.ts` — `toPlaylistDataRow` / COMPLETION ↔ `spotEncoding` |
| Official ingest parse | `hudlCsv.test.ts` — `parseHudlCsv` round-trip `hudl-32col-spot-encoding.csv` |
| 23-col partial rejected | `hudlCanonical.test.ts` — `looksLikePartial23ColPlaylist` on partial fixture |
| MaxPreps parity | `maxPrepsBoxScore.test.ts` — golden `.txt` from JSONL fixtures |
| Fixture reconciliation | `reconcileMaxPrepsExport.test.ts` — East Noble `#94` suspects |
| Partial not official golden | kicking tests use 32-col JSONL / `parseHudlCsv`, not partial CSV alone |

## Agent checklist

1. Correct layer (free export vs unofficial derivation vs Hudl parse)?
2. Free CSV export still works without env vars?
3. Official = Hudl after film, not iPad re-tag?
4. No Friday-vs-Hudl diff tooling (C9)?
5. MaxPreps primary = Hudl `.txt`?
6. Platform game pages upgrade to official snapshot when committed (D2 — platform implements)?

## Locked decisions (D1–D4)

See [hudl-canonical-locked-decisions.md](./hudl-canonical-locked-decisions.md). Cross-repo implementation: [platform IMPLEMENTATION-PROMPT-HUDL-CANONICAL.md](../huddlestat-platform/docs/IMPLEMENTATION-PROMPT-HUDL-CANONICAL.md).

## Related

- [Violation audit (2026-05-30)](./hudl-canonical-violation-audit.md)
- Platform: [hudl-canonical-violation-audit.md](../huddlestat-platform/docs/hudl-canonical-violation-audit.md)
