const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..');
let server, browser, base;
before(async () => {
  server = http.createServer((req, res) => {
    let file = path.resolve(ROOT, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(ROOT + path.sep) && file !== ROOT) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return res.writeHead(404).end();
    const mime = { '.html':'text/html', '.mjs':'text/javascript', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2' };
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}) });
});
after(async () => { await browser?.close(); server?.closeAllConnections(); await new Promise(r=>server.close(r)); });
async function pageAt(query, options = {}) {
  const page = await browser.newPage({viewport:{width:1920,height:1080}, ...options});
  await page.goto(base + '/' + query, {waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-resolve-stage]').count(), 1, 'front-page resolve stage must exist');
  return page;
}
async function opacity(page, selector) {
  return page.locator(selector).evaluate(el=>Number(getComputedStyle(el).opacity));
}
test('resolve holds only the centred tree; opening never shifts or scales it', async () => {
  const page = await pageAt('?frame=resolve');
  const before = await page.locator('[data-title-crown]').boundingBox();
  assert.ok(Math.abs(before.x + before.width/2 - 960) < 1);
  assert.ok(Math.abs(before.y + before.height/2 - 583.2) < 1);
  assert.ok(Math.abs(before.height - 626.4) < 1);
  assert.equal(await opacity(page, '.resolve-world'), 0);
  for (const el of await page.locator('[data-arrival]').all()) assert.equal(await el.evaluate(e=>Number(getComputedStyle(e).opacity)), 0);
  await page.evaluate(()=>window.sdforestResolve.seek(5));
  assert.deepEqual(await page.locator('[data-title-crown]').boundingBox(), before);
  assert.equal(await opacity(page, '.resolve-title'), 1);
  for (const el of await page.locator('[data-pool-link]').all()) assert.equal(await el.evaluate(e=>Number(getComputedStyle(e).opacity)), 1);
  await page.close();
});
test('warm-world dissolve is reversible and never restarts the tree or invents a second one', async () => {
  const page = await pageAt('?frame=resolve');
  await page.evaluate(()=>window.sdforestResolve.seek(-1));
  const tree = await page.locator('[data-title-crown]').boundingBox();
  assert.equal(await opacity(page,'.resolve-world'),1);
  await page.evaluate(()=>window.sdforestResolve.seek(-0.5));
  const halfway = await opacity(page,'.resolve-world');
  assert.ok(halfway > 0 && halfway < 1);
  await page.evaluate(()=>window.sdforestResolve.seek(3));
  await page.evaluate(()=>window.sdforestResolve.seek(-0.5));
  assert.equal(await opacity(page,'.resolve-world'),halfway);
  assert.deepEqual(await page.locator('[data-title-crown]').boundingBox(),tree);
  assert.equal(await page.locator('[data-title-crown]').count(),1);
  await page.close();
});
test('scroll completes the actual arrival and keyboard can skip directly to usable pools', async () => {
  const page = await pageAt('');
  assert.equal(await opacity(page,'.resolve-world'),1);
  await page.evaluate(()=>scrollTo(0, innerHeight * 1.25));
  await page.waitForFunction(()=>document.documentElement.dataset.resolveState === 'opened');
  assert.equal(await opacity(page,'[data-pool-link="my-story"]'),1);
  await page.goto(base, {waitUntil:'networkidle'});
  await page.getByRole('link',{name:'Explore the pools',exact:true}).first().focus();
  await page.keyboard.press('Enter');
  assert.equal(await opacity(page,'[data-pool-link="ai-d-kit"]'),1);
  await page.close();
});
test('two-step pool entry never navigates on selection and explicit Enter reaches the existing pool', async () => {
  const page = await pageAt('?frame=opened');
  await page.locator('[data-pool-link="ai-d-kit"]').click();
  assert.ok(page.url().endsWith('?frame=opened'));
  await page.getByRole('button',{name:'Enter AI-d kit',exact:true}).click();
  await page.waitForURL(base + '/web/pools/ai-d-kit/');
  await page.close();
});
test('reduced motion and no JavaScript both expose all seven native pool links', async () => {
  for (const options of [{reducedMotion:'reduce'},{javaScriptEnabled:false}]) {
    const page = await pageAt('',options);
    assert.equal(await page.locator('[data-pool-link]').count(),7);
    for (const el of await page.locator('[data-pool-link]').all()) {
      assert.equal(await el.evaluate(e=>Number(getComputedStyle(e).opacity)),1);
      assert.ok(await el.isVisible());
    }
    assert.equal(await opacity(page,'.resolve-world'),0);
    if (options.reducedMotion) assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
    await page.close();
  }
});
test('phone layout keeps the tree centred and every pool reachable without horizontal overflow', async () => {
  const page = await pageAt('?frame=opened',{viewport:{width:390,height:844}});
  const tree = await page.locator('[data-title-crown]').boundingBox();
  assert.ok(Math.abs(tree.x + tree.width/2 - 195) < 1);
  assert.ok(Math.abs(tree.y + tree.height/2 - 236.32) < 1);
  assert.ok(Math.abs(tree.width - 265.2) < 1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
  for (const link of await page.locator('[data-pool-link]').all()) { await link.scrollIntoViewIfNeeded(); assert.ok(await link.isVisible()); }
  await page.locator('[data-pool-link="health"]').click();
  await page.getByRole('button',{name:'Enter Health',exact:true}).click();
  await page.waitForURL(base + '/web/pools/health/');
  await page.close();
});
test('fragment landing is fully opened and all homepage assets load without runtime errors', async () => {
  const page = await browser.newPage({viewport:{width:1920,height:1080}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400) errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(base+'/#atlas',{waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-resolve-stage]').count(),1);
  assert.equal(await opacity(page,'[data-pool-link="growingapp"]'),1);
  assert.deepEqual(errors,[]);
  await page.close();
});
test('resolve has no stray history banner and opened utilities do not overlap', async () => {
  const page = await pageAt('?frame=resolve');
  assert.equal(await page.locator('.dh-banner').isVisible(), false);
  await page.evaluate(()=>window.sdforestResolve.seek(5));
  const history = await page.locator('.dh-tab').boundingBox();
  const feedback = await page.getByRole('button',{name:'Send feedback',exact:true}).boundingBox();
  assert.ok(history.x + history.width <= feedback.x || feedback.x + feedback.width <= history.x || history.y + history.height <= feedback.y || feedback.y + feedback.height <= history.y);
  await page.close();
});
test('phone title is above the fixed tree, not over its foliage', async () => {
  const page = await pageAt('?frame=opened',{viewport:{width:390,height:844}});
  const title = await page.locator('.resolve-title').boundingBox();
  const tree = await page.locator('[data-title-crown]').boundingBox();
  assert.ok(title.y + title.height <= tree.y, `${title.y + title.height} overlaps tree at ${tree.y}`);
  await page.close();
});
test('short screens and portrait tablets keep the title clear of the tree', async () => {
  for (const [width,height] of [[768,1024],[320,640],[667,375],[1920,720],[320,390]]) {
    const page = await pageAt('?frame=opened',{viewport:{width,height}});
    const title = await page.locator('.resolve-title').boundingBox();
    const tree = await page.locator('[data-title-crown]').boundingBox();
    assert.ok(title.y + title.height <= tree.y, `${width}x${height}: title overlaps tree`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
    await page.close();
  }
});
test('returning from a pool does not replay the terminal sequence', async () => {
  const page = await pageAt('');
  await page.evaluate(()=>scrollTo(0,innerHeight * 1.25));
  await page.waitForFunction(()=>document.documentElement.dataset.resolveState === 'opened');
  await page.locator('[data-pool-link="health"]').click();
  await page.getByRole('button',{name:'Enter Health',exact:true}).click();
  await page.waitForURL(base + '/web/pools/health/');
  await page.goBack({waitUntil:'networkidle'});
  assert.equal(await opacity(page,'.resolve-world'),0);
  assert.equal(await opacity(page,'[data-pool-link="health"]'),1);
  await page.close();
});
test('mobile scrub track grows with wrapped and selected entries instead of clipping navigation', async () => {
  for (const [width,height] of [[320,390],[780,390],[390,844]]) {
    const page = await pageAt('',{viewport:{width,height}});
    await page.addStyleTag({content:'.resolve-home .portal-name{font-size:52px!important}.resolve-home .portal-meta{font-size:30px!important}'});
    await page.evaluate(()=>scrollTo(0,innerHeight*1.25));
    await page.waitForFunction(()=>document.documentElement.dataset.resolveState==='opened');
    const bounds = await page.evaluate(()=>{
      const stage=document.querySelector('.resolve-stage').getBoundingClientRect();
      const history=document.querySelector('.resolve-history').getBoundingClientRect();
      return {stage:stage.height,contentBottom:history.bottom-stage.top};
    });
    assert.ok(bounds.contentBottom <= bounds.stage, `${width}x${height}: controls end at ${bounds.contentBottom} inside ${bounds.stage}px stage`);
    // Page scrolling only: locator scrolling can silently scroll an overflow:hidden ancestor.
    await page.evaluate(()=>{
      const e=document.querySelector('.dh-tab');
      scrollBy(0,e.getBoundingClientRect().top-innerHeight/2);
    });
    await page.waitForFunction(()=>{
      const e=document.querySelector('.dh-tab'),b=e.getBoundingClientRect();
      return b.top>=0 && b.bottom<=innerHeight;
    });
    assert.ok(await page.locator('.dh-tab').evaluate(e=>{
      const b=e.getBoundingClientRect(),hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
      return hit===e || e.contains(hit);
    }));
    await page.locator('.dh-tab').click();
    await page.getByRole('button',{name:'Close design history',exact:true}).click();
    await page.locator('[data-pool-link="my-story"]').click();
    const selected = await page.evaluate(()=>{
      const s=document.querySelector('.resolve-stage').getBoundingClientRect(),h=document.querySelector('.resolve-history').getBoundingClientRect();
      return h.bottom-s.top <= s.height;
    });
    assert.ok(selected, 'selection must not cut off the controls');
    assert.equal(await page.locator('.resolve-stage').evaluate(e=>e.scrollTop),0,'no hidden internal scroller');
    await page.close();
  }
});
test('desktop portals during arrival and selection leave the tree artwork rectangle reserved', async () => {
  for (const [width,height] of [[1920,1080],[1366,768],[1024,768],[820,1180]]) {
    const page=await pageAt('?frame=opened',{viewport:{width,height}});
    for (const time of [.9,1.3,1.8,2.5,3.2,5]) {
      await page.evaluate(t=>window.sdforestResolve.seek(t),time);
      const overlaps=await page.locator('[data-pool-link]').evaluateAll(es=>{
        const t=document.querySelector('.resolve-tree').getBoundingClientRect();
        return es.filter(e=>Number(getComputedStyle(e).opacity)>0).map(e=>{const b=e.getBoundingClientRect();return {id:e.dataset.poolLink,area:Math.max(0,Math.min(b.right,t.right)-Math.max(b.left,t.left))*Math.max(0,Math.min(b.bottom,t.bottom)-Math.max(b.top,t.top))};}).filter(x=>x.area>0);
      });
      assert.deepEqual(overlaps,[],`${width}x${height}, arrival t=${time}`);
    }
    for (const selection of [null,'health','ai-d-kit','my-story']) {
      if(selection) await page.locator(`[data-pool-link="${selection}"]`).click();
      const overlaps=await page.locator('[data-pool-link]').evaluateAll(es=>{
        const t=document.querySelector('.resolve-tree').getBoundingClientRect();
        return es.map(e=>{const b=e.getBoundingClientRect();return {id:e.dataset.poolLink,area:Math.max(0,Math.min(b.right,t.right)-Math.max(b.left,t.left))*Math.max(0,Math.min(b.bottom,t.bottom)-Math.max(b.top,t.top))};}).filter(x=>x.area>0);
      });
      assert.deepEqual(overlaps,[],`${width}x${height}, selected ${selection}`);
      await page.keyboard.press('Escape');
    }
    await page.close();
  }
});

test('all existing pool names fit the 320px layout and selection does not lose their text', async () => {
  const page=await pageAt('?frame=opened',{viewport:{width:320,height:568}});
  for (const link of await page.locator('[data-pool-link]').all()) {
    await link.click();
    const fits=await link.evaluate(e=>{
      const box=e.getBoundingClientRect(),name=e.querySelector('.portal-name'),range=document.createRange();
      range.selectNodeContents(name);
      return [...range.getClientRects()].every(r=>r.left>=box.left && r.right<=box.right && r.top>=box.top && r.bottom<=box.bottom);
    });
    assert.ok(fits,await link.getAttribute('data-pool-link'));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.keyboard.press('Escape');
  }
  await page.close();
});
test('mobile scroll clock uses its CSS runway rather than a separate changing viewport height', async () => {
  const page=await pageAt('',{viewport:{width:390,height:844}});
  // Exercise the measurement boundary with a deliberately shorter real layout track.
  await page.addStyleTag({content:'html[data-resolve-motion="scrub"] .resolve-scroll{padding-bottom:500px}'});
  await page.evaluate(()=>scrollTo(0,500));
  await page.waitForFunction(()=>window.sdforestResolve.time > -1);
  assert.equal(await page.evaluate(()=>window.sdforestResolve.time),5);
  assert.equal(await opacity(page,'[data-pool-link="my-story"]'),1);
  await page.evaluate(()=>scrollTo(0,250));
  await page.waitForFunction(()=>window.sdforestResolve.time<5);
  assert.equal(await page.evaluate(()=>window.sdforestResolve.time),2);
  await page.close();
});
test('Tab reaches portals in DOM order and never focuses unrevealed controls', async () => {
  const page=await pageAt('?frame=resolve');
  for (const time of [0,2,4,5]) {
    await page.evaluate(t=>window.sdforestResolve.seek(t),time);
    const expected=await page.locator('[data-pool-link]').evaluateAll(es=>es.filter(e=>!e.inert).map(e=>e.dataset.poolLink));
    await page.locator('.resolve-skip').focus();
    const visited=[];
    for(let i=0;i<24;i++) {
      await page.keyboard.press('Tab');
      const focused=await page.evaluate(()=>{
        const e=document.activeElement;
        if(e===document.body) return {body:true};
        const chain=[];for(let p=e;p;p=p.parentElement) chain.push(p);
        return {skip:e.matches('.resolve-skip'),pool:e.dataset.poolLink,hidden:chain.some(p=>p.inert||getComputedStyle(p).visibility==='hidden'||Number(getComputedStyle(p).opacity)===0)};
      });
      if(focused.skip) break;
      if(!focused.body) assert.equal(focused.hidden,false,`hidden focus at t=${time}`);
      if(focused.pool) visited.push(focused.pool);
    }
    assert.deepEqual(visited,expected);
  }
  await page.close();
});
test('rewinding while history is open cannot leave a visible focusable drawer in the resolve frame', async () => {
  const page=await pageAt('?frame=opened');
  await page.locator('.dh-tab').click();
  await page.evaluate(()=>window.sdforestResolve.seek(0));
  assert.equal(await page.getByRole('dialog',{name:'Design history',exact:true}).isVisible(),false);
  // Chrome clears pre-existing focus after rendering display:none; wait for that observable state.
  await page.waitForFunction(()=>!document.activeElement?.classList.contains('dh-close'));
  await page.locator('.resolve-skip').focus();
  await page.locator('.dh-close').evaluate(e=>e.focus());
  assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('resolve-skip')),true);
  await page.close();
});
test('reduced motion selected during a partial arrival opens every pool without animation', async () => {
  const page=await pageAt('?frame=resolve');
  await page.evaluate(()=>window.sdforestResolve.seek(2));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.documentElement.dataset.resolveState==='opened');
  assert.equal(await opacity(page,'.resolve-world'),0);
  assert.equal(await page.locator('[data-pool-link]').evaluateAll(es=>es.every(e=>!e.inert && Number(getComputedStyle(e).opacity)===1)),true);
  assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
  await page.close();
});
test('pending or failed background planes cannot block the tree or opened navigation', async () => {
  for (const failure of [false,true]) {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    let release;const gate=new Promise(resolve=>release=resolve);
    await page.route(/\/(sky|sunset|mist|landscape)\.png$/,async route=>{
      if(failure) await route.abort();
      else {await gate;await route.continue();}
    });
    await page.goto(base+'/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.sdforestResolve);
    const decoded=await page.locator('.resolve-tree image').evaluate(async e=>{
      const image=new Image();image.src=e.href.baseVal;await image.decode();return image.naturalWidth;
    });
    assert.equal(decoded,864);
    await page.evaluate(()=>scrollTo(0,innerHeight*1.25));
    await page.waitForFunction(()=>document.documentElement.dataset.resolveState==='opened');
    assert.equal(await opacity(page,'.resolve-world'),0);
    assert.equal(await page.locator('[data-pool-link]').evaluateAll(es=>es.every(e=>!e.inert && Number(getComputedStyle(e).opacity)===1)),true);
    assert.deepEqual(errors,[]);
    release();await page.unrouteAll({behavior:'wait'});
    await page.close();
  }
});
