# Orchestration Plan

`toolmirror` compares tool surfaces so agent operators can review capability drift.

1. Capture the previous and current tool manifests from the target agent environment.
2. Normalize and diff them with the CLI.
3. Review added, removed, and changed tools before promoting the environment.
4. Run `npm run release:check` before publishing to keep tests, smoke checks, and package contents aligned.

The tool reports differences; it does not approve or deny deployments. CI/CD systems should enforce their own policy gates around the generated report.
