#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

node dist/cli.js import tests/fixtures/codex-tools.json --output "$tmp_dir/catalog.json"
node dist/cli.js docs "$tmp_dir/catalog.json" --output "$tmp_dir/TOOLING.md"
node dist/cli.js risk "$tmp_dir/catalog.json" --min high --fail-on high >"$tmp_dir/risk.txt" && {
  printf 'expected risk command to fail on high-risk tools\n' >&2
  exit 1
}

set +e
node dist/cli.js diff tests/fixtures/codex-tools.json tests/fixtures/codex-tools-next.json --output "$tmp_dir/diff.txt"
diff_status=$?
set -e

if [ "$diff_status" -ne 2 ]; then
  printf 'expected diff command to exit 2 when catalogs differ, got %s\n' "$diff_status" >&2
  exit 1
fi

grep -q 'file_write' "$tmp_dir/catalog.json"
grep -q '# Tool Catalog' "$tmp_dir/TOOLING.md"
grep -q 'Changed: 1' "$tmp_dir/diff.txt"

printf 'smoke passed\n'
