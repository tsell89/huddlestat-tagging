#!/usr/bin/env node
/** Start QA log sidecar + Expo (port 8082) with EXPO_PUBLIC_QA_LOG_URL auto-set. */
import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.env.QA_LOG_PORT ?? "8099";

function lanIp() {
  try {
    return execSync("ipconfig getifaddr en0", { encoding: "utf8" }).trim();
  } catch {
    return "127.0.0.1";
  }
}

const ip = lanIp();
const qaLogUrl = `http://${ip}:${PORT}`;

console.log(`[dev:mobile:qa] EXPO_PUBLIC_QA_LOG_URL=${qaLogUrl}`);

const server = spawn("npx", ["tsx", "scripts/qa-log-server.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, QA_LOG_PORT: PORT },
});

const expoEnv = {
  ...process.env,
  EXPO_PUBLIC_QA_LOG_URL: qaLogUrl,
  REACT_NATIVE_PACKAGER_HOSTNAME: ip,
};

const expo = spawn(
  "npx",
  ["expo", "start", "--clear", "--lan", "--port", "8082"],
  {
    cwd: join(root, "apps/mobile"),
    stdio: "inherit",
    env: expoEnv,
  },
);

function shutdown(code = 0) {
  server.kill("SIGTERM");
  expo.kill("SIGTERM");
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

server.on("exit", (code) => {
  if (code && code !== 0) shutdown(code);
});
expo.on("exit", (code) => {
  shutdown(code ?? 0);
});
