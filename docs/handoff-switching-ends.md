# Handoff: Switching ends (defending end + slider flip)

> **Field / yard math:** [field-position-model.md](field-position-model.md) is canonical. Defending end is **UI orientation only**.

## Model

- `DefendingEnd = "left" | "right"` — device-relative end our team defends
- Meta: `defending_end:{gameId}`, `opening_defending_end:{gameId}`
- `orientedRatio(mathRatio, defendingEnd)` — mirror when defend right
- Hudl / 0–100 math unchanged

## Key files

| Path | Role |
|------|------|
| `apps/mobile/lib/tagging/defendingEnd.ts` | Pure helpers + quarter-break flip |
| `apps/mobile/lib/tagging/defendingEndPersist.ts` | SQLite meta |
| `apps/mobile/components/tagging/FieldPositionSlider.tsx` | Mirror track + end actions |
| `apps/mobile/components/tagging/DirectionOfPlayControl.tsx` | Teams + LOS + arrow |
| `apps/mobile/app/game/[id].tsx` | Lifecycle wiring |

## Declare moments

Opening (kick pad) → Q1/Q2 & Q3/Q4 auto-flip → HALFTIME redeclare (default = opening end) → OT modal (ball + end).

**Quarter geometry:** Q1 opening → Q2 opposite → Q3 opening → Q4 opposite.
