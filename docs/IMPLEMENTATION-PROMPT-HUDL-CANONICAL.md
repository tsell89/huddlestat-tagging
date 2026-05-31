# Implementation prompt — Hudl-canonical (copy for AI sessions)

Paste the block below when starting Hudl-canonical work in **huddlestat-tagging**.

---

You are working on **huddlestat-tagging** (MIT) — iPad live tagging + `@huddlestat/shared`.

**Platform SSOT (merged 2026-05-30):** read sibling or GitHub docs before changing stats semantics:
- `../huddlestat/docs/hudl-canonical-architecture.md` — layer/source table + forbidden paths
- `../huddlestat/docs/hudl-canonical-violation-audit.md` — platform audit pattern
- `../huddlestat/docs/maxpreps-stat-decisions.md` — C1–C9, Hudl-canonical official (B1 revised)
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

Run ripgrep across the repo for: `official_saturday`, `unofficial_friday`, `parsePartialPlaylistCsv`, `parseHudlCsv`, `offensiveCredits`, `reconcileMaxPrepsExport`, `iPad only`, `Friday → Saturday`, `Friday->Saturday`, `re-import`, `MaxPreps export`, `Upload to MaxPreps`, `Download MaxPreps`.

Pay special attention to:
- `docs/maxpreps-stat-decisions.md` **B1** — still says “iPad only” for `official_saturday` (SUPERSEDED by Hudl-canonical)
- **B7** — platform parity export only; Hudl `.txt` primary
- **B11 + work streams** — “Friday → Saturday reconciliation” conflicts with C9
- `packages/shared/src/index.ts` — `parseHudlCsv` not exported (platform blocker)
- `reconcileMaxPrepsExport.ts` — ensure scope is fixture/CI only, not coach-facing diff UI spec

### Code map

| Concern | Location |
|---------|----------|
| 32-col Hudl parse | `packages/shared/src/pbp/hudlCsv.ts` → `parseHudlCsv`, `rowToPlaylistData` |
| 23-col partial parse | `packages/shared/src/maxPrepsBoxScore.ts` → `parsePartialPlaylistCsv` |
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

### Tasks

**A. Audit** — grep patterns above; markdown violation list (like platform `hudl-canonical-violation-audit.md`).

**B. Architecture doc** — add `docs/hudl-canonical-architecture.md` (tagging-specific) OR a short `docs/hudl-canonical-tagging.md` that links platform SSOT + tagging layer table + forbidden paths. Single source for agents in this repo.

**C. Revise stale docs**
- `docs/maxpreps-stat-decisions.md` — B1, B7, B11, work streams table
- `docs/cloud-sync.md` — link Hudl-canonical; live = unofficial only
- `README.md` — “export Hudl CSV Friday → coach corrects in Hudl → official stats live in Hudl + hosted platform ingest”
- Optional: `AGENTS.md` + cross-link this file

**D. Shared package fixes**
- Export `parseHudlCsv`, `parseCsvLine`, `rowToPlaylistData` from `packages/shared/src/index.ts`
- Add `isPartial23ColPlaylist(plays)` or share logic with platform `hudlCanonical.ts` (consider duplicating minimal guard in shared with test, or extract to shared and let platform import)
- Mark `parsePartialPlaylistCsv` JSDoc: `@deprecated official path — partial 23-col fixtures only`
- CI test: `parseHudlCsv` round-trips `hudl-32col-spot-encoding.csv`; partial csv must not be the only ingest test for kicking

**E. CI guards (cheap)**
- Test that `parsePartialPlaylistCsv` output matches partial-23-col shape (platform rejects this on official commit)
- Do not add tests that treat partial csv as official ingest golden

**F. Agent checklist** — `.cursor/rules/` or AGENTS.md items:
1. Correct layer (free export vs unofficial derivation vs Hudl parse)?
2. Free CSV export still works without env vars?
3. Official = Hudl after film, not iPad re-tag?
4. No Friday-vs-Hudl diff tooling?
5. MaxPreps primary = Hudl `.txt`?

### Do not

- Require platform env vars for core tagging/export
- Add season commit / official publish to iPad app
- Build iPad-vs-Hudl reconcile UI or API (C9)
- Use `parsePartialPlaylistCsv` for official-season or MaxPreps-primary docs
- Break 32-col `PLAYLIST_DATA_HEADERS` / `QTR` / `COMPLETION`↔`spotEncoding` export (ADR-0001)

### Deliverables

- Violation audit (markdown list in PR)
- Tagging architecture doc with layer table
- Doc fixes (maxpreps-stat-decisions B1/B7/B11 minimum)
- Export `parseHudlCsv` from shared + tests
- PR with test plan mapping each tagging-relevant row to a test or assertion

### After merge

Bump `tagging-ref.json` in platform repo `huddlestat` so CI picks up shared export changes.
