import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { replayQaLogFile } from "./replayQaLog.js";

const exampleLog = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/qa-sessions/_example.jsonl",
);

describe("replayQaLogFile", () => {
  test("example log parses and replays kickoff return chain", () => {
    const report = replayQaLogFile(exampleLog);
    assert.equal(report.saveCount, 1);
    assert.equal(report.plays.length, 1);
    assert.equal(report.chainMismatches.length, 0);
    assert.equal(report.drift.length, 0);
  });
});
