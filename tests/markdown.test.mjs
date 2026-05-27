import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { renderMarkdown } from '../dist/markdown.js';
import { normalizeCatalogs } from '../dist/normalize.js';

async function fixture(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
}

describe('renderMarkdown', () => {
  it('renders an index and parameter table', async () => {
    const markdown = renderMarkdown(normalizeCatalogs([{ label: 'fixture', value: await fixture('./fixtures/codex-tools.json') }]));

    assert.match(markdown, /^# Tool Catalog/);
    assert.match(markdown, /- \[file\\_write\]\(#file-write\) - high/);
    assert.match(markdown, /\| `path` \| string \| yes \| Destination path \|/);
  });
});
