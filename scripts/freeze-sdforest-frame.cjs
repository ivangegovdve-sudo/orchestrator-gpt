// Step 2 must run before render-sdforest-intro.cjs. No invented reference artwork:
// these PNGs are screenshots of the real, built Option-A page at motion phase zero.
const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { normalizeFinalRaster, hashComposition } = require('./sdforest-raster.cjs');
const base = process.env.SDFOREST_BASE_URL || 'http://127.0.0.1:4580';
const out = path.resolve('web/assets/sdforest-intro');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
let browser;
(async () => {
  browser = await chromium.launch({headless:true, args:['--disable-gpu','--force-color-profile=srgb'], executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const frames = [];
  for (const [name,width,height] of [['desktop',1920,1080],['phone',390,844]]) {
    const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/?frame=opened`, {waitUntil:'networkidle'});
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => document.documentElement.dataset.forestFinished === 'true');
    await page.evaluate(() => window.sdforestResolve.freeze());
    await page.waitForTimeout(100);
    await normalizeFinalRaster(page);
    const state = await page.evaluate(() => ({
      poolCount:document.querySelectorAll('[data-pool-link]').length,
      pools:[...document.querySelectorAll('[data-pool-link]')].map(node => {
        const box = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        return {
          id:node.dataset.poolLink,
          box:box.toJSON(),
          visible: style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0',
          width: box.width,
          height: box.height
        };
      }),
      overflow:document.documentElement.scrollWidth > innerWidth,
      tree:document.querySelector('.resolve-tree').getBoundingClientRect().toJSON(),
    }));
    if (errors.length || state.overflow || state.poolCount !== 7 || state.pools.some(({box,visible,width,height})=>!visible || width<=0 || height<=0 || box.top<0 || box.bottom>height || box.left<0 || box.right>width)) throw new Error(`Frame is not ready: ${JSON.stringify({errors,state})}`);
    const file = `final-frame-${name}.png`;
    await page.screenshot({path:path.join(out,file)});
    frames.push({name,width,height,file,sha256:sha(path.join(out,file)),state});
    await page.close();
  }
  await browser.close();
  const compositionSources = [
    'index.html', 'web/shared/feedback.js', 'web/shared/pool-directory.mjs',
    'web/shared/frontpage-finish.css', 'web/shared/frontpage-finish.mjs',
    'web/shared/frontpage-resolve.css', 'web/shared/frontpage-resolve.mjs', 'web/shared/frontpage-growth.mjs',
    'web/shared/frontpage-grove.css', 'web/shared/frontpage-reveal.css',
    'web/shared/frontpage-pool-vines.css', 'web/shared/frontpage-pool-vines.mjs',
    'web/shared/frontpage-workbench.mjs', 'web/shared/frontpage-ambient.mjs',
    'web/shared/frontpage-pool-effects.mjs', 'web/shared/frontpage-vines.mjs',
    'web/shared/frontpage-intro-reveal.css', 'web/shared/frontpage-intro-scene.mjs',
    'web/shared/forest-design.css', 'web/shared/design-history.css', 'web/shared/design-history.js',
    'web/vendor/fonts/cormorant-garamond-normal-500-latin.woff2',
    'web/vendor/fonts/alegreya-normal-400-900-latin.woff2',
    ...['sdforest-sunset','sdforest-workbench'].flatMap(folder=>fs.readdirSync(`web/assets/${folder}`).filter(file=>file.endsWith('.webp')).map(file=>`web/assets/${folder}/${file}`)),
  ];
  fs.writeFileSync(path.join(out,'final-frame-lock.json'),JSON.stringify({version:1,style:'Option A: UI-first forest skin',phase:'opened; phase-zero instruments; controls and promoted symbols present',rasterNormalization:'paint .5, .99, then 1; capture restored live DOM',sourceHashing:'SHA256; UTF-8 source text normalized to LF; binary bytes unchanged',frames,compositionSources:Object.fromEntries(compositionSources.map(file=>[file,hashComposition(file)]))},null,2)+'\n');
  console.log('Locked desktop and phone screenshots of the real page.');
})().catch(async error=>{await browser?.close();console.error(error);process.exitCode=1});
