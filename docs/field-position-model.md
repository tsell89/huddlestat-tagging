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

- **Kickoff `completion`**: `end:TD` (touchdown) vs `end:SA` (safety) vs `end:-25` (yard line)
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

**Next play yard line** = where the return ended (`completion` / `ReturnEnd`), **not** kick line + `gainLoss`.

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

## Do NOT

- Use **−50** for midfield (use **50**)
- Use **+50** for goal line (use **0** with TD/SA in completion)
- Set next play to `yardLine + gainLoss` after kickoff return
- Show raw `-5` in UI when meaning Own 5 (use `formatFieldPosition`)

---

## Related docs

- [`handoff-kickoff-sliders.md`](handoff-kickoff-sliders.md) — slider UI spec
- [`handoff-ipad-tagging-ui.md`](handoff-ipad-tagging-ui.md) — layout / sidebar
