import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const target = path.join(here, "sdforest-redesign.test.js");
const expectedFailures = [
  "public council exposes exactly two truthful modes",
  "TinyLM standalone route redirects into Councils"
].sort();
const run = spawnSync(process.execPath, ["--test", "--test-reporter=tap", target], { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
const output = (run.stdout || "") + (run.stderr || "");
const failures = Array.from(output.matchAll(/^not ok \d+ - (.+)$/gm), (match) => match[1].trim()).sort();
assert.equal(run.status, 1, "baseline suite must currently exit 1");
assert.deepEqual(failures, expectedFailures);
assert.match(output, /# tests 11/); assert.match(output, /# pass 9/); assert.match(output, /# fail 2/);
process.stdout.write("SD Forest inherited baseline guard passed\n");
