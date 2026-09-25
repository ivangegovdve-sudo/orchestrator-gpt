const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(process.env.SDFOREST_TEST_ROOT || path.join(__dirname, '../..'));
let server, browser, base;
before(async () => {
  server = http.createServer((req, res) => {
    let file = path.resolve(ROOT, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(ROOT + path.sep) && file !== ROOT) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return res.writeHead(404).end();
    const mime = { '.html':'text/html', '.mjs':'text/javascript', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.mp4':'video/mp4', '.woff2':'font/woff2' };
    const range=req.headers.range;
    if(range&&path.extname(file)==='.mp4') {
      const size=fs.statSync(file).size;
      const [rawStart,rawEnd]=range.replace('bytes=','').split('-');
      const start=Number(rawStart)||0,end=Math.min(rawEnd?Number(rawEnd):size-1,size-1);
      res.writeHead(206,{'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});
      fs.createReadStream(file,{start,end}).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}) });
});
after(async () => {
  if(process.env.SDFOREST_PROOF_DIR) await captureProof(process.env.SDFOREST_PROOF_DIR);
  await browser?.close(); server?.closeAllConnections(); await new Promise(r=>server.close(r));
});
async function captureProof(out) {
  fs.mkdirSync(out,{recursive:true});
  const measurements=[];
  for(const [name,width,height] of [['desktop',1920,1080],['target',1672,941],['short-desktop',1366,768],['wide-short',1920,720],['mobile',390,844],['narrow',320,568],['landscape',780,390]]) {
    const page=await pageAt('?frame=opened',{viewport:{width,height}});
    await page.getByRole('button',{name:'Pause motion',exact:true}).click();
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:path.join(out,`workbench-${name}.png`)});
    if(name==='mobile') await page.screenshot({path:path.join(out,'workbench-mobile-full.png'),fullPage:true});
    measurements.push(await page.evaluate(()=>({viewport:[innerWidth,innerHeight],tree:document.querySelector('.resolve-tree').getBoundingClientRect().toJSON(),entries:[...document.querySelectorAll('[data-pool-link]')].map(e=>({id:e.dataset.poolLink,box:e.getBoundingClientRect().toJSON(),color:getComputedStyle(e.querySelector('.portal-name')).color,font:getComputedStyle(e.querySelector('.portal-name')).fontFamily}))})));
    if(name==='desktop') {
      await page.getByRole('button',{name:'Resume motion',exact:true}).click();
      await page.locator('[data-pool-link="ai-d-kit"]').click();
      await page.waitForTimeout(500);
      await page.screenshot({path:path.join(out,'workbench-selected.png')});
      await page.keyboard.press('Escape');
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.screenshot({path:path.join(out,'workbench-reduced.png')});
    }
    if(name==='desktop'||name==='mobile') {
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.goto(base+'/?frame=resolve',{waitUntil:'networkidle'});
      await page.screenshot({path:path.join(out,`workbench-resolve-${name}.png`)});
    }
    await page.close();
  }
  fs.writeFileSync(path.join(out,'workbench-measurements.json'),JSON.stringify(measurements,null,2));
}
async function pageAt(query, options = {}) {
  const page = await browser.newPage({viewport:{width:1920,height:1080}, ...options});
  await page.goto(base + '/' + query, {waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-resolve-stage]').count(), 1, 'front-page resolve stage must exist');
  return page;
}
async function opacity(page, selector) {
  return page.locator(selector).evaluate(el=>Number(getComputedStyle(el).opacity));
}

test('phone landscape keeps the sunset behind the roots and branding contrasts with its backing', async () => {
  const page=await pageAt('?frame=opened',{viewport:{width:780,height:390}});
  const tree=await page.locator('.resolve-tree').boundingBox();
  const field=await page.locator('.resolve-field').boundingBox();
  assert.ok(field.y+field.height>=tree.y+tree.height+10,'the background must continue beyond the tree contact, not cut through its trunk');
  assert.notEqual(await page.locator('.resolve-field').evaluate(e=>getComputedStyle(e).maskImage),'none','the landscape edge must fade into the existing bark continuation');
  assert.equal(await page.locator('.resolve-brand').evaluate(e=>getComputedStyle(e).color),'rgb(243, 244, 246)','landscape branding sits over dark bark');
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('.resolve-brand').evaluate(e=>getComputedStyle(e).color),'rgb(41, 60, 69)');
  await page.close();
});

test('every visible heartbeat is a full-height stationary spike, never a scaled minor bump', async () => {
  const page=await pageAt('?frame=opened');
  const samples=await page.evaluate(async()=>{
    const {createPoolEffects}=await import('/web/shared/frontpage-pool-effects.mjs');
    const art=document.createElement('span');art.style.cssText='position:relative;display:block;width:550px;height:229px';
    document.body.append(art);const fx=createPoolEffects('health',art),samples=[];
    for(let t=0;t<3;t+=.01){
      fx.render(t,0,false,false,true);
      const paths=[...art.querySelectorAll('.ecg-deflection')].filter(e=>Number(getComputedStyle(e).opacity)>.1);
      samples.push(paths.map(e=>({height:e.querySelector('path').getBoundingClientRect().height,x:e.getBoundingClientRect().x})));
    }
    art.remove();return samples;
  });
  assert.ok(samples.some(row=>row.length===0),'the full beat must rest on the baseline between pulses');
  const visible=samples.flat();assert.ok(visible.length>0,'a real beat must be visible');
  assert.ok(visible.every(p=>p.height>50),`no undersized bumps: min height ${Math.min(...visible.map(p=>p.height))}`);
  assert.ok(Math.max(...visible.map(p=>p.x))-Math.min(...visible.map(p=>p.x))<.1);
  await page.close();
});

test('whole neuron arbors light from the same passing circuit and return to quiet', async () => {
  const page=await pageAt('?frame=opened');
  const rows=await page.evaluate(async()=>{
    const {createPoolEffects}=await import('/web/shared/frontpage-pool-effects.mjs');
    const art=document.createElement('span'),fx=createPoolEffects('artificial-self',art);
    return [0,.4/2.8,.8/2.8,.49].map(age=>{
      fx.render(age,1,true,true,true,{age,held:false});
      return [...art.querySelectorAll('[data-neural-arbor]')].map(e=>Number(e.style.opacity));
    });
  });
  assert.equal(rows[0].length,3,'all three complete painted neurons need registered illumination');
  assert.ok(rows[0][0]>.5&&rows[0][1]<.1&&rows[0][2]<.1);
  assert.ok(rows[1][1]>.5&&rows[1][2]<.1);
  assert.ok(rows[2][2]>.5);
  assert.ok(rows[3].every(value=>value<.05),'the whole arbor illumination decays after the charge');
  await page.close();
});

test('hover explanations open on opaque readable backing and remain open under the pointer', async () => {
  const page=await pageAt('?frame=opened');
  for(const link of await page.locator('[data-pool-link]').all()) {
    await link.hover();await page.waitForTimeout(500);
    const result=await link.evaluate(e=>{
      const meta=e.querySelector('.portal-meta'),c=getComputedStyle(meta),b=meta.getBoundingClientRect(),p=e.getBoundingClientRect();
      return {id:e.dataset.poolLink,background:c.backgroundColor,color:c.color,fontSize:parseFloat(c.fontSize),width:b.width,poolWidth:p.width,box:b.toJSON()};
    });
    assert.ok(result.width>=result.poolWidth*.75,`${result.id}: explanation cannot inherit the narrow nameplate width`);
    assert.ok(!result.background.includes('rgba'),`${result.id}: solid readable backing required`);
    assert.ok(result.fontSize>=16);
    await page.mouse.move(result.box.x+result.box.width/2,result.box.y+result.box.height/2);await page.waitForTimeout(250);
    assert.equal(await link.locator('.portal-meta').evaluate(e=>getComputedStyle(e).visibility),'visible','no gap-induced hover flicker');
  }
  await page.close();
});

test('explanation covers hinge away without scaling the readable lettering', async () => {
  const page=await pageAt('?frame=opened');
  const link=page.locator('[data-pool-link="health"]');
  assert.equal(await link.locator('.portal-reveal-cover').count(),1,'an opening shutter, not just an opacity change');
  await link.hover();await page.waitForTimeout(90);
  const first=await link.locator('.portal-reveal-cover').getAttribute('style');
  await page.waitForTimeout(300);
  assert.notEqual(await link.locator('.portal-reveal-cover').getAttribute('style'),first);
  assert.equal(await link.locator('.portal-meta').evaluate(e=>getComputedStyle(e).transform),'none');
  assert.equal(await link.locator('.portal-reveal-cover').evaluate(e=>getComputedStyle(e).opacity),'0');
  await page.close();
});

test('pointer preview does not leave a second explanation open at the old keyboard focus', async () => {
  const page=await pageAt('?frame=opened');
  await page.locator('[data-pool-link="artificial-self"]').focus();
  await page.locator('[data-pool-link="health"]').hover();await page.waitForTimeout(400);
  const open=await page.locator('.portal-reveal').evaluateAll(es=>es.filter(e=>getComputedStyle(e).visibility==='visible').map(e=>e.parentElement.dataset.poolLink));
  assert.deepEqual(open,['health'],'one readable preview, without stealing keyboard focus');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.poolLink),'artificial-self');
  await page.close();
});

test('Health beats in place, returns to baseline, and goes flat when pressed', async () => {
  const page=await pageAt('?frame=opened');
  const health=page.locator('[data-pool-link="health"]');
  const wave=health.locator('[data-ecg-wave]');
  assert.equal(await wave.count(),1);
  const samples=await page.evaluate(async()=>{
    const wave=document.querySelector('[data-ecg-wave]');
    const samples=[];
    for(let i=0;i<40;i++) {
      const path=wave.querySelector('[data-ecg-qrs] path') || wave.querySelector('path');
      const b=path.getBoundingClientRect();
      const visible=Number(getComputedStyle(path.parentElement.parentElement).opacity)>.1;
      samples.push({x:b.x,width:b.width,height:visible?b.height:0});
      await new Promise(r=>setTimeout(r,40));
    }
    return samples;
  });
  assert.ok(Math.max(...samples.map(s=>s.x))-Math.min(...samples.map(s=>s.x))<.1,'the trace must not scroll sideways');
  assert.ok(samples.some(s=>s.height>8),'a visible beat deflects from baseline');
  assert.ok(samples.some(s=>s.height<.1),'the trace rests flat between beats');
  await health.focus();
  await page.waitForTimeout(500);
  assert.equal(await health.getAttribute('data-effect-state'),'engaged');
  await health.hover();await page.mouse.down();await page.waitForTimeout(80);
  assert.equal(await opacity(page,'[data-ecg-wave]'),0);
  assert.equal(await opacity(page,'[data-ecg-flat]'),1);
  await page.mouse.up();await page.waitForTimeout(650);
  assert.equal(await health.getAttribute('data-armed'),'true','selection survives the momentary click response');
  assert.equal(await opacity(page,'[data-ecg-wave]'),1,'the selected instrument resumes beating instead of remaining flat');
  assert.equal(await opacity(page,'[data-ecg-flat]'),0);
  await page.keyboard.press('Escape');await page.waitForTimeout(500);
  assert.equal(await opacity(page,'[data-ecg-flat]'),0);
  await page.close();
});

test('pool housings stay planted while each local mechanism responds and has idle life', async () => {
  const page=await pageAt('?frame=opened');
  const ids=await page.locator('[data-pool-link]').evaluateAll(es=>es.map(e=>e.dataset.poolLink));
  const localStyles=link=>link.locator('.workbench-part,.workbench-lid,.pool-instrument,.pool-instrument *').evaluateAll(es=>es.map(e=>e.getAttribute('style')));
  for(const id of ids) {
    const link=page.locator(`[data-pool-link="${id}"]`);
    const art=link.locator('.portal-art');
    const before=await art.boundingBox();
    await link.evaluate(e=>{
      window.poolIdleChanged=false;
      const observer=new MutationObserver(()=>{window.poolIdleChanged=true;observer.disconnect();});
      observer.observe(e.querySelector('.portal-art'),{subtree:true,attributes:true,attributeFilter:['style']});
    });
    // Sparse beats and firing bursts have intentional rests; two 330ms stills
    // can sample the same rest. Observe the cycle, not an arbitrary two frames.
    await page.waitForFunction(()=>window.poolIdleChanged,{},{timeout:6500});
    await link.hover();await page.waitForTimeout(420);
    assert.deepEqual(await art.boundingBox(),before,`${id}: hover must not move the whole housing`);
    const hovered=await localStyles(link);
    await link.click();await page.waitForTimeout(90);
    assert.notDeepEqual(await localStyles(link),hovered,`${id} must acknowledge the click inside the mechanism`);
    assert.deepEqual(await art.boundingBox(),before,`${id}: click must not shrink or sink the whole housing`);
    await page.keyboard.press('Escape');await page.mouse.move(960,100);await page.waitForTimeout(450);
  }
  await page.close();
});

test('a neuron receives an arriving impulse before passing activity to the next cell', async () => {
  const page=await pageAt('?frame=opened');
  const circuit=await page.evaluate(async()=>{
    const module=await import('/web/shared/frontpage-pool-effects.mjs');
    if(typeof module.sampleNeuralCircuit!=='function')return null;
    return [0,.15,.4,.55,.8,1.3].map(age=>module.sampleNeuralCircuit(age));
  });
  assert.ok(circuit,'the rendered neural circuit must have a causal firing sample');
  assert.ok(circuit[0].cores[0]>.7 && circuit[0].cores[1]<.1,'only the initiating cell fires first');
  assert.ok(circuit[1].travel[0]>0 && circuit[1].travel[0]<1,'impulse travels before arrival');
  assert.ok(circuit[2].cores[1]>.7 && circuit[2].cores[2]<.1,'middle cell receives before last cell');
  assert.ok(circuit[3].travel[1]>0 && circuit[3].travel[1]<1);
  assert.ok(circuit[4].cores[2]>.7,'last cell responds to its incoming impulse');
  assert.ok(circuit[5].cores.every(value=>value<.1),'the firing event dissipates rather than holding every cell on');
  await page.close();
});

test('the click cascade reaches the final neuron within the entry acknowledgement', async () => {
  const page=await pageAt('?frame=opened');
  const peaks=await page.evaluate(async()=>{
    const {createPoolEffects}=await import('/web/shared/frontpage-pool-effects.mjs');
    const art=document.createElement('span');
    const effects=createPoolEffects('artificial-self',art);
    const peaks=[0,0,0];
    for(let age=0;age<=.35;age+=.01){
      effects.render(age,1,true,true,true,{age,held:false});
      [...art.querySelectorAll('[data-neural-core]')].forEach((e,i)=>peaks[i]=Math.max(peaks[i],Number(e.style.opacity)));
    }
    return peaks;
  });
  assert.ok(peaks.every(value=>value>.7),`the last cell must fire before navigation, peaks=${peaks}`);
  await page.close();
});

test('reduced motion during confirmation opens the requested route without waiting on a stopped clock', async () => {
  const page=await pageAt('?frame=opened');
  const link=page.locator('[data-pool-link="ai-d-kit"]');
  await link.click();await page.waitForTimeout(650);await link.click();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForURL(base+'/web/pools/ai-d-kit/');
  await page.close();
});

test('press cancellation never arms a pool and reduced motion cancels local click motion', async () => {
  const page=await ambientPage();
  const health=page.locator('[data-pool-link="health"]');
  await health.hover();await page.mouse.down();await page.waitForTimeout(100);
  assert.equal(await opacity(page,'[data-ecg-flat]'),1);
  await health.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse'});
  await page.mouse.move(960,100);await page.mouse.up();await page.waitForTimeout(300);
  assert.equal(await health.getAttribute('data-armed'),null);
  assert.equal(await opacity(page,'[data-ecg-flat]'),0);
  await health.click();await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(100);
  const styles=()=>page.locator('.pool-instrument,.pool-instrument *, .workbench-part').evaluateAll(es=>es.map(e=>e.getAttribute('style')));
  const still=await styles();await page.waitForTimeout(450);
  assert.deepEqual(await styles(),still);
  assert.equal(await page.evaluate(()=>frameProbe.pending()),0);
  await page.close();
});

test('confirmed entry shows the local click response before navigation and Escape can cancel it', async () => {
  const page=await pageAt('?frame=opened');
  const link=page.locator('[data-pool-link="health"]');
  await link.click();await page.waitForTimeout(650);
  await link.click();
  assert.ok(page.url().endsWith('?frame=opened'),'the confirmation must be visible before leaving');
  await page.waitForTimeout(60);
  assert.equal(await opacity(page,'[data-ecg-flat]'),1,'the second click also performs the instrument response');
  await page.keyboard.press('Escape');await page.waitForTimeout(500);
  assert.ok(page.url().endsWith('?frame=opened'),'Escape must cancel a pending entry');
  await link.press('Enter');await link.press('Enter');
  await page.waitForURL(base+'/web/pools/health/');
  await page.close();
});

test('Artificial Self carries impulses along distinct wires instead of blinking a rectangular crop', async () => {
  const page=await pageAt('?frame=opened');
  const link=page.locator('[data-pool-link="artificial-self"]');
  const impulses=link.locator('[data-neural-impulse]');
  assert.ok(await impulses.count()>=3,'independent wire-following impulse heads');
  await link.hover();await page.waitForTimeout(500);
  await page.evaluate(()=>{
    window.neuralPeaks=[];
    const cores=[...document.querySelectorAll('[data-neural-core]')];
    new MutationObserver(()=>neuralPeaks.push(cores.map(e=>Number(e.style.opacity))))
      .observe(document.querySelector('.neural-instrument'),{subtree:true,attributes:true,attributeFilter:['style']});
  });
  await link.click();
  const start=await impulses.evaluateAll(es=>es.map(e=>e.style.transform));
  await page.waitForTimeout(180);
  assert.notDeepEqual(await impulses.evaluateAll(es=>es.map(e=>e.style.transform)),start);
  assert.equal(await link.getAttribute('data-effect-state'),'selected');
  await page.waitForTimeout(750);
  const peaks=await page.evaluate(()=>neuralPeaks);
  assert.ok(peaks.some(row=>row.some(value=>value>.65)),`a real firing peak must occur, not a permanently bright selected state: ${JSON.stringify(peaks)}`);
  await page.close();
});

test('soil bridges the trunk contact to the foreground and hanging vines respond without moving the tree', async () => {
  const page=await pageAt('?frame=opened');
  const tree=await page.locator('.resolve-tree').boundingBox();
  assert.equal(await page.locator('.ambient-soil-bridge').count(),1);
  const bridge=await page.locator('.ambient-soil-bridge').boundingBox();
  assert.ok(bridge.y<=tree.y+tree.height && bridge.y+bridge.height>=.87*1080,'ground covers the contact and joins the foreground ledge');
  const vines=page.locator('[data-wind-vine]');
  assert.ok(await vines.count()>=2);
  const before=await vines.evaluateAll(es=>es.map(e=>e.style.transform));
  await page.mouse.move(1800,400);await page.waitForTimeout(500);
  assert.notDeepEqual(await vines.evaluateAll(es=>es.map(e=>e.style.transform)),before);
  assert.deepEqual(await page.locator('.resolve-tree').boundingBox(),tree);
  assert.equal(await page.locator('.resolve-ambient').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
  await page.close();
});

test('all new local effects freeze completely on pause and reduced motion, including hover', async () => {
  const page=await ambientPage();
  const effects='.ecg-deflection,.ecg-rest,[data-neural-impulse],[data-wind-vine],.portal-art';
  assert.ok(await page.locator('[data-ecg-wave]').count());
  await page.getByRole('button',{name:'Pause motion',exact:true}).click();
  const styles=()=>page.locator(effects).evaluateAll(es=>es.map(e=>e.getAttribute('style')));
  const paused=await styles();
  await page.mouse.move(1800,400);await page.waitForTimeout(400);
  assert.deepEqual(await styles(),paused);
  assert.equal(await page.evaluate(()=>frameProbe.pending()),0);
  await page.emulateMedia({reducedMotion:'reduce'});
  const still=await styles();
  await page.waitForTimeout(400);assert.deepEqual(await styles(),still);
  assert.equal(await page.evaluate(()=>frameProbe.max),1);
  await page.close();
});

test('hanging vines capture a deliberate drag then swing freely without moving the tree', async () => {
  const page=await ambientPage();
  const vine=page.getByRole('button',{name:'Swing left vine',exact:true});
  assert.equal(await vine.count(),1,'a hanging vine must be an actual interactive target');
  const tree=await page.locator('.resolve-tree').boundingBox();
  const before=await vine.getAttribute('style');
  const box=await vine.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height*.7);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+70,box.y+box.height*.7+15,{steps:10});
  await page.waitForTimeout(100);
  assert.equal(await vine.getAttribute('data-dragging'),'true');
  assert.notEqual(await vine.getAttribute('style'),before);
  await page.mouse.up();
  assert.equal(await vine.getAttribute('data-dragging'),null);
  const released=await vine.getAttribute('style');
  await page.waitForTimeout(300);
  assert.notEqual(await vine.getAttribute('style'),released,'release continues as a damped swing');
  assert.deepEqual(await page.locator('.resolve-tree').boundingBox(),tree);
  assert.equal(await page.evaluate(()=>frameProbe.max),1);
  await page.getByRole('button',{name:'Pause motion',exact:true}).click();
  const held=await vine.getAttribute('style');
  await page.waitForTimeout(300);assert.equal(await vine.getAttribute('style'),held);
  assert.equal(await page.evaluate(()=>frameProbe.pending()),0);
  await page.close();
});

test('vines support keyboard nudges and become inert on rewind or reduced motion', async () => {
  const page=await ambientPage();
  const vine=page.locator('button[data-wind-vine="1"]');
  assert.equal(await vine.count(),1);
  await vine.focus();
  const before=await vine.getAttribute('style');
  await vine.press('Enter');await page.waitForTimeout(120);
  assert.notEqual(await vine.getAttribute('style'),before);
  await page.evaluate(()=>window.sdforestResolve.seek(0));
  assert.ok(await vine.evaluate(e=>!!e.closest('[inert]')));
  assert.equal(await vine.evaluate(e=>e===document.activeElement),false);
  await page.evaluate(()=>window.sdforestResolve.seek(5));
  await page.emulateMedia({reducedMotion:'reduce'});
  const still=await vine.getAttribute('style');
  await page.mouse.move(1700,700);await page.waitForTimeout(200);
  assert.equal(await vine.getAttribute('style'),still);
  assert.equal(await page.evaluate(()=>frameProbe.pending()),0);
  await page.close();
});

test('a phone swipe on a vine yields to vertical scrolling and cancels its drag', async () => {
  const page=await pageAt('?frame=opened',{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const vine=page.locator('button[data-wind-vine="0"]');
  const box=await vine.boundingBox();
  const cdp=await page.context().newCDPSession(page);
  const x=box.x+box.width/2,y=box.y+box.height*.8;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  assert.equal(await vine.getAttribute('data-dragging'),'true');
  for(let i=1;i<=5;i++) {
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*25}]});
    await page.waitForTimeout(20);
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(150);
  assert.equal(await vine.getAttribute('data-dragging'),null);
  assert.ok(await page.evaluate(()=>scrollY>20),'a decorative strand must not trap the phone page');
  await page.close();
});

test('pausing during a captured vine drag releases it and stops the only clock', async () => {
  const page=await ambientPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const vine=page.locator('button[data-wind-vine="0"]');
  const box=await vine.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height*.7);await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+45,box.y+box.height*.7,{steps:4});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(100);
  assert.deepEqual(errors,[]);
  assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
  assert.equal(await page.locator('.resolve-motion-toggle').textContent(),'Motion off');
  assert.equal(await vine.getAttribute('data-dragging'),null);
  const held=await vine.getAttribute('style');
  await page.mouse.up();await page.waitForTimeout(150);
  assert.equal(await vine.getAttribute('style'),held);
  assert.equal(await page.evaluate(()=>frameProbe.pending()),0);
  assert.equal(await page.evaluate(()=>frameProbe.max),1);
  await page.close();
});

test('phone pool mechanisms fill their entries and names remain embedded rather than beside thumbnails', async () => {
  for(const [width,height] of [[390,844],[320,568],[780,390]]) {
    const page=await pageAt('?frame=opened',{viewport:{width,height}});
    assert.deepEqual(await page.locator('[data-pool-link]').evaluateAll(es=>es.slice(-2).map(e=>e.dataset.poolLink)),['tinkerbox','design-gallery']);
    for(const link of await page.locator('[data-pool-link]').all()) {
      const result=await link.evaluate(e=>{
        const box=e.getBoundingClientRect(),art=e.querySelector('.portal-art').getBoundingClientRect();
        const range=document.createRange();range.selectNodeContents(e.querySelector('.portal-name'));
        const text=range.getBoundingClientRect();
        return {id:e.dataset.poolLink,width:box.width,art:art.toJSON(),text:text.toJSON()};
      });
      assert.ok(result.art.width>=result.width*.95,`${width}px ${result.id}: not a thumbnail`);
      assert.ok(result.text.left>=result.art.left && result.text.right<=result.art.right &&
        result.text.top>=result.art.top && result.text.bottom<=result.art.bottom,`${width}px ${result.id}: embedded title ${JSON.stringify(result)}`);
    }
    await page.close();
  }
});

test('illustrated ground is planted at the tree base without the old synthetic grass overlay', async () => {
  const page=await pageAt('?frame=opened');
  const loaded=await page.locator('.rooted-earth').evaluateAll(es=>es.map(e=>({loaded:e.complete&&e.naturalWidth>0,box:e.getBoundingClientRect().toJSON()})));
  assert.equal(loaded.length,1,'the approved illustrated bed must be integrated, not preview-only');
  assert.ok(loaded[0].loaded);
  const tree=await page.locator('.resolve-tree').boundingBox();
  const image=loaded[0].box,contactY=image.y+image.width*765/1672,contactX=image.x+image.width*819/1672;
  assert.ok(Math.abs(contactX-(tree.x+tree.width/2))<2,'illustrated root collar aligns to the trunk centre');
  assert.ok(Math.abs(contactY-(tree.y+tree.height))<16,'root collar meets the fixed tree base');
  assert.ok(image.width<tree.width*2,'the bed cannot enlarge the roots to the full-screen preview scale');
  assert.equal(await page.locator('[data-wind-grass]').evaluateAll(es=>es.some(e=>e.getBoundingClientRect().height>0)),false,'no mismatched synthetic blade overlay');
  await page.close();
});

test('selected phone summaries sit below the whole mechanism, clear of its label and next entry', async () => {
  for(const width of [320,390]) {
    const page=await pageAt('?frame=opened',{viewport:{width,height:844}});
    for(const link of await page.locator('[data-pool-link]').all()) {
      await link.press('Enter');
      assert.equal(await link.getAttribute('data-armed'),'true');
      await page.waitForTimeout(350);
      const boxes=await link.evaluate(e=>{
        const b=e.getBoundingClientRect(),m=e.querySelector('.portal-meta').getBoundingClientRect();
        const next=e.nextElementSibling?.getBoundingClientRect();
        return {bottom:b.bottom,meta:m.toJSON(),nextTop:next?.top,id:e.dataset.poolLink};
      });
      assert.ok(boxes.meta.top>=boxes.bottom+10,`${width} ${boxes.id}: drawer clears the mechanism`);
      assert.ok(boxes.meta.width>=width-26,`${width} ${boxes.id}: summary uses the whole entry`);
      if(boxes.nextTop)assert.ok(boxes.meta.bottom<=boxes.nextTop,`${width} ${boxes.id}: summary clears next mechanism ${JSON.stringify(boxes)}`);
      await page.keyboard.press('Escape');
    }
    await page.close();
  }
});

test('landscape phones expose a complete first row without changing the fixed tree', async () => {
  for(const [width,height] of [[780,390],[568,320]]) {
    const page=await pageAt('?frame=opened',{viewport:{width,height}});
    const entries=await page.locator('[data-pool-link]').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
    assert.ok(entries.filter(e=>e.top>=0 && e.bottom<=height).length>=2,`${width}x${height}: two complete leading entries`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
    for(const link of await page.locator('[data-pool-link]').all()) {
      assert.ok(await link.evaluate(e=>{const b=e.getBoundingClientRect(),r=document.createRange();r.selectNodeContents(e.querySelector('.portal-name'));return [...r.getClientRects()].every(t=>t.left>=b.left && t.right<=b.right && t.bottom<=b.bottom);}),await link.getAttribute('data-pool-link'));
    }
    await page.close();
  }
});

test('stationary heartbeat and idle wind do not trigger repeated layout', async () => {
  const page=await pageAt('?frame=opened',{viewport:{width:390,height:844}});
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const layouts=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value])).LayoutCount;
  const before=await layouts();await page.waitForTimeout(1400);
  assert.equal(await layouts()-before,0,'idle instruments should composite, not re-layout SVG paths');
  await page.close();
});

test('a visible phone pool keeps its idle life after the tree scrolls out of view', async () => {
  const page=await pageAt('?frame=opened',{viewport:{width:390,height:600}});
  const link=page.locator('[data-pool-link="artificial-self"]');
  await link.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  assert.ok(await page.locator('.resolve-tree').evaluate(e=>e.getBoundingClientRect().bottom<0));
  await link.locator('[data-neural-impulse]').first().evaluate(signal=>{
    window.visibleIdleMotion=false;
    const before=signal.getAttribute('style');
    new MutationObserver(()=>{if(signal.getAttribute('style')!==before)window.visibleIdleMotion=true;})
      .observe(signal,{attributes:true,attributeFilter:['style']});
  });
  // Observe the full sparse firing cycle: half-second snapshots can alias away
  // a fast impulse even while it visibly travels between those snapshots.
  await page.waitForFunction(()=>window.visibleIdleMotion===true,{},{timeout:6500});
  await page.close();
});

test('TinkerBox releases a separate lid after its locking pins retract', async () => {
  const page=await pageAt('?frame=opened');
  const link=page.locator('[data-pool-link="tinkerbox"]');
  const lid=link.locator('[data-workbench-lid]');
  assert.equal(await lid.count(),1);
  const before=await lid.getAttribute('style');
  await page.evaluate(()=>{
    const art=document.querySelector('[data-pool-link="tinkerbox"] .portal-art');window.hatchSamples=[];
    new MutationObserver(()=>{const matrix=selector=>new DOMMatrix(getComputedStyle(art.querySelector(selector)).transform);
      hatchSamples.push({left:Math.abs(matrix('[data-workbench-part="pin-left"]').m41),right:Math.abs(matrix('[data-workbench-part="pin-right"]').m41),lid:Math.abs(matrix('[data-workbench-lid]').m23)});
    }).observe(art,{subtree:true,attributes:true,attributeFilter:['style']});
  });
  await link.hover();await page.waitForTimeout(600);
  const samples=await page.evaluate(()=>hatchSamples);
  assert.ok(samples.some(s=>s.lid>.14),'hover opens the unlocked hatch visibly, not a two-degree twitch');
  assert.ok(samples.filter(s=>s.lid>.07).every(s=>s.left>=8&&s.right>=8),'the lid cannot move through its still-engaged locking pins');
  await link.click();await page.waitForTimeout(500);
  assert.notEqual(await lid.getAttribute('style'),before);
  await page.keyboard.press('Escape');await page.waitForTimeout(500);
  assert.equal(await link.getAttribute('data-armed'),null);
  await page.close();
});

test('the first-aid flag flips over while the illustrated planted bed remains available', async () => {
  const page=await pageAt('?frame=opened');
  const link=page.locator('[data-pool-link="ai-d-kit"]');
  await link.click();await page.waitForTimeout(500);
  const flag=await link.locator('[data-workbench-part="flag"]').getAttribute('style');
  assert.match(flag,/rotateY\(180deg\)/,'the flag flips, not just tilts');
  assert.ok(await page.locator('.rooted-earth').evaluate(e=>e.complete&&e.naturalWidth>0),'the matching illustrated vegetation remains loaded during interaction');
  await page.close();
});

test('heartbeat hover increases its measured regular rate without lateral travel', async () => {
  const page=await pageAt('?frame=opened');
  async function cyclesPerSecond() {
    return page.evaluate(async()=>{
      const wave=document.querySelector('[data-ecg-wave]');
      const path=wave.querySelector('[data-ecg-qrs] path') || wave.querySelector('path');
      const read=()=>Number(getComputedStyle(path.parentElement.parentElement).opacity)>.5 && path.getBoundingClientRect().height>8;
      let prior=read(),beats=0,start=performance.now();
      while(performance.now()-start<5000) {
        await new Promise(resolve=>setTimeout(resolve,30));
        const next=read();if(next&&!prior)beats++;prior=next;
      }
      return beats/((performance.now()-start)/1000);
    });
  }
  const idle=await cyclesPerSecond();
  await page.locator('[data-pool-link="health"]').hover();await page.waitForTimeout(650);
  const engaged=await cyclesPerSecond();
  assert.ok(idle>=.98 && idle<1.45,`rest ${idle*60} bpm`);
  assert.ok(engaged>=1.98 && engaged<2.5,`hover ${engaged*60} bpm`);
  await page.close();
});

test('GrowingApp and Artificial Self titles stay inside their inset nameplates', async () => {
  // The native nameplates sit in the lower control recess, not on the bark.
  // Check both the actual text containment and the plate's artwork boundary.
  for (const [width,height] of [[1920,1080],[1672,941],[1366,768],[1920,720]]) {
    const page=await pageAt('?frame=opened',{viewport:{width,height}});
    for (const [id,left,top,right,bottom] of [
      ['growingapp',.21,.59,.79,.78],
      ['artificial-self',.21,.59,.79,.78]
    ]) {
      const result=await page.locator(`[data-pool-link="${id}"]`).evaluate((e,bounds)=>{
        const art=e.querySelector('.portal-art').getBoundingClientRect();
        const range=document.createRange();range.selectNodeContents(e.querySelector('.portal-name'));
        const text=range.getBoundingClientRect();
        const plate=e.querySelector('.portal-copy').getBoundingClientRect();
        const [left,top,right,bottom]=bounds;
        return {fits:plate.left>=art.left+art.width*left-.5 && plate.right<=art.left+art.width*right+.5 &&
          plate.top>=art.top+art.height*top-.5 && plate.bottom<=art.top+art.height*bottom+.5 &&
          text.left>=plate.left && text.right<=plate.right && text.top>=plate.top && text.bottom<=plate.bottom,
          text:text.toJSON(),plate:plate.toJSON(),art:art.toJSON()};
      },[left,top,right,bottom]);
      assert.ok(result.fits,`${id} at ${width}x${height}: ${JSON.stringify(result)}`);
    }
    await page.close();
  }
});

test('selected instructions and existing summaries never share the same desktop line', async () => {
  for(const [width,height] of [[1920,1080],[1672,941],[1366,768],[1920,720]]) {
    const page=await pageAt('?frame=opened',{viewport:{width,height}});
    for(const link of await page.locator('[data-pool-link]').all()) {
      await link.click();
      await page.waitForTimeout(350);
      const result=await link.evaluate(e=>{
        const meta=e.querySelector('.portal-meta').getBoundingClientRect(),hint=e.querySelector('.portal-selection').getBoundingClientRect();
        return {id:e.dataset.poolLink,top:hint.top,bottom:hint.bottom,meta:meta.toJSON()};
      });
      assert.ok(result.bottom<=result.meta.top || result.top>=result.meta.bottom,
        `${width}x${height}: ${JSON.stringify(result)}`);
      await page.keyboard.press('Escape');
    }
    await page.close();
  }
});

test('connected bark and distant woodland open reversibly without intercepting any pool', async () => {
  const page=await pageAt('?frame=resolve');
  assert.equal(await page.locator('.workbench-bark').count(),1,'one connected bark environment, not separate floating frames');
  assert.equal(await page.locator('.workbench-woodland').count(),1,'the tree needs a visible distant setting');
  const tree=await page.locator('.resolve-tree').boundingBox();
  for (const time of [5,0,5]) {
    await page.evaluate(t=>window.sdforestResolve.seek(t),time);
    assert.equal(await opacity(page,'.resolve-field'),time===0?0:1);
    assert.deepEqual(await page.locator('.resolve-tree').boundingBox(),tree);
  }
  assert.equal(await page.locator('.workbench-bark,.workbench-woodland').evaluateAll(es=>es.every(e=>e.complete && e.naturalWidth>0)),true);
  for(const link of await page.locator('[data-pool-link]').all()) {
    assert.ok(await link.evaluate(e=>{
      const b=e.getBoundingClientRect(),hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
      return hit===e||e.contains(hit);
    }));
  }
  await page.close();
});

test('the environmental mist shares pause and reduced-motion with the existing single clock', async () => {
  const page=await ambientPage();
  assert.equal(await page.locator('.workbench-mist').count(),1);
  const style=()=>page.locator('.workbench-mist').getAttribute('style');
  const start=await style();
  await page.waitForTimeout(1100);
  assert.notEqual(await style(),start);
  await page.getByRole('button',{name:'Pause motion',exact:true}).click();
  const held=await style();
  await page.waitForTimeout(1100);
  assert.equal(await style(),held);
  await page.emulateMedia({reducedMotion:'reduce'});
  const still=await style();
  await page.mouse.move(1800,700);await page.waitForTimeout(1100);
  assert.equal(await style(),still);
  assert.equal(await page.evaluate(()=>frameProbe.pending()),0);
  assert.equal(await page.evaluate(()=>frameProbe.max),1);
  await page.close();
});

test('mobile bark does not leak into the tree-only resolve frame', async () => {
  const page=await pageAt('?frame=resolve',{viewport:{width:390,height:844}});
  const background=await page.locator('[data-pool-directory]').evaluate(e=>getComputedStyle(e).backgroundImage);
  assert.equal(background,'none','a permanent nav background escapes seek() and remains visible at t=0');
  const layer=page.locator('.workbench-directory-bark');
  assert.equal(await layer.count(),1);
  assert.equal(await opacity(page,'.workbench-directory-bark'),0);
  await page.evaluate(()=>window.sdforestResolve.seek(5));
  assert.equal(await opacity(page,'.workbench-directory-bark'),1);
  await page.evaluate(()=>window.sdforestResolve.seek(0));
  assert.equal(await opacity(page,'.workbench-directory-bark'),0);
  await page.close();
});

test('lower flank pools keep the same width and cadence as leaders without entering the tree box', async () => {
  const page=await pageAt('?frame=opened');
  const boxes=await page.locator('[data-pool-link]').evaluateAll(es=>Object.fromEntries(es.map(e=>[e.dataset.poolLink,e.getBoundingClientRect().toJSON()])));
  assert.ok(boxes.health.x < 960 && boxes['ai-d-kit'].x > 960);
  assert.ok(Math.abs(boxes.health.y-boxes['ai-d-kit'].y)<1);
  assert.ok(boxes.growingapp.y > boxes.health.bottom);
  assert.ok(boxes['artificial-self'].y > boxes['ai-d-kit'].bottom);
  const tree=await page.locator('.resolve-tree').boundingBox();
  for(const id of ['tinkerbox','my-story','design-gallery']) {
    assert.ok(boxes[id].bottom <= 1080,`${id} must remain above the fold`);
  }
  assert.ok(boxes['my-story'].y >= tree.y+tree.height);
  for(const [last,middle] of [['tinkerbox','growingapp'],['design-gallery','artificial-self']]) {
    assert.ok(Math.abs(boxes[last].width-boxes.health.width)<1,'last must not mean a shrunken control');
    assert.ok(Math.abs((boxes[last].y-boxes[middle].y)-(boxes.growingapp.y-boxes.health.y))<1,'same vertical cadence, not a detached footer');
    assert.ok(boxes[last].right<=tree.x || boxes[last].left>=tree.x+tree.width);
  }
  assert.ok(boxes['design-gallery'].height <= boxes.health.height);
  assert.ok(boxes.tinkerbox.x < boxes['my-story'].x && boxes['my-story'].x < boxes['design-gallery'].x);
  await page.close();
});

test('selection animates an actual lever, resets on Escape, and cannot turn a double-click into entry', async () => {
  const page=await pageAt('?frame=opened');
  const link=page.locator('[data-pool-link="ai-d-kit"]');
  const lever=link.locator('[data-workbench-part="lever"]');
  assert.equal(await lever.count(),1,'the visible mechanism must exist, not only a selected border');
  await page.evaluate(()=>{
    window.leverSamples=[];
    const lever=document.querySelector('[data-workbench-part="lever"]');
    const observer=new MutationObserver(()=>leverSamples.push(lever.style.transform));
    observer.observe(lever,{attributes:true,attributeFilter:['style']});
  });
  const before=await lever.evaluate(e=>getComputedStyle(e).transform);
  await link.dblclick();
  assert.ok(page.url().endsWith('?frame=opened'));
  await page.waitForTimeout(500);
  assert.notEqual(await lever.evaluate(e=>getComputedStyle(e).transform),before);
  assert.ok(await page.evaluate(()=>new Set(leverSamples).size>8),'a press must traverse intermediate poses, not jump to an end state');
  await page.keyboard.press('Escape');
  assert.equal(await link.getAttribute('data-armed'),null);
  await link.press('Enter');
  assert.ok(page.url().endsWith('?frame=opened'));
  assert.equal(await link.getAttribute('data-armed'),'true');
  await link.press('Enter');
  await page.waitForURL(base+'/web/pools/ai-d-kit/');
  await page.close();
});

test('failed workbench artwork never hides names, selection state or a usable route', async () => {
  const page=await browser.newPage({viewport:{width:320,height:568}});
  await page.route('**/sdforest-workbench/**',r=>r.abort());
  await page.goto(base+'/?frame=opened',{waitUntil:'networkidle'});
  for(const link of await page.locator('[data-pool-link]').all()) {
    assert.ok(await link.locator('.portal-name').isVisible());
    await link.press('Enter');
    assert.equal(await link.getAttribute('data-armed'),'true');
    await page.keyboard.press('Escape');
  }
  const link=page.locator('[data-pool-link="health"]');
  await link.press('Enter');await link.press('Enter');
  await page.waitForURL(base+'/web/pools/health/');
  await page.close();
});

test('reduced motion stops every mechanism and parallax while retaining selection and keyboard safety', async () => {
  const page=await pageAt('?frame=opened',{reducedMotion:'reduce'});
  const styles=()=>page.locator('.workbench-part,.workbench-horizon').evaluateAll(es=>es.map(e=>e.getAttribute('style')));
  const still=await styles();
  await page.mouse.move(1850,850);
  await page.waitForTimeout(700);
  assert.deepEqual(await styles(),still,'reduced motion is not a slower loop or pointer parallax');
  const link=page.locator('[data-pool-link="tinkerbox"]');
  await link.focus();
  await page.keyboard.down('Enter');
  await page.keyboard.down('Enter');
  await page.keyboard.up('Enter');
  assert.ok(page.url().endsWith('?frame=opened'),'key repeat cannot confirm selection');
  assert.equal(await link.getAttribute('data-armed'),'true');
  const selected=await styles();
  await page.waitForTimeout(700);
  assert.deepEqual(await styles(),selected);
  await page.close();
});

test('background parallax leaves the tree fixed and the seven name colours distinct and legible', async () => {
  const page=await pageAt('?frame=opened');
  const tree=await page.locator('.resolve-tree').boundingBox();
  const far=page.locator('.workbench-horizon');
  const before=await far.getAttribute('style');
  await page.mouse.move(1800,700);
  await page.waitForTimeout(450);
  assert.notEqual(await far.getAttribute('style'),before);
  assert.deepEqual(await page.locator('.resolve-tree').boundingBox(),tree);
  const colours=await page.locator('.portal-name').evaluateAll(es=>es.map(e=>getComputedStyle(e).color));
  assert.equal(new Set(colours).size,7);
  const luminance=rgb=>rgb.map(c=>c/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0);
  for(const colour of colours) {
    const ratio=(luminance(colour.match(/\d+/g).map(Number))+.05)/(luminance([15,15,21])+.05);
    assert.ok(ratio>=7,`${colour} needs at least 7:1 against the dark control surface, got ${ratio}`);
  }
  await page.close();
});

test('dragging moves only the central depth planes; the bark, tree and contact stay anchored', async () => {
  const page=await pageAt('?frame=opened');
  await page.evaluate(()=>document.documentElement.style.setProperty('--ambient-strength','0'));
  const boxes=()=>page.locator('.resolve-tree,.ambient-soil-bridge').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
  const treeAndContact=await boxes();
  const offsets=()=>page.locator('.workbench-horizon,.workbench-mist,.workbench-bark').evaluateAll(es=>es.map(e=>new DOMMatrix(getComputedStyle(e).transform).m41));
  await page.mouse.move(960,790);await page.waitForTimeout(500);
  const before=await offsets();
  await page.mouse.down();
  await page.mouse.move(1210,740,{steps:12});await page.waitForTimeout(500);
  assert.equal(await page.locator('[data-resolve-stage]').getAttribute('data-world-dragging'),'true');
  const delta=(await offsets()).map((x,i)=>Math.abs(x-before[i]));
  assert.ok(delta[0]>.2 && delta[0]<delta[1],`far < mist; observed ${delta}`);
  assert.equal(delta[2],0,'the foreground plate must never follow the pointer');
  assert.deepEqual(await boxes(),treeAndContact,'camera motion cannot detach the tree from its contact');
  await page.mouse.up();
  assert.equal(await page.locator('[data-resolve-stage]').getAttribute('data-world-dragging'),null);
  await page.close();
});

test('reduced motion releases a world drag and leaves every depth plane still', async () => {
  const page=await pageAt('?frame=opened');
  await page.mouse.move(960,790);await page.mouse.down();
  await page.mouse.move(1160,760,{steps:8});await page.waitForTimeout(150);
  assert.equal(await page.locator('[data-resolve-stage]').getAttribute('data-world-dragging'),'true');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
  assert.equal(await page.locator('[data-resolve-stage]').getAttribute('data-world-dragging'),null);
  const styles=()=>page.locator('.workbench-horizon,.workbench-mist,.workbench-bark').evaluateAll(es=>es.map(e=>e.getAttribute('style')));
  const still=await styles();
  await page.mouse.move(1000,850);await page.mouse.up();await page.waitForTimeout(400);
  assert.deepEqual(await styles(),still);
  assert.equal(await page.locator('[data-pool-link]').evaluateAll(es=>es.every(e=>!e.inert)),true);
  await page.close();
});

test('the tree supplies high-resolution transparent artwork rather than magnifying the thumbnail', async () => {
  const page=await pageAt('?frame=opened');
  const asset=await page.locator('.resolve-tree image').evaluate(async e=>{
    const image=new Image();image.src=e.href.baseVal;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
    const context=canvas.getContext('2d');context.drawImage(image,0,0);
    return {width:image.naturalWidth,height:image.naturalHeight,cornerAlpha:context.getImageData(0,0,1,1).data[3]};
  });
  assert.ok(asset.width>=1200 && asset.height>=1200,JSON.stringify(asset));
  assert.equal(asset.cornerAlpha,0,'no opaque rectangular matte around the tree');
  await page.close();
});

// Observe actual scheduling/reads without replacing their browser behaviour.
async function ambientPage(options = {}) {
  const page = await browser.newPage({viewport:{width:1920,height:1080}, ...options});
  await page.addInitScript(() => {
    const pending = new Set();
    const request = window.requestAnimationFrame.bind(window);
    const cancel = window.cancelAnimationFrame.bind(window);
    window.frameProbe = {max:0, calls:0, reads:0, pending:()=>pending.size};
    window.requestAnimationFrame = callback => {
      const id = request(time => { pending.delete(id); frameProbe.calls++; callback(time); });
      pending.add(id); frameProbe.max = Math.max(frameProbe.max,pending.size); return id;
    };
    window.cancelAnimationFrame = id => { pending.delete(id); cancel(id); };
    for (const name of ['getBoundingClientRect','getClientRects']) {
      const original = Element.prototype[name];
      Element.prototype[name] = function(...args) { frameProbe.reads++; return original.apply(this,args); };
    }
    const computed = window.getComputedStyle;
    window.getComputedStyle = (...args) => { frameProbe.reads++; return computed(...args); };
  });
  await page.goto(base+'/?frame=opened',{waitUntil:'networkidle'});
  return page;
}

test('ambient moves around a fixed tree and Pause motion freezes every decorative layer', async () => {
  const page = await ambientPage();
  const tree = await page.locator('.resolve-tree').boundingBox();
  assert.equal(await page.locator('.resolve-ambient[aria-hidden="true"][inert]').count(),1);
  const styles = () => page.locator('[data-wind-grass], [data-ambient-mote]').evaluateAll(es=>es.map(e=>e.getAttribute('style')));
  const before = await styles();
  await page.waitForTimeout(1100);
  assert.notDeepEqual(await styles(),before,'the opened scene must actually breathe');
  assert.deepEqual(await page.locator('.resolve-tree').boundingBox(),tree);
  await page.getByRole('button',{name:'Pause motion',exact:true}).click();
  const held = await styles();
  const calls = await page.evaluate(()=>frameProbe.calls);
  await page.waitForTimeout(200);
  assert.deepEqual(await styles(),held);
  assert.equal(await page.evaluate(()=>frameProbe.calls),calls,'paused means no idle rAF loop');
  assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
  await page.getByRole('button',{name:'Resume motion',exact:true}).click();
  await page.waitForTimeout(1100);
  assert.notDeepEqual(await styles(),held);
  assert.equal(await page.evaluate(()=>frameProbe.max),1,'feedback and scrub cannot own another rAF');
  await page.close();
});

test('ambient does not measure layout at rest, obscure navigation, or run offscreen', async () => {
  const page = await ambientPage({viewport:{width:390,height:844}});
  await page.evaluate(()=>{frameProbe.reads=0;});
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>frameProbe.reads),0);
  assert.equal(await page.locator('[data-ambient-mote]:visible').count(),3);
  assert.equal(await page.locator('.resolve-ambient').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
  await page.locator('[data-pool-link="health"]').click();
  assert.equal(await page.locator('[data-pool-link="health"]').getAttribute('data-armed'),'true');
  await page.evaluate(()=>{
    // Move the whole scene offscreen, not merely the tree while pools remain visible.
    const spacer=document.createElement('div');spacer.style.height='150vh';spacer.inert=true;
    document.body.append(spacer);scrollTo(0,document.body.scrollHeight);
  });
  await page.waitForFunction(()=>frameProbe.pending()===0);
  const calls = await page.evaluate(()=>frameProbe.calls);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>frameProbe.calls),calls);
  await page.evaluate(()=>scrollTo(0,0));
  await page.waitForFunction(count=>frameProbe.calls>count,calls);
  await page.close();
});

test('reduced motion, zero strength and no JS keep composed ground without moving air', async () => {
  for (const options of [{reducedMotion:'reduce'}, {javaScriptEnabled:false}]) {
    const page = await pageAt('?frame=opened',options);
    assert.ok(await page.locator('.rooted-earth').isVisible());
    assert.equal(await opacity(page,'.resolve-ambient'),1);
    assert.equal(await page.locator('[data-ambient-mote]').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='0')),true);
    await page.close();
  }
  const page = await ambientPage();
  await page.evaluate(()=>document.documentElement.style.setProperty('--ambient-strength','0'));
  await page.waitForFunction(()=>frameProbe.pending()===0);
  const before = await page.locator('.rooted-earth,.workbench-horizon,.workbench-mist').evaluateAll(es=>es.map(e=>e.style.transform));
  await page.waitForTimeout(200);
  assert.deepEqual(await page.locator('.rooted-earth,.workbench-horizon,.workbench-mist').evaluateAll(es=>es.map(e=>e.style.transform)),before);
  await page.evaluate(()=>document.documentElement.style.setProperty('--ambient-strength','0.5'));
  await page.waitForFunction(()=>frameProbe.pending()===1);
  await page.close();
});

test('rewind suspends ambient and visibility changes resume without a catch-up jump', async () => {
  const page = await ambientPage();
  await page.evaluate(()=>window.sdforestResolve.seek(0));
  assert.equal(await opacity(page,'.resolve-ambient'),0);
  assert.equal(await page.evaluate(()=>frameProbe.pending()),0);
  await page.evaluate(()=>window.sdforestResolve.seek(5));
  await page.waitForTimeout(150);
  // Supply the visibility boundary event; the native rAF scheduler stays real.
  await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,value:true});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  assert.equal(await page.evaluate(()=>frameProbe.pending()),0);
  const before = await page.locator('[data-ambient-mote]').first().getAttribute('style');
  const calls = await page.evaluate(()=>frameProbe.calls);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>frameProbe.calls),calls);
  await page.evaluate(()=>{
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(count=>frameProbe.calls>count,calls);
  // Inspect the first resumed sample, not an imagined elapsed hidden duration.
  const after = await page.locator('[data-ambient-mote]').first().getAttribute('style');
  const y = style => Number(style.match(/,\s*(-?[\d.]+)px,\s*0/)[1]);
  assert.ok(Math.abs(y(after)-y(before)) < .3,'resume must hold ambient time');
  await page.close();
});
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
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  await page.waitForFunction(()=>document.documentElement.dataset.resolveState === 'opened');
  assert.equal(await opacity(page,'[data-pool-link="my-story"]'),1);
  await page.goto(base, {waitUntil:'networkidle'});
  await page.getByRole('link',{name:'Explore the pools',exact:true}).first().focus();
  await page.keyboard.press('Enter');
  assert.equal(await opacity(page,'[data-pool-link="ai-d-kit"]'),1);
  await page.close();
});
test('whole-entry press selects without navigating and the next deliberate press opens the existing pool', async () => {
  const page = await pageAt('?frame=opened');
  await page.locator('[data-pool-link="ai-d-kit"]').click();
  assert.ok(page.url().endsWith('?frame=opened'));
  assert.equal(await page.locator('[data-pool-link="ai-d-kit"]').getAttribute('data-armed'),'true');
  assert.equal(await page.getByRole('button',{name:/^Enter /}).count(),0);
  await page.locator('[data-pool-link="ai-d-kit"]').click();
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
  await page.locator('[data-pool-link="health"]').click();
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
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  await page.waitForFunction(()=>document.documentElement.dataset.resolveState === 'opened');
  await page.locator('[data-pool-link="health"]').click();
  await page.locator('[data-pool-link="health"]').click();
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
    await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
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
    const hit=await page.locator('.dh-tab').evaluate(e=>{
      const b=e.getBoundingClientRect(),target=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
      return {works:target===e||e.contains(target),box:b.toJSON(),target:target?.className||target?.tagName,scrollY,time:window.sdforestResolve.time,visibility:getComputedStyle(e).visibility};
    });
    assert.ok(hit.works,`${width}x${height}: design history hit target ${JSON.stringify(hit)}`);
    await page.locator('.dh-tab').click();
    await page.getByRole('button',{name:'Close design history',exact:true}).click();
    // Wait for the existing drawer's 420ms exit before asking Playwright to
    // scroll a covered portal into view. Otherwise its retry rewinds the scrub.
    await page.locator('.dh-drawer').waitFor({state:'hidden'});
    await page.locator('[data-pool-link="my-story"]').click();
    assert.equal(await page.locator('[data-pool-link="my-story"]').getAttribute('data-armed'),'true');
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

test('short desktop lower controls never cover the site utilities', async () => {
  for(const [width,height] of [[1366,768],[1920,720]]) {
    const page=await pageAt('?frame=opened',{viewport:{width,height}});
    const overlaps=await page.evaluate(()=>{
      const utility=[...document.querySelectorAll('.resolve-controls,.resolve-history')].map(e=>e.getBoundingClientRect());
      return [...document.querySelectorAll('[data-pool-link]')].filter(e=>{
        const b=e.getBoundingClientRect();
        return utility.some(u=>Math.min(b.right,u.right)>Math.max(b.left,u.left)&&Math.min(b.bottom,u.bottom)>Math.max(b.top,u.top));
      }).map(e=>e.dataset.poolLink);
    });
    assert.deepEqual(overlaps,[],`${width}x${height}: portal must not compete with a footer hit area`);
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
  await page.addStyleTag({content:'html[data-resolve-motion="scrub"] .resolve-growth-runway{height:156px}'});
  await page.evaluate(()=>scrollTo(0,1000));
  await page.waitForFunction(()=>window.sdforestResolve.time > -1);
  assert.equal(await page.evaluate(()=>window.sdforestResolve.time),5);
  assert.equal(await opacity(page,'[data-pool-link="my-story"]'),1);
  await page.evaluate(()=>scrollTo(0,500));
  await page.waitForFunction(()=>window.sdforestResolve.time<5);
  assert.equal(await page.evaluate(()=>window.sdforestResolve.time),-.5);
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

test('the growth film is a paused fullscreen scroll surface that reverses and hands off to the fixed tree', async () => {
  const page=await pageAt('');
  const film=page.locator('[data-growth-film]');
  assert.equal(await film.count(),1,'the seed-to-tree master must be the first visual surface');
  await film.evaluate(video=>new Promise(resolve=>video.readyState>=1?resolve():video.addEventListener('loadedmetadata',resolve,{once:true})));
  const start=await film.evaluate(video=>({paused:video.paused,time:video.currentTime,duration:video.duration,box:video.getBoundingClientRect().toJSON()}));
  assert.equal(start.paused,true,'scroll owns the timeline; the media must never free-run');
  assert.ok(start.time<.1,'first paint holds the seed');
  assert.ok(start.duration>25&&start.duration<25.3,'the existing complete Drive master is used');
  assert.deepEqual([start.box.x,start.box.y,start.box.width,start.box.height],[0,0,1920,1080]);
  assert.equal(await page.locator('.resolve-tree').evaluate(tree=>getComputedStyle(tree).opacity),'1','the growth layer must cover the tree without mutating it');
  const stacking=await page.evaluate(()=>({film:Number(getComputedStyle(document.querySelector('[data-growth-intro]')).zIndex),tree:Number(getComputedStyle(document.querySelector('.resolve-tree')).zIndex)}));
  assert.ok(stacking.film>stacking.tree,`the opaque seed film must cover the fixed tree, got ${JSON.stringify(stacking)}`);

  await page.evaluate(()=>window.sdforestResolve.seek(-3));
  const forward=await film.evaluate(video=>video.currentTime);
  assert.ok(forward>12&&forward<16,`middle scroll must reach middle growth, got ${forward}`);
  assert.equal(await page.locator('.resolve-tree').evaluate(tree=>getComputedStyle(tree).opacity),'1','film growth must not alter the fixed tree');
  await page.evaluate(()=>window.sdforestResolve.seek(-5));
  const reverse=await film.evaluate(video=>video.currentTime);
  assert.ok(reverse>2&&reverse<7&&reverse<forward,'reverse scroll must reverse the same footage');

  const treeBefore=await page.locator('.resolve-tree').boundingBox();
  await page.evaluate(()=>window.sdforestResolve.seek(-.25));
  const handoffOpacity=Number(await page.locator('[data-growth-intro]').evaluate(intro=>getComputedStyle(intro).opacity));
  assert.ok(handoffOpacity>.65&&handoffOpacity<.85,`the film must remain dominant at midpoint to avoid a double-tree overlay, got ${handoffOpacity}`);
  const filmHandoff=await film.boundingBox();
  assert.ok(filmHandoff.x<=0&&filmHandoff.y<=0&&filmHandoff.x+filmHandoff.width>=1920&&filmHandoff.y+filmHandoff.height>=1080,`the final film reframe must cover the viewport, got ${JSON.stringify(filmHandoff)}`);
  await page.evaluate(()=>window.sdforestResolve.seek(0));
  assert.equal(await film.evaluate(video=>getComputedStyle(video.closest('[data-growth-intro]')).visibility),'hidden');
  assert.equal(await page.locator('.resolve-tree').evaluate(tree=>getComputedStyle(tree).opacity),'1');
  assert.deepEqual(await page.locator('.resolve-tree').boundingBox(),treeBefore,'the film handoff must not alter the tree geometry contract');
  await page.close();
});

test('the growth film keeps seed and mature subjects in frame on a portrait phone', async () => {
  const page=await pageAt('',{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const film=page.locator('[data-growth-film]');
  await film.evaluate(video=>new Promise(resolve=>video.readyState>=1?resolve():video.addEventListener('loadedmetadata',resolve,{once:true})));
  assert.equal(await film.evaluate(video=>getComputedStyle(video).objectPosition),'50% 50%');
  await page.evaluate(()=>window.sdforestResolve.seek(-.25));
  const focus=await film.evaluate(video=>getComputedStyle(video).objectPosition);
  assert.match(focus,/2[3-9]% 50%/,'the final left-side tree must be reframed into the portrait viewport');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.close();
});

test('failed growth media releases the intro and leaves native pool navigation usable', async () => {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/growth-scroll.mp4',route=>route.abort());
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.resolveState==='opened');
  assert.equal(await page.locator('[data-growth-intro]').evaluate(e=>getComputedStyle(e).visibility),'hidden');
  assert.equal(await page.locator('[data-pool-link]').count(),7);
  assert.ok(await page.locator('[data-pool-link="health"]').isVisible());
  await page.close();
});

test('reduced motion and no JavaScript never gate the homepage behind the growth film', async () => {
  for(const options of [{reducedMotion:'reduce'},{javaScriptEnabled:false}]) {
    const page=await pageAt('',options);
    assert.equal(await page.locator('[data-growth-intro]').evaluate(e=>getComputedStyle(e).display),'none');
    assert.equal(await page.locator('[data-pool-link]').count(),7);
    assert.ok(await page.locator('[data-pool-link="health"]').isVisible());
    await page.close();
  }
});
test('pending or failed background planes cannot block the tree or opened navigation', async () => {
  for (const failure of [false,true]) {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    let release;const gate=new Promise(resolve=>release=resolve);
    await page.route(/\/(?:sky|sunset|mist|landscape)\.png$|\/sdforest-sunset\/(?:valley|mist)\.webp$/,async route=>{
      if(failure) await route.abort();
      else {await gate;await route.continue();}
    });
    await page.goto(base+'/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.sdforestResolve);
    const decoded=await page.locator('.resolve-tree image').evaluate(async e=>{
      const image=new Image();image.src=e.href.baseVal;await image.decode();return image.naturalWidth;
    });
    assert.ok(decoded>=1200,'the high-resolution tree loads independently of background planes');
    await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
    await page.waitForFunction(()=>document.documentElement.dataset.resolveState==='opened');
    assert.equal(await opacity(page,'.resolve-world'),0);
    assert.equal(await page.locator('[data-pool-link]').evaluateAll(es=>es.every(e=>!e.inert && Number(getComputedStyle(e).opacity)===1)),true);
    assert.deepEqual(errors,[]);
    release();await page.unrouteAll({behavior:'wait'});
    await page.close();
  }
});
