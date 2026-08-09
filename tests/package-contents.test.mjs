import assert from "node:assert/strict";
import test from "node:test";

import { assertPackageContents, requiredPackagePaths } from "../scripts/check-package-contents.mjs";

const packageJson = {
  main: "./dist/index.js",
  types: "./dist/index.d.ts",
  bin: { toolmirror: "./dist/cli.js" },
};
const supportPaths = ["docs/TASKS.md", "tests/fixtures/tools.json"];

test("accepts a package containing runtime, metadata, and support files", () => {
  const files = requiredPackagePaths(packageJson, supportPaths).map((path) => ({ path }));
  assert.doesNotThrow(() => assertPackageContents({ files }, packageJson, supportPaths));
});

test("reports a missing required package file", () => {
  const files = requiredPackagePaths(packageJson, supportPaths)
    .filter((path) => path !== "dist/cli.js")
    .map((path) => ({ path }));

  assert.throws(
    () => assertPackageContents({ files }, packageJson, supportPaths),
    /npm package is missing required files:\n- dist\/cli\.js/,
  );
});
