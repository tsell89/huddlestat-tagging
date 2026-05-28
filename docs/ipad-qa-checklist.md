# iPad QA — master checklist (batched session)

**Purpose:** One place to run **all** remaining Package I manual QA in as few iPad sessions as possible. Use with [ipad-qa-play-scripts.md](./ipad-qa-play-scripts.md) for step-by-step tags.

**Last iPad session:** 2026-05-27 ([package-i-qa-report.md](./package-i-qa-report.md)) — §2.4 Plays 1–6 pass; UX-14 fail on Play 6→7.

**This batch adds verification for:**

- UX-14 kickoff role after score (PR #9)
- Workstream 2A — 4th-down punt → Punt Rec + odk flip
- Workstream 2B — KO/punt return TD → ScoringPad
- Workstream 4 — GamePhaseBar, halftime catch-up, Start OT modal, auto score header

**Sign-off rule:** Mark each row **PASS** / **FAIL** / **SKIP** with date and branch. Do not mark full Package I ✓ in [ipad-tagging-spec.md](./ipad-tagging-spec.md) §11 until every **MUST** row passes or is explicitly waived.

---

## Session setup (every run)

| # | Check | Result | Notes |
|---|-------|--------|-------|
| S1 | `cd ~/huddlestat-tagging && nvm use` | | Node 20 |
| S2 | Metro on **8082** only (`apps/mobile`, `--lan`, no `--tunnel`) | | Not 8081 |
| S3 | iPad landscape · same Wi‑Fi · Expo Go Local Network | | |
| S4 | Fresh or continued game: team `SHS`, opponent `QA Test` | | Record game id / play count |
| S5 | Branch / commit under test recorded below | | |

**Branch under test:** _______________  
**Date:** _______________  
**Tester:** _______________

Setup details: [package-i-qa-walkthrough.md](./package-i-qa-walkthrough.md) Part 0–3.

---

## Play scripts (run in order)

Execute scripts **A → I** in one sitting if possible. Each script is self-contained; start a **new game** when a script says so.

| Script | Plays | Covers | Priority |
|--------|-------|--------|----------|
| [A](./ipad-qa-play-scripts.md#script-a--canonical-drive--ux-14-regression) | 1–8 | §2.4 + UX-14 kickoff flip | **MUST** |
| [B](./ipad-qa-play-scripts.md#script-b--our-td--xp--kickoff) | 1–4 | ScoringPad, our score → We kick | **MUST** |
| [C](./ipad-qa-play-scripts.md#script-c--opponent-fg--we-receive-kickoff) | 1–3 | Opponent score → We receive | **MUST** |
| [D](./ipad-qa-play-scripts.md#script-d--kickoff-return-td--scoringpad) | 1–3 | Return TD → XP → kickoff (2B) | **MUST** |
| [E](./ipad-qa-play-scripts.md#script-e--4th-down-punt--punt-rec-2a) | 1–4 | Punt flip odk D + Punt Rec | **MUST** |
| [F](./ipad-qa-play-scripts.md#script-f--phase-bar-halftime-ot) | — | Q1–OT, catch-up, score header | **MUST** |
| [G](./ipad-qa-play-scripts.md#script-g--live-ball-spot-checks) | 1–6 | INT, fumble, blocked FG, COP | Should |
| [H](./ipad-qa-play-scripts.md#script-h--jersey-grid--defaults) | 1–5 | D2 grid, UX-05/09 | Should |
| [I](./ipad-qa-play-scripts.md#script-i--edit--catch-up) | — | Edit play, catch-up insert | Should |

---

## A. Shell & sidebar (spec §1)

| ID | Check | Script | Result | Notes |
|----|-------|--------|--------|-------|
| A1 | 72/28 layout (pad left, sidebar right) | A | | |
| A2 | SAVE only bottom-right of sidebar | A | | |
| A3 | Last 2 plays visible and tappable | I | | |
| A4 | Catch-up missed play → insert → resume live | I | | |
| A5 | TaggingHeader situation line matches chain | A | | |
| A6 | Score in header updates on save (no confirm) | B, F | | Auto score workstream |

---

## B. Canonical drive (spec §2.4) — MUST PASS

| Play | Expected after save | Script | Result | Notes |
|------|---------------------|--------|--------|-------|
| 1 | `PLAY #2 · 1st & 10 @ -25`, Run pad | A | | KO return +20 |
| 2 | `PLAY #3 · 1st & 10 @ 25`, gain +50 | A | | |
| 3 | `PLAY #4 · 2nd & 10 @ 25` | A | | Incomplete setup |
| 4 | `PLAY #5 · 3rd & 8 @ 23` | A | | Short run +2 |
| 5 | `PLAY #6 · 4th & 13 @ 28`, Sack −5 | A | | Rusher+tackler only |
| 6 | `PLAY #7 · Kickoff @ -40`, Kickoff pad | A | | FG Good 38 yd |
| 7 | Kickoff pad shows **We kick** (not opening We receive) | A | | **UX-14** — PR #9 |

---

## C. Ball spot & down chain (spec §2.1–2.3)

| ID | Check | Script | Result | Notes |
|----|-------|--------|--------|-------|
| C1 | Tackle spot → read-only gain/loss | A | | Plays 2, 4, 5 |
| C2 | Next snap inherits end spot | A | | |
| C3 | Incomplete: gain 0, spot unchanged | A | | Play 3 |
| C4 | Kickoff touchback → Own 20 | G | | |
| C5 | Punt touchback → Own 20 | E/G | | |
| C6 | FG no good (field) → opponent @ LOS | G | | |
| C7 | FG no good (into EZ) → touchback Own 20 | G | | |
| C8 | Failed 4th → COP, flipped possession | G | | |

---

## D. KickoffPad (spec §4.1, Package G)

| ID | Check | Script | Result | Notes |
|----|-------|--------|--------|-------|
| D1 | We kick / We receive toggle works | A | | Play 1 receive |
| D2 | Return sliders + yards (+20) | A | | |
| D3 | **After our FG/XP/2pt Good → We kick** | A, B | | UX-14 |
| D4 | **After opponent FG/XP/2pt Good → We receive** | C | | |
| D5 | After blocked PAT (opp TD) → We receive | — | | Optional; unit-tested |
| D6 | Toggle persists across app relaunch | A | | Kill Expo Go, reopen game |
| D7 | OT XP Good → **not** kickoff; role unchanged | F | | HS OT possession |

---

## E. OffensePad (spec §4.2–4.6)

| ID | Check | Script | Result | Notes |
|----|-------|--------|--------|-------|
| E1 | Run/Pass/Sack + tackle spot | A | | |
| E2 | FG attempt distance (38 yd @ Opp 28) | A | | |
| E3 | Sack: rusher+tackler only | A | | |
| E4 | **4th in FG range → default FG pad** | A | | UX-11 — at Play 6 |
| E5 | 4th & 1–2 in FG range → default Run | — | | UX-12 |
| E6 | Punt not over-emphasized in FG range | — | | UX-13 |
| E7 | Situational PlayTypeRow tap sizes | — | | Visual |

---

## F. ScoringPad (spec §4.7, Package G)

| ID | Check | Script | Result | Notes |
|----|-------|--------|--------|-------|
| F1 | Rush TD → ScoringPad, Extra Pt preloaded | B | | |
| F2 | XP Good → kickoff, **We kick** | B | | |
| F3 | 2pt Good → kickoff | — | | Optional |
| F4 | Opponent TD → Extra Pt. Block preloaded | C/D | | odk D |
| F5 | XP block → kickoff, **We receive** | — | | Spec §10 |

---

## G. Live ball (Package H)

| ID | Check | Script | Result | Notes |
|----|-------|--------|--------|-------|
| G1 | INT return → COP @ return end | G | | |
| G2 | Fumble lost → turnover spot | G | | |
| G3 | Blocked FG → recovery spot | G | | |
| G4 | Penalty → replay down @ foul spot | G | | |

---

## H. Jersey grid & defaults (Package D2)

| ID | Check | Script | Result | Notes |
|----|-------|--------|--------|-------|
| H1 | Passer auto-default (#7 or game leader) | A, H | | Play 3 |
| H2 | **Run rusher auto-default** | H | | UX-05 |
| H3 | **Sack rusher = passer leader** | A, H | | UX-09 |
| H4 | Tackler grid: two-deep then usage | H | | UX-06 |
| H5 | Hero slot size matches grid | H | | UX-07 |

---

## I. Edit & catch-up

| ID | Check | Script | Result | Notes |
|----|-------|--------|--------|-------|
| I1 | Tap prior play → edit → save → chain OK | I | | |
| I2 | Catch-up insert mid-drive | I | | |
| I3 | Halftime catch-up banner + 2H kickoff hint | F | | |
| I4 | Edit last play (FG Good↔No Good) → kickoff role updates | I | | UX-14 edit path |

---

## J. Phase & OT (workstream 4)

| ID | Check | Script | Result | Notes |
|----|-------|--------|--------|-------|
| J1 | GamePhaseBar Q1–Q4 segments | F | | |
| J2 | Q2 → HALFTIME (no play row) | F | | |
| J3 | HALFTIME → Q3 + catch-up offer | F | | |
| J4 | Start OT modal: we/they ball first | F | | |
| J5 | OT XP Good → snap @ ±10, not kickoff | F | | |
| J6 | OT win → FINAL when score decisive | F | | Optional |

---

## K. Chain fixes (2A / 2B)

| ID | Check | Script | Result | Notes |
|----|-------|--------|--------|-------|
| K1 | 4th punt downed → next **Punt Rec**, odk **D** | E | | 2A |
| K2 | KO return `end:TD` → **ScoringPad** | D | | 2B |
| K3 | Punt return TD → ScoringPad | — | | Optional |

---

## UX backlog tracker

Copy failures into [package-i-qa-report.md](./package-i-qa-report.md) on session close.

| ID | Pri | Item | Re-test in | Result |
|----|-----|------|------------|--------|
| UX-01 | P1 | Opp territory `+25` in header | A Play 2 | |
| UX-02 | P1 | Yard notation aligned header/sidebar/slider | A | |
| UX-03 | P1 | Slider full-left = safety | G | |
| UX-04 | P1 | ±1 beside tackle slider | G | |
| UX-05 | P0 | Run rusher auto-default | H | |
| UX-06 | P1 | Tackler grid two-deep + usage | H | |
| UX-07 | P1 | Hero slot size | H | |
| UX-08 | P2 | Less empty space under grid | — | |
| UX-09 | P0 | Sack rusher = passer leader | A Play 5 | |
| UX-11 | P0 | 4th in FG range → FG pad default | A Play 6 | |
| UX-12 | P1 | 4th & 1–2 → Run default | — | |
| UX-13 | P2 | Punt de-emphasis in FG range | — | |
| UX-14 | P0 | Our score → We kick | A Play 7, B | |
| UX-16 | P1 | Larger sidebar play rows | — | |
| UX-17 | P1 | Show 3 previous plays | — | |
| UX-18 | P2 | 72/28 split revisit | — | |

---

## Report template (paste to Cursor after session)

```text
iPad QA batch — date: YYYY-MM-DD, branch: ______, game: ______

Script A: PASS/FAIL — notes
Script B: ...
...
Script I: ...

UX-14 Play 7: We kick shown? PASS/FAIL
Blockers:
Follow-ups:
```

---

## Related docs

- [ipad-qa-play-scripts.md](./ipad-qa-play-scripts.md) — step-by-step tags
- [package-i-qa-walkthrough.md](./package-i-qa-walkthrough.md) — beginner Metro setup + Script A detail
- [package-i-qa-report.md](./package-i-qa-report.md) — prior session results
- [ipad-tagging-spec.md](./ipad-tagging-spec.md) — source spec
- [game-phase-otux.md](./game-phase-otux.md) — phase/OT/score workstreams
