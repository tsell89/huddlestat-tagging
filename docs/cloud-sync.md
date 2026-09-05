# Cloud sync (optional hosted upgrade)

The tagging app is **free and complete without the platform**: local SQLite, live tagging, Hudl CSV export.

Optional env vars connect to the proprietary **HuddleStat hosted** sync API for a **live unofficial stats page** (paid upgrade path). Live publish is **never official season stats** — see [hudl-canonical-tagging.md](./hudl-canonical-tagging.md).

Full product context: see the platform repo [product-path.md](https://github.com/tsell89/huddlestat-platform/blob/main/docs/product-path.md) (or sibling clone `../huddlestat-platform/docs/product-path.md`).

## What publishes

Full game snapshots at milestones only:

| Trigger | Kind |
|---------|------|
| Score changes after save | `live` |
| Halftime | `halftime` |
| Start of Q3 | `live` |
| Final | `final` |

Each publish is **this team’s view** of the game (`teamCode` vs opponent). There is no shared stats database with the rival school.

## Config

```env
EXPO_PUBLIC_SYNC_API_URL=http://YOUR_MAC_LAN_IP:3001
EXPO_PUBLIC_SYNC_API_KEY=...
EXPO_PUBLIC_WEB_BASE_URL=https://your-team.live.example/game/...
```

## Code

- `lib/sync/publish.ts` — HTTP client
- `lib/sync/triggers.ts` — milestone → snapshot kind
- `app/game/[id].tsx` — calls publish on milestones

Live publish **does not** update season statistics (Option A). Season is a separate hosted tier.

## iPhone voice tagger (hosted, not this app)

Friday **hosted** tagging can use an iPhone dictation client in `huddlestat-platform` (`apps/iphone-tagger`). That path requires internet and publishes unofficial live snapshots on **every confirmed play**.

This MIT iPad app stays the **offline fallback**: tap tagging + Hudl CSV export with zero platform env vars. Do not require `EXPO_PUBLIC_SYNC_API_*` for core export.

Dictation text → snap parsing lives in `@huddlestat/shared` (`parseWithRules`). Situation (down / distance / yard line / ODK) stays in `playChain`.
