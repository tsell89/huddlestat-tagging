# Package I — iPad QA Report

**Date:** 2026-05-27  
**Branch:** `main` (post-D2 merge)  
**Repo:** `huddlestat-tagging`  
**Tester:** Cursor agent (automated + static review)  
**Device target:** Landscape iPad Pro · Expo Go (per `dev-quickstart.md`)

---

## Executive summary

| Layer | Result |
|-------|--------|
| `npm run test` | **PASS** — 39 tests (29 shared + 10 mobile) |
| `npm run typecheck` | **PASS** |
| Chain logic (§2.4 canonical drive) | **PASS** — unit tests |
| Manual iPad Expo Go session | **NOT RUN** — see blockers below |

**Overall Package I:** **Blocked on manual iPad pass.** Backend/chain logic and D2 jersey grid behavior are verified by tests and code review; tap UX, layout density, sidebar flows, and jersey grid refresh on device were not exercised on hardware in this session.

---

## Environment & setup

| Step | Status | Notes |
|------|--------|-------|
| `npm install` | ✓ | Completed at repo root |
| `npm run dev:mobile:clear` | ⚠ | Port **8081** occupied by another Expo instance (`HuddleStat/apps/mobile`, pid 10890). Alternate start on **8082** with Node 20 succeeded |
| Node version | ⚠ | `.nvmrc` requires **Node 20**; default shell had Node 18 → Metro `configs.toReversed is not a function`. Fix: `nvm use` before dev |
| Expo Go on iPad | ✗ | No physical iPad or iPad Simulator available in agent environment |
| Expo web | ✗ | Bundle fails: `Unable to resolve "./constants.js" from packages/shared/src/index.ts` |

**Dev server (when run with Node 20):** Metro at `http://localhost:8082` — scan QR from terminal for Expo Go on landscape iPad.

---

## Section results

### A. Shell & sidebar (§1)

| Check | Result | Evidence |
|-------|--------|----------|
| 72/28 layout | **PASS** (static) | `LAYOUT.taggingPadFlex: 0.72`, `playLogFlex: 0.28` in `layoutConstants.ts`; `[id].tsx` flex row |
| No pad ScrollView as primary surface | **PASS** (static) | No `ScrollView` under `components/tagging/`; pads use `flex: 1` + conditional sections |
| Save only bottom-right of sidebar | **PASS** (static) | `PlayLogSidebar` — `saveRow` with `justifyContent: "flex-end"` |
| Last 2 plays tappable | **PASS** (static) | `lastTwo = [...plays].reverse().slice(0, 2)` + `onSelectPlay` |
| Catch-up + resume live | **PASS** (static) | `handleCatchUp`, `resumeLiveTagging`, banners in sidebar |
| TaggingHeader down/distance/yard line | **PASS** (static) | `formatSituationLine(draft)` in header |
| **Manual tap/layout on iPad** | **NOT VERIFIED** | — |

### B. Canonical drive (§2.4) — MUST PASS

| Play | Result | Evidence |
|------|--------|----------|
| 1. KO return → Own 25, +20, 1st & 10 | **PASS** | `playChain.test.ts` — `advanceSituation` + `yardLineAfterPlay` |
| 2. Run Own 25 → Opp 25 (+50) | **PASS** | Same test suite |
| 3. Sack 3rd & 8 @ Opp 23, −5 → 4th & 13 @ Opp 28 | **PASS** | Same test suite |
| 4. FG good → Kickoff pad | **PASS** | `nextDraftAfterPlay` → `PlayType.Kickoff`, `odk: Kicking` |
| **End-to-end on device** (sliders, save, header update) | **NOT VERIFIED** | Requires iPad session |

### C. Ball spot & down chain (§2.1–2.3)

| Check | Result | Evidence |
|-------|--------|----------|
| Tackle spot → gainLoss (read-only) | **PASS** (static) | `TackleSpotPanel` computes via `computeTackleGainLoss`; no gain slider |
| Next snap inherits end spot | **PASS** | `nextDraftAfterPlay` / `advanceSituation` tests |
| Incomplete/tipped: gainLoss=0, same spot, down+1 | **PASS** | `playChain.test.ts` incomplete/tipped suite |
| Touchbacks @ Own 20 (KO, punt, FG into EZ) | **PASS** | touchback + punt + FG no-good EZ tests |
| Failed 4th → auto COP | **PASS** | `normalizePlayOnSave` + failed 4th tests |
| Penalty: replay same down from foul spot | **PASS** | Package H holding penalty test |
| **Manual slider/header sync** | **NOT VERIFIED** | — |

### D. KickoffPad (§4.1, Package G)

| Check | Result | Evidence |
|-------|--------|----------|
| We kick / We receive toggle | **PASS** (static) | `KickoffTaggingPad` role row; `setKickoffRole` persists to SQLite `meta` |
| Return: caught + returned sliders | **PASS** (static) | `KickoffReturnSpotsPanel` when `Result.Return` |
| Touchback note | **PASS** (static) | Note shown; `touchbackDraftPatch` → Own 20 |
| Player slots + jersey grid | **PASS** (static) | kicker/returner/tackler slots + `JerseyQuickGrid` |
| **Toggle persistence across app restart** | **NOT VERIFIED** | Needs device + relaunch |

### E. OffensePad — Run/Pass/Punt/FG

| Check | Result | Evidence |
|-------|--------|----------|
| PlayTypeRow always visible | **PASS** (static) | `OffensePad` always renders `PlayTypeRow` |
| Run↔Pass mid-play preserves situation | **PASS** (static) | `applyPlayTypeChange` keeps down/distance/yardLine |
| Situational tap sizes | **PASS** (static) | `getPlayTypeTapSizes` + `PlayTypeRow` tier heights |
| RunPad results + tackle spot | **PASS** (static) | `RunPad` + `TackleSpotPanel` |
| PassPad all results incl. Sack | **PASS** (static) | `getAlternateResultsForPlayType(Pass)` |
| Sack: rusher not passer (UI slots) | **PASS** (static) | `visiblePlayerSlots`: Sack → `["rusher", "tackler1"]` only |
| Sack: no passer in saved row | **WARN** | `applyResultChange` does not clear `passer` when switching Complete→Sack; hidden in UI but may persist in CSV if passer was set earlier — **verify on iPad** |
| PuntPad variants | **PASS** (static) | Downed/Return/TB/Blocked/Penalty UI present |
| FGPad + attempt yards | **PASS** (static) | `fgAttemptYards(draft.yardLine)` displayed |
| **Tap size visual check on iPad** | **NOT VERIFIED** | — |

### F. ScoringPad (Package G)

| Check | Result | Evidence |
|-------|--------|----------|
| Rush TD / Complete TD → ScoringPad | **PASS** | `nextDraftAfterPlay` TD tests |
| XP/2pt Good → Kickoff | **PASS** | scoring → kickoff tests |
| Block variants → Kickoff | **PASS** | XP block / 2pt block tests |
| XP ↔ 2pt toggle | **PASS** (static) | `ScoringPad` type row |
| **Manual TD → XP flow** | **NOT VERIFIED** | — |

### G. Live ball (Package H)

| Check | Result | Evidence |
|-------|--------|----------|
| INT → COP @ return end, odk flip | **PASS** | Package H test |
| Fumble lost vs offense recovery | **PASS** | Package H tests |
| Blocked punt/FG recovery | **PASS** | Package H tests |
| FG no good field vs into EZ | **PASS** | Package H tests |
| **Manual spot panels on iPad** | **NOT VERIFIED** | — |

### H. Jersey grid & passer default (Package D2)

| Check | Result | Evidence |
|-------|--------|----------|
| Early game POSITION_GROUPS two-deep | **PASS** | `jerseyGridRank.test.ts` — passer slots `["7", "12"]` |
| Hero ~2× cells for frequent jerseys | **PASS** (static) | `JerseyQuickGrid` tier styles; rusher tier thresholds tested |
| One Hero tackler cap | **PASS** | `caps tackler hero to one jersey` test |
| Passer leader pre-fill on new PassPad snap | **PASS** | `applyPasserLeaderDefault` tests |
| Refill after Sack→Complete (passer-visible) | **PASS** | `refills passer after switching into a passer-visible result` test |
| Grid refreshes after SAVE without leaving screen | **PASS** (static) | `gamePlays` prop updates from `plays` state after save; `useMemo` on `buildJerseyGridRankings(gamePlays, …)` |
| Jersey tap auto-advances slot | **PASS** (static) | `OffensePlayerSection` + `KickoffTaggingPad` advance to `visibleSlots[idx + 1]` |
| **Visual Hero sizing on iPad** | **NOT VERIFIED** | — |

### I. Regression checks

| Check | Result | Evidence |
|-------|--------|----------|
| Edit last 2 plays + save + resume live | **PASS** (static) | `handleSelectPlay`, `handleSavePlay` edit branch, `resumeLiveTagging` |
| Catch-up tags missed play then resume | **PASS** (static) | `handleCatchUp` + save clears catch-up |
| `npm run test` | **PASS** | 39/39 |
| `npm run typecheck` | **PASS** | mobile + shared |
| **Manual edit/catch-up on device** | **NOT VERIFIED** | — |

---

## Spec §10 open questions encountered

| Question | Hit during QA? | Notes |
|----------|----------------|-------|
| XP attempt yard line: Hudl −3 vs +3 | **Yes (observed)** | Tests and `applyScoringPlayTypeChange` use **`yardLine: 3`** (positive) for offense XP. Confirm against Hudl export before production CSV push |
| After opponent TD + our XP block: who kicks off? | **No** | Not exercised |
| 2pt player slot matrix | **No** | ScoringPad shows kicker slot only for XP/2pt Good |
| Auto COP saved row: `result: COP` only | **Yes (confirmed in tests)** | `normalizePlayOnSave` sets `result: COP` on failed 4th; no separate play-type change |

Additional gap (not in §10): **Kickoff return TD → ScoringPad** listed in §6 remaining gaps — not tested.

---

## Blockers for Package I sign-off

1. **Manual iPad Expo Go session not completed** in this environment (no device/simulator).
2. **Dev friction:** run `nvm use` (Node 20) before `npm run dev:mobile:clear`; resolve port 8081 conflict or use `--port 8082`.
3. **Optional verify:** Sack save row should not include stale `passer` jersey if user switched from Complete → Sack.

---

## Manual acceptance script (§2.4 on iPad)

**Full beginner walkthrough:** [package-i-qa-walkthrough.md](./package-i-qa-walkthrough.md) — use this with Cursor step-by-step.

Quick summary: 6 saves (2 setup + 4 spec) on port **8082**, fresh game, landscape iPad + Expo Go.

---

## Screenshots

None captured — manual session not run.
