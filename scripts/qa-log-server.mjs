#!/usr/bin/env node
/**
 * Mac QA log sidecar — receives POST /qa-log from iPad during __DEV__ QA sessions.
 * Appends JSONL to docs/qa-sessions/live/session.jsonl (canonical path for Cursor).
 *
 * Start via: npm run dev:mobile:qa
 */
import { createServer } from "node:http";
import { appendFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const liveDir = join(root, "docs/qa-sessions/live");
const archiveDir = join(liveDir, "archives");
/** Fixed path — agents read docs/qa-sessions/live/session.jsonl from repo root */
const LIVE_LOG = join(liveDir, "session.jsonl");
const LIVE_LOG_REL = "docs/qa-sessions/live/session.jsonl";
const PORT = Number(process.env.QA_LOG_PORT ?? 8099);

const { nextDraftAfterPlay, playlistDataSchema } = await import(
  join(root, "packages/shared/src/index.ts")
);
const { padClassMatches } = await import(
  join(root, "packages/shared/src/pbp/padClass.ts")
);

mkdirSync(liveDir, { recursive: true });
mkdirSync(archiveDir, { recursive: true });

/** @type {Set<string>} game slugs that received a session line this sidecar run */
const startedSlugs = new Set();

function lanIp() {
  try {
    return execSync("ipconfig getifaddr en0", { encoding: "utf8" }).trim();
  } catch {
    return "127.0.0.1";
  }
}

function slugFromPayload(body) {
  return (body.gameSlug ?? body.gameId ?? "unknown")
    .toString()
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .slice(0, 48);
}

function ensureSidecarSessionHeader(slug) {
  if (startedSlugs.has(slug)) return;
  startedSlugs.add(slug);
  appendFileSync(
    LIVE_LOG,
    JSON.stringify({
      type: "session",
      source: "mac-sidecar",
      date: new Date().toISOString().slice(0, 10),
      gameSlug: slug,
      startedAt: new Date().toISOString(),
      logPath: LIVE_LOG_REL,
    }) + "\n",
  );
}

function archiveLiveLogIfPresent() {
  if (!existsSync(LIVE_LOG)) return;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dest = join(archiveDir, `${stamp}.jsonl`);
  copyFileSync(LIVE_LOG, dest);
  console.log(`[qa-log] archived previous → docs/qa-sessions/live/archives/${stamp}.jsonl`);
}

if (process.env.QA_LOG_FRESH === "1" && existsSync(LIVE_LOG)) {
  archiveLiveLogIfPresent();
}

function parsePlay(raw) {
  if (!raw || typeof raw !== "object") return null;
  try {
    return playlistDataSchema.parse(raw);
  } catch {
    return null;
  }
}

function checkSaveDrift(body) {
  const saved = parsePlay(body.savedPlay);
  const loggedNext = parsePlay(body.nextDraft);
  if (!saved || !loggedNext) return [];

  const overtime = body.phaseAfter === "OT";
  const team = saved.team || "TEAM_A";
  const current = nextDraftAfterPlay(saved, loggedNext.playNumber, team, {
    rules: "HS",
    overtime,
  });

  const issues = [];
  for (const field of ["down", "distance", "yardLine", "odk"]) {
    if (current[field] !== loggedNext[field]) {
      issues.push(
        `${field}: iPad logged ${JSON.stringify(loggedNext[field])} · chain now ${JSON.stringify(current[field])}`,
      );
    }
  }
  if (!padClassMatches(current, loggedNext)) {
    issues.push(
      `pad: iPad logged ${loggedNext.playType}/${loggedNext.odk} · chain now ${current.playType}/${current.odk}`,
    );
  }
  return issues;
}

function formatSaveLine(body) {
  const playNum = body.savedPlay?.playNumber ?? "?";
  const summary = body.tagSummary ?? body.sidebarLast ?? "save";
  const header = body.headerAfter ?? "";
  const pad = body.padAfter ?? "";
  return `SAVE #${playNum} · ${summary} → ${header} · ${pad}`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ ok: true, port: PORT, logPath: LIVE_LOG_REL }),
    );
    return;
  }

  if (req.method !== "POST" || req.url !== "/qa-log") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  try {
    const body = await readBody(req);
    const type = body.type ?? "unknown";
    const slug = slugFromPayload(body);

    if (type === "session" || type === "save") {
      ensureSidecarSessionHeader(slug);
    }

    appendFileSync(LIVE_LOG, JSON.stringify(body) + "\n");

    if (type === "save") {
      const line = formatSaveLine(body);
      const drift = checkSaveDrift(body);
      if (drift.length === 0) {
        console.log(`\x1b[32m✓\x1b[0m ${line}`);
      } else {
        console.log(`\x1b[31m✗\x1b[0m ${line}`);
        for (const d of drift) console.log(`  \x1b[33mchain drift:\x1b[0m ${d}`);
      }
    } else if (type === "phase") {
      console.log(`\x1b[36m◆\x1b[0m PHASE ${body.action ?? ""}`);
    } else if (type === "cursor") {
      console.log(
        `\x1b[90m→\x1b[0m ${body.action ?? "cursor"}${body.nextPlayNumber != null ? ` · live #${body.nextPlayNumber}` : ""}`,
      );
    } else if (type === "session") {
      console.log(`\x1b[35m●\x1b[0m session ${slug}`);
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, logPath: LIVE_LOG_REL }));
  } catch (err) {
    console.error("[qa-log] error:", err);
    res.writeHead(400);
    res.end(String(err));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  const ip = lanIp();
  console.log("");
  console.log("HuddleStat QA log sidecar");
  console.log(`  listen   http://0.0.0.0:${PORT}`);
  console.log(`  iPad     http://${ip}:${PORT}/qa-log`);
  console.log(`  log file ${LIVE_LOG_REL}`);
  console.log(`  replay   npm run qa:replay -- ${LIVE_LOG_REL}`);
  console.log("");
});
