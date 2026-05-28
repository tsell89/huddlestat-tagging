# Overtime rules (tagging reference)

Huddlestat targets **high school** games first. College and NFL overtime are different models — do not reuse kickoff-chain logic for HS OT.

**Hudl spots:** See [field-position-model.md](./field-position-model.md). HS OT offense uses **Opp 10** (`yardLine` **+10**). When we defend, opponent is at **Own 10** (`yardLine` **−10**).

---

## High school (default product)

| Rule | Detail |
|------|--------|
| Structure | **Alternating possessions** — one series on offense, one on defense, repeat until someone wins |
| No kickoff | Possessions do **not** start with a kickoff (unlike college/NFL OT periods) |
| Starting spot | **Opponent 10-yard line** — 10 yards from the end zone you are attacking |
| Down & distance | **1st & goal from the 10** (`down: 1`, `distance: 10`) |
| End of series | Series ends on score, turnover on downs, or turnover (INT, fumble, etc.) |
| Winner | First lead after both teams have had an equal number of possessions, or second-team score that wins |

**Chain (when `meta.rules === "HS"` and `meta.overtime === true`):**

- After **TD → XP/2pt Good** (or block attempt complete): next snap is the **other team’s OT possession** at the 10 — not kickoff.
- Our offense next: `odk: O`, `yardLine: +10`, `1st & goal`, distance `10`.
- Our defense next: `odk: D`, `yardLine: -10`, `1st & goal`, distance `10` (opponent at our 10).

Constants: `HS_OT_OFFENSE_YARD_LINE`, `HS_OT_DEFENSE_YARD_LINE`, `HS_OT_DISTANCE` in `packages/shared/src/fieldPosition100.ts`.

**Not modeled yet:** coin toss, choosing offense/defense first, mercy if both score TD+XP each round, FG-only wins without a defensive stop, state-specific tie-breaker variants.

---

## NCAA (college)

| Rule | Detail |
|------|--------|
| Structure | OT **periods**; each team gets a possession from a defined spot (rules vary by era) |
| Recent CFP/NFL-style | Often **kickoff** or guaranteed possession from the 25 (check game year / level) |
| Corpus | `scenarios/overtime-ncaa-drive.json`, `games/cfbd-overtime-ncaa` use **kickoff → TB @ Own 20** as a simplified college-style anchor |

Do **not** map CFBD OT plays into HS OT spots without explicit `rules: NCAA` on the fixture.

---

## NFL

| Rule | Detail |
|------|--------|
| Structure | Modified sudden death with possessions; **kickoff** common between scores |
| Touchback | Often **25-yard line** (not HS Own 20) |
| Corpus | `scenarios/overtime-nfl-drive.json` tagged `rules: NFL`; chain still uses HS touchback until NFL spots are implemented |

---

## Fixture tagging

```json
{
  "rules": "HS",
  "overtime": true
}
```

| `rules` | OT behavior in replay tests |
|---------|---------------------------|
| `HS` | XP/2pt complete → alternating possession @ ±10 |
| `NCAA` | XP/2pt/FG complete → kickoff (simplified) |
| `NFL` | Same as NCAA in chain until NFL-specific spots exist |

---

## Related

- [play-by-play-test-corpus.md](./play-by-play-test-corpus.md) — `scenarios/overtime-hs-drive.json`
- [ipad-tagging-spec.md](./ipad-tagging-spec.md) §10 open questions — extend for HS OT UX (pad default, header copy)
