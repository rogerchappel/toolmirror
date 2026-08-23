import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testsDirectory = path.join(rootDirectory, "tests");
const suites = readdirSync(testsDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".test.mjs"))
  .map((entry) => path.join("tests", entry.name))
  .sort();

if (suites.length === 0) {
  console.error("No tests/*.test.mjs suites found.");
  process.exit(1);
}

console.log(`Running ${suites.length} test suites:`);
for (const suite of suites) console.log(`- ${suite}`);

const result = spawnSync(process.execPath, ["--test", ...suites], {
  cwd: rootDirectory,
  stdio: "inherit"
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
