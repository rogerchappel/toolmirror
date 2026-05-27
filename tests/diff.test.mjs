import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { diffCatalogs } from '../dist/diff.js';
import { normalizeCatalogs } from '../dist/normalize.js';

async function fixture(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
}

describe('diffCatalogs', () => {
  it('reports added, removed, changed, and unchanged counts', async () => {
    const before = normalizeCatalogs([{ label: 'before', value: await fixture('./fixtures/codex-tools.json') }]);
    const after = normalizeCatalogs([{ label: 'after', value: await fixture('./fixtures/codex-tools-next.json') }]);
    const report = diffCatalogs(before, after);

    assert.equal(report.summary.added, 1);
    assert.equal(report.summary.removed, 1);
    assert.equal(report.summary.changed, 1);
    assert.equal(report.summary.unchanged, 0);
    assert.equal(report.added[0].name, 'message_send');
    assert.equal(report.removed[0].name, 'web_search');
    assert.equal(report.changed[0].name, 'file_write');
  });
});
