# Task Breakdown

## Release readiness

- Keep tool snapshot fixtures current enough to exercise added, removed, and changed tool fields.
- Run `npm run release:check` before publishing or tagging a release candidate.
- Use `npm run package:smoke` to assert the published package includes its runtime entrypoint, CLI, declarations, root project documents, and every intentionally shipped file under `docs/` and `tests/fixtures/`.

## Follow-up candidates

- Add fixture coverage for renamed tools and permission changes.
- Document recommended review thresholds for noisy tool-surface changes.
