# HuddleStat Tagging

Open-source **iPad play tagging** for high school football. Tag live on the sideline, export **Hudl-compatible CSV**, and optionally sync to [HuddleStat Cloud](https://github.com/tsell89/huddlestat) (commercial hosted service).

**License:** [MIT](./LICENSE)

## What's included

| Package | Purpose |
|---------|---------|
| `apps/mobile` | Expo iPad tagging app (offline SQLite, optional cloud sync) |
| `packages/shared` | Hudl `PlaylistData` schema, field-position model, play chain logic |

## What's not included (commercial platform)

Live web dashboard, Convex storage, media guides, two-deep rosters, and hosted stats live in the private **[huddlestat](https://github.com/tsell89/huddlestat)** repo.

## Quick start

```bash
git clone https://github.com/tsell89/huddlestat-tagging.git
cd huddlestat-tagging
nvm use
npm install
cp apps/mobile/.env.example apps/mobile/.env   # optional: cloud sync URL
npm run dev:mobile
```

Tagging works **fully offline** without `.env`. Set `EXPO_PUBLIC_CONVEX_URL` only if you run [HuddleStat Platform](https://github.com/tsell89/huddlestat) or your own compatible backend.

## Docs

- [iPad tagging spec](./docs/ipad-tagging-spec.md)
- [Field position model](./docs/field-position-model.md)

## Trademark

“HuddleStat” is a trademark of the project owner. This license does not grant rights to use the HuddleStat name for a competing hosted product. See [TRADEMARK.md](./TRADEMARK.md).

## Contributing

Contributions welcome under MIT. By contributing, you agree your contributions are licensed under the same terms.
