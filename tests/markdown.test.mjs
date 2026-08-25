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

  it('assigns deterministic unique anchors to colliding tool names', () => {
    const names = ['foo-bar', 'foo_bar', 'foo bar', '!!!', '???'];
    const tools = names.map((name) => ({
      name,
      description: '',
      parameters: [],
      schema: {},
      source: 'fixture',
      risk: { level: 'low', reasons: [], verbs: [] }
    }));

    const markdown = renderMarkdown({ schemaVersion: 1, generatedBy: 'toolmirror', tools });
    const indexAnchors = [...markdown.matchAll(/\]\(#([^)]+)\)/g)].map((match) => match[1]);
    const headingAnchors = [...markdown.matchAll(/<h2 id="([^"]+)">/g)].map((match) => match[1]);

    assert.deepEqual(indexAnchors, ['foo-bar', 'foo-bar-2', 'foo-bar-3', 'tool', 'tool-2']);
    assert.deepEqual(headingAnchors, indexAnchors);
    for (const anchor of indexAnchors) {
      assert.equal(headingAnchors.filter((candidate) => candidate === anchor).length, 1);
    }
  });
});
