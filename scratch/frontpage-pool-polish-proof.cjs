const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const out=process.env.SDFOREST_PROOF_DIR;
if(!out)throw Error('SDFOREST_PROOF_DIR required');
const base=process.env.SDFOREST_BASE_URL||'http://127.0.0.1:4176';
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  const rows=[];
  try {
    const context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:out,size:{width:1920,height:1080}}});
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/?frame=opened',{waitUntil:'networkidle'});
    const tree=await page.locator('.resolve-tree').boundingBox();
    await page.screenshot({path:path.join(out,'desktop.png')});
    const ids=await page.locator('[data-pool-link]').evaluateAll(es=>es.map(e=>e.dataset.poolLink));
    for(const id of ids){
      const link=page.locator(`[data-pool-link="${id}"]`);
      await page.mouse.move(960,80);await page.waitForTimeout(1200);
      await link.screenshot({path:path.join(out,`${id}-idle.png`)});
      await link.hover();await page.waitForTimeout(id==='artificial-self'?140:650);
      await link.screenshot({path:path.join(out,`${id}-hover.png`)});
      const drawerClip=await link.evaluate(e=>{
        const a=e.getBoundingClientRect(),b=e.querySelector('.portal-reveal').getBoundingClientRect();
        const x=Math.max(0,Math.min(a.left,b.left)-6),y=Math.max(0,Math.min(a.top,b.top)-6);
        return {x,y,width:Math.min(innerWidth,Math.max(a.right,b.right)+6)-x,height:Math.min(innerHeight,Math.max(a.bottom,b.bottom)+6)-y};
      });
      await page.screenshot({path:path.join(out,`${id}-drawer.png`),clip:drawerClip});
      if(id==='health') {
        const clip=await link.boundingBox();
        const cdp=await page.context().newCDPSession(page);
        await page.waitForFunction(()=>document.querySelector('[data-ecg-qrs]').style.opacity==='1');
        await cdp.send('Emulation.setVirtualTimePolicy',{policy:'pause'});
        const shot=await cdp.send('Page.captureScreenshot',{format:'png',clip:{...clip,scale:1}});
        fs.writeFileSync(path.join(out,'health-sharp-beat.png'),Buffer.from(shot.data,'base64'));
        await cdp.send('Emulation.setVirtualTimePolicy',{policy:'advance'});
        await cdp.detach();
      }
      await page.waitForTimeout(900);await page.mouse.down();await page.waitForTimeout(90);
      await link.screenshot({path:path.join(out,`${id}-press.png`)});
      await page.mouse.up();await page.waitForTimeout(100);
      await link.screenshot({path:path.join(out,`${id}-click.png`)});
      await page.waitForTimeout(1300);
      rows.push({id,armed:await link.getAttribute('data-armed'),treeUnchanged:JSON.stringify(await page.locator('.resolve-tree').boundingBox())===JSON.stringify(tree),housingTransform:await link.locator('.portal-art').evaluate(e=>getComputedStyle(e).transform)});
      await page.keyboard.press('Escape');
    }
    const video=page.video();await context.close();await video.saveAs(path.join(out,'pool-polish-desktop.webm'));
    const views=[];
    for(const [name,width,height] of [['desktop-still',1920,1080],['phone',390,844],['narrow',320,568],['landscape',780,390]]){
      const mobile=await browser.newPage({viewport:{width,height},isMobile:width<800,hasTouch:width<800,reducedMotion:'reduce'});
      await mobile.goto(base+'/?frame=opened',{waitUntil:'networkidle'});
      await mobile.screenshot({path:path.join(out,`${name}.png`)});
      if(name==='phone')await mobile.screenshot({path:path.join(out,'phone-full.png'),fullPage:true});
      views.push(await mobile.evaluate(()=>({width:innerWidth,height:innerHeight,tree:document.querySelector('.resolve-tree').getBoundingClientRect().toJSON(),visible:[...document.querySelectorAll('[data-pool-link]')].filter(e=>{const b=e.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight;}).length,total:document.querySelectorAll('[data-pool-link]').length,overflow:document.documentElement.scrollWidth>innerWidth})));
      await mobile.close();
    }
    fs.writeFileSync(path.join(out,'measurements.json'),JSON.stringify({rows,views,errors},null,2));
    console.log(JSON.stringify({rows,views,errors,out},null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
