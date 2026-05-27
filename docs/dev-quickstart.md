# Tagging app — dev quickstart

## Install

```bash
cd huddlestat-tagging
nvm use
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
| **Offline only** | No `.env` needed. Plays stay in local SQLite. |
| **HuddleStat Cloud** | Set `EXPO_PUBLIC_CONVEX_URL` in `apps/mobile/.env` to your [platform](https://github.com/tsell89/huddlestat) deployment. |

Physical iPad requires a **https://….convex.cloud** URL — not `127.0.0.1`.

## Typecheck & tests

```bash
npm run typecheck
npm run test
```

## Hudl export

Playlist row shape and CSV column order: `packages/shared` (`toPlaylistDataRow`, `PLAYLIST_DATA_HEADERS`).
