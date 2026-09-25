// Rendered evidence and editable vector-layer export. No publishing or new clock.
// Serve the repo, then set SDFOREST_PROOF_DIR and (optionally) CHROME_PATH.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const out=process.env.SDFOREST_PROOF_DIR;
if(!out)throw new Error('Set SDFOREST_PROOF_DIR to the evidence directory');
const base=process.env.SDFOREST_BASE_URL||'http://127.0.0.1:4176';
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try {
    const context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:out,size:{width:1920,height:1080}}});
    const page=await context.newPage();
    await page.goto(base+'/?frame=opened',{waitUntil:'networkidle'});
    await page.waitForTimeout(2400);
    await page.screenshot({path:path.join(out,'opened-desktop.png')});
    const ids=await page.locator('[data-pool-link]').evaluateAll(es=>es.map(e=>e.dataset.poolLink));
    const vine=await page.locator('[data-wind-vine]').first().boundingBox();
    await page.mouse.move(vine.x+vine.width/2,vine.y+vine.height*.75);
    await page.mouse.down();await page.mouse.move(vine.x+vine.width/2+120,vine.y+vine.height*.75,{steps:18});
    await page.waitForTimeout(300);await page.mouse.up();await page.waitForTimeout(2400);
    for(const id of ids) {
      const link=page.locator(`[data-pool-link="${id}"]`);
      await link.hover();await page.waitForTimeout(1800);
      await link.click();await page.waitForTimeout(650);
      await page.screenshot({path:path.join(out,`selected-${id}.png`)});
      await page.keyboard.press('Escape');
      await page.mouse.click(960,190);await page.waitForTimeout(350);
    }
    const vectors=await page.evaluate(()=>{
      const layers=[];
      const selectors=['[data-ecg-wave] svg','[data-ecg-flat] svg','.neural-wires','.ambient-soil-bridge svg','[data-wind-vine] svg','[data-wind-grass] svg'];
      for(const selector of selectors)document.querySelectorAll(selector).forEach((el,index)=>{
        const clone=el.cloneNode(true);clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
        const viewBox=el.viewBox.baseVal;
        clone.setAttribute('width',viewBox.width);clone.setAttribute('height',viewBox.height);
        const originals=[el,...el.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
        copies.forEach((copy,i)=>{
          const css=getComputedStyle(originals[i]);
          for(const property of ['fill','stroke','stroke-width','stroke-linecap','opacity'])copy.style.setProperty(property,css.getPropertyValue(property).replace(/url\(["']?[^)#]*#([^)'"\s]+)["']?\)/g,'url(#$1)'));
        });
        if(!clone.querySelector('defs'))clone.prepend(document.querySelector('.ambient-soil-bridge defs').cloneNode(true));
        // Parent placement/transform is documented separately; each SVG is an editable source plane.
        clone.style.removeProperty('transform');
        const name=selector.includes('ecg-wave')?'health-wave':selector.includes('ecg-flat')?'health-flat':selector.includes('neural')?'neural-wires':selector.includes('soil')?'soil':selector.includes('vine')?'vine':'grass';
        layers.push({name:`${name}-${index+1}.svg`,source:new XMLSerializer().serializeToString(clone)});
      });
      return layers;
    });
    const layers=path.join(out,'native-layers');fs.mkdirSync(layers,{recursive:true});
    for(const layer of vectors)fs.writeFileSync(path.join(layers,layer.name),layer.source);
    for(const name of ['frontpage-pool-effects.mjs','frontpage-workbench.mjs','frontpage-vines.mjs','frontpage-ambient.mjs','frontpage-resolve.mjs','frontpage-resolve.css']) {
      fs.copyFileSync(path.resolve(__dirname,'../web/shared',name),path.join(layers,name));
    }
    fs.copyFileSync(path.resolve(__dirname,'../docs/frontpage-correction-2026-09-24.md'),path.join(layers,'README.md'));
    await context.close();
    await page.video().saveAs(path.join(out,'pool-motion-desktop.webm'));
    const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await phone.goto(base+'/?frame=opened',{waitUntil:'networkidle'});
    await phone.screenshot({path:path.join(out,'opened-phone.png')});
    await phone.screenshot({path:path.join(out,'opened-phone-full.png'),fullPage:true});
    for(const id of ids) {
      await phone.locator(`[data-pool-link="${id}"]`).click();await phone.waitForTimeout(450);
      await phone.screenshot({path:path.join(out,`phone-selected-${id}.png`)});
    }
    await phone.close();
    console.log(JSON.stringify({vectors:vectors.length,desktopSelections:ids.length,phoneSelections:ids.length,output:out}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
