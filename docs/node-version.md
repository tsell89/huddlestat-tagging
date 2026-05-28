# Node.js version

## Recommendation (2026-05-28)

**Use Node 22 LTS** for local dev, CI, and Metro (`nvm use`).

| Layer | Version | Notes |
|-------|---------|-------|
| **Project runtime** | Node **22** (`.nvmrc`, `engines`) | Expo SDK 54 minimum is 20.19.4; Node 22 is supported in practice and tested in CI. |
| **GitHub Actions runtime** | Node **24** (via `actions/checkout@v6`, `actions/setup-node@v6`) | Action majors run on Node 24; separate from the Node version used for `npm ci` / tests. |

**Do not move to Node 24 for the project yet.** Expo SDK 54 documents minimum **20.19.x** only; SDK 56 raises the minimum to **22.13.x**. Node 24 is not listed for SDK 54. Revisit when upgrading to Expo SDK 55+.

## GitHub Actions deprecation (Node 20 actions)

`actions/checkout@v4` and `actions/setup-node@v4` ran on Node 20 and triggered deprecation warnings. **v6** actions run on Node 24 and eliminate those warnings. CI still installs and runs tests with the project Node from `.nvmrc` (22).

## Timeline

| Milestone | Date (GitHub) | Action |
|-----------|---------------|--------|
| Node 24 default for Actions | June 2, 2026 | Addressed by action v6 bump |
| Node 20 removed from runners | Sept 16, 2026 | N/A for action runtime after v6 |
| Node 20 LTS maintenance ends | April 2026 | Prefer Node 22 for dev |
| Node 24 for Expo project | After SDK 55+ upgrade | Track Expo SDK reference table |

## Verify locally

```bash
nvm use
node --version   # v22.x
npm ci
npm run test && npm run test:pbp && npm run typecheck
cd apps/mobile && npx expo start
```

If Metro fails with `configs.toReversed is not a function`, you are on Node < 20 — run `nvm use` and restart Expo.
