# Implementation prompt — Hudl-canonical (copy for AI sessions)

Paste the block below when starting Hudl-canonical work in **huddlestat-tagging**.

---

You are working on **huddlestat-tagging** (MIT) — iPad live tagging + `@huddlestat/shared`.

**Platform SSOT (merged 2026-05-30):** read sibling or GitHub docs before changing stats semantics:
- `../huddlestat/docs/hudl-canonical-architecture.md` — layer/source table + forbidden paths
- [docs/hudl-canonical-tagging.md](./hudl-canonical-tagging.md) — **this repo's SSOT** (links platform + tagging layer table)
- `../huddlestat/docs/hudl-canonical-violation-audit.md` — platform audit pattern
- [docs/hudl-canonical-violation-audit.md](./hudl-canonical-violation-audit.md) — tagging audit
- `docs/maxpreps-stat-decisions.md` — B1/B7/B11 revised for Hudl-canonical
- `../huddlestat/docs/product-path.md` — free tagging vs hosted tiers

## Hudl-canonical — tagging repo scope

This repo owns **free MIT tagging** and **`@huddlestat/shared`**. It does NOT own Postgres season commits — but shared parsers/derivations must align with platform invariants.

### Canonical layer table (tagging-relevant rows)

| Layer / surface | Where in this repo | `plays[]` source | Stats engine | Label / role |
|-----------------|-------------------|------------------|--------------|--------------|
| Free MIT tagging | `apps/mobile` SQLite → CSV export | iPad tag | N/A (export only) | Upload to Hudl Friday night |
| Live unofficial (hosted) | `lib/sync/publish.ts` payload | iPad milestone publish | `offensiveCredits` (C8) when implemented | Unofficial — never season |
| Unofficial derivation | `packages/shared` | iPad-shaped `PlaylistData` | `offensiveCredits` + existing defensive credits | For live / unofficial_friday only |
| Official ingest helpers | `packages/shared/src/pbp/hudlCsv.ts` | Hudl 32-col CSV/xlsx | **Hudl wins** — parse/store, do not re-derive official display | Platform `official_saturday` |
| 23-col partial path | `parsePartialPlaylistCsv` in `maxPrepsBoxScore.ts` | Legacy Hudl export | Test/fixture only — **NOT** official commit input | Deprecate for official |
| MaxPreps parity math | `maxPrepsBoxScore.ts` | Test fixtures / optional platform parity | HuddleStat derivation | **NOT** primary MaxPreps path |
| MaxPreps upload (coach) | none in this repo | Hudl `.txt` download | Hudl — not HuddleStat | Document only |

### Locked rules (tagging repo)

1. **Free tier stays zero-config** — full 32-col Hudl CSV export works offline with no platform env vars.
2. **iPad tag is unofficial** — never product-copy or UX that says iPad re-tag after film = “official stats.”
3. **`parseHudlCsv` is the official ingest parser** — platform season commit must use 32-col Hudl shape; export `parseHudlCsv` + `rowToPlaylistData` from `@huddlestat/shared` index (platform needs this to wire `hudlPlaylistCsv`).
4. **`parsePartialPlaylistCsv` is 23-col test-only** — comments/tests must say “Section A / partial fixture only”; never document as official commit path.
5. **No iPad-vs-Hudl diff / reconcile tooling (C9)** — `reconcileMaxPrepsExport` is for **derived vs golden fixture validation** (B11), NOT a Friday `unofficial_friday` vs Saturday Hudl official diff product. Remove or revise B11/B work-stream rows that imply Friday→Saturday play diff before official publish.
6. **MaxPreps `.txt` primary = Hudl** — shared package may derive parity `.txt` for tests; docs must not imply HuddleStat replaces Hudl MaxPreps export.
7. **`offensiveCredits.ts` (C8)** — applies only to iPad-derived paths (live / unofficial); **do not** use for official Hudl-canonical display (separate thread unless a guard requires a one-line check).

### Known violations to audit (grep first)

Re-run when changing stats semantics or ingest paths:

`official_saturday`, `unofficial_friday`, `parsePartialPlaylistCsv`, `parseHudlCsv`, `offensiveCredits`, `reconcileMaxPrepsExport`, `Friday → Saturday`, `MaxPreps export`, `Upload to MaxPreps`

**Resolved in [hudl-canonical-violation-audit.md](./hudl-canonical-violation-audit.md) (2026-05-30):** B1/B7/B11 doc drift, `parseHudlCsv` export, partial-shape guard, reconcile scope.

**Still watch:**
- `offensiveCredits.ts` (C8) — not in shared yet; unofficial paths only when added
- Platform `hudlCanonical.ts` — may import `looksLikePartial23ColPlaylist` from `@huddlestat/shared` after `tagging-ref.json` bump

### Code map

| Concern | Location |
|---------|----------|
| 32-col Hudl parse | `packages/shared/src/pbp/hudlCsv.ts` → `parseHudlCsv`, `rowToPlaylistData` |
| 23-col partial parse | `packages/shared/src/maxPrepsBoxScore.ts` → `parsePartialPlaylistCsv` |
| Partial-shape guard | `packages/shared/src/hudlCanonical.ts` → `looksLikePartial23ColPlaylist` |
| MaxPreps derivation | `packages/shared/src/maxPrepsBoxScore.ts` |
| Defensive credits (unofficial) | `packages/shared/src/defensiveCredits.ts` |
| Fixture reconciliation | `packages/shared/src/reconcileMaxPrepsExport.ts` |
| 32-col export | `packages/shared/src/index.ts` → `PLAYLIST_DATA_HEADERS`, `toPlaylistDataRow` |
| iPad tagging | `apps/mobile/` |
| Cloud publish (unofficial live) | `apps/mobile/lib/sync/` — see `docs/cloud-sync.md` |
| Hudl ingest script | `packages/shared/scripts/ingest-hudl-csv.mjs` |
| Full fixtures | `packages/shared/fixtures/maxpreps/*.jsonl`, xlsx-derived |
| Partial fixture | `fixtures/maxpreps/snider-vs-warsaw-2025-08-22.playlist.csv` (23-col) |
| Field position | `packages/shared/src/fieldPosition100.ts`, `.cursor/rules/field-position-model.mdc` |

### Tasks (completed 2026-05-30 — see PR #20)

**A. Audit** — [hudl-canonical-violation-audit.md](./hudl-canonical-violation-audit.md)

**B. Architecture doc** — [hudl-canonical-tagging.md](./hudl-canonical-tagging.md)

**C. Doc fixes** — maxpreps-stat-decisions B1/B7/B11, cloud-sync, README, AGENTS.md

**D. Shared package** — exports + `looksLikePartial23ColPlaylist` + tests

**E. CI guards** — partial-shape + 32-col round-trip tests

**F. Agent checklist** — `.cursor/rules/hudl-canonical-tagging.mdc`, AGENTS.md

### Do not

- Require platform env vars for core tagging/export
- Add season commit / official publish to iPad app
- Build iPad-vs-Hudl reconcile UI or API (C9)
- Use `parsePartialPlaylistCsv` for official-season or MaxPreps-primary docs
- Break 32-col `PLAYLIST_DATA_HEADERS` / `QTR` / `COMPLETION`↔`spotEncoding` export (ADR-0001)

### Deliverables (PR #20)

- [x] Violation audit — `docs/hudl-canonical-violation-audit.md`
- [x] Tagging architecture doc — `docs/hudl-canonical-tagging.md`
- [x] Doc fixes (B1/B7/B11 minimum)
- [x] Export `parseHudlCsv` from shared + tests
- [x] Test plan in PR description

### After merge

Bump `tagging-ref.json` in platform repo `huddlestat` so CI picks up shared export changes.
