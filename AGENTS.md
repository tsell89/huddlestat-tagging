# Agent guide — huddlestat-tagging

**Read first:** [docs/hudl-canonical-tagging.md](./docs/hudl-canonical-tagging.md) · [docs/hudl-canonical-locked-decisions.md](./docs/hudl-canonical-locked-decisions.md) · [docs/field-position-model.md](./docs/field-position-model.md)

## Repo scope

| Owns | Does not own |
|------|----------------|
| Free MIT iPad tagging (`apps/mobile`) | Postgres season commits |
| `@huddlestat/shared` parsers/derivations | Official publish / MaxPreps coach upload UX |
| Hudl 32-col CSV export | Platform live web app |

Platform SSOT (sibling or GitHub): `../huddlestat-platform/docs/hudl-canonical-architecture.md`

## Hudl-canonical checklist

Before changing stats semantics, export, or docs:

1. **Correct layer?** Free CSV export vs unofficial derivation vs Hudl `parseHudlCsv` ingest?
2. **Free tier zero-config?** Core tagging/export must work without platform env vars.
3. **Official = Hudl after film?** Never iPad re-tag as official stats copy or UX.
4. **No Friday-vs-Hudl diff tooling?** C9 — `reconcileMaxPrepsExport` is fixture/CI only.
5. **MaxPreps primary = Hudl `.txt`?** HuddleStat `.txt` is parity/testing only.

## Key APIs

| Path | Role |
|------|------|
| `parseHudlCsv` | Official 32-col ingest (exported from `@huddlestat/shared`) |
| `parseWithRules` | Dictation transcript → snap facts; does **not** invent down/distance/ODK |
| `parsePartialPlaylistCsv` | **Deprecated** — 23-col Section A fixtures only |
| `looksLikePartial23ColPlaylist` | Guard partial shape (platform official commit rejects) |
| `toPlaylistDataRow` / `PLAYLIST_DATA_HEADERS` | iPad → Hudl CSV export (ADR-0001) |

## Implementation sessions

Copy-paste prompt: [docs/IMPLEMENTATION-PROMPT-HUDL-CANONICAL.md](./docs/IMPLEMENTATION-PROMPT-HUDL-CANONICAL.md)

Violation audit pattern: [docs/hudl-canonical-violation-audit.md](./docs/hudl-canonical-violation-audit.md)

## After shared export changes

Bump `tagging-ref.json` in platform repo `huddlestat-platform` so CI picks up `@huddlestat/shared` changes.
