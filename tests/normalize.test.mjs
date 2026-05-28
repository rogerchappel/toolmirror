import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { coerceCatalog, normalizeCatalogs } from '../dist/normalize.js';

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

  it('preserves source paths when coercing an existing toolmirror catalog', async () => {
    const catalog = normalizeCatalogs([{ label: 'codex-tools.json', value: await fixture('./fixtures/codex-tools.json') }]);
    const coerced = coerceCatalog(catalog, 'toolmirror.lock.json');

    assert.deepEqual(
      coerced.tools.map((tool) => tool.source),
      catalog.tools.map((tool) => tool.source)
    );
    assert.equal(coerced.tools[0].source, 'codex-tools.json.tools[1]');
  });
});
