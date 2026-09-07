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

Use `-` for one input from standard input. An import may combine that single
stdin input with file inputs, but supplying `-` more than once is a usage error
and exits with status `1` before stdin is read.

When multiple inputs define the same tool name, identical normalized definitions
are collapsed into one entry. Its `source` is the lexicographically first source
location, so reversing the inputs does not change the lockfile. Conflicting
same-name definitions are rejected with exit status `1`; the diagnostic names
the tool and every conflicting source location instead of silently choosing one.

Generate Markdown documentation:

```sh
toolmirror docs toolmirror.lock.json --output TOOLING.md
```

Generated index links use deterministic heading anchors. Tool names that normalize to the same anchor receive stable numeric suffixes such as `foo-bar-2`.

Compare exactly two snapshots. The command exits `2` when catalogs differ:

```sh
toolmirror diff old.lock.json new.lock.json
```

Review risky tools. `--fail-on high` exits `3` when high-risk tools are present:

```sh
toolmirror risk toolmirror.lock.json --min medium --fail-on high --output risk.txt
```

Risk scanning recognizes verbs in delimited, camelCase, and PascalCase tool names
(for example, `delete_file`, `sendEmail`, and `ExecuteCommand`) as well as descriptions.

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

The standard test command discovers every top-level `tests/*.test.mjs` suite
with Node before invoking the test runner, avoiding shell-specific glob
behavior. It prints the discovered suite list so CI logs show the exact test
coverage used by `npm test` and `npm run release:check`.

Use `npm run package:smoke` to inspect `npm pack --dry-run --json` and assert that the published tarball includes the runtime entrypoint, CLI, declarations, root project documents, every file under `docs/`, and every fixture under `tests/fixtures/`.

## Limitations

toolmirror extracts supported tool-definition shapes from JSON and normalizes
them into a common catalog; it does not interpret every vendor-specific schema
extension. Default-value redaction is heuristic and is not a substitute for
preventing secrets from entering source catalogs. Risk levels are likewise
name- and parameter-based signals, not proof that a tool is safe or unsafe.
Review imported definitions, generated documentation, diffs, and risk reports
before using them for security or release decisions.
