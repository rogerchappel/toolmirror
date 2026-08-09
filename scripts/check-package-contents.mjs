import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";

const ROOT_DOCUMENTS = [
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
];
const SUPPORT_DIRECTORIES = ["docs", "tests/fixtures"];

export function requiredPackagePaths(packageJson, supportPaths = []) {
  const binaries = Object.values(packageJson.bin ?? {});
  return [
    packageJson.main,
    packageJson.types,
    ...binaries,
    ...ROOT_DOCUMENTS,
    ...supportPaths,
  ].filter(Boolean).map((entry) => entry.replace(/^\.\//, ""));
}

export function assertPackageContents(packResult, packageJson, supportPaths = []) {
  const packagedPaths = new Set(packResult.files.map(({ path: filePath }) => filePath));
  const missing = requiredPackagePaths(packageJson, supportPaths)
    .filter((requiredPath) => !packagedPaths.has(requiredPath));

  if (missing.length > 0) {
    throw new Error(`npm package is missing required files:\n${missing.map((file) => `- ${file}`).join("\n")}`);
  }
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  }));
  return files.flat();
}

async function main() {
  const packageJson = JSON.parse(await import("node:fs/promises").then(({ readFile }) => readFile("package.json", "utf8")));
  const supportPaths = (await Promise.all(SUPPORT_DIRECTORIES.map(listFiles)))
    .flat()
    .map((filePath) => filePath.split(path.sep).join("/"));
  const packed = spawnSync("npm", ["pack", "--dry-run", "--json"], { encoding: "utf8" });

  if (packed.status !== 0) {
    process.stderr.write(packed.stderr);
    process.exit(packed.status ?? 1);
  }

  const [packResult] = JSON.parse(packed.stdout);
  assertPackageContents(packResult, packageJson, supportPaths);
  console.log(`Verified ${packResult.entryCount} packaged files, including ${supportPaths.length} support files.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
