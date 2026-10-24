import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

test('preserves the recovered scene bytes and three effect layers', async () => {
  const bytes = await readFile(new URL('./flow-background.json', import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '066a057168f8d42275e10943db253f77392f0917c9101a99944215a02d23a96d');
  assert.deepEqual(JSON.parse(bytes).history.map(layer => layer.type), ['gradient', 'mouseDraw', 'fbm']);
});

test('loads the pinned runtime and relative scene with original rendering settings', async () => {
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('unicornstudio.js@v1.5.2/dist/unicornStudio.umd.js'));
  assert.ok(html.includes("filePath: './flow-background.json'"));
  assert.ok(html.includes('scale: 1, dpi: 1, fps: 60'));
  assert.ok(html.includes('pointer-events: none'));
  assert.ok(html.includes('Scene could not load.'));
});
