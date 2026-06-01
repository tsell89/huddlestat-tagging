# Handoff: Kickoff sliders (READ THIS FIRST)

> **For the next agent.** The user is blocked on kickoff UX. Do NOT re-scaffold sync API, Postgres platform, or PlaylistData. Fix the kickoff slider UI only, using this spec exactly.

> **Field / yard math:** [field-position-model.md](field-position-model.md) is canonical (0–100 axis, Hudl −49…50…+49, **0** = TD or safety).

---

## Copy-paste prompt for next session

```
Continue HuddleStat kickoff tagging at /Users/tsellhorn/HuddleStat.

READ FIRST:
1. docs/handoff-kickoff-sliders.md  ← THIS FILE (slider spec is law)
2. docs/handoff-ipad-tagging-ui.md
3. apps/mobile/lib/tagging/kickoffReturn.ts
4. apps/mobile/components/tagging/FieldPositionSlider.tsx
5. apps/mobile/components/tagging/KickoffReturnSpots.tsx
6. apps/mobile/components/tagging/KickoffTaggingPad.tsx

Mission: Fix kickoff caught-at and returned-to sliders per the spec below.
Integrate Touchback (far left) and Touchdown (far right) on the slider row.

Do NOT change sync API / PlaylistData schema.
Display own territory as "Own 5" never "-5".
Hudl export still uses signed integers (-5, 25, etc.) in playlistDataSchema.

Test: Play #1 kickoff, Return flow, default Own 5 caught → Opp 25 returned = +30 yards.
```

---

## The slider spec (non-negotiable)

Both **Caught at** and **Returned to** use the **same field track**:

```
Touchback          Caught / Returned slider track                    Touchdown
[  TB  ]    -1  ···  -5  ···  -7  ···  |  50  |  ···  +1    [  TD  ]
  ↑ LEFT END                              ↑ MID                              ↑ RIGHT END
```

### Track endpoints (left → right)

| Position on track | Display label | Hudl signed value (export) |
|-------------------|---------------|---------------------------|
| **Far left**      | −1 (own 1)    | `-1`                      |
| **Midpoint**      | 50            | `-50` (50-yard line)      |
| **Far right**     | +1 (opp 1)    | `+1`                      |

### Values between −1 and 50 (left half of track)

Own-territory catches/returns use **more negative** numbers toward midfield:

`-1, -2, -3, -4, -5, -6, -7, … -49, -50`

- **Default caught at: −5** → display **"Own 5"**, thumb in the **left half** (between −1 and 50)
- Typical catch zone: **−5 to −15** (don't need tick marks for every yard)

### Values between 50 and +1 (right half of track)

`-50, -49, … -1, then cross to +1` — actually after midpoint (-50), values go toward opponent: `+1, +2, … +49, +50`

For **returned to**, typical end zone: **+20 to +45**; default **+25** ("Opp 25")

### Ratio math (implement exactly)

One slider, ratio `r` from 0 (left) to 1 (right):

```typescript
// LEFT HALF: r in [0, 0.5]  →  yardLine from -1 to -50
if (r <= 0.5) {
  const t = r / 0.5;
  yardLine = Math.round(-1 + t * (-50 - (-1)));  // -1 + t * (-49)
}
// RIGHT HALF: r in (0.5, 1]  →  yardLine from -50 to +1
else {
  const t = (r - 0.5) / 0.5;
  yardLine = Math.round(-50 + t * (1 - (-50)));  // -50 + t * 51
}
```

Inverse (yardLine → ratio): piecewise inverse of above.

**Verify defaults:**
- `caughtAt = -5` → `r ≈ 0.04` (near left, just right of −1) ✓
- `returnedTo = +25` → on right half, `r ≈ 0.75` ✓

### Display rules

| Signed value | UI must show |
|--------------|--------------|
| `-5`         | **Own 5**    |
| `-50`        | **50**       |
| `+25`        | **Opp 25**   |
| `-1`         | **Own 1** or **−1** at tick only |
| `+1`         | **Opp 1** or **+1** at tick only |

Never show `-5` as the primary value when meaning own 5.

---

## Touchback & Touchdown on the slider row

User wants **endpoint buttons on the same row as the slider**, not separate result chips:

| Button | Position | Effect |
|--------|----------|--------|
| **Touchback** | Far **left** of slider track | Result = Touchback; **hide both sliders**; no catch/return yards; kicker only |
| **Touchdown** | Far **right** of slider track | Return end = TD; compute `returnYards = 50 - caughtAt` (or to goal); may hide returned-to thumb |

Keep **Penalty** as a small result option if needed, or long-press — ask user if unclear.

Current UI has separate **Return / Touchback / Penalty** chips above the sliders — user wants Touchback/TD **on the slider ends** instead of (or in addition to?) those chips. **Prefer replacing** Touchback/TD from the chip row with endpoint buttons.

---

## Field coordinate model (1–100) — use for all yard math

Compute distance on a **single 1–100 axis** (own goal → opponent goal). Map to/from Hudl signed only at save/export/display.

| Position | Meaning | Hudl export |
|----------|---------|-------------|
| 1 | Own 1 | `-1` |
| 5 | Own 5 | `-5` |
| 25 | Own 25 | `-25` |
| 49 | Own 49 | `-49` |
| 50 | Midfield | **`50`** (not −50) |
| 51 | Opp 49 | `+49` |
| 52 | Opp 48 | `+48` |
| 75 | Opp 25 | `+25` |
| 99 | Opp 1 | `+1` |
| 100 | End zone (TD) | **`0`** (not +50; `spotEncoding` end token still `TD`) |

Hudl range: **−49 … −1 → 50 → +49 … +1**, plus **0** for touchdown.

```typescript
hudlToFieldPosition(-5)   // 5
hudlToFieldPosition(50)   // 50 (midfield)
hudlToFieldPosition(+25)  // 75
fieldPositionToHudl(100)  // 0 (TD export)
fieldPositionToHudl(51)   // +49
```

Implementation: [`apps/mobile/lib/tagging/fieldPosition100.ts`](../apps/mobile/lib/tagging/fieldPosition100.ts)

## Return yards

Always computed on the 1–100 axis, never manually entered:

```
returnYards = fieldPosition(returnEnd) - fieldPosition(caughtAt)
```

Examples:
- **Own 5 → Own 25**: `25 - 5` = **20**
- **Own 5 → Opp 25** (`+25` / pos 75): `75 - 5` = **70**
- **Own 5 → TD**: `100 - 5` = **95** (not `50 - caughtAt`)

Touchback: `returnYards = 0`, no catch/return spots

**Next play yard line** = Hudl encoding of **return end spot** (from `spotEncoding`), not kick line + return yards.

---

## Player flow (working — don't break)

On kickoff **Return** (not touchback):

1. **Kicker** → jersey grid → auto-advance
2. **Returner** → jersey grid → auto-advance  
3. **Tackler** (tackler1) → optional **Tackler** (tackler2)

Slots in `playConfig.ts`: `["kicker", "returner", "tackler1", "tackler2"]` for KO + Return.

Both tackler slots labeled **"Tackler"**.

---

## What went wrong (don't repeat)

| Attempt | Problem |
|---------|---------|
| Full −50..+50 linear one segment | Caught slider felt backwards; wrong ticks |
| Left=50, Right=Own 1 only for caught | Inverted geography vs user mental model |
| Showing `-5` in UI | User wants **Own 5** |
| Separate TD button under returned-to | User wants TD on **far right of track** |
| Separate Touchback chip | User wants TB on **far left of track** |

The **piecewise −1 / 50 / +1 mapping** (ratio math above) was close in an earlier iteration; the bug was **display** (−5 vs Own 5) and **tick orientation**, not the idea of three anchors.

---

## Files to edit

| File | Action |
|------|--------|
| [`apps/mobile/lib/tagging/kickoffReturn.ts`](apps/mobile/lib/tagging/kickoffReturn.ts) | Replace ratio functions with piecewise spec above; `formatFieldPosition()` |
| [`apps/mobile/components/tagging/FieldPositionSlider.tsx`](apps/mobile/components/tagging/FieldPositionSlider.tsx) | Ticks: −1, 50, +1; optional TB/TD slot props on ends |
| [`apps/mobile/components/tagging/KickoffReturnSpots.tsx`](apps/mobile/components/tagging/KickoffReturnSpots.tsx) | Layout: TB — caught slider — returned slider — TD |
| [`apps/mobile/components/tagging/KickoffTaggingPad.tsx`](apps/mobile/components/tagging/KickoffTaggingPad.tsx) | Remove redundant TB/TD/Return chips if integrated into slider row; keep Penalty? |
| [`apps/mobile/components/tagging/ReturnedToControl.tsx`](apps/mobile/components/tagging/ReturnedToControl.tsx) | Merge into unified kickoff field component or delete |

---

## Header (working)

Kickoff play #1 shows **`Kickoff @ -40`** — NOT `0 & 0 @ -40 (M)`.

See [`apps/mobile/lib/tagging/formatSituation.ts`](apps/mobile/lib/tagging/formatSituation.ts).

---

## Sidebar (working — don't break)

- 72/28 split
- **Save play** bottom-right in sidebar only
- Last **2 plays**, catch-up button, resume live when editing

---

## ASCII target layout (one screen)

```
┌─ PLAY #1 · Kickoff @ -40 ────────────────────────────────────────┐
│ [Penalty?]                                                          │
├─────────────────────────────────────────────────────────────────────┤
│ 1 · CAUGHT AT                                          Own 5       │
│ [Touchback]  ●━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━  [Touchdown] │
│               −1              50                            +1    │
│                                                                     │
│ 2 · RETURNED TO                                       Opp 25       │
│ [Touchback]  ━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━  [Touchdown] │
│               −1              50                            +1    │
│                                                                     │
│ RETURN YARDS                                              +30      │
│ [Kicker] [Returner] [Tackler] [Tackler]                             │
│ Jersey grid…                                                        │
└─────────────────────────────────────────────────────────────────────┘
```

(User may want **one** slider row with TB/TD only on returned-to, or TB/TD on both — clarify: TB likely applies to whole play, TD to return end. Sensible default: **one play row** with TB left / TD right wrapping **both** sliders or only the return slider.)

---

## Defaults

| Field | Signed | Display |
|-------|--------|---------|
| Kick line (header) | -40 | Kickoff @ -40 |
| Caught at | -5 | Own 5 |
| Returned to | +25 | Opp 25 |
| Return yards | 30 | +30 |

---

## Test checklist

- [ ] Caught default Own 5: thumb near **left** end (between −1 and 50), label says **Own 5**
- [ ] Drag toward −1: deeper into own territory
- [ ] Drag toward 50: toward midfield
- [ ] Returned default Opp 25: thumb in **right half** (past 50 mark)
- [ ] Touchback left: no sliders, kicker only, save works
- [ ] Touchdown right: return yards computed, no manual yards
- [ ] Kicker → Returner → Tackler flow intact
- [ ] Save → SQLite + outbox unchanged

---

## Decision log

| Date | Note |
|------|------|
| 2026-05-25 | User rejected linear CAUGHT_MIN=-50 left, CAUGHT_MAX=-1 right |
| 2026-05-25 | User wants −1 left, 50 center, +1 right, piecewise mapping |
| 2026-05-25 | TB button far left, TD button far right on slider row |
| 2026-05-25 | Session ended — handoff for fresh agent |
