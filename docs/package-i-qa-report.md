# Package I — iPad QA Report

**Automated review date:** 2026-05-27  
**Manual iPad session date:** 2026-05-27  
**Branch:** `main` @ `7c80456` (Metro shared-package fix, tackle slider drag, QA docs)  
**Repo:** `huddlestat-tagging`  
**Game:** SHS vs QA Test (continued session; Play 1 from prior pass)  
**Device:** Landscape iPad · Expo Go · LAN `exp://<mac-ip>:8082` (no `--tunnel`)

---

## Executive summary

| Layer | Result |
|-------|--------|
| `npm run test` | **PASS** — 39 tests (29 shared + 10 mobile) |
| `npm run typecheck` | **PASS** |
| Chain logic (§2.4) | **PASS** — unit tests |
| Manual §2.4 canonical drive (iPad) | **PASS** — Plays 1–6 saved; headers, gains, pads verified |
| Manual spec §A–I (full checklist) | **NOT RUN** — session stopped after §2.4 |
| Kickoff role after our FG (Play 6→7) | **FAIL** — see [UX-14](#ux-backlog-manual-session-2026-05-27); **fix merged PR #9 — re-test Script A Play 7** |

**Package I sign-off:** **§2.4 acceptance met on device.** UX-14 fix pending re-test. Full Package I (scripts A–I on iPad) tracked in [ipad-qa-checklist.md](./ipad-qa-checklist.md). Do not treat as full Package I ✓ in `ipad-tagging-spec.md` §11 until checklist MUST rows pass or explicit scope waiver.

---

## Manual iPad session — §2.4 only

Connection: `REACT_NATIVE_PACKAGER_HOSTNAME=$(ipconfig getifaddr en0) npx expo start --clear --lan --port 8082`. Convex unset (expected). Offline OK.

| Play | Tag | Device result | Notes |
|------|-----|---------------|-------|
| 1 | KO return Own 5→Own 25, +20 | **PASS** | Prior session; not re-tested |
| 2 | Run Own 25→Opp 25, +50 | **PASS** | Tackle slider drag to Opp 25 verified (`FieldPositionSlider` fix) |
| 3 | Pass incomplete @ Opp 25 | **PASS** | → `PLAY #4 · 2nd & 10 @ 25`; passer #7 auto-filled |
| 4 | Run +2 to Opp 23 | **PASS** | → `PLAY #5 · 3rd & 8 @ 23` |
| 5 | Pass sack −5 to Opp 28 | **PASS** | Rusher+tackler slots only; → `PLAY #6 · 4th & 13 @ 28` |
| 6 | FG good 38 yd | **PASS** | → `PLAY #7 · Kickoff @ -40`; Kickoff pad shown |
| 7 | (post-FG kickoff draft) | **PARTIAL** | Pad routing correct; **We receive** shown — should be **We kick** after our FG ([UX-14](#ux-backlog-manual-session-2026-05-27)) |

Play 7 was not required to save for §2.4 acceptance; kickoff-role defect recorded from post–Play 6 screen.

---

## Environment & setup

| Step | Status | Notes |
|------|--------|-------|
| `git pull origin main` | ✓ | At `7c80456` |
| Node 22 (`nvm use`) | ✓ | Required before Metro |
| Expo LAN port **8082** | ✓ | Do not use 8081 (wrong repo) or `--tunnel` (ngrok body error) |
| Expo Go Local Network | ✓ | User-enabled on iPad |
| Convex / sync rebuild | — | Intentionally skipped per QA scope |
| Prior automated-only rows | ✓ | `npm install`, typecheck, unit tests unchanged from 2026-05-27 agent review |

---

## Section results (automated + manual where noted)

Legend: **(device)** = verified this iPad session · **(static)** = code review only · **(unit)** = `playChain.test.ts`

### A. Shell & sidebar (§1)

| Check | Result | Evidence |
|-------|--------|----------|
| 72/28 layout | **PASS** (static) | `layoutConstants.ts` |
| Save bottom-right of sidebar | **PASS** (device) | Used for all §2.4 saves |
| Last 2 plays tappable | **PASS** (static) | Not re-tested on device |
| Catch-up + resume live | **PASS** (static) | Not exercised |
| TaggingHeader situation line | **PASS** (device) | Matches expected through Play 6 |
| Sidebar information density | **FAIL** (UX) | [UX-16](#ux-backlog-manual-session-2026-05-27)–[UX-18](#ux-backlog-manual-session-2026-05-27) |
| Full §1 manual checklist | **NOT RUN** | — |

### B. Canonical drive (§2.4) — MUST PASS

| Play | Result | Evidence |
|------|--------|----------|
| 1–6 chain | **PASS** (unit) | `playChain.test.ts` |
| 1–6 end-to-end on iPad | **PASS** (device) | [Manual §2.4 table](#manual-ipad-session--24-only) |
| Post-FG kickoff role default | **FAIL** (device) | [UX-14](#ux-backlog-manual-session-2026-05-27) |

### C. Ball spot & down chain (§2.1–2.3)

| Check | Result | Evidence |
|-------|--------|----------|
| Tackle spot → gainLoss | **PASS** (device) | +50, +2, −5 on Plays 2, 4, 5 |
| Next snap inherits end spot | **PASS** (device) | Headers advanced correctly |
| Remaining §C cases (TB, COP, penalties, etc.) | **PASS** (unit) / **NOT RUN** (device) | — |

### D. KickoffPad (§4.1, Package G)

| Check | Result | Evidence |
|-------|--------|----------|
| We kick / We receive toggle | **PASS** (device) | Play 1 used receive; persists in SQLite meta |
| Return sliders + yards | **PASS** (device) | Play 1 prior session |
| **Auto role after our score** | **FAIL** (device) | Persisted `receive` applied after FG Good; no flip on save — `withKickoffRole` in `app/game/[id].tsx` |
| Toggle persistence across relaunch | **NOT RUN** | — |

### E. OffensePad — Run/Pass/Punt/FG

| Check | Result | Evidence |
|-------|--------|----------|
| Run/Pass/Sack pads + tackle spot | **PASS** (device) | Plays 2–5 |
| FG attempt 38 yd @ Opp 28 | **PASS** (device) | Play 6 |
| Sack UI slots (no passer/receiver) | **PASS** (device) | Play 5 |
| Sack stale `passer` in saved row | **NOT OBSERVED** | Drive used Incomplete then Sack, not Complete→Sack; prior WARN still applies if that path is used |
| 4th-down default pad (FG vs Run) | **FAIL** (UX) | [UX-11](#ux-backlog-manual-session-2026-05-27)–[UX-13](#ux-backlog-manual-session-2026-05-27) |
| Situational tap sizes visual | **NOT RUN** | — |

### F–I. Scoring, live ball, jersey grid, regression

| Area | Manual iPad this session |
|------|---------------------------|
| F ScoringPad (TD→XP) | **NOT RUN** |
| G Live ball (INT, fumble, blocked) | **NOT RUN** |
| H Jersey grid / defaults | **PARTIAL** — passer default on Pass (Play 3); tackler grid usage growth (Play 5); rusher often empty on Run ([UX-05](#ux-backlog-manual-session-2026-05-27), [UX-09](#ux-backlog-manual-session-2026-05-27), [UX-07](#ux-backlog-manual-session-2026-05-27)) |
| I Edit / catch-up regression | **NOT RUN** |

Automated/unit results for F–I unchanged from earlier 2026-05-27 review (all **PASS** in CI).

---

## UX backlog (manual session 2026-05-27)

Product follow-ups from iPad QA. **Not** §2.4 blockers unless marked **defect**.

| ID | Pri | Item | Session note |
|----|-----|------|----------------|
| UX-01 | P1 | Header/play log: show **`+25`** in opponent territory (not bare `25`) | After Play 2 |
| UX-02 | P1 | Align yard notation across header, sidebar, sliders | Extends UX-01 |
| UX-03 | P1 | Tackle slider: full-left = **safety**; remove always-on Safety button | Plays 4–5 |
| UX-04 | P1 | **±1** step buttons beside tackle slider for fine-tuning | Plays 4–5 |
| UX-05 | P0 | **Run · Rush:** auto-default **rusher** (top ball carrier / usage) | Often `—` until manual tap |
| UX-06 | P1 | **Tackler:** all roster jerseys reachable; prioritize two-deep then usage (D2) | Play 5 |
| UX-07 | P1 | Match **hero slot button** size to usage-weighted grid cells (tackler) | Play 5 |
| UX-08 | P2 | Reduce empty space under jersey grids on pads | Throughout |
| UX-09 | P0 | **Pass · Sack:** default **rusher** = game passer leader | #7 expected; sometimes empty at first |
| UX-11 | P0 | **4th in FG range** (e.g. 4th & 13 @ 28): default **FG**, not Run · Rush | After Play 5 |
| UX-12 | P1 | Default **Run** on 4th only for **4th & 1** or **4th & 2** in FG territory | Spec routing gap |
| UX-13 | P2 | Do not over-emphasize **Punt** on short 4th in FG range | — |
| UX-14 | **P0** | **defect:** After **our** FG/XP/2pt Good → next kickoff **We kick** (flip); not persisted opening choice | Play 6→7; fix in PR #9 — **re-test** [Script A Play 7](./ipad-qa-play-scripts.md#script-a--canonical-drive--ux-14-regression) |
| UX-16 | P1 | Sidebar: **larger** previous-play rows, **more fields** per play | End of session |
| UX-17 | P1 | Show **3** previous plays (not 2) when space allows | End of session |
| UX-18 | P2 | Revisit 72/28 split if needed for sidebar density | Related to UX-16–17 |

**Related spec (already documented — not duplicated as new UX IDs):** D2 usage-weighted grid (§5), situational PlayTypeRow sizes (§4.2), kickoff toggle persistence (§4.1), sack stale passer WARN (§E — not hit this drive).

**Next engineering (separate initiative):** Real-game PBP test corpus for chain regression — planning only; not part of this report.

---

## Spec §10 open questions

| Question | Hit during QA? | Notes |
|----------|----------------|-------|
| XP yard line Hudl −3 vs +3 | No (device) | — |
| After opponent TD + our XP block: who kicks off? | No | Tied to [UX-14](#ux-backlog-manual-session-2026-05-27) for our-score case |
| 2pt player slot matrix | No | — |
| Auto COP `result: COP` only | Yes (unit) | Unchanged |

---

## Blockers & dev notes

| Item | Status |
|------|--------|
| Manual §2.4 on iPad | **Cleared** |
| Full Package I A–I on iPad | **Open** |
| `nvm use` before Metro | Still required |
| Port 8082 / no tunnel | Documented in [package-i-qa-walkthrough.md](./package-i-qa-walkthrough.md) |

---

## Manual acceptance script

**Walkthrough (Script A):** [package-i-qa-walkthrough.md](./package-i-qa-walkthrough.md)  
**Full batched checklist:** [ipad-qa-checklist.md](./ipad-qa-checklist.md)  
**Play scripts A–I:** [ipad-qa-play-scripts.md](./ipad-qa-play-scripts.md)

---

## Screenshots

User-provided iPad screenshots from 2026-05-27 session (Plays 2–7, home screen). Not committed to repo.
