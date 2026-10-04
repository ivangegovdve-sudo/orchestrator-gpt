// Literal RGB proof: frozen page -> encoded last frame -> Chromium video display.
const { chromium }=require('playwright-core');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const assert=require('node:assert/strict');
const base=process.env.SDFOREST_BASE_URL||'http://127.0.0.1:4580';
const assets=path.resolve('web/assets/sdforest-intro');
const out=path.resolve('docs/sdforest-pipeline-evidence/video');
const lock=JSON.parse(fs.readFileSync(path.join(assets,'final-frame-lock.json')));
let browser;
const raw=(file,width,height)=>{
  const result=spawnSync('ffmpeg',['-v','error','-i',file,'-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','-'],{maxBuffer:width*height*4});
  assert.equal(result.status,0,String(result.stderr));return result.stdout;
};
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  browser=await chromium.launch({headless:true,args:['--disable-gpu','--force-color-profile=srgb'],executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const evidence=[];
  for(const frame of lock.frames){
    const video=frame.name==='desktop'?'growth-scroll.mp4':'growth-scroll-phone.mp4';
    const decoded=path.join(out,`${frame.name}-decoded-final.png`);
    const result=spawnSync('ffmpeg',['-y','-v','error','-sseof','-0.05','-i',path.join(assets,video),'-frames:v','1',decoded],{encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    const reference=raw(path.join(assets,frame.file),frame.width,frame.height);
    assert.ok(raw(decoded,frame.width,frame.height).equals(reference),`${video}: decoded last frame must equal locked page`);
    const page=await browser.newPage({viewport:{width:frame.width,height:frame.height},deviceScaleFactor:1});
    await page.goto(`${base}/?frame=opened`,{waitUntil:'networkidle'});
    const seeks=await page.evaluate(async src=>{
      await document.fonts.ready;
      window.sdforestResolve.freeze();
      const video=document.createElement('video');video.muted=true;video.preload='auto';
      video.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;object-fit:fill;z-index:2147483647;background:#000;pointer-events:none';
      document.body.append(video);
      const ready=new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=()=>reject(new Error('Video decoder failed'));});
      video.src=src;await ready;
      const seeks=[];
      const seek=async time=>{
        const start=performance.now();
        await new Promise((resolve,reject)=>{
          const timeout=setTimeout(()=>reject(new Error(`Video seek stalled at ${time}`)),10000);
          video.onseeked=()=>{clearTimeout(timeout);resolve();};
          video.onerror=()=>{clearTimeout(timeout);reject(new Error('Video decoder failed during seeking'));};
          video.currentTime=time;
        });
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        seeks.push({time,elapsedMs:Math.round((performance.now()-start)*10)/10,readyState:video.readyState});
      };
      // Exercise forward, backward and the lossy→lossless keyframe boundary.
      for(const time of [3,8,5,(287/24),video.duration-1/24])await seek(time);
      return seeks;
    },`/web/assets/sdforest-intro/${video}`);
    const screenshot=path.join(out,`${frame.name}-browser-final.png`);
    await page.screenshot({path:screenshot});
    assert.ok(raw(screenshot,frame.width,frame.height).equals(reference),`${video}: browser video pixels must equal locked page`);
    assert.ok(seeks.every(seek=>seek.readyState>=2),`${video}: every seek has a decoded frame`);
    evidence.push({name:frame.name,video,decodedDifferentPixels:0,browserDifferentPixels:0,width:frame.width,height:frame.height,seeks});
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({base,method:'RGB24 equality, FFmpeg decoder and Chrome screenshot at final video sample',evidence},null,2)+'\n');
  console.log('Desktop and phone video final frames are pixel-identical to the locked page in decoder and Chromium.');
})().catch(async error=>{await browser?.close();console.error(error);process.exitCode=1;});
