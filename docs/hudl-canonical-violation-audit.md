# Hudl-canonical violation audit — tagging repo (2026-05-30)

Audit scope: `@huddlestat/shared`, tagging docs, free-tier export path, unofficial derivation helpers.

Reference table: [hudl-canonical-tagging.md](./hudl-canonical-tagging.md) · platform SSOT: [../huddlestat/docs/hudl-canonical-architecture.md](../huddlestat/docs/hudl-canonical-architecture.md)

## Violations found

### Critical — wrong source documented for official season

| ID | Location | Violation | Fix |
|----|----------|-----------|-----|
| T1 | `docs/maxpreps-stat-decisions.md` B1 L27 | `official_saturday` = iPad `PlaylistData` only; no Hudl re-import | Revised B1 — Hudl 32-col after film (platform SSOT) |
| T2 | `docs/maxpreps-stat-decisions.md` work streams L192 | “Friday → Saturday reconciliation” — play diff before official publish | Removed — conflicts with C9 (Hudl wins, no diff tooling) |
| T3 | `docs/maxpreps-stat-decisions.md` B11 L170–178 | Scope includes Friday unofficial vs Saturday official reconciliation workflow | Scoped to fixture/CI derived-vs-golden only |

### Critical — platform blocker

| ID | Location | Violation | Fix |
|----|----------|-----------|-----|
| T4 | `packages/shared/src/index.ts` | `parseHudlCsv`, `rowToPlaylistData`, `parseCsvLine` not exported | Exported from package index |
| T5 | `packages/shared` | No shared guard for 23-col partial shape on official ingest | Added `looksLikePartial23ColPlaylist` + tests (platform `hudlCanonical.ts` can import) |

### Medium — MaxPreps implies HuddleStat is primary

| ID | Location | Violation | Fix |
|----|----------|-----------|-----|
| T6 | `docs/maxpreps-stat-decisions.md` B7 L116–118 | Platform `.txt` from `official_saturday` without Hudl-primary disclaimer | B7 revised — Hudl `.txt` primary; HuddleStat parity/testing only |
| T7 | `README.md` | No Friday → Hudl → official workflow | Added Hudl-canonical workflow paragraph |

### Medium — docs / agent guidance stale

| ID | Location | Violation | Fix |
|----|----------|-----------|-----|
| T8 | `docs/cloud-sync.md` | No Hudl-canonical link; live tier role unclear | Linked architecture doc; live = unofficial only |
| T9 | repo root | No agent checklist for layer table | Added `AGENTS.md` + `.cursor/rules/hudl-canonical-tagging.mdc` |
| T10 | `packages/shared/src/reconcileMaxPrepsExport.ts` | JSDoc implied general reconciliation product (B11) | Clarified fixture/CI scope only |

### Low — partial parser documentation

| ID | Location | Violation | Fix |
|----|----------|-----------|-----|
| T11 | `parsePartialPlaylistCsv` JSDoc | No deprecation for official path | `@deprecated` — Section A / 23-col fixtures only |
| T12 | `docs/maxpreps-stat-decisions.md` B11 L178 | “fix on iPad → re-commit” workflow for reconciliation | Revised — CI/fixture review, not coach Friday→Saturday diff |

## Already compliant

| Rule | Evidence |
|------|----------|
| Free tier zero-config | `README.md` — offline without `.env`; Hudl CSV export |
| Live publish never season | `docs/cloud-sync.md` Option A; no season commit in `apps/mobile` |
| 32-col export ADR-0001 | `PLAYLIST_DATA_HEADERS`, `toPlaylistDataRow`, `hudlCsv.test.ts` |
| No iPad-vs-Hudl diff UI | none in `apps/mobile` |
| `parseHudlCsv` tests exist | `packages/shared/src/pbp/hudlCsv.test.ts` + fixture |
| Partial CSV Section A only | B5 + partial fixture comments; not sole kicking ingest test |

## Residual risk (accepted / platform-owned)

- **`looksLikePartial23ColPlaylist`** heuristic may false-negative on tiny partial samples (`plays.length < 10`) — platform also uses this threshold.
- **Platform `hudlCanonical.ts`** still duplicates guard until it imports from `@huddlestat/shared` (post tagging-ref bump).
- **`offensiveCredits.ts` (C8)** not yet in shared — unofficial live path only when implemented.
