# Play-by-play fixtures

Committed games and scenarios for chain replay tests. See [docs/play-by-play-test-corpus.md](../../../docs/play-by-play-test-corpus.md).

## Run tests

```bash
npm run test:pbp --workspace=@huddlestat/shared
```

## Games

| `gameId` | Source | Notes |
|----------|--------|-------|
| `hudl-spec-2-4` | Hudl-shaped | Spec §2.4 drive + we-kick return to Opp 25 + odk D +7 |
| `cfbd-chaos-penalties` | CFBD-derived | Penalty replay down; we-kick then odk D scrimmage |
| `cfbd-overtime-ncaa` | CFBD-derived | NCAA OT kickoff sequence |
| `cfbd-normal-drives` | CFBD-derived | Touchback, punt, they snap 1st & 10 @ Opp 20 |

## Licenses

- **Hudl exports:** your team data; redacted as `TEAM_A` in repo.
- **CFBD-derived JSONL:** derived subset; attribute [CollegeFootballData.com](https://collegefootballdata.com); API MIT.
- **nflverse:** CC-BY-4.0 when added — see `mapping/nflverse.md`.

## Scenarios

| File | Rules | Notes |
|------|-------|-------|
| `halftime-kickoff.json` | HS | FG → 2H kickoff return |
| `overtime-hs-drive.json` | **HS** | Alternating OT @ Opp 10 / Own 10 — **not** kickoff |
| `overtime-ncaa-drive.json` | NCAA | Kickoff/TB simplified college OT |
| `overtime-nfl-drive.json` | NFL | Tagged NFL; chain touchback still HS @ 20 |
| `package-h-edge-plays.json` | HS | Blocked punt, FG miss TB |
| `punt-odk-flip.json` | HS | 4th-down punt → `odk: D`, `Punt Rec` TB → 1st & 10 @ Opp 20 |
| `odk-d-scrimmage.json` | HS | We-kick return Opp 25; D rush +7 → 2nd & 3; D loss −7 |
| `kickoff-return-td-scoring.json` | HS | KO return TD → Extra Pt. scoring pad |
| `kickoff-return-midfield-spot.json` | HS | KO Rec Own 5→Own 25 → next @ −25 |
| `defensive-special-td-catalog.json` | HS | INT return TD → scoring pad |
| `onside-recovery.json` | HS | Onside kick recovery spot (replay asserts end spot) |
| `safety-free-kick.json` | HS | Run Safety → free kick KO @ Own 20 → we-kick TB → D @ Opp 20 |
| `xp-no-good-kickoff.json` | HS | Rush TD → XP No Good → kickoff |
| `opp-xp-block-outcomes.json` | HS | Opp TD → Extra Pt. Block Good / No Good → KO Rec |

## QA script games (`games/qa-script-*`)

Scripted simulations of [ipad-qa-play-scripts.md](../../../docs/ipad-qa-play-scripts.md):

```bash
npm run qa:script-sim --workspace=@huddlestat/shared
```

See [docs/overtime-rules.md](../../../docs/overtime-rules.md).
