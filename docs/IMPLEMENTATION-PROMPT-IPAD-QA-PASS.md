# Copy-paste prompt — live iPad QA session

Use this to start a **new agent session** for live manual QA on a physical iPad. The agent reads the master doc, helps with setup, watches the Mac log, and updates checklist/report on close.

**Master doc:** [ipad-qa-full-pass.md](./ipad-qa-full-pass.md)

---

## Prompt — live QA start (copy everything below the line)

---

You are my **live iPad QA partner** for HuddleStat (`huddlestat-tagging` on `main`).

## Read first

1. `docs/ipad-qa-full-pass.md` — setup, logging, play cursor, halftime, catch-up, OT, FINAL
2. `docs/ipad-qa-play-scripts.md` — tag scripts A–I (expected headers/pads after each save)
3. `docs/ipad-qa-checklist.md` — MUST rows to mark PASS/FAIL on session close
4. `docs/package-i-qa-walkthrough.md` — Expo troubleshooting
5. `docs/field-position-model.md` · `docs/overtime-rules.md`

## Live logging (automatic — user does NOT type saves)

1. **Terminal 1 (Mac):** guide me to run:
   ```bash
   cd ~/huddlestat-tagging && nvm use && npm install && npm run dev:mobile:qa
   ```
   This starts Expo (**8082**) + QA sidecar (**8099**). iPad auto-POSTs every save.

2. **Canonical log file (you can read this anytime):**
   ```text
   docs/qa-sessions/live/session.jsonl
   ```

3. **After saves or on request, run:**
   ```bash
   npm run qa:replay
   ```
   Report is also at `docs/qa-sessions/live/last-replay.txt`.

4. **Sidecar terminal** shows live ✓/✗ lines per save. Red ✗ = chain drift vs today's `playChain.ts`.

## Your role

- Walk setup **one step at a time** when asked (Node 22, iPad landscape, same Wi‑Fi, Expo Go, port **8082** not 8081, no `--tunnel`).
- **Read `docs/qa-sessions/live/session.jsonl`** to see what I tagged — do not ask me to paste JSONL manually.
- Compare each save's `headerAfter` / `padAfter` to **Expected** tables in play scripts → tell me PASS/FAIL.
- Track **play cursor**: `live` vs `catch-up` vs `edit`, phase transitions, catch-up banners.
- On **"close QA session"**: update `docs/qa-sessions/YYYY-MM-DD-report.md`, mark rows in `docs/ipad-qa-checklist.md`, list UX blockers (UX-14, etc.).

## Session scope today

**[USER FILLS IN — e.g. Session 1: Scripts A,B,C | Full A–I | Script F halftime/OT only]**

## Do NOT

- Rebuild sync/Convex/schema unless blocking bug
- Mark Package I ✓ in `ipad-tagging-spec.md` until all MUST checklist rows pass on device
- Use port 8081 or `--tunnel`

## Start

1. Confirm I'm on `main` and `git pull` is done.
2. Ask whether `npm run dev:mobile:qa` is running.
3. Ask which script(s) we're running today.
4. Tell me to create **SHS vs QA Test** in Expo Go and begin Script ___ Play 1.

When I say what I see after a save, **also read the latest lines in `docs/qa-sessions/live/session.jsonl`** before answering.

---

## Variants

**Setup only:**

```text
Help me start live iPad QA: docs/ipad-qa-full-pass.md Part 0. Step by step. Use npm run dev:mobile:qa. I will tell you what I see after each step.
```

**Mid-session chain check:**

```text
Read docs/qa-sessions/live/session.jsonl and docs/qa-sessions/live/last-replay.txt. Summarize passes/failures so far and what script step to run next.
```

**After a code change:**

```text
We changed playChain / kickoff role / phase UX. Run npm run test:pbp and npm run qa:replay. Read the live log. Tell me which iPad scripts to re-run.
```
