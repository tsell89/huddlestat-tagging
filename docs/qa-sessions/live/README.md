# Live QA log (Mac sidecar)

## Canonical paths (repo root)

| File | Committed? | Purpose |
|------|------------|---------|
| `docs/qa-sessions/live/session.jsonl` | **No** (gitignored) | Append-only stream from iPad while `npm run dev:mobile:qa` runs |
| `docs/qa-sessions/live/last-replay.txt` | **No** (gitignored) | Latest `npm run qa:replay` report |
| `docs/qa-sessions/live/archives/` | **No** (gitignored) | Archived prior sessions |

**Replay command** (works from any directory — finds repo root automatically):

```bash
npm run qa:replay
```

Same as:

```bash
npm run qa:replay -- docs/qa-sessions/live/session.jsonl
```

Optional alternate log:

```bash
npm run qa:replay -- docs/qa-sessions/my-export.jsonl
```

Cursor / agents: read `docs/qa-sessions/live/session.jsonl` or `docs/qa-sessions/live/last-replay.txt` from the `huddlestat-tagging` repo root.
