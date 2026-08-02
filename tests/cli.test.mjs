import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const cli = new URL('../dist/cli.js', import.meta.url);
const fixture = new URL('./fixtures/codex-tools.json', import.meta.url).pathname;

function run(args, { input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli.pathname, ...args], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => (stdout += chunk));
    child.stderr.setEncoding('utf8').on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(input);
  });
}

describe('CLI argument contracts', () => {
  it('rejects unsupported options, excess positionals, and missing option values', async () => {
    for (const args of [
      ['docs', fixture, '--format', 'json'],
      ['docs', fixture, 'extra'],
      ['docs', fixture, '--output'],
      ['diff', fixture, fixture, '--min', 'low'],
      ['risk', fixture, '--fail-on='],
      ['import', fixture, '--unknown', 'value'],
      ['diff', fixture]
    ]) {
      const result = await run(args);
      assert.equal(result.code, 1, `${args.join(' ')}\n${result.stderr}`);
      assert.match(result.stderr, /^toolmirror: /);
    }
  });

  it('preserves help and valid output behavior', async () => {
    const help = await run(['--help']);
    assert.equal(help.code, 0);
    assert.match(help.stdout, /^Usage:/);

    const directory = await mkdtemp(join(tmpdir(), 'toolmirror-cli-'));
    const output = join(directory, 'docs.md');
    const docs = await run(['docs', fixture, '--output', output]);
    assert.equal(docs.code, 0, docs.stderr);
    assert.match(await readFile(output, 'utf8'), /^# Tool Catalog/m);

    const riskOutput = join(directory, 'risk=report.txt');
    const risk = await run(['risk', fixture, `--output=${riskOutput}`]);
    assert.equal(risk.code, 0, risk.stderr);
    assert.match(await readFile(riskOutput, 'utf8'), /^Risk report/);
  });

  it('preserves stdin and multiple inputs for import', async () => {
    const json = await readFile(fixture, 'utf8');
    const imported = await run(['import', '-', fixture], { input: json });
    assert.equal(imported.code, 0, imported.stderr);
    assert.equal(JSON.parse(imported.stdout).tools.length, 2);
  });

  it('fails conflicting imports with both source locations and no output', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'toolmirror-conflict-'));
    const first = join(directory, 'first.json');
    const second = join(directory, 'second.json');
    const output = join(directory, 'output.json');
    await writeFile(first, JSON.stringify([{ name: 'shared', parameters: { type: 'string' } }]));
    await writeFile(second, JSON.stringify([{ name: 'shared', parameters: { type: 'number' } }]));

    const result = await run(['import', second, first, '--output', output]);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /toolmirror: conflicting definitions for tool "shared" at first\.json\[0\], second\.json\[0\]/);
    await assert.rejects(readFile(output, 'utf8'), { code: 'ENOENT' });
  });

  it('preserves diff exit 2 and risk exit 3', async () => {
    const different = new URL('./fixtures/codex-tools-next.json', import.meta.url).pathname;
    assert.equal((await run(['diff', fixture, different, '--format', 'json'])).code, 2);
    assert.equal((await run(['risk', fixture, '--fail-on', 'high'])).code, 3);
  });
});
