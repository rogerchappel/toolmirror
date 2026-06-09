# Task Breakdown

## Release readiness

- Keep tool snapshot fixtures current enough to exercise added, removed, and changed tool fields.
- Run `npm run release:check` before publishing or tagging a release candidate.
- Use `npm run package:smoke` to confirm the published package includes compiled output, fixtures, and support docs.

## Follow-up candidates

- Add fixture coverage for renamed tools and permission changes.
- Document recommended review thresholds for noisy tool-surface changes.
