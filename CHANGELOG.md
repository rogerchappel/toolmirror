# Changelog

All notable changes to this project will be documented in this file.

This project follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
format and uses semantic versioning when versioned releases are published.

## [Unreleased]

### Added

- Initial local-first `toolmirror` CLI with `import`, `docs`, `diff`, and
  `risk` commands.
- Stable catalog normalization, Markdown rendering, diff reports, and risk
  classification for tool surfaces.
- Release readiness scaffolding, CI workflows, smoke tests, and ReleaseBox
  configuration.
- CLI regression coverage for stdin imports, lockfile documentation, documented
  diff/risk exit codes, and malformed JSON errors.
- Release candidate notes in `RELEASE_NOTES.md`.

### Fixed

- Preserved original tool source attribution when generating docs from an
  existing `toolmirror.lock.json`.

### Changed

- Included contributor, security, changelog, release notes, and docs files in
  the published npm package.

## Release Links

- Unreleased:
  `https://github.com/rogerchappel/toolmirror/compare/...HEAD`
- Latest release:
  `https://github.com/rogerchappel/toolmirror/releases/latest`

Replace placeholder links once the first release tag exists.
