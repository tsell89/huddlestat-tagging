# Handoff: iPad tagging UI redesign (fast touch targets)

**Milestone (2026-05-26):** Sync + live web working — see [dev-quickstart.md](./dev-quickstart.md). **Next UX plan:** [next-session-tagging-ux.md](./next-session-tagging-ux.md).

Use this document to start a **new Cursor session** focused on redesigning the live tagging surface. **Do not rebuild sync API, PlaylistData schema, or platform Postgres** unless a bug is found — those layers work.

---

## Copy-paste prompt for the next agent

```
You are continuing HuddleStat Tagging (repo: huddlestat-tagging; platform: sibling huddlestat-platform).

READ FIRST (in order):
1. ~/.cursor/plans/huddlestat_architecture_plan_e44998b1.plan.md — especially "iPad tagging surface" and "iPad-specific UX choices" (landscape, large tap targets, one-screen tagging, minimize taps).
2. docs/handoff-ipad-tagging-ui.md — session state and UX problems.
3. packages/shared/src/index.ts — PlaylistData schema (Hudl 31 columns); plays MUST stay compatible.
4. apps/mobile/app/game/[id].tsx — current tagging screen (to replace/redesign).
5. apps/mobile/components/ChipSelect.tsx, PlayPlayerFields.tsx, PlayerInput.tsx — current patterns we dislike.

## Product constraint (non-negotiable)

Taggers work under **extreme time pressure** at live games. The iPad UI must optimize for:
- **One-thumb, one-screen tagging** in landscape on iPad Pro (~12.9").
- **Almost no keyboard** during a play — jersey, yards, play type, result, tacklers, kicker, returner must be **large tap targets** (min 48–56pt; prefer 64pt+ for primary actions).
- **Minimize taps per play** — target ≤3–5 taps for a typical run/pass after kickoff; kickoff flow should be ≤4 taps.
- **Zero horizontal scrolling** for primary choices (current ChipSelect rows are too slow).
- **Instant visual confirmation** — play #, situation (down/distance/yard line), last play visible without scrolling.

The current Phase 2 MVP UI is functionally complete but **UX is unacceptable** for game-speed tagging (text fields, +/- steppers, nested scroll, players only after type+result).

## What is already done (keep)

- Phase 1: Platform Postgres + web `/game/[slug]`, game create on web.
- Phase 2 backend: expo-sqlite, milestone publish to sync API (`lib/sync/`, `lib/db/`), Expo SDK 54, monorepo metro/babel fixes.
- Shared: `PlaylistData`, `defaultKickoffPlay`, play # join key.
- Mobile: home, new game, tagging route `app/game/[id].tsx`, sync bar ("N plays to sync"), resume game, kickoff as play #1 default.
- Player fields exist in data model: kicker, returner, returnYards, kickYards, tackler1/2, passer, receiver, rusher, etc.

## Known issues to fix in UI (not necessarily in sync)

- iPad physical device: use **LAN** `EXPO_PUBLIC_SYNC_API_URL` (not `127.0.0.1`). Web live link uses Mac LAN IP for port 3000 — see [dev-quickstart.md](./dev-quickstart.md) and [cloud-sync.md](./cloud-sync.md).
- Web and iPad only match when opening the **same game slug** shown on the tagger.
- Navigation: back from tagging should go home (`router.replace('/')`) — already fixed.

## Your mission this session

1. **Review the architecture plan** and propose a **screen-by-screen iPad tagging spec** (tap budget per play type: KO, run, pass, punt, FG, TD).
2. **Redesign `apps/mobile/app/game/[id].tsx`** (and extract components) implementing:
   - Fixed header: score, quarter (placeholder OK), play #, situation, sync status.
   - **Grid-based** play type + result (not horizontal chips).
   - **Yard line / gain / return yards**: preset tap grids (e.g. -10,-5,-3,0,3,5,10,15,20) not steppers.
   - **Jersey selection**: roster grid or numpad-style jersey picker — NO name typing during live tagging (optional long-press for name).
   - **Contextual player pads**: show kicker/returner/tacklers/rusher/passer blocks based on play type in same viewport.
   - **Kickoff-first flow**: play #1 opens in KO mode with kicker + return + return yards one tap away.
   - **Save play**: single large sticky footer button; haptic feedback if easy.
   - **Undo last play** (local SQLite delete + outbox reconcile) — highly desired.
3. Keep saving through existing `saveLocalPlay()` and `playlistDataSchema` validation.
4. Landscape-only; test on iPad simulator or device.
5. Deliver a short `docs/ipad-tagging-spec.md` with tap-count targets before or alongside implementation.

## Anti-patterns (do not ship again)

- TextInput for jersey/name as primary path during live tagging.
- Small +/- steppers for yards.
- Horizontal scrolling chip rows for type/result.
- Requiring type + result before showing player fields (players should appear in same glanceable layout).
- Deep vertical ScrollView as the main tagging surface.

## Reference: plan’s intended UX (quote)

From architecture plan:
- "Landscape-first layout; large tap targets"
- "Persistent game clock / quarter / score header"
- "One-screen tagging where possible (minimize modal depth — opposite of too many taps)"
- "Undo last play"

## Optional follow-ups (later sessions)

- Session B: Huddle screenshot comparison.
- Roster setup screen + jersey grid from `players` table.
- Phase 3 web dashboard polish.
```

---

## Session state (May 2026)

| Area | Status |
|------|--------|
| Phase 1 web + Postgres platform | Done |
| Phase 2 SQLite + milestone publish | Done (needs LAN IP on real iPad) |
| Phase 2 tagging UI | **Functional MVP, UX failed review** |
| PlaylistData fields | Wired in DB + sync; UI uses keyboard/steppers |

### Key files

| Path | Role |
|------|------|
| `apps/mobile/app/game/[id].tsx` | Main tagging screen — **redesign target** |
| `apps/mobile/components/ChipSelect.tsx` | Horizontal chips — replace |
| `apps/mobile/components/PlayPlayerFields.tsx` | Conditional player text inputs |
| `apps/mobile/lib/db/plays.ts` | `saveLocalPlay`, local storage |
| `packages/shared/src/index.ts` | Enums, `PlaylistData`, `defaultKickoffPlay` |
| `apps/sync-api` (platform) | `POST /v1/publish` ingest |

### User feedback (verbatim themes)

- "This is pretty bad" — referring to tagging layout with keyboard-heavy player entry.
- Needs kicker, returner, return yards, tacklers — **data paths exist**, presentation is wrong for speed.
- Wants next session to **review plan** and emphasize **very fast touch targets** under time pressure.

### Suggested UI architecture (for next agent to validate)

```
┌─────────────────────────────────────────────────────────────────┐
│ Sync bar · SHS 21-7 · Q2 · PLAY #12 · 2nd & 7 @ -32 (M)  [UNDO]│
├──────────────────────────────┬──────────────────────────────────┤
│  [Run] [Pass] [KO] [Punt]    │  Last 3 plays (compact)          │
│  [Rush] [Complete] [TD] ...  │                                  │
│                              │                                  │
│  Yards: [+3][+5][+10] [-2]... │                                  │
│                              │                                  │
│  Jersey pad (roster grid)    │                                  │
│  #12 #45 #3 ...              │                                  │
│                              │                                  │
│  [        SAVE PLAY        ] │                                  │
└──────────────────────────────┴──────────────────────────────────┘
```

---

## Dev setup reminder

```bash
# Platform (Postgres + sync API + web)
cd ~/huddlestat-platform && nvm use && npm run db:up && npm run db:migrate
npm run dev:sync   # terminal 1 — port 3001
npm run dev:web    # terminal 2 — port 3000

# Tagging (this repo)
cd ~/huddlestat-tagging && npm run dev:mobile:clear  # terminal 3
```

Physical iPad `.env` (see `apps/mobile/.env.example`):

```
EXPO_PUBLIC_SYNC_API_URL=http://<MAC_LAN_IP>:3001
EXPO_PUBLIC_SYNC_API_KEY=dev-sync-key
EXPO_PUBLIC_WEB_BASE_URL=http://<MAC_LAN_IP>:3000
```
