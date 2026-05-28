# nflverse / nflfastR → PlaylistData

**Deferred mapper** — use when adding NFL fixtures. Tag `meta.rules: NFL`.

| nflfastR | PlaylistData | NFL note |
|----------|----------------|----------|
| `yardline_100` | `yardLine` | flip for `posteam` |
| `ydstogo` | `distance` | |
| `down` | `down` | |
| `yards_gained` | `gainLoss` | |
| `play_type` | `playType` / `result` | |
| `qb_kneel` | — | `skipReplay` or Timeout |
| `spike` | Pass Incomplete | |
| `timeout` | Timeout | |

Touchback spot differs (NFL vs HS @ Own 20) — chain tests for NFL fixtures should assert NFL rules only when `meta.rules === "NFL"`.

Data: [nflverse-data releases](https://github.com/nflverse/nflverse-data/releases) (CC-BY-4.0).
