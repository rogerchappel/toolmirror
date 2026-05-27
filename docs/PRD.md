# toolmirror PRD

Status: in-progress

## Summary

`toolmirror` is a tiny local registry for agent tool definitions. It imports JSON tool catalogs from MCP servers, Codex/OpenClaw tool dumps, or hand-written files, normalizes them, redacts sensitive defaults, and produces searchable Markdown plus schema diffs. Think `jq` meets a runbook index for agent tools.

## Source attribution

Inspired by the growing MCP and agent-tool ecosystem, including Linux Foundation stewardship of MCP/AGENTS.md and the broader trend of pluggable coding-agent harnesses. This project does not copy any server implementation; it focuses on local documentation and drift detection for tool catalogs.

## Problem

Agent tool surfaces change quickly. Developers need to answer: what tools exist, what parameters do they accept, what changed since last week, and which tools expose risky actions? Today that knowledge is scattered across prompts, logs, and runtime-specific UI.

## Users

- Developers maintaining local MCP/tool integrations.
- Agent operators reviewing permissions before scheduled runs.
- OSS maintainers documenting tool contracts for contributors.

## V1 Goals

- Import one or more JSON catalogs.
- Normalize function/tool definitions into a stable model.
- Generate Markdown reference docs.
- Diff two catalog snapshots by added/removed/changed tools and parameters.
- Flag risky verbs such as send, delete, write, publish, upload, and execute.
- Provide `import`, `docs`, `diff`, and `risk` CLI commands.

## Non-Goals

- Talking to MCP servers directly.
- Executing tools.
- Replacing generated API documentation.

## CLI

```bash
toolmirror import tools.json --output toolmirror.lock.json
toolmirror docs toolmirror.lock.json --output TOOLING.md
toolmirror diff old.json new.json
toolmirror risk toolmirror.lock.json
```

## Acceptance Criteria

- Deterministic output for fixture catalogs.
- No network calls.
- JSON and Markdown outputs are stable and sorted.
- Risk scan exits non-zero only when `--fail-on high` is used.
- README shows OpenClaw/Codex style examples without private data.
