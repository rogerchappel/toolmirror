# toolmirror Orchestration Plan

`toolmirror` is intentionally local-first. Release orchestration should keep
network-dependent work outside the CLI runtime path and make each release step
repeatable from a clean checkout.

## Local RC Flow

1. Install dependencies with `npm install` or `npm ci`.
2. Run `npm run release:check`.
3. Run `releasebox check .` when ReleaseBox is available.
4. Refresh `RELEASE_NOTES.md` with `releasebox notes .`.
5. Inspect `npm pack --dry-run` output for expected package contents.

## Release Flow

1. Open a reviewed pull request from the factory branch.
2. Confirm CI and release dry-run workflows are green.
3. Update changelog links once the first version tag exists.
4. Tag the reviewed release from `main`.
5. Create the GitHub release from the refreshed release notes.

## Operating Boundaries

- The CLI must not call networks or execute tools.
- Generated catalogs should remain deterministic and safe to diff in git.
- Risk reports are advisory; callers decide whether `--fail-on` blocks their
  automation.
