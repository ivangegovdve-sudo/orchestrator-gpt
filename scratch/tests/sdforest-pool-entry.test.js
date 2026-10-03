const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const entryPools = ['growingapp', 'ai-d-kit', 'tinkerbox', 'design-gallery', 'artificial-self', 'my-story'];
const presenter = import('../../web/shared/pool-page.mjs');
const catalog = import('../../web/shared/project-catalog.mjs');

test('each non-Health pool carries the shared entry contract and its own scene', () => {
  for (const id of entryPools) {
    const html = read(`web/pools/${id}/index.html`);
    assert.match(html, /<section class="entry" data-pool-entry data-sc-act="pin" data-sc-span="[\d.]+">/, id);
    assert.match(html, /data-entry-canvas[^>]*aria-hidden="true"/, id);
    assert.match(html, /class="entry-notice"/, id);
    assert.match(html, /class="entry-go" href="#pool-world"/, id);
    assert.match(html, /id="pool-world"/, id);
    assert.match(html, /\/web\/shared\/pool-entry\/pool-entry\.css/, id);
    assert.match(html, /\/web\/shared\/feedback\.js/, id);
    assert.doesNotMatch(html, /pool-page\.css|pool-designed\.css/, id);
    assert.ok(fs.existsSync(path.join(ROOT, `web/pools/${id}/entry.mjs`)), id);
    const scene = read(`web/pools/${id}/entry.mjs`);
    assert.match(scene, /duration/, id);
    assert.match(scene, /still/, id);
  }
});

test('Health stays on the old template and does not load the entry system', () => {
  const html = read('web/pools/health/index.html');
  assert.doesNotMatch(html, /pool-entry|feedback\.js/);
});

test('the engine copy is verbatim', () => {
  assert.equal(read('web/shared/pool-entry/scrollcraft.js'), read('.agents/skills/scroll-craft/engine/scrollcraft.js'));
});

test('feedback mode adds a Feedback button to every card, including closed ones, without aria-disabled', async () => {
  const [{ renderProject }, { getPoolProjects }] = await Promise.all([presenter, catalog]);
  for (const name of ['GrowingApp', 'AI-d kit', 'TinkerBox', 'Design Gallery', 'Artificial Self', 'My Story']) {
    for (const project of getPoolProjects(name)) {
      const html = renderProject(project, { designed: true, feedback: true });
      if (!html) continue;
      assert.match(html, new RegExp(`data-feedback-open data-feedback-project="${project.id}"`), project.id);
      assert.doesNotMatch(html, /aria-disabled/, project.id);
      assert.doesNotMatch(renderProject(project, { designed: true }), /data-feedback-open/, 'off by default');
    }
  }
});
