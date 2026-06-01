# QA session logs

## Live stream (Mac sidecar)

While `npm run dev:mobile:qa` is running, events append to:

```text
docs/qa-sessions/live/session.jsonl
```

## Replay (any terminal, any cwd inside the repo)

From a fresh terminal:

```bash
cd ~/huddlestat-tagging   # or any subdirectory of the repo
npm run qa:replay
```

The script walks up to the repo root, reads `docs/qa-sessions/live/session.jsonl`, prints chain results, and saves:

```text
docs/qa-sessions/live/last-replay.txt
```

Both output files are **gitignored** (local only). The command itself is committed in `scripts/qa-replay.mjs`.

See [live/README.md](./live/README.md).
