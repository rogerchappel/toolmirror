# toolmirror Task Breakdown

This list tracks the work needed to take `toolmirror` from release candidate to
the first reviewed OSS release.

## Ready for RC

- Keep `npm run release:check` passing on the factory branch.
- Keep ReleaseBox readiness passing with `releasebox check .`.
- Refresh `RELEASE_NOTES.md` from `releasebox notes .` before tagging.
- Preserve deterministic output for import, docs, diff, and risk workflows.

## Before First Release

- Replace placeholder release compare links in `CHANGELOG.md` after the first
  tag exists.
- Run a package install smoke test from the generated npm tarball.
- Review README examples against the final CLI help output.
- Confirm security reporting guidance points to the intended maintainer channel.

## Later

- Add sample catalogs for additional MCP server shapes.
- Consider a machine-readable JSON Schema for `toolmirror.lock.json`.
- Add fixture coverage for nested `capabilities.tools` imports.
