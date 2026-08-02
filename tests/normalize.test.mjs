import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { normalizeCatalogs } from '../dist/normalize.js';

async function fixture(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
}

describe('normalizeCatalogs', () => {
  it('extracts stable tool definitions and redacts sensitive defaults', async () => {
    const catalog = normalizeCatalogs([{ label: 'fixture', value: await fixture('./fixtures/codex-tools.json') }]);

    assert.deepEqual(
      catalog.tools.map((tool) => tool.name),
      ['file_write', 'web_search']
    );

    const fileWrite = catalog.tools[0];
    assert.equal(fileWrite.risk.level, 'high');
    assert.deepEqual(
      fileWrite.parameters.map((parameter) => parameter.name),
      ['api_token', 'content', 'path']
    );
    assert.equal(JSON.stringify(fileWrite.schema).includes('secret-value'), false);
    assert.equal(JSON.stringify(fileWrite.schema).includes('[REDACTED]'), true);
  });

  it('collapses identical duplicates with a deterministic source', () => {
    const definition = { name: 'shared', description: 'Same tool', parameters: { type: 'object' } };
    const forward = normalizeCatalogs([
      { label: 'z.json', value: [definition] },
      { label: 'a.json', value: [definition] }
    ]);
    const reversed = normalizeCatalogs([
      { label: 'a.json', value: [definition] },
      { label: 'z.json', value: [definition] }
    ]);

    assert.deepEqual(forward, reversed);
    assert.equal(forward.tools.length, 1);
    assert.equal(forward.tools[0].source, 'a.json[0]');
  });

  it('rejects conflicting duplicates with order-independent source diagnostics', () => {
    const first = { name: 'shared', parameters: { type: 'object', properties: { a: { type: 'string' } } } };
    const second = { name: 'shared', parameters: { type: 'object', properties: { b: { type: 'number' } } } };
    const normalize = (inputs) => () => normalizeCatalogs(inputs);
    const message = /conflicting definitions for tool "shared" at first\.json\[0\], second\.json\[0\]/;

    assert.throws(normalize([{ label: 'first.json', value: [first] }, { label: 'second.json', value: [second] }]), message);
    assert.throws(normalize([{ label: 'second.json', value: [second] }, { label: 'first.json', value: [first] }]), message);
  });
});
