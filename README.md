# toolmirror

Local-first registry and drift detector for agent tool catalogs.

`toolmirror` imports JSON tool definitions from MCP-style catalogs, Codex/OpenClaw dumps, or hand-written files. It normalizes them into a stable lockfile, redacts sensitive defaults, generates Markdown reference docs, diffs snapshots, and flags risky tool surfaces.

## Install

```sh
npm install
npm run build
```

For local CLI use from this checkout:

```sh
npm link
```

## Use

Normalize one or more tool dumps:

```sh
toolmirror import tools.json --output toolmirror.lock.json
```

Generate Markdown documentation:

```sh
toolmirror docs toolmirror.lock.json --output TOOLING.md
```

Compare exactly two snapshots. The command exits `2` when catalogs differ:

```sh
toolmirror diff old.lock.json new.lock.json
```

Review risky tools. `--fail-on high` exits `3` when high-risk tools are present:

```sh
toolmirror risk toolmirror.lock.json --min medium --fail-on high --output risk.txt
```

Each command accepts only the options shown above. Unknown options, missing option
values, missing inputs, and extra inputs exit `1` with a usage error. Use `--help`
to print the command summary and exit `0`.

## Supported input shapes

`toolmirror` detects common tool definitions under `tools`, `functions`, and `capabilities.tools`. Each tool can use `inputSchema`, `parameters`, or `schema` for JSON Schema-like inputs.

Sensitive defaults, examples, constants, and enum values are redacted when their path includes names such as `token`, `secret`, `password`, `api_key`, or `credential`.

## Verify

Run the local validation script before opening a pull request:

```sh
bash scripts/validate.sh
```

`scripts/validate.sh` runs the repository's standard local checks when they are defined and will also run `agent-qc ready` when `agent-qc` is installed. Missing `agent-qc` is treated as a skip, not a failure.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution expectations. Changes
should be small, reviewable, and verified before review.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance. Replace
the default security policy before publishing the generated repository.

These links assume this README has been copied to the generated repository root.

## License

MIT

## Verification

Run the release-readiness checks before publishing or cutting a PR:

```bash
npm run check
npm run build
npm run test
npm run smoke
npm run package:smoke
npm run release:check
```

Use `npm run package:smoke` or `npm pack --dry-run` to confirm the published tarball includes the support docs and runnable package contents.

## Limitations

toolmirror summarizes local log text and deterministic matches. It can miss domain-specific failures, over-group unrelated lines, or redact context that a human reviewer still needs, so use the output as triage evidence rather than the final incident record.
