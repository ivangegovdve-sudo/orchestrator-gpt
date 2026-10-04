const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const pools = ['growingapp', 'ai-d-kit', 'tinkerbox', 'design-gallery', 'artificial-self', 'my-story'];
const runtime = import('../../web/shared/pool-entry/pool-entry.mjs');

test('the six non-Health pools expose accessible entry and skip paths', () => {
  for (const id of pools) {
    const html = read(`web/pools/${id}/index.html`);
    assert.match(html, /<section class="entry" data-pool-entry data-sc-act="pin" data-sc-span="[\d.]+">/, id);
    assert.match(html, /data-entry-canvas[^>]*aria-hidden="true"/, id);
    assert.match(html, /class="entry-go" href="#pool-world"/, id);
    assert.match(html, /id="pool-world"/, id);
    assert.match(html, /\/web\/shared\/pool-entry\/pool-entry\.css/, id);
    assert.match(html, /\/web\/shared\/feedback\.js/, id);
    assert.ok(fs.existsSync(path.join(ROOT, `web/pools/${id}/entry.mjs`)), id);
  }
});

test('entry clock resumes the current gesture after hidden and off-screen time', async () => {
  const { createEntryClock } = await runtime;
  const clock = createEntryClock(0);
  assert.equal(clock(0, true), 0);
  assert.equal(clock(1000, true), 1);
  assert.equal(clock(1100, false), 1);
  assert.equal(clock(2100, false), 1);
  assert.equal(clock(2100, true), 1);
  assert.equal(clock(2600, true), 1.5);
  assert.equal(clock(2000, true), 1.5, 'a backwards timestamp never reverses the arrival');
});

test('malformed debug query values cannot turn the canvas clock into NaN', async () => {
  const { debugTime } = await runtime;
  for (const value of ['', 'nope', 'Infinity', '-1', '3oops']) {
    assert.equal(debugTime(new URLSearchParams({ 'entry-t': value }), 'entry-t'), null, value);
  }
  assert.equal(debugTime(new URLSearchParams('entry-t=0'), 'entry-t'), 0);
  assert.equal(debugTime(new URLSearchParams('entry-t=3.2'), 'entry-t'), 3.2);
});

test('scroll engine is copied without per-pool engine edits', () => {
  assert.equal(read('web/shared/pool-entry/scrollcraft.js'), read('.agents/skills/scroll-craft/engine/scrollcraft.js'));
});

test('all catalog cards retain usable feedback, including closed destinations', async () => {
  const [{ renderProject }, { getPoolProjects }] = await Promise.all([
    import('../../web/shared/pool-page.mjs'), import('../../web/shared/project-catalog.mjs'),
  ]);
  for (const name of ['GrowingApp', 'AI-d kit', 'TinkerBox', 'Design Gallery', 'Artificial Self', 'My Story', 'Health']) {
    for (const project of getPoolProjects(name)) {
      const html = renderProject(project, { designed: true, feedback: true });
      if (!html) continue;
      assert.match(html, new RegExp(`data-feedback-open data-feedback-project="${project.id}"`), project.id);
      assert.doesNotMatch(html, /aria-disabled/, project.id);
      assert.doesNotMatch(renderProject(project, { designed: true }), /data-feedback-open/, 'off by default');
    }
  }
});
