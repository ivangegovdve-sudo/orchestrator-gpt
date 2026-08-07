const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
const text = (markup) => markup.replace(/<[^>]+>/g, '').replace(/&(amp|rsquo);/g, (_, entity) => ({ amp: '&', rsquo: '’' })[entity]).replace(/\s+/g, ' ').trim();
const portalCards = (markup) => [...markup.matchAll(/<([a-z]+)\b(?=[^>]*\bclass="[^"]*\bportal\b[^"]*")[^>]*>([\s\S]*?)<\/\1>/gi)]
  .map((match) => ({ tag: match[0], tagName: match[1], project: attribute(match[0], 'data-project'), name: text(match[2].match(/class="portal-name"[^>]*>([\s\S]*?)<\//)?.[1] || '') }));
const indexItems = (markup) => [...markup.matchAll(/<([a-z]+)\b(?=[^>]*\bdata-index-project="[^"]+")[^>]*>([\s\S]*?)<\/\1>/gi)]
  .map((match) => ({ tag: match[0], tagName: match[1], project: attribute(match[0], 'data-index-project'), name: text(match[2]) }));

test('home presents the canonical grouped directory as progressively enhanced, truthful navigation', () => {
  const home = read('index.html');
  const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(home, /SDForest is Ivan Gegov(?:\u2019|&rsquo;)s living collection of writing, creative projects, practical web tools, and research experiments\. It is for curious readers, makers, learners, and families(?:\u2014|&mdash;)choose a section below based on whether you want to read, use something, play, or investigate\./);
  assert.match(home, /<a[^>]+href="#atlas"[^>]*>Explore by section<\/a>/);

  const taxonomy = [
    ['writing-media', 'Writing & Media', 'Briefings, accessible reading, essays, and spoken-word experiences.', ['morning-news', 'reader', 'audiobook', 'manifesto'], ['voice', 'poetry']],
    ['projects-play', 'Projects & Play', 'Creative work, family experiences, and playful builds.', ['vfx', 'kids', 'power', 'void'], ['gallery', 'flowform', 'lobester', 'multiply', 'math']],
    ['tools', 'Tools', 'Practical utilities, tutors, and searchable references.', ['time', 'rubiks', 'library', 'avatar'], ['council', 'mendeleev', 'explore', 'calendar']],
    ['research-experiments', 'Research & Experiments', 'Evidence-led resources and investigations into AI, health, ecosystems, and model behavior.', ['health', 'open-overview', 'muscle', 'c2c-dolphin'], ['tinylm', 'c2c-self']],
  ];
  const sections = [...home.matchAll(/<section\b[^>]*\bdata-directory-section="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)];
  assert.equal(sections.length, 4);
  assert.deepEqual(sections.map((section) => section[1]), taxonomy.map(([id]) => id));
  const indexSections = [...home.matchAll(/<section\b[^>]*\bdata-index-section="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)];
  assert.deepEqual(indexSections.map((section) => section[1]), taxonomy.map(([id]) => id));

  for (const [id, title, description, featured, overflow] of taxonomy) {
    const body = sections.find((section) => section[1] === id)[2];
    assert.match(body, new RegExp(`<h3[^>]*>${escape(title)}<\\/h3>`));
    assert.match(body, new RegExp(escape(description)));
    const featuredMarkup = body.match(/data-featured-projects[^>]*>([\s\S]*?)<\/div>/)?.[1];
    const overflowMarkup = body.match(/<details[^>]*>[\s\S]*?data-overflow-projects[^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/details>/)?.[1];
    assert.ok(featuredMarkup, `${id} has a featured card group`);
    assert.ok(overflowMarkup, `${id} has a details overflow group`);
    assert.deepEqual(portalCards(featuredMarkup).map((card) => card.project), featured);
    assert.deepEqual(portalCards(overflowMarkup).map((card) => card.project), overflow);
    assert.deepEqual(
      indexItems(indexSections.find((section) => section[1] === id)[2]).map((item) => item.project),
      [...featured, ...overflow],
    );
    assert.match(body, new RegExp(`See all ${featured.length + overflow.length}`));
    assert.match(body, /Show featured only/);
  }

  const directory = home;
  assert.match(home, /<section\b[^>]*\bid="atlas"/);
  const cards = portalCards(directory);
  const index = indexItems(directory);
  assert.equal(cards.length, 29);
  assert.equal(new Set(cards.map((card) => card.project)).size, 29);
  assert.equal(index.length, 29);
  assert.equal(new Set(index.map((item) => item.project)).size, 29);

  for (const card of cards) {
    const item = index.find((candidate) => candidate.project === card.project);
    assert.ok(item, `${card.project} is present in the compact index`);
    assert.equal(item.name, card.name, `${card.project} keeps its name in the index`);
    if (card.project === 'gallery') {
      assert.notEqual(card.tagName, 'a');
      assert.match(card.tag, /aria-disabled="true"/);
      assert.match(card.tag, /tabindex="-1"/);
      assert.notEqual(item.tagName, 'a');
      continue;
    }
    assert.equal(card.tagName, 'a', `${card.project} is a real link`);
    assert.doesNotMatch(card.tag, /aria-disabled="true"/);
    assert.equal(attribute(card.tag, 'href'), attribute(card.tag, 'data-href'));
    assert.equal(item.tagName, 'a', `${card.project} has an index link`);
    assert.equal(attribute(item.tag, 'href'), attribute(card.tag, 'href'));
    if (attribute(card.tag, 'data-external') === 'true') {
      for (const tag of [card.tag, item.tag]) {
        assert.equal(attribute(tag, 'target'), '_blank');
        assert.match(tag, /rel="[^"]*\bnoopener\b[^"]*"/);
      }
    }
  }

  assert.doesNotMatch(directory, /aria-pressed/);
  assert.ok(home.indexOf('id="atlas"') < home.indexOf('data-routes'));
  assert.match(home, /document\.querySelectorAll\('\[data-project-grid\] \.portal'\)/);
  assert.doesNotMatch(home, /card\.addEventListener\('click'/);
});

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
    'Open Overview',
    'Rubik',
  ]) {
    assert.match(home, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.equal((home.match(/data-project="/g) || []).length, 29);
  assert.match(home, /The atlas/);
  assert.match(home, /Every path <em>at a glance<\/em>/);

  assert.doesNotMatch(home, /Voice2Voice Buddy/i);
  assert.doesNotMatch(home, /TinyLM Experiment/i);
  assert.match(home, /Multiply Magic Studio[\s\S]{0,600}In development/i);
  assert.match(home, /Math Forest[\s\S]{0,600}In development/i);
  assert.match(home, /Replicator Void[\s\S]{0,600}Experimental/i);
  assert.match(home, /web\/vfx-portfolio\/index\.html/);
});

test('home preserves the scroll-linked route walk without button-navigation shims', () => {
  const home = read('index.html');

  assert.match(home, /data-routes/);
  assert.match(home, /data-project-grid/);
  assert.match(home, /section\.dataset\.slam/);
  assert.doesNotMatch(home, /class="portal" type="button"/);
  assert.doesNotMatch(home, /aria-pressed="false"/);
  assert.match(home, /prefers-reduced-motion/);
  assert.match(home, /pointermove/);
});

test('public council exposes exactly two truthful modes', () => {
  const council = read('web/council/index.html');
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

test('every live internal portal resolves to an animated page with a Forest return path', () => {
  const home = read('index.html');
  const routes = [...home.matchAll(/data-href="(\/web\/[^"]+)"/g)].map((match) => match[1]);

  assert.equal(routes.length, 24);
  assert.equal(new Set(routes).size, 24);
  for (const route of new Set(routes)) {
    let relativePath = route.replace(/^\//, '').split('#')[0];
    if (relativePath.endsWith('/')) relativePath += 'index.html';
    assert.ok(fs.existsSync(path.join(ROOT, relativePath)), `${route} does not exist`);
    const page = read(relativePath);
    assert.match(
      page,
      /href="\/"|href="\/index\.html"|forest-(?:motion|trails)\.js/,
      `${route} has no Forest return path`,
    );
    assert.match(page, /forest-motion\.js|open-overview\.js|id="world"|id="starfield"|\/web\/rubiks-teacher\/assets\/index-[^"]+\.js/, `${route} has no motion runtime`);
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
