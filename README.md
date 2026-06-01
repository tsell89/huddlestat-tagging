# HuddleStat Tagging

Open-source **iPad play tagging** for high school football. Tag live on the sideline, export **Hudl-compatible CSV**, and optionally sync to [HuddleStat Platform](https://github.com/tsell89/huddlestat-platform) (commercial hosted service).

**Friday workflow:** tag on iPad → export Hudl 32-col CSV → coach uploads to Hudl. After film, coach corrects in Hudl; **official stats** live in Hudl and the hosted platform via Hudl ingest (`official_saturday`) — iPad tagging is **unofficial** only. See [docs/hudl-canonical-tagging.md](./docs/hudl-canonical-tagging.md).

**License:** [MIT](./LICENSE)

## What's included

| Package | Purpose |
|---------|---------|
| `apps/mobile` | Expo iPad tagging app (offline SQLite, optional cloud sync) |
| `packages/shared` | Hudl `PlaylistData` schema, field-position model, play chain logic |

## What's not included (commercial platform)

Live web dashboard, Postgres storage, media guides, two-deep rosters, and hosted stats live in the private **[huddlestat-platform](https://github.com/tsell89/huddlestat-platform)** repo.

## Quick start

```bash
git clone https://github.com/tsell89/huddlestat-tagging.git
cd huddlestat-tagging
nvm use   # Node 22 — see docs/node-version.md
npm install
cp apps/mobile/.env.example apps/mobile/.env   # optional: cloud sync URL
npm run dev:mobile
```

Tagging works **fully offline** without `.env`. Set `EXPO_PUBLIC_SYNC_API_URL` and related vars only if you run [HuddleStat Platform](https://github.com/tsell89/huddlestat-platform) or your own compatible sync API — see [docs/cloud-sync.md](./docs/cloud-sync.md).

## Docs

- [Hudl-canonical architecture (tagging)](./docs/hudl-canonical-tagging.md)
- [iPad tagging spec](./docs/ipad-tagging-spec.md)
- [Field position model](./docs/field-position-model.md)
- [Node.js version](./docs/node-version.md)

## CI and platform integration

`@huddlestat/shared` tests run via [`.github/workflows/shared-ci.yml`](./.github/workflows/shared-ci.yml), a **reusable workflow** that the private [huddlestat-platform](https://github.com/tsell89/huddlestat-platform) repo calls on every PR. The platform pins which tagging ref to test in its `tagging-ref.json`.

Shared-package fixtures live under `packages/shared/fixtures/` so CI never depends on checking out the platform repo.

## Trademark

“HuddleStat” is a trademark of the project owner. This license does not grant rights to use the HuddleStat name for a competing hosted product. See [TRADEMARK.md](./TRADEMARK.md).

## Contributing

Contributions welcome under MIT. By contributing, you agree your contributions are licensed under the same terms.
