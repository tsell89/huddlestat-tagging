# Field position model (READ FIRST for tagging)

> **Canonical reference** for yard lines, return yards, and play-to-play chain advancement.
> Code: [`apps/mobile/lib/tagging/fieldPosition100.ts`](../apps/mobile/lib/tagging/fieldPosition100.ts)

---

## Two layers

| Layer | Purpose |
|-------|---------|
| **Internal 0–100** | All yardage math (return yards, next-ball spot, sliders) |
| **Hudl export** | Signed integers in playlist CSV (−49…50…+49, **0** for end zone) |

Never compute return yards with raw Hudl subtraction (`+25 − (−5)`). Always convert → subtract on 0–100 → convert back.

---

## Internal axis (offense marching toward opponent goal)

| Position | Meaning | Return yards example |
|----------|---------|----------------------|
| **0** | **Own end zone** (safety) | Caught Own 5 → Safety: `0 − 5` = **−5** |
| 1–49 | Own yard lines | Own 5 → Own 25: `25 − 5` = **20** |
| 50 | Midfield | |
| 51–99 | Opponent yard lines | Own 5 → Opp 25: `75 − 5` = **70** |
| **100** | **Opponent end zone** (TD) | Own 5 → TD: `100 − 5` = **95** |

---

## Hudl export mapping

| Internal pos | Hudl value | UI label |
|--------------|------------|----------|
| 0 | **0** | Safety (own EZ) |
| 1–49 | −1 … −49 | Own N |
| 50 | **50** | 50 (midfield — **not** −50) |
| 51–99 | +49 … +1 | Opp N |
| 100 | **0** | Touchdown (opp EZ) |

### Hudl **0** is overloaded

Both end zones export as **0**. Disambiguate with:

- **Kickoff `spotEncoding`**: `end:TD` (touchdown) vs `end:SA` (safety) vs `end:-25` (yard line)
- **`ReturnEnd.kind`**: `"touchdown"` | `"safety"` | `"yardline"`
- **`hudlToFieldPosition(0, "own")`** → 0 · **`hudlToFieldPosition(0, "opponent")`** → 100

---

## Kickoff return (quick reference)

| Control | Row | Effect |
|---------|-----|--------|
| Touchback | Caught at (left) | Play result = Touchback, no spots |
| Safety | Returned to (left) | Return end = own EZ, Hudl 0, negative return yards |
| Touchdown | Returned to (right) | Return end = opp EZ, Hudl 0, yards to goal |
| Sliders | Both | Caught / returned yard lines |

**Next play yard line** = where the return ended (`spotEncoding` / `ReturnEnd`), **not** kick line + `gainLoss`.

Defaults: caught **Own 5** (−5), returned **Own 25** (−25), return yards **+20**.

---

## API cheatsheet

```typescript
import {
  hudlToFieldPosition,
  fieldPositionToHudl,
  yardsAdvanced,
  yardsToOpponentGoal,
  yardsToOwnGoal,
} from "@/lib/tagging/fieldPosition100";

hudlToFieldPosition(-5);                    // 5
hudlToFieldPosition(0, "own");              // 0  (safety)
hudlToFieldPosition(0, "opponent");         // 100 (TD)
yardsAdvanced(-5, -25);                     // 20
yardsToOpponentGoal(-5);                    // 95
yardsToOwnGoal(-5);                         // -5
```

---

## High school overtime spots

HS overtime is **not** kickoff-based. Each possession starts **1st & goal from the opponent 10**:

| Role | Hudl `yardLine` | Meaning |
|------|-----------------|--------|
| Our offense | **+10** | Opp 10 |
| Our defense | **−10** | Opponent at our 10 |

See [overtime-rules.md](./overtime-rules.md).

---

## UI orientation (defending end)

Field-position **sliders may mirror** for the tagger’s device view. This is **not** the same as `EndZoneSide`.

| Concept | Meaning |
|---------|---------|
| **`defendingEnd: "left" \| "right"`** | Which **device** end (iPad landscape) **our team** defends this period |
| **`EndZoneSide`** | Disambiguates Hudl `0` (own safety vs opponent TD) for math/export |
| **Slider flip** | Visual only: when we defend right, track ratio mirrors (`displayRatio = 1 − mathRatio`); Safety/TD/Touchback buttons and −1/+1 ticks swap sides |

**Hudl CSV, `yardLine`, return yards, and play-chain math stay offense-relative** (own → opponent on 0–100). Flipping never remaps stored Hudl signs. Display labels stay “Own 5” / “Opp 25”.

Code: [`apps/mobile/lib/tagging/defendingEnd.ts`](../apps/mobile/lib/tagging/defendingEnd.ts), [`FieldPositionSlider`](../apps/mobile/components/tagging/FieldPositionSlider.tsx).

Declare moments: opening (with kick/receive), auto-flip Q1→Q2 and Q3→Q4, redeclare at HALFTIME→Q3 (default = opening end), OT start. See [game-phase-otux.md](./game-phase-otux.md).

---

## Do NOT

- Use **−50** for midfield (use **50**)
- Use **+50** for goal line (use **0** with TD/SA in `spotEncoding`)
- Set next play to `yardLine + gainLoss` after kickoff return
- Show raw `-5` in UI when meaning Own 5 (use `formatFieldPosition`)

---

## Related docs

- [`adr/0001-spot-encoding-field-name.md`](./adr/0001-spot-encoding-field-name.md) — `spotEncoding` vs pass `result`
- [`handoff-kickoff-sliders.md`](handoff-kickoff-sliders.md) — slider UI spec
- [`handoff-ipad-tagging-ui.md`](handoff-ipad-tagging-ui.md) — layout / sidebar
