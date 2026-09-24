// Manual steady-state benchmark, outside npm test. Serve the repo root first.
// Requires Playwright; CHROME_PATH may select an installed Chrome executable.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const repo = path.resolve(__dirname, '..');
const base = process.env.SDFOREST_BASE_URL || 'http://127.0.0.1:4176';
const baseline = process.env.SDFOREST_PROFILE_BASELINE || 'd0377dd18bb2b1f0134f1bc916c73a35fb488c95';
const trace = process.env.SDFOREST_PROFILE_TRACE === '1';
const out = process.env.SDFOREST_PROFILE_OUT;
const modes = (process.argv[2] || 'baseline,ambient,baseline,ambient,paused').split(',');
if (modes.some(mode => !['baseline','ambient','paused'].includes(mode))) throw new Error('Expected baseline, ambient or paused');
const oldFiles = ['index.html','web/shared/frontpage-resolve.css','web/shared/frontpage-resolve.mjs','web/shared/feedback.js'];
if(process.env.SDFOREST_PROFILE_BASELINE)oldFiles.push('web/shared/frontpage-workbench.mjs','web/shared/frontpage-ambient.mjs');
const originals = Object.fromEntries(oldFiles.map(file => ['/' + (file === 'index.html' ? '' : file),
  execFileSync('git',['show',`${baseline}:${file}`],{cwd:repo})]));
const percentile = (values, p) => [...values].sort((a,b)=>a-b)[Math.floor((values.length-1)*p)] || 0;

(async () => {
  const browser = await chromium.launch({headless:true,
    ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  const results = [];
  try {
    for (const mode of modes) {
      const page = await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
      if (mode === 'baseline') await page.route('**/*',route => {
        const url = new URL(route.request().url());
        if (url.origin === new URL(base).origin && Object.hasOwn(originals,url.pathname)) {
          return route.fulfill({body:originals[url.pathname],contentType:url.pathname === '/' ? 'text/html' :
            url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript'});
        }
        return route.continue();
      });
      if (trace) await page.addInitScript(() => {
        const request = requestAnimationFrame.bind(window);
        window.ambientProfile = {costs:[],stamps:[],enabled:false};
        window.requestAnimationFrame = fn => request(time => {
          const start = performance.now();
          fn(time);
          if (ambientProfile.enabled) {
            ambientProfile.costs.push(performance.now()-start);
            ambientProfile.stamps.push(time);
          }
        });
      });
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
      await cdp.send('Performance.enable');
      await page.goto(base+'/?frame=opened',{waitUntil:'networkidle'});
      if (mode === 'paused') await page.getByRole('button',{name:'Pause motion',exact:true}).click();
      await page.waitForTimeout(1500);
      const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
      const events = [];
      if (trace) {
        cdp.on('Tracing.dataCollected',event=>events.push(...event.value));
        await cdp.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline.frame,cc,benchmark',transferMode:'ReportEvents'});
        await page.evaluate(()=>{ambientProfile.enabled=true;});
      }
      const before = await metrics();
      await page.waitForTimeout(10000);
      const after = await metrics();
      const seconds = after.Timestamp-before.Timestamp;
      const result = {mode,seconds,taskMsPer60HzFrame:(after.TaskDuration-before.TaskDuration)*1000/(seconds*60),
        scriptMsPer60HzFrame:(after.ScriptDuration-before.ScriptDuration)*1000/(seconds*60),
        layoutCount:after.LayoutCount-before.LayoutCount,recalcCount:after.RecalcStyleCount-before.RecalcStyleCount};
      if (trace) {
        const probe = await page.evaluate(()=>{ambientProfile.enabled=false;return ambientProfile;});
        const ended = new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));
        await cdp.send('Tracing.end');await ended;
        const gaps = probe.stamps.slice(1).map((stamp,i)=>stamp-probe.stamps[i]);
        Object.assign(result,{callbackCount:probe.costs.length,callbackMedianMs:percentile(probe.costs,.5),
          callbackP95Ms:percentile(probe.costs,.95),callbackGapP95Ms:percentile(gaps,.95),
          callbackGapsOver25ms:gaps.filter(gap=>gap>25).length,
          drawFrames:events.filter(event=>event.name==='DrawFrame').length,
          paintEvents:events.filter(event=>event.name==='Paint').length,
          droppedFrameEvents:events.filter(event=>event.name==='DroppedFrame').length});
        if (out) {
          fs.mkdirSync(out,{recursive:true});
          fs.writeFileSync(path.join(out,`trace-${results.length}-${mode}.json`),JSON.stringify({traceEvents:events}));
        }
      }
      results.push(result);console.log(JSON.stringify(result));
      await page.close();
    }
    if (out) {
      fs.mkdirSync(out,{recursive:true});
      fs.writeFileSync(path.join(out,trace?'trace-summary.json':'cost-summary.json'),JSON.stringify({baseline:modes.includes('baseline')?baseline:'same-page paused',trace,results},null,2));
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error);process.exitCode=1; });
