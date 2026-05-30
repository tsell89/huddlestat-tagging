# PBP exception UX (PBP-4)

Spec for gentle failure when the chain or mapper cannot confidently advance situation. **Implementation on iPad is deferred**; this document is the product contract for unsupported/ambiguous plays discovered via the [play-by-play test corpus](./play-by-play-test-corpus.md).

---

## Principles

1. **Never block save** — tagger can record the play and continue.
2. **Never silent wrong down/distance** — if chain is uncertain, show a banner; do not overwrite header with a guessed snap.
3. **Post-game fix path** — sidebar edit + export review; optional “chain mismatch” flag in QA export.

---

## Unsupported play types

Tag with `Result.Timeout` when Hudl-compatible, or leave `playType`/`result` empty and set game meta `unsupportedPlay: true` on the row.

| Play | Default pad | Banner copy |
|------|-------------|-------------|
| Kneel | Run · Rush (read-only gain) | “Kneel — verify down/distance after save.” |
| Spike | Pass · Incomplete | “Spike — clock play; check distance.” |
| Timeout | (no pad change) | “Timeout — next snap unchanged.” |
| Fair catch kick | Punt (closest) | “Fair catch kick not fully supported — fix post-game.” |
| Fake punt / fake FG | Punt / FG | “Fake kick — confirm result and ball spot.” |
| Onside kick (unusual) | Kickoff | “Onside kick — confirm receiving spot.” |
| HS OT new possession | Offense or Defense | “Overtime — 1st & goal from the 10. Confirm O/D.” |
| 2-min drill / clock-only | Offense | “Clock situation — confirm game clock in film.” |

---

## Ambiguous feed (mapper / import)

When CFBD (or other) text does not map cleanly:

- Show: **“Imported play unclear — set ball spot manually.”**
- Do not run `nextDraftAfterPlay` pre-fill for the *next* snap until user saves current play.
- Corpus: flag `review: true` in `expectations.jsonl`.

---

## Chain mismatch (replay found bug or edge)

After save, if internal QA detects `nextDraftAfterPlay` ≠ user’s next snap (dev-only or post-game):

- Show: **“Situation may not match previous play — tap last play in sidebar to fix.”**
- Pre-load catch-up with last play’s computed end spot as hint.

---

## Catch-up flow

Existing catch-up control remains primary path:

1. User taps **Catch-up missed play**.
2. Enters down, distance, yard line (or picks from film).
3. Save — chain resumes from that snap.

---

## Defaults when uncertain

| Context | Default |
|---------|---------|
| Unknown offensive snap | `1st & 10 @ Own 25` only if no prior play; else last play end spot |
| Unknown after score | Kickoff pad, **We kick** / **We receive** from last user choice (see UX-14) |
| Unknown after penalty | Replay same down at foul spot when `spotEncoding` has `foul:` |

---

## QA checklist (manual)

- [ ] Banner visible, SAVE still enabled
- [ ] Header not updated to wrong D/D after unsupported play
- [ ] Sidebar shows last saved play for edit
- [ ] Export row reflects what user saved, not auto-corrected chain
