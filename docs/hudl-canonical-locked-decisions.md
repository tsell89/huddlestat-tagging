# Hudl-canonical locked decisions (2026-05-30)

Platform SSOT: [../huddlestat-platform/docs/hudl-canonical-locked-decisions.md](../huddlestat-platform/docs/hudl-canonical-locked-decisions.md)

Summary for tagging-repo agents:

| ID | Decision |
|----|----------|
| **D1** | `unofficial_friday` = explicit season commit; copy live `plays` if omitted; never auto on live `final` |
| **D2** | Platform `/game/[slug]` shows **official** Hudl snapshot after `official_saturday` (single-game lookback); no diff UI |
| **D3** | Wire Hudl ingest first (thin slice), then live box scores, then game-page official display |
| **D4** | Require `ingestSource: hudl_csv \| hudl_xlsx` on new `official_saturday` when CSV parse ships |

Tagging repo implements parsers/credits only — game page behavior is platform (`huddlestat-platform`).

Cross-repo prompt: [../huddlestat-platform/docs/IMPLEMENTATION-PROMPT-HUDL-CANONICAL.md](../huddlestat-platform/docs/IMPLEMENTATION-PROMPT-HUDL-CANONICAL.md)
