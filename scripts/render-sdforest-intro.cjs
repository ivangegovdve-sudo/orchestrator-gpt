// Step 3: animate the already locked live-page DOM. A changed composition refuses
// rendering until Step 2 is repeated. Intermediate frames stay outside the repo.
const { chromium }=require('playwright-core');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {normalizeFinalRaster,hashComposition}=require('./sdforest-raster.cjs');
const {encodeFrames}=require('./sdforest-encode.cjs');
const base=process.env.SDFOREST_BASE_URL || 'http://127.0.0.1:4580';
const root=path.resolve('web/assets/sdforest-intro');
const temp=path.resolve(process.env.SDFOREST_RENDER_OUT || path.join(os.tmpdir(),'sdforest-render'));
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const fps=24,frames=289;
const encodeExisting=process.argv.includes('--encode-existing');
let browser;
(async()=>{
  const lock=JSON.parse(fs.readFileSync(path.join(root,'final-frame-lock.json')));
  for(const [file,hash] of Object.entries(lock.compositionSources))if(hashComposition(file)!==hash)throw new Error(`Composition changed; repeat Step 2: ${file}`);
  if(!encodeExisting)browser=await chromium.launch({headless:true,args:['--disable-gpu','--force-color-profile=srgb'],executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const videos=[];
  for(const reference of lock.frames) {
    const dir=path.join(temp,reference.name);fs.mkdirSync(dir,{recursive:true});
    let page;
    const raw=file=>{const decoded=spawnSync('ffmpeg',['-v','error','-i',file,'-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','-'],{maxBuffer:reference.width*reference.height*4});if(decoded.status!==0)throw new Error(String(decoded.stderr));return decoded.stdout;};
    if(!encodeExisting) {
    page=await browser.newPage({viewport:{width:reference.width,height:reference.height},deviceScaleFactor:1});
    await page.goto(`${base}/?frame=opened`,{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(()=>window.sdforestResolve.freeze());
    await page.waitForTimeout(100);
    await normalizeFinalRaster(page);
    const preflight=path.join(dir,'preflight.png');
    await page.screenshot({path:preflight});
    if(!raw(preflight).equals(raw(path.join(root,reference.file))))throw new Error(`Preflight differs from locked page: ${reference.name}`);
    for(let index=0;index<frames;index++) {
      await page.evaluate(p=>window.forestRender.render(p),index/(frames-1));
      await page.screenshot({path:path.join(dir,`${String(index).padStart(4,'0')}.png`)});
      if(index%72===0)console.log(`${reference.name}: ${index}/${frames-1}`);
    }
    }
    const final=path.join(dir,`${String(frames-1).padStart(4,'0')}.png`);
    // PNG encoding can differ, so require equality of raw decoded RGB pixels.
    if(!raw(final).equals(raw(path.join(root,reference.file))))throw new Error(`Rendered final frame differs from locked page: ${reference.name}`);
    const file=reference.name==='desktop'?'growth-scroll.mp4':'growth-scroll-phone.mp4';
    const encoding=encodeFrames({dir,target:path.join(root,file),reference:path.join(root,reference.file),width:reference.width,height:reference.height,fps,frames});
    fs.copyFileSync(path.join(dir,'0000.png'),path.join(root,`seed-poster-${reference.name}.png`));
    videos.push({file,width:reference.width,height:reference.height,fps,frames,duration:frames/fps,...encoding,sha256:sha(path.join(root,file)),reference:reference.file});
    await page?.close();
  }
  await browser?.close();
  fs.writeFileSync(path.join(root,'video-render.json'),JSON.stringify({method:'code-rendered locked live-page DOM; no generated footage or paid service',fps,frames,videos},null,2)+'\n');
  console.log('Both videos rendered from the locked page.');
})().catch(async error=>{await browser?.close();console.error(error);process.exitCode=1});
