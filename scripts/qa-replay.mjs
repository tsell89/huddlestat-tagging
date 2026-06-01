#!/usr/bin/env node
/**
 * Replay the live iPad QA log against playChain.
 *
 * Always resolves paths from the huddlestat-tagging repo root — safe from any cwd:
 *   npm run qa:replay
 *   npm run qa:replay -- path/to/other.jsonl
 *
 * Writes a human-readable report to docs/qa-sessions/live/last-replay.txt (gitignored).
 */
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { join, dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));

/** Repo-relative paths (committed docs; log output gitignored). */
export const QA_LIVE_LOG_REL = "docs/qa-sessions/live/session.jsonl";
export const QA_LAST_REPLAY_REL = "docs/qa-sessions/live/last-replay.txt";

function findRepoRoot() {
  let dir = process.cwd();
  for (;;) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        if (pkg.name === "huddlestat-tagging") return dir;
      } catch {
        /* keep walking */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return join(scriptDir, "..");
}

function resolveLogPath(repoRoot, arg) {
  if (!arg) return join(repoRoot, QA_LIVE_LOG_REL);
  if (isAbsolute(arg)) return arg;
  return resolve(repoRoot, arg);
}

const repoRoot = findRepoRoot();
const logArg = process.argv[2];
const logPath = resolveLogPath(repoRoot, logArg);
const logRel = logArg ?? QA_LIVE_LOG_REL;

if (!existsSync(logPath)) {
  console.error("QA log not found.");
  console.error(`  looked for: ${logPath}`);
  console.error(`  repo root:   ${repoRoot}`);
  console.error("");
  console.error("Start a QA session, then tag on iPad:");
  console.error("  cd ~/huddlestat-tagging && npm run dev:mobile:qa");
  console.error("");
  console.error("Default log path (repo-relative):");
  console.error(`  ${QA_LIVE_LOG_REL}`);
  process.exit(1);
}

const { replayQaLogFile, formatQaReplayReport } = await import(
  join(repoRoot, "packages/shared/src/qa/replayQaLog.ts")
);

const report = replayQaLogFile(logPath);
const text = formatQaReplayReport(report);

console.log(text);
console.log("");
console.log(`repo: ${repoRoot}`);
console.log(`log:  ${logRel}`);

const reportPath = join(repoRoot, QA_LAST_REPLAY_REL);
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(
  reportPath,
  [
    `at: ${new Date().toISOString()}`,
    `repo: ${repoRoot}`,
    `log: ${logPath}`,
    "",
    text,
    "",
  ].join("\n"),
);
console.log(`report: ${QA_LAST_REPLAY_REL}`);

const failed =
  report.chainMismatches.length > 0 || report.drift.length > 0;
process.exit(failed ? 1 : 0);
