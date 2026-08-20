# iPad QA — batched play scripts

Step-by-step tags for [ipad-qa-checklist.md](./ipad-qa-checklist.md). Report each script PASS/FAIL with header text and pad name after every save.

**Convention:** `@ -25` = Own 25, `@ 25` = Opp 25 (Hudl header). Sliders use friendly labels (`Own 25`, `Opp 28`).

---

## Script A — Canonical drive + UX-14 regression

**Game:** New · SHS vs QA Test · opening kickoff role **We receive** (Play 1).

| Play | Situation | Tag steps | Expected after save |
|------|-----------|-----------|---------------------|
| **1** | KO @ Own 40 | We **receive** · Return · Caught Own 5 → Returned Own 25 · +20 · SAVE | `PLAY #2 · 1st & 10 @ -25` · Run pad · sidebar `Kickoff · Return (+20)` |
| **2** | 1st & 10 @ Own 25 | Run · Rush · Tackled **Opp 25** · gain **+50** · SAVE | `PLAY #3 · 1st & 10 @ 25` · Run |
| **3** | 1st & 10 @ Opp 25 | Pass · **Incomplete** · SAVE | `PLAY #4 · 2nd & 10 @ 25` · Run · passer default filled? (UX-09/H1) |
| **4** | 2nd & 10 @ Opp 25 | Run · Rush · Tackled **Opp 23** · gain **+2** · SAVE | `PLAY #5 · 3rd & 8 @ 23` |
| **5** | 3rd & 8 @ Opp 23 | Pass · **Sack** · Tackled **Opp 28** · gain **−5** · rusher slot only (no passer/receiver) · SAVE | `PLAY #6 · 4th & 13 @ 28` · note rusher default (UX-09) |
| **6** | 4th & 13 @ Opp 28 | **Pad default should be FG** (UX-11) · FG · Good · attempt **38 yd** · SAVE | `PLAY #7 · Kickoff @ -40` · **Kickoff pad** |
| **7** | Kickoff @ Own 40 | **Do not tap role yet** — verify toggle shows **We kick** (UX-14) · then tag TB or short return · SAVE | Next offense snap OR note kickoff role persisted |
| **8** | (optional) | Relaunch Expo Go · reopen same game · Play 7 draft still **We kick** (D6) | |

**UX-14 pass criteria:** Immediately after Play 6 save, Kickoff pad toggle = **We kick**, not **We receive** from opening coin toss.

---

## Script B — Our TD → XP → kickoff

**Game:** New · start mid-field or drive from Own 40.

| Play | Tag | Expected after save |
|------|-----|---------------------|
| **1** | Run · Rush · Tackled **Opp 5** (or use slider to goal line) · set tackle end **TD** if needed OR tackle at Opp 1 and mark TD per pad | **ScoringPad** · Extra Pt · odk O |
| **2** | Extra Pt · **Good** · SAVE | **Kickoff pad** · toggle **We kick** |
| **3** | Kickoff · Touchback (or return) · SAVE | Offense @ Own 20 or return end |
| **4** | Verify header score increased +6 then +1 silently | |

---

## Script C — Opponent FG → We receive kickoff

**Game:** New · use catch-up or fast-forward to opponent 4th in FG range, **or** tag defensive series manually.

| Play | Tag | Expected after save |
|------|-----|---------------------|
| **1** | Set odk **D** · opponent FG attempt · **Good** (odk D on FG row) · SAVE | **Kickoff pad** · toggle **We receive** |
| **2** | Kickoff · Return or Touchback · SAVE | Offense chain continues |
| **3** | (alt) Opponent TD (odk D Run TD) → Extra Pt Block · Blocked · SAVE | Kickoff · **We receive** |

---

## Script D — Kickoff return TD → ScoringPad

**Game:** New · We receive opening KO.

| Play | Tag | Expected after save |
|------|-----|---------------------|
| **1** | KO Rec · Return · Caught Own 5 → Returned **Opp 0 / TD** (use slider to opponent goal / TD end) · SAVE | **ScoringPad** · Extra Pt · odk O — **not** Run pad (2B) |
| **2** | Extra Pt · Good · SAVE | Kickoff · **We kick** |
| **3** | Optional punt return TD | Same ScoringPad routing |

---

## Script E — 4th-down punt → Punt Rec (2A)

**Game:** New · drive to **4th & short** in own territory (avoid FG range if testing punt default).

| Play | Tag | Expected after save |
|------|-----|---------------------|
| **1–3** | Runs/incompletes to **4th & 3 @ Own 35** (example) | |
| **4** | odk O · **Punt** · **Downed** at Opp 20 (set downed spot on punt pad) · SAVE | Next: **Punt Rec** · odk **D** · spot at downed location |
| **5** | Continue Punt Rec return or downed | Chain spot OK |

**Pass criteria:** After punt, header shows receiving team on defense (`odk D`), play type **Punt Rec**, not offensive Run.

---

## Script F — Phase bar, halftime, OT

**Game:** New or use phase bar on existing test game.

| Step | Action | Expected |
|------|--------|----------|
| F1 | Tap **Q1** active in GamePhaseBar | phase Q1, quarter 1 on saves |
| F2 | Tag 1–2 plays · verify header quarter badge | |
| F3 | Tap **Q2** → **HALFTIME** | phase HALFTIME · no new play row required |
| F4 | Tap catch-up / **Start 2nd half** | Halftime catch-up banner (PlayLogSidebar) |
| F5 | Tag 2H kickoff sequence (Own 40 · We receive) | quarter 3 on 2H plays |
| F6 | Tap **OT** → Start OT modal | Choose **We have ball first** |
| F7 | Tag OT snap @ Own 10 (or ±10 per rules) | quarter 5 · odk matches choice |
| F8 | Score TD → XP Good · SAVE | **Next = OT opponent possession @ ±10** · **not** kickoff (D7/J5) |
| F9 | Verify score header updates without confirm dialog | |

---

## Script G — Live ball spot checks

**Game:** New · one play per row (catch-up OK between).

| Play | Tag | Expected after save |
|------|-----|---------------------|
| G1 | Pass · INT · return to **Own 40** | COP · flipped odk · @ Own 40 |
| G2 | Run · Fumble · defense rec @ **Opp 30** | Turnover · @ Opp 30 |
| G3 | FG · No Good · **In field** | Opponent @ LOS (flipped) |
| G4 | FG · No Good · **Into end zone** | Touchback @ Own 20 |
| G5 | FG · Blocked · return to **Own 45** | Possession @ Own 45 |
| G6 | Run · short on **4th & 2** @ Opp 40 | COP · auto result · flipped |

---

## Script H — Jersey grid & defaults

**Game:** New · tag enough plays to build usage (or continue Script A game).

| Play | Tag | What to verify |
|------|-----|----------------|
| H1 | Pass · Incomplete ×3 with same passer jersey | Passer leader default on next Pass snap |
| H2 | Run · Rush ×5 same rusher jersey | Rusher appears in **hero** tier on Run pad (UX-05) |
| H3 | Pass · Sack | Rusher slot pre-filled with passer leader (UX-09) |
| H4 | Run · Rush · multiple tacklers over drive | Tackler grid boosts repeat jerseys (UX-06) |
| H5 | Compare hero slot button size to grid cells (UX-07) | Visual |

---

## Script I — Edit & catch-up

**Game:** Continue Script A game with ≥6 plays saved.

| Step | Action | Expected |
|------|--------|----------|
| I1 | Tap Play 4 in sidebar · change gain spot · SAVE | Chain from Play 6+ still coherent |
| I2 | **Catch-up missed play** · insert Play 3b · SAVE · **Resume live** | Play numbers/order OK |
| I3 | Edit **Play 6** FG Good → No Good · SAVE | Next snap = opponent @ LOS · **not** kickoff |
| I4 | Restore FG Good · SAVE | Play 7 kickoff · **We kick** again (UX-14 edit path) |

---

## Quick reference — kickoff role after score

| Saved play | Next is kickoff? | Toggle default |
|------------|------------------|----------------|
| Our FG / XP / 2pt **Good** (odk O) | yes | **We kick** |
| Our XP / 2pt **No Good** (odk O) | yes | **We kick** |
| Opponent FG / XP / 2pt **Good** (odk D) | yes | **We receive** |
| Our PAT **block** after opp TD (odk D) | yes | **We receive** |
| OT XP Good | no (OT possession) | unchanged |
| Rush TD row | no (ScoringPad) | unchanged |

Code: `resolveKickoffRoleAfterSave` in `apps/mobile/lib/tagging/kickoffRoleResolve.ts`.
