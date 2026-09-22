const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const withoutNavigationMetadata = (source) =>
  source.replace(/<script\b[^>]*type=["']speculationrules["'][^>]*>[\s\S]*?<\/script>/gi, '');

const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
const text = (markup) => markup.replace(/<[^>]+>/g, '').replace(/&(amp|rsquo);/g, (_, entity) => ({ amp: '&', rsquo: '’' })[entity]).replace(/\s+/g, ' ').trim();
const portalCards = (markup) => [...markup.matchAll(/<([a-z]+)\b(?=[^>]*\bclass="[^"]*\bportal\b[^"]*")[^>]*>([\s\S]*?)<\/\1>/gi)]
  .map((match) => ({ tag: match[0], tagName: match[1], project: attribute(match[0], 'data-project'), name: text(match[2].match(/class="portal-name"[^>]*>([\s\S]*?)<\//)?.[1] || '') }));
const indexItems = (markup) => [...markup.matchAll(/<([a-z]+)\b(?=[^>]*\bdata-index-project="[^"]+")[^>]*>([\s\S]*?)<\/\1>/gi)]
  .map((match) => ({ tag: match[0], tagName: match[1], project: attribute(match[0], 'data-index-project'), name: text(match[2]) }));

test('home presents seven manually authored live pools as progressively enhanced navigation', () => {
  const home = read('index.html');
  assert.match(home, /choose one of seven live pools below/);
  assert.match(home, /<a[^>]+href="#atlas"[^>]*>Explore the pools<\/a>/);
  const cards = portalCards(home);
  assert.deepEqual(cards.map((card) => card.name), [
    'GrowingApp', 'AI-d kit', 'TinkerBox', 'Health', 'Design Gallery', 'Artificial Self', 'My Story',
  ]);
  assert.equal(cards.length, 7);
  for (const card of cards) {
    assert.equal(card.tagName, 'a');
    assert.match(card.tag, /data-pool-link="/);
    assert.match(card.tag, /href="\/web\/pools\/[^"]+\/"/);
    assert.match(card.tag, />Live pool</);
    assert.doesNotMatch(card.tag, /aria-disabled|aria-pressed/);
  }
  assert.equal(indexItems(home).length, 0, 'the obsolete compact project index is retired');
  assert.doesNotMatch(home, /data-directory-section=|data-index-section=/);
});

test('home exposes live pools with a separate external Portfolio control and no stale project lineup', () => {
  const home = read('index.html');
  assert.equal((home.match(/data-pool-link="/g) || []).length, 7);
  assert.match(home, /Seven pools <em>to explore<\/em>/);
  assert.match(home, /data-site-control="portfolio" href="https:\/\/vfxportfolio.lovable.app" target="_blank" rel="noopener">Portfolio — opens in a new tab/);
  assert.doesNotMatch(home, /Kids Corner|Found Work|Voice Playground|Multiply Magic|Web Design Gallery|VFX Portfolio|Published research/);
  assert.doesNotMatch(home, /data-project="/);
});

test('pool directory stays outside the existing scroll-linked project walk', () => {
  const home = read('index.html');
  assert.match(home, /data-pool-directory/);
  assert.match(home, /data-routes/);
  assert.doesNotMatch(home, /<[^>]+data-project-grid/);
  assert.doesNotMatch(home, /class="portal" type="button"/);
  assert.doesNotMatch(home, /aria-pressed="false"/);
  assert.match(home, /prefers-reduced-motion/);
  assert.match(home, /pointermove/);
});

test('public council exposes exactly two truthful modes', () => {
  const council = withoutNavigationMetadata(read('web/council/index.html'));
  const modes = council.match(/data-council-mode=/g) || [];

  assert.equal(modes.length, 2);
  assert.match(council, /TinyLLM Local Oracle/);
  assert.match(council, /OpenRouter Free/);
  assert.match(council, /no (?:fleet )?memory/i);
  assert.match(council, /no delegation/i);
  assert.doesNotMatch(council, /Chlo[eé].*inner|Personal Round Table|private council/is);
});

test('TinyLM standalone route redirects into Councils', () => {
  const tiny = read('web/council/tinylm/index.html');
  assert.match(tiny, /web\/council\/index\.html#tinylm/);
  assert.match(tiny, /http-equiv="refresh"/i);

  // The duplicate /web/tinylm/ stub is retired; its bookmark lives on as a
  // permanent redirect rather than a second copy of the same meta-refresh page.
  assert.equal(fs.existsSync(path.join(ROOT, 'web/tinylm')), false);
  const vercel = JSON.parse(read('vercel.json'));
  assert.ok(vercel.redirects.some(({ source, destination }) =>
    source === '/web/tinylm/' && destination === '/web/council/index.html#tinylm'));
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

test('shared motion runtime honors interaction and imports the deterministic theme registry', async () => {
  const motion = read('web/shared/forest-motion.js');

  for (const token of ['uMouse', 'uClick', 'uScroll', 'visibilitychange', 'prefers-reduced-motion']) {
    assert.match(motion, new RegExp(token));
  }
  assert.match(motion, /devicePixelRatio/);
  assert.match(motion, /forest-themes\.mjs/);

  const themesPath = pathToFileURL(path.join(ROOT, 'web/shared/forest-themes.mjs')).href;
  const themes = await import(`${themesPath}?authority=${Date.now()}`);
  const first = themes.createThemePoints('library', 24, 20260725);
  const second = themes.createThemePoints('library', 24, 20260725);
  assert.deepEqual(first, second);
  assert.equal(first.positions.length, 72);
});

test('shared layouts preserve fixed controls and stack safely on tablets', () => {
  const shell = read('web/shared/forest-shell.css');
  const homeStyles = read('web/shared/forest-home.css');
  const homeRuntime = read('web/shared/forest-three.js');

  assert.match(shell, /:where\(body\[data-forest-page\]/);
  assert.match(homeStyles, /@media \(max-width: 900px\)/);
  assert.match(homeRuntime, /matchMedia\('\(max-width: 900px\)'\)/);
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

test('every live pool link resolves to a static page with a Forest return path', () => {
  const home = read('index.html');
  const routes = [...home.matchAll(/data-pool-link="[^"]+" href="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(routes.length, 7);
  assert.equal(new Set(routes).size, 7);
  for (const route of routes) {
    const relativePath = route.slice(1) + 'index.html';
    assert.ok(fs.existsSync(path.join(ROOT, relativePath)), route);
    const page = read(relativePath);
    assert.match(page, /href="\/">Back to SD Forest/);
    assert.match(page, /data-pool-id="/);
    assert.match(page, /data-forest-runtime="motion"/);
    assert.match(page, /forest-runtime-boot\.mjs\?v=20260807a/);
    assert.match(page, /data-forest-page="[^"]+"/);
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
