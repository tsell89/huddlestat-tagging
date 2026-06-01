# Tagging app — dev quickstart

## Install

```bash
cd huddlestat-tagging
nvm use   # Node 22 — see docs/node-version.md
npm install
```

## Run on iPad (Expo)

```bash
cp apps/mobile/.env.example apps/mobile/.env   # optional
npm run dev:mobile:clear
```

Scan the QR code with Expo Go on a **landscape iPad**.

## Offline vs cloud sync

| Mode | Setup |
|------|--------|
| **Offline only** | No `.env` needed. Plays stay in local SQLite (schema auto-migrates; latest version drops legacy outbox). |
| **HuddleStat Platform (live sync)** | Set `EXPO_PUBLIC_SYNC_API_URL`, `EXPO_PUBLIC_SYNC_API_KEY`, and `EXPO_PUBLIC_WEB_BASE_URL` in `apps/mobile/.env` — see [cloud-sync.md](./cloud-sync.md) and [huddlestat-platform dev-quickstart](../huddlestat-platform/docs/dev-quickstart.md). |

Physical iPad cannot use `127.0.0.1` for the sync API — use your Mac’s LAN IP (see `apps/mobile/.env.example`).

## Typecheck & tests

```bash
npm run typecheck
npm run test
```

## Hudl export

Playlist row shape and CSV column order: `packages/shared` (`toPlaylistDataRow`, `PLAYLIST_DATA_HEADERS`).

Play-by-play chain regression: `npm run test:pbp` — see [play-by-play-test-corpus.md](./play-by-play-test-corpus.md).
