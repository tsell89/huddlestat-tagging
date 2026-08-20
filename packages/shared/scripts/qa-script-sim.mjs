#!/usr/bin/env node
/**
 * Scripted full-game / iPad QA play-script simulation.
 *
 * Usage:
 *   npx tsx scripts/qa-script-sim.mjs              # all qa-script-* + qa-full-regulation
 *   npx tsx scripts/qa-script-sim.mjs qa-script-a  # one game
 *   npx tsx scripts/qa-script-sim.mjs all
 */
import {
  formatSimulateFailures,
  listQaScriptGameIds,
  simulateScriptById,
} from "../src/qa/simulateScript.ts";
import { listGameIds } from "../src/pbp/loadGame.ts";

const arg = process.argv[2] ?? "all";

function targets() {
  if (arg === "all") {
    const scripts = listQaScriptGameIds();
    const full = listGameIds().includes("qa-full-regulation")
      ? ["qa-full-regulation"]
      : [];
    return [...scripts, ...full];
  }
  return [arg];
}

let failed = 0;
for (const id of targets()) {
  const result = simulateScriptById(id);
  if (result.ok) {
    console.log(
      `PASS  ${id}  (${result.plays.length} plays, ${result.chainMismatches.length} mismatches)`,
    );
  } else {
    failed += 1;
    console.log(`FAIL  ${id}`);
    console.log(formatSimulateFailures(result));
  }
}

if (failed) {
  console.error(`\n${failed} script(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${targets().length} simulation(s) passed`);
