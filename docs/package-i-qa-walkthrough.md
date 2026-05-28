# Package I — iPad QA walkthrough (beginner)

Use this doc **one step at a time** with Cursor. After each step, tell the agent what you see; it will mark pass/fail.

**Full batched checklist (all scripts A–I):** [ipad-qa-checklist.md](./ipad-qa-checklist.md) · **Play-by-play scripts:** [ipad-qa-play-scripts.md](./ipad-qa-play-scripts.md)

---

## Part 0 — Which server is which?

| Port | What it is | Use for iPad QA? |
|------|------------|------------------|
| **8081** | Old Expo from **`HuddleStat`** (different folder) | **No** — ignore or quit that terminal |
| **8082** | **`huddlestat-tagging`** — correct app | **Yes — use this** |
| **8083** | Failed **web** preview (browser only, currently broken) | **No** — safe to ignore |

You only need **8082** running.

---

## Part 1 — Start Expo (Mac)

Do this in **Terminal** (Applications → Utilities → Terminal).

### Step 1.1 — Open the right folder

Copy and paste, then press **Return**:

```bash
cd ~/huddlestat-tagging
```

### Step 1.2 — Use Node 20 (required)

```bash
nvm use
```

You should see: `Now using node v20...`

If `nvm: command not found`, install nvm first or run:

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use
```

### Step 1.3 — Start Expo on port 8082

```bash
cd apps/mobile && npx expo start --clear --port 8082
```

Wait until you see:

```text
Waiting on http://localhost:8082
```

Leave this terminal window **open**. Do not close it while testing.

### Step 1.4 — Optional: stop the confusing 8083 server

In a **second** Terminal window:

```bash
kill 79401
```

(That stops the web server on 8083. Only do this if something is still running there.)

---

## Part 2 — Connect your iPad

### Step 2.1 — Same Wi‑Fi

- iPad and Mac must be on the **same Wi‑Fi network** (not guest Wi‑Fi).

### Step 2.2 — Install Expo Go

- App Store → search **Expo Go** → install.

### Step 2.3 — Landscape

- Rotate iPad so it is **horizontal (landscape)**.

### Step 2.4 — Open the project in Expo Go

**Option A — QR code (easiest)**

1. On the Mac, in the Terminal where Expo is running, you should see a **QR code**.
2. Open **Camera** or **Expo Go** on the iPad.
3. Scan the QR code.
4. Tap to open in **Expo Go**.

**Option B — Manual URL**

If QR does not work, in Expo Go tap **Enter URL manually** and type:

```text
exp://192.168.7.24:8082
```

(If that fails, replace `192.168.7.24` with your Mac’s IP: run `ipconfig getifaddr en0` in Terminal.)

### Step 2.5 — Confirm you loaded the right app

You should see the **HuddleStat** home screen:

- Title: **HuddleStat**
- Subtitle: **iPad Tagger · offline-first**
- Button: **+ New game**

If you see a different app, you connected to **8081** (wrong repo). Quit Expo Go and scan the **8082** terminal QR again.

---

## Part 3 — Create a fresh test game

1. Tap **+ New game**
2. **Team code:** leave `SHS` (or any 3 letters)
3. **Opponent:** type `QA Test`
4. Tap **Start tagging**

You should land on the **tagging screen**:

- **Top bar (navy):** `PLAY #1 · Kickoff @ -40` (or similar)
- **Left (~72%):** Kickoff pad
- **Right (~28%):** sidebar with **Catch-up missed play** and green **SAVE PLAY** at the bottom-right

---

## Part 4 — How to read the screen

| Area | What to look at |
|------|-----------------|
| **Header** | `PLAY #N ·` situation (down/distance @ yard line) |
| **Left pad** | Type, results, sliders, player slots, jersey grid |
| **Sidebar** | Last 2 saved plays; **SAVE PLAY** only here |
| **Gain/loss** | Read-only number under tackle/return sliders |

**Yard line in header** uses Hudl numbers (`-25` = own 25, `25` = opp 25).  
**Sliders** use friendly labels (`Own 5`, `Opp 25`).

---

## Part 5 — Canonical drive §2.4 (main acceptance test)

We will tag **7 plays** total (2 setup plays + 5 spec plays).

### Checklist format

After each **SAVE**, report back:

1. Header line (exact text)
2. Which pad appeared (Kickoff / Run / Pass / FG)
3. Gain/loss shown (if any)
4. Sidebar: last play summary

---

### PLAY 1 — Kickoff return to Own 25

**Goal:** Return +20 yards → next snap **1st & 10 @ own 25**

| # | Do this |
|---|---------|
| 1 | On Kickoff pad, tap **We receive** (top row) |
| 2 | Confirm **Return** is selected (not Touchback) |
| 3 | Slider **1 · Caught at** → **Own 5** (default is usually already Own 5) |
| 4 | Slider **2 · Returned to** → **Own 25** (default is usually already Own 25) |
| 5 | Confirm return yards show **+20** |
| 6 | (Optional) Tap jersey numbers for Kicker / Returner — not required to save |
| 7 | Tap **SAVE PLAY** (bottom-right of sidebar) |

**Expected immediately after save:**

| Check | Expected |
|-------|----------|
| Header | `PLAY #2 · 1st & 10 @ -25` |
| Pad | **Run** pad (Run selected, Rush result) |
| Previous play in sidebar | `Kickoff · Return (+20)` |

---

### PLAY 2 — Run Own 25 → Opp 25 (+50)

| # | Do this |
|---|---------|
| 1 | **Run** should already be selected; **Rush** result |
| 2 | **Tackled at** slider → **Opp 25** |
| 3 | **Gain / loss** must show **+50** |
| 4 | Tap **SAVE PLAY** |

**Expected after save:**

| Check | Expected |
|-------|----------|
| Header | `PLAY #3 · 1st & 10 @ 25` |
| Pad | Run pad again |
| Sidebar | `Run · Rush (+50)` |

---

### PLAY 3 — Setup: incomplete (stay @ Opp 25)

Needed so we can reach **3rd & 8 @ Opp 23** for the sack test.

| # | Do this |
|---|---------|
| 1 | Tap **Pass** in the play-type row |
| 2 | Tap **Incomplete** |
| 3 | No tackle slider should appear |
| 4 | Tap **SAVE PLAY** |

**Expected after save:**

| Check | Expected |
|-------|----------|
| Header | `PLAY #4 · 2nd & 10 @ 25` |
| Pad | Run pad (default after new snap) |

---

### PLAY 4 — Setup: short run to Opp 23

| # | Do this |
|---|---------|
| 1 | **Run · Rush** |
| 2 | **Tackled at** → **Opp 23** |
| 3 | **Gain / loss** → **+2** (from Opp 25 to Opp 23) |
| 4 | Tap **SAVE PLAY** |

**Expected after save:**

| Check | Expected |
|-------|----------|
| Header | `PLAY #5 · 3rd & 8 @ 23` |
| Pad | Run pad |

---

### PLAY 5 — Sack (spec §2.5)

| # | Do this |
|---|---------|
| 1 | Tap **Pass** |
| 2 | Tap **Sack** |
| 3 | Player slots should show **Rusher** and **Tackler** only (no Passer / Receiver) |
| 4 | **Tackled at** → **Opp 28** |
| 5 | **Gain / loss** → **-5** |
| 6 | Tap a jersey for **Rusher** (any number) |
| 7 | Tap **SAVE PLAY** |

**Expected after save:**

| Check | Expected |
|-------|----------|
| Header | `PLAY #6 · 4th & 13 @ 28` |
| Pad | Run pad (or Pass — either OK) |
| Sidebar | `Pass · Sack (-5)` |

---

### PLAY 6 — Field goal good → Kickoff

| # | Do this |
|---|---------|
| 1 | Tap **FG** in play-type row |
| 2 | **Good** should be selected |
| 3 | **Attempt** line should show **38 yd** |
| 4 | Tap **SAVE PLAY** |

**Expected after save:**

| Check | Expected |
|-------|----------|
| Header | `PLAY #7 · Kickoff @ -40` (or `Kickoff @ …`) |
| Pad | **Kickoff** pad (not Run/Pass) |
| Sidebar | `Field Goal · Good` |

---

### PLAY 7 — Post-FG kickoff role (UX-14)

**Goal:** After **our** FG Good, next kickoff defaults to **We kick** (not opening We receive).

| # | Do this |
|---|---------|
| 1 | **Do not tap** We kick / We receive yet — read the toggle |
| 2 | Confirm toggle shows **We kick** |
| 3 | (Optional) Tag kickoff · Touchback or Return · SAVE |
| 4 | (Optional) Kill Expo Go · reopen game · confirm Play 7 still **We kick** |

**Expected immediately after Play 6 save (before any tap):**

| Check | Expected |
|-------|----------|
| Header | `PLAY #7 · Kickoff @ -40` (or similar) |
| Pad | **Kickoff** pad |
| Role toggle | **We kick** selected — **not** We receive from Play 1 |

If **We receive** is shown, UX-14 **FAIL** — see [ipad-qa-checklist.md](./ipad-qa-checklist.md) Script A.

---

## Part 6 — Report results to Cursor

Copy this template and fill it in after you finish (or after each play):

```text
PLAY 1: header="..." pad=... sidebar="..." PASS/FAIL
PLAY 2: ...
...
PLAY 6: ...
PLAY 7: kickoff role toggle="We kick" PASS/FAIL
```

Cursor will compare to the **Expected** tables and update Package I sign-off.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Red error screen on iPad | Shake iPad → Reload; ensure Mac Terminal still shows Metro running |
| `Unable to resolve ./constants.js` | Fixed in `metro.config.js` — stop Expo, run `npx expo start --clear --port 8082` again |
| `configs.toReversed is not a function` | Run `nvm use` then restart Expo |
| Wrong app / old UI | You’re on port **8081** — use **8082** |
| Cannot connect | Same Wi‑Fi; try manual URL `exp://YOUR_MAC_IP:8082` |
| SAVE disabled | Need play type + result selected (defaults usually OK) |

---

## After all 7 plays pass

Tell Cursor: **“§2.4 + UX-14 complete — all pass.”**  
Continue with [ipad-qa-checklist.md](./ipad-qa-checklist.md) scripts B–I for full Package I.
