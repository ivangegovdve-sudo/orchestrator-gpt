const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..', '..');
const chromeExecutable = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const hostile = (label) => `" autofocus onfocus="window.__payloadFired=1">${label}<img id="${label}-payload" src=x onerror="window.__payloadFired=1">`;

let baseUrl;
let browser;
let server;

before(async () => {
  server = http.createServer((request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let filePath = path.resolve(repoRoot, requestPath.replace(/^\/+/, ''));
    if (!filePath.startsWith(repoRoot)) return response.writeHead(403).end('Forbidden');
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return response.writeHead(404).end('Not found');
    const type = {
      '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
      '.woff2': 'font/woff2',
    }[path.extname(filePath)] || 'application/octet-stream';
    response.writeHead(200, { 'content-type': type });
    fs.createReadStream(filePath).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: chromeExecutable });
});

after(async () => {
  await browser?.close();
  server?.closeAllConnections();
  await new Promise((resolve) => server?.close(resolve));
});

async function researchContext(mode) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
  await context.route('https://chloe.blumenkraft.cloud/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (mode === 'offline') return route.abort();
    if (pathname === '/hypertrophy/stats') return route.fulfill({ json: { papers: 43, facts: 254, rules: 45 } });
    if (pathname === '/hypertrophy/query') return route.fulfill({ json: { answer: '<safe answer>', sources: ['Corpus'] } });
    if (pathname === '/womens-health/health') return route.fulfill({ json: { papers: 2, facts: 4, rules: 1 } });
    if (pathname === '/womens-health/claims') return route.fulfill({
      json: mode === 'hostile'
        ? { count: 1, claims: [{ statement: hostile('CLAIM'), confidence: 'HIGH', category: hostile('CLAIM-CATEGORY'), contradictions: hostile('CLAIM-CONTRADICTION') }] }
        : { count: 1, claims: [] },
    });
    if (pathname === '/womens-health/topics') return route.fulfill({
      json: { topics: [{ name: mode === 'hostile' ? hostile(`TOPIC-${'x'.repeat(420)}`) : 'hormones', facts: 4 }] },
    });
    if (pathname.startsWith('/womens-health/facts')) return route.fulfill({
      json: {
        facts: [{
          fact: mode === 'hostile' ? hostile('FACT') : '<supported fact>',
          confidence_label: 'HIGH',
          confidence: 0.94,
          category: mode === 'hostile' ? hostile('FACT-CATEGORY') : 'Hormones',
          paper_title: mode === 'hostile' ? hostile('FACT-PAPER') : 'A paper',
          paper_doi: '10.1000/example',
        }],
      },
    });
    if (pathname.startsWith('/womens-health/rules')) return route.fulfill({
      json: { rules: [{ rule: hostile('RULE'), applies_to: hostile('RULE-SCOPE'), evidence_count: 3, confidence: 0.9 }] },
    });
    if (pathname.startsWith('/womens-health/papers')) return route.fulfill({
      json: { papers: [{ title: hostile('PAPER'), topic_category: hostile('PAPER-TOPIC'), authors: hostile('PAPER-AUTHOR'), year: hostile('PAPER-YEAR'), doi: '10.1000/paper' }] },
    });
    if (pathname === '/womens-health/cycle-phases') return route.fulfill({
      json: { phases: [{ phase: hostile('CYCLE'), days: hostile('CYCLE-DAYS'), facts: [{ fact: hostile('CYCLE-FACT') }] }] },
    });
    if (pathname === '/womens-health/query') return route.fulfill({
      json: {
        answer: hostile('CHAT-ANSWER'),
        sources: [hostile('CHAT-SOURCE')],
        facts: [{ fact: hostile('CHAT-FACT'), paper_title: hostile('CHAT-PAPER') }],
        pubmed: [
          { pmid: '101', title: hostile('CHAT-HTTP'), journal: hostile('CHAT-JOURNAL'), year: hostile('CHAT-YEAR'), url: 'http://pubmed.ncbi.nlm.nih.gov/101/' },
          { pmid: '102', title: 'Data URL', journal: 'Journal', year: 2026, url: 'data:text/html,payload' },
          { pmid: '103', title: 'JavaScript URL', journal: 'Journal', year: 2026, url: 'javascript:window.__payloadFired=1' },
          { pmid: '104', title: 'Lookalike host', journal: 'Journal', year: 2026, url: 'https://pubmed.ncbi.nlm.nih.gov.evil.example/104/' },
          { pmid: '105', title: 'Userinfo host', journal: 'Journal', year: 2026, url: 'https://attacker@pubmed.ncbi.nlm.nih.gov/105/' },
          { pmid: '201', title: 'PubMed reference', journal: 'Journal', year: 2026, url: 'https://pubmed.ncbi.nlm.nih.gov/201/' },
          { pmid: '202', title: 'DOI reference', journal: 'Journal', year: 2026, url: 'https://doi.org/10.1000/example' },
          { pmid: '203', title: 'NCBI reference', journal: 'Journal', year: 2026, url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC203/' },
          { pmid: '204', title: 'PMC reference', journal: 'Journal', year: 2026, url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC204/' },
        ],
      },
    });
    return route.fulfill({ json: {} });
  });
  return context;
}

test('Hypertrophy exposes mocked corpus stats and keeps API text out of the DOM parser', async () => {
  const context = await researchContext('online');
  const page = await context.newPage();
  await page.goto(`${baseUrl}/web/hypertrophyos/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#corpus-stats [data-stat="papers"]').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#corpus-stats [data-stat="papers"]').textContent(), '43 papers');
  await page.locator('#research-question').fill('test');
  await page.locator('#research-form').evaluate((form) => form.requestSubmit());
  await page.locator('#research-answer').getByText('<safe answer>').waitFor();
  assert.equal(await page.locator('#research-answer script').count(), 0);
  await context.close();
});

test('both Health OS pages render a useful named-port state when their mocked APIs are unreachable', async () => {
  const context = await researchContext('offline');
  const hyper = await context.newPage();
  await hyper.goto(`${baseUrl}/web/hypertrophyos/`, { waitUntil: 'domcontentloaded' });
  await hyper.locator('#corpus-stats').getByText(/localhost:8090/).waitFor();
  assert.match(await hyper.locator('#corpus-stats').textContent(), /calculator/i);
  assert.equal(await hyper.locator('#lift-form').isVisible(), true);

  const women = await context.newPage();
  await women.goto(`${baseUrl}/web/womens-health-os/`, { waitUntil: 'domcontentloaded' });
  await women.locator('#view .offline-note').waitFor();
  assert.match(await women.locator('#view .offline-note').textContent(), /localhost:8091/);
  assert.match(await women.locator('#view .offline-note').textContent(), /Menstrual cycle/);
  await context.close();
});

test('Women facts lead with a visually dominant evidence grade and counters only animate once', async () => {
  const context = await researchContext('online');
  const page = await context.newPage();
  await page.goto(`${baseUrl}/web/womens-health-os/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#view .evidence-grade').waitFor();
  const fact = page.locator('#view .item').first();
  assert.equal(await fact.locator(':scope > :first-child').getAttribute('class'), 'evidence-grade conf-high');
  assert.equal(await fact.locator('.evidence-grade').textContent(), 'HIGH evidence');
  assert.equal(await fact.locator('.body').textContent(), '<supported fact>');
  const hierarchy = await fact.locator('.evidence-grade').evaluate((grade) => ({
    fontSize: Number.parseFloat(getComputedStyle(grade).fontSize),
    weight: Number.parseInt(getComputedStyle(grade).fontWeight, 10),
    bodySize: Number.parseFloat(getComputedStyle(grade.parentElement.querySelector('.body')).fontSize),
  }));
  assert.ok(hierarchy.fontSize > hierarchy.bodySize && hierarchy.weight >= 700);
  const desktopControls = await page.evaluate(() => {
    const controls = document.querySelector('#controls');
    const search = document.querySelector('#search').getBoundingClientRect();
    const topic = document.querySelector('#topic').getBoundingClientRect();
    return {
      display: getComputedStyle(controls).display,
      searchRight: search.right,
      topicLeft: topic.left,
      searchCenter: search.top + search.height / 2,
      topicCenter: topic.top + topic.height / 2,
    };
  });
  assert.equal(desktopControls.display, 'flex');
  assert.ok(desktopControls.searchRight <= desktopControls.topicLeft);
  assert.ok(Math.abs(desktopControls.searchCenter - desktopControls.topicCenter) < 1);
  await page.waitForFunction(() => {
    const stat = document.querySelector('#stat-papers');
    return stat.dataset.counted === 'true' && stat.textContent === '2';
  });
  await context.close();
});

test('reduced motion writes the final mock values without scheduling counter frames', async () => {
  const context = await researchContext('reduced');
  const page = await context.newPage();
  await page.goto(`${baseUrl}/web/womens-health-os/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#stat-papers').waitFor();
  const stats = await page.locator('#stat-row .num').evaluateAll((numbers) => numbers.map((number) => ({ text: number.textContent, counted: number.dataset.counted })));
  assert.deepEqual(stats, [
    { text: '2', counted: 'true' }, { text: '4', counted: 'true' },
    { text: '1', counted: 'true' }, { text: '1', counted: 'true' },
  ]);
  const repeat = await page.evaluate(() => {
    const stat = document.querySelector('#stat-papers');
    let calls = 0;
    const original = window.requestAnimationFrame;
    window.requestAnimationFrame = () => { calls += 1; return 0; };
    window.forestReveal.countUp(stat);
    window.requestAnimationFrame = original;
    return { calls, text: stat.textContent, counted: stat.dataset.counted };
  });
  assert.deepEqual(repeat, { calls: 0, text: '2', counted: 'true' });
  await context.close();
});

test('named-port fallback remains contained and navigable at a 375px mobile viewport', async () => {
  const context = await researchContext('offline');
  const page = await context.newPage();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${baseUrl}/web/womens-health-os/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#view .offline-note').waitFor();
  const layout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    back: document.querySelector('.forest-back')?.getBoundingClientRect().toJSON(),
    feedback: document.querySelector('[aria-label="Send feedback"]')?.getBoundingClientRect().toJSON(),
  }));
  assert.ok(layout.scrollWidth <= layout.width, `mobile overflow: ${layout.scrollWidth - layout.width}px`);
  assert.ok(layout.back && layout.back.height >= 40);
  assert.ok(layout.feedback && layout.feedback.width > 0);
  await context.close();
});

test('all Women API payloads render as inert text and only allow known public reference hosts', async () => {
  const context = await researchContext('hostile');
  await context.addInitScript(() => { window.__payloadFired = 0; });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/web/womens-health-os/`, { waitUntil: 'domcontentloaded' });

  async function assertInert(label) {
    assert.match(await page.locator('#view').textContent(), new RegExp(label));
    assert.equal(await page.locator('[onfocus], [onerror], [autofocus], [id$="-payload"]').count(), 0);
    assert.equal(await page.evaluate(() => window.__payloadFired), 0);
  }

  await page.locator('#view .evidence-grade').waitFor();
  await assertInert('FACT');
  assert.match(await page.locator('#topic option').nth(1).textContent(), /TOPIC/);
  await assertInert('FACT');

  for (const [tab, marker] of [['rules', 'RULE'], ['claims', 'CLAIM'], ['papers', 'PAPER'], ['cycle', 'CYCLE']]) {
    await page.locator(`[data-tab="${tab}"]`).click();
    await page.waitForFunction((text) => document.querySelector('#view').textContent.includes(text), marker);
    await assertInert(marker);
  }

  await page.locator('#whChatFab').click();
  await page.locator('#whChatInput').fill('hostile response');
  await page.locator('#whChatForm').evaluate((form) => form.requestSubmit());
  await page.waitForFunction(() => document.querySelector('#whChatLog').textContent.includes('CHAT-ANSWER'));
  assert.equal(await page.locator('[onfocus], [onerror], [autofocus], [id$="-payload"]').count(), 0);
  assert.equal(await page.evaluate(() => window.__payloadFired), 0);

  for (const pmid of ['105', '101', '102', '103', '104']) {
    const rejected = page.locator('.wh-ref').filter({ hasText: `PMID:${pmid}` });
    assert.equal(await rejected.evaluate((element) => element.tagName), 'DIV', `PMID:${pmid} must not be linked`);
  }
  const allowed = [
    ['201', 'https://pubmed.ncbi.nlm.nih.gov/201/'],
    ['202', 'https://doi.org/10.1000/example'],
    ['203', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC203/'],
    ['204', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC204/'],
  ];
  for (const [pmid, href] of allowed) {
    const reference = page.locator('a.wh-ref').filter({ hasText: `PMID:${pmid}` });
    assert.equal(await reference.getAttribute('href'), href);
  }
  await context.close();
});

test('editing the Hypertrophy calculator during reveal keeps the newest input result', async () => {
  const context = await researchContext('online');
  const page = await context.newPage();
  await page.goto(`${baseUrl}/web/hypertrophyos/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#lift-tool').scrollIntoViewIfNeeded();
  await page.locator('#lift-weight').fill('100');
  await page.locator('#lift-reps').fill('6');
  await page.waitForTimeout(1100);
  assert.equal(await page.locator('#one-rm').textContent(), '116.1');
  await context.close();
});

test('a long hostile Women topic stays readable and contained at 375x812', async () => {
  const context = await researchContext('hostile');
  const page = await context.newPage();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${baseUrl}/web/womens-health-os/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#topic').options.length > 1);
  await page.locator('#topic').selectOption({ index: 1 });
  const layout = await page.evaluate(() => {
    const select = document.querySelector('#topic');
    const controls = document.querySelector('#controls');
    return {
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      selectWidth: select.getBoundingClientRect().width,
      controlsWidth: controls.getBoundingClientRect().width,
      selectedText: select.selectedOptions[0].textContent,
      selectedValue: select.value,
    };
  });
  assert.ok(layout.documentWidth <= layout.viewport, `mobile overflow: ${layout.documentWidth - layout.viewport}px`);
  assert.ok(layout.selectWidth <= layout.controlsWidth);
  assert.match(layout.selectedText, /TOPIC-/);
  assert.ok(layout.selectedValue.length > 420);
  await context.close();
});
