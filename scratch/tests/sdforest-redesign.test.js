const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test('home is a truthful portal with the requested project lineup', () => {
  const home = read('index.html');

  for (const title of [
    'VFX Portfolio',
    'Morning News',
    'Life in Time',
    'Women’s Health OS',
    'Replicator Void',
    'Multiply Magic Studio',
    'Math Forest',
  ]) {
    assert.match(home, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.doesNotMatch(home, /Voice2Voice Buddy/i);
  assert.doesNotMatch(home, /TinyLM Experiment/i);
  assert.match(home, /Multiply Magic Studio[\s\S]{0,600}In development/i);
  assert.match(home, /Math Forest[\s\S]{0,600}In development/i);
  assert.match(home, /Replicator Void[\s\S]{0,600}Experimental/i);
  assert.match(home, /web\/vfx-portfolio\/index\.html/);
});

test('home implements an accessible scroll assembly and interactive previews', () => {
  const home = read('index.html');

  assert.match(home, /data-assembly/);
  assert.match(home, /data-project-grid/);
  assert.match(home, /data-preview-stage/);
  assert.match(home, /aria-live="polite"/);
  assert.match(home, /prefers-reduced-motion/);
  assert.match(home, /pointermove/);
});

test('public council exposes exactly two truthful modes', () => {
  const council = read('web/council/index.html');
  const modes = council.match(/data-council-mode=/g) || [];

  assert.equal(modes.length, 2);
  assert.match(council, /TinyLM Local Oracle/);
  assert.match(council, /OpenRouter Free/);
  assert.match(council, /no (?:fleet )?memory/i);
  assert.match(council, /no delegation/i);
  assert.doesNotMatch(council, /Chlo[eé].*inner|Personal Round Table|private council/is);
});

test('TinyLM standalone route redirects into Councils', () => {
  const tiny = read('web/tinylm/index.html');
  assert.match(tiny, /web\/council\/index\.html#tinylm/);
  assert.match(tiny, /http-equiv="refresh"/i);
});

test('VFX portfolio preserves real prior work and contains no generated imagery', () => {
  const vfx = read('web/vfx-portfolio/index.html');

  for (const source of [
    'https://youtu.be/ogwVYZrWI6s',
    'https://youtu.be/pInnrhghaxY',
    'https://vimeo.com/283914588',
    'https://www.youtube.com/watch?v=SOjHSKbRVCQ',
    'https://www.youtube.com/watch?v=qeevdrluvnA',
    'https://youtu.be/C8Mwkhu3iq4',
    'https://redtiger.com/games',
  ]) {
    assert.match(vfx, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(vfx, /Senior Animator \/ Animation Lead/);
  assert.match(vfx, /Animation, Compositing &amp; VFX Artist/);
  assert.match(vfx, /ivangegov\.dve@gmail\.com/);
  assert.doesNotMatch(vfx, /generated_images|oaidalle|DALL.?E|AI-generated/i);
});

test('shared motion runtime honors pointer, click, visibility, and reduced motion', () => {
  const motion = read('web/shared/forest-motion.js');

  for (const token of ['uMouse', 'uClick', 'visibilitychange', 'prefers-reduced-motion']) {
    assert.match(motion, new RegExp(token));
  }
  assert.match(motion, /devicePixelRatio/);
  assert.match(motion, /value = \(value \+ 0x6D2B79F5\) \| 0/);
  assert.doesNotMatch(motion, /nearest\.sort/);
});

test('shared layouts preserve fixed controls and stack safely on tablets', () => {
  const shell = read('web/shared/forest-shell.css');
  const homeStyles = read('web/shared/forest-home.css');
  const home = read('index.html');

  assert.match(shell, /:where\(body\[data-forest-page\]/);
  assert.match(homeStyles, /@media \(max-width: 900px\)/);
  assert.match(home, /matchMedia\('\(max-width: 900px\)'\)/);
});

test('live research requests have bounded waits and guaranteed timer cleanup', () => {
  const hypertrophy = read('web/hypertrophyos/index.html');
  const health = read('web/womens-health-os/index.html');

  assert.match(hypertrophy, /AbortController/);
  assert.match(hypertrophy, /signal:controller\.signal/);
  assert.match(hypertrophy, /finally\{clearTimeout\(timeoutId\)/);
  assert.match(health, /\.finally\(function \(\) \{ clearTimeout\(t\); \}\)/);
});

test('Replicator Void uses its working native canvas instead of the broken bundle', () => {
  const replicator = read('web/replicator-void/index.html');
  assert.match(replicator, /<canvas[^>]+id="world"/i);
  assert.doesNotMatch(replicator, /index-fWcu6nyk\.js/);
  assert.match(replicator, /Experimental/);
});

test('every live internal portal resolves to an animated page with a Forest return path', () => {
  const home = read('index.html');
  const routes = [...home.matchAll(/data-href="(\/web\/[^"]+)"/g)].map((match) => match[1]);

  assert.equal(routes.length, 13);
  for (const route of routes) {
    const relativePath = route.replace(/^\//, '');
    assert.ok(fs.existsSync(path.join(ROOT, relativePath)), `${route} does not exist`);
    const page = read(relativePath);
    assert.match(page, /href="\/"|href="\/index\.html"/, `${route} has no Forest return path`);
    assert.match(page, /forest-motion\.js|id="world"|id="starfield"/, `${route} has no motion runtime`);
  }
});

test('deprecated voice project is absent from public web surfaces', () => {
  const publicFiles = fs.readdirSync(path.join(ROOT, 'web'), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:html|js|css)$/.test(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name));

  for (const file of publicFiles) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /Voice2Voice Buddy/i, file);
  }
});
