import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const repoRoot = new URL('..', import.meta.url);
const cliPath = new URL('../dist/cli.js', import.meta.url);

async function fixture(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

async function runCli(args, options = {}) {
  const child = spawn(process.execPath, [cliPath.pathname, ...args], {
    cwd: repoRoot,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  if (options.stdin) {
    child.stdin.end(options.stdin);
  } else {
    child.stdin.end();
  }

  const stdout = [];
  const stderr = [];
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));

  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });

  return {
    code,
    stdout: Buffer.concat(stdout).toString('utf8'),
    stderr: Buffer.concat(stderr).toString('utf8')
  };
}

describe('toolmirror CLI', () => {
  it('imports a catalog from stdin and writes stable JSON to stdout', async () => {
    const result = await runCli(['import', '-'], { stdin: await fixture('./fixtures/codex-tools.json') });

    assert.equal(result.code, 0);
    assert.equal(result.stderr, '');

    const catalog = JSON.parse(result.stdout);
    assert.equal(catalog.generatedBy, 'toolmirror');
    assert.deepEqual(
      catalog.tools.map((tool) => tool.name),
      ['file_write', 'web_search']
    );
  });

  it('preserves original source attribution when generating docs from a lockfile', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'toolmirror-cli-'));
    try {
      const lockfile = join(tmp, 'toolmirror.lock.json');
      const docs = join(tmp, 'TOOLING.md');

      const imported = await runCli(['import', 'tests/fixtures/codex-tools.json', '--output', lockfile]);
      assert.equal(imported.code, 0, imported.stderr);

      const rendered = await runCli(['docs', lockfile, '--output', docs]);
      assert.equal(rendered.code, 0, rendered.stderr);

      const markdown = await readFile(docs, 'utf8');
      assert.match(markdown, /Source: `codex-tools\.json\.tools\[1\]`/);
      assert.doesNotMatch(markdown, /Source: `toolmirror\.lock\.json/);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('returns documented exit codes for diff and risk failures', async () => {
    const diff = await runCli(['diff', 'tests/fixtures/codex-tools.json', 'tests/fixtures/codex-tools-next.json', '--format', 'json']);
    assert.equal(diff.code, 2);
    assert.equal(JSON.parse(diff.stdout).summary.changed, 1);

    const risk = await runCli(['risk', 'tests/fixtures/codex-tools.json', '--fail-on', 'high']);
    assert.equal(risk.code, 3);
    assert.match(risk.stdout, /file_write/);
  });

  it('reports malformed JSON as a user-facing error', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'toolmirror-cli-'));
    try {
      const badJson = join(tmp, 'bad.json');
      await writeFile(badJson, '{not-json', 'utf8');

      const result = await runCli(['import', badJson]);
      assert.equal(result.code, 1);
      assert.match(result.stderr, /^toolmirror: /);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
