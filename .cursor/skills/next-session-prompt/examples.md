# Next session prompt examples

## Good

Paste into your next agent:

```markdown
You are continuing work on **huddlestat-tagging** (branch `feat/ws4-quarter-break`).

## Goal
Implement quarter-break catch-up banners at Q1→Q2, Q3→Q4, and Q4→FINAL.

## Context
Repo: `huddlestat-tagging`. Read `docs/game-phase-otux.md` for locked WS order.

## Done
- WS3 corpus doc updated; `npm run test:pbp` green
- Kickoff role flip logic verified in `kickoffRoleResolve.ts`

## Next steps
1. Read `docs/game-phase-otux.md` locked kickoff section
2. Fix `startHalftimeCatchUp` in `apps/mobile/app/game/[id].tsx` — pre-fill opposite of opening `kickoff_role`
3. Add tests in `kickoffRole.test.ts` for 2H default
4. Run `npm run test --workspace=apps/mobile`

## Blockers / open questions
- `startHalftimeCatchUp` hardcodes `"receive"` — needs flip from stored opening role

## Files touched
- `apps/mobile/app/game/[id].tsx`
- `apps/mobile/lib/tagging/kickoffRoleResolve.ts`

## Attach in next session
- @AGENTS.md
- `docs/field-position-model.md`

## Git state
- Branch `feat/ws4-quarter-break`; changes uncommitted — do not commit unless asked

## Constraints
- Field position: 0–100 via `fieldPosition100.ts`
- Do not reorder workstreams; WS4 only
- Free CSV export must work without env vars

## Verify
`npm run test --workspace=apps/mobile` and manual Q2 transition in simulator
```

## Bad — prose only (no copy button)

Here's your continuation prompt:

You are continuing work on huddlestat-tagging. Next implement quarter-break catch-up...

## Bad — multiple blocks

```markdown
## Goal
Implement quarter-break catch-up.
```

```markdown
## Next steps
1. Fix startHalftimeCatchUp
```

## Bad — important context outside the block

The key file is `apps/mobile/app/game/[id].tsx` — make sure to fix `startHalftimeCatchUp`. Branch is `feat/ws4-quarter-break`.

```markdown
## Goal
Implement quarter-break catch-up.
...
```

## Bad — asks user to fix format

I didn't format that correctly. Attach @next-session-prompt again and I'll give you the block.

## Bad — executes instead of writing the prompt

I'll start on WS4 now by editing `startHalftimeCatchUp`...
