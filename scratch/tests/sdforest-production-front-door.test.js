const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const read = (source) => fs.readFileSync(path.join(ROOT, source), 'utf8');
const config = JSON.parse(read('vercel.json'));
const routeFor = (src) => config.routes.find((entry) => entry.src === src);

test('production root takes precedence over the filesystem, with a canonical gate route', () => {
  assert.deepEqual(config.routes.slice(0, 2), [
    { src: '^/$', dest: '/scratch/sdforest-overworld-preview/' },
    { src: '^/gate/?$', dest: '/scratch/sdforest-gate-entry/intro/' },
  ]);
  assert.deepEqual(routeFor('^/$'), {
    src: '^/$',
    dest: '/scratch/sdforest-overworld-preview/',
  });
  assert.deepEqual(routeFor('^/gate/?$'), {
    src: '^/gate/?$',
    dest: '/scratch/sdforest-gate-entry/intro/',
  });
});

test('the root fallback does not redirect visitors into a scratch route', () => {
  const root = read('index.html');
  assert.doesNotMatch(root, /http-equiv=["']refresh/i);
  assert.match(root, /href=["']\/gate\/["']/);
  assert.match(root, /href=["']\/scratch\/sdforest-overworld-preview\/["']/);
});

test('the overwritten root page keeps its canvas and promotes the stones gate', () => {
  const page = read('scratch/sdforest-overworld-preview/index.html');
  assert.match(page, /<canvas\s+id=["']forest-canvas["']/i);
  assert.match(page, /href=["']\/gate\/["']/);
  assert.match(page, /Enter through the stones/);
  assert.match(page, /src=["']\/scratch\/sdforest-overworld-preview\/app\.js["']/);
  assert.match(page, /href=["']\/scratch\/sdforest-overworld-preview\/styles\.css["']/);
});

test('the gate is reachable at the canonical route and still keeps scratch compatibility', () => {
  const page = read('scratch/sdforest-gate-entry/intro/index.html');
  assert.match(page, /<canvas\s+id=["']intro-canvas["']/i);
  assert.match(page, /<canvas\s+id=["']reveal-canvas["']/i);
  assert.match(page, /href=["']\/["']/);
  assert.match(page, /src=["']\/scratch\/sdforest-gate-entry\/intro\/intro\.js["']/);
  assert.match(page, /three\/webgpu/);
});
