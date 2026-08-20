# Play-by-play fixtures

Committed games and scenarios for chain replay tests. See [docs/play-by-play-test-corpus.md](../../../docs/play-by-play-test-corpus.md).

## Run tests

```bash
npm run test:pbp --workspace=@huddlestat/shared
```

## Games

| `gameId` | Source | Notes |
|----------|--------|-------|
| `hudl-spec-2-4` | Hudl-shaped | Spec §2.4 canonical drive (7 plays) |
| `cfbd-chaos-penalties` | CFBD-derived | Penalty replay down |
| `cfbd-overtime-ncaa` | CFBD-derived | NCAA OT kickoff sequence |
| `cfbd-normal-drives` | CFBD-derived | Touchback, punt ODK flip, FG |

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
| `punt-odk-flip.json` | HS | 4th-down punt → `odk: D`, `Punt Rec` |
| `kickoff-return-td-scoring.json` | HS | KO return TD → Extra Pt. scoring pad |
| `defensive-special-td-catalog.json` | HS | INT return TD → scoring pad |
| `onside-recovery.json` | HS | Onside kick recovery spot (replay asserts end spot) |
| `kickoff-return-midfield-spot.json` | HS | KO Rec Own 5→Own 25 → next @ −25 |

See [docs/overtime-rules.md](../../../docs/overtime-rules.md).
