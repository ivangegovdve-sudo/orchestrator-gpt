import {createIntroScene,clamp} from './frontpage-intro-scene.mjs';
// The film contains the complete frozen page. Other viewport sizes use the same
// code compositor at their native geometry, so resizing cannot reveal a mismatch.
export function createGrowthIntro(stage,onProgress,onComplete,onTakeover) {
  const root=document.documentElement;
  const intro=stage.querySelector('[data-growth-intro]');
  const film=stage.querySelector('[data-growth-film]');
  stage.append(intro);
  const narration=new Audio('/web/assets/sdforest-intro/seed-to-forest.mp3');
  narration.preload='none';
  let scene=null,p=0,guide=false,id=0,last=null,ready=false,useFilm=false,enabled=false,fading=0,narrationAlignment=false;
  const voice=document.createElement('button');
  voice.type='button';voice.className='intro-voice-control';voice.textContent='Listen';voice.hidden=true;
  voice.setAttribute('aria-label','Play the intro word poem');stage.append(voice);
  const guideSeconds=14;
  function configureFilm() {
    const phone=innerWidth===390&&innerHeight===844;
    useFilm=phone||(innerWidth===1920&&innerHeight===1080);
    if(useFilm) {
      film.poster=`/web/assets/sdforest-intro/seed-poster-${phone?'phone':'desktop'}.png`;
      const src=`/web/assets/sdforest-intro/growth-scroll${phone?'-phone':''}.mp4`;
      if(film.getAttribute('src')!==src){film.src=src;film.load();}
    }
    intro.style.display=useFilm?'block':'none';
  }
  function prepare(){
    if(!enabled)return;
    if(ready)return;
    if(root.dataset.forestFinished!=='true'){requestAnimationFrame(prepare);return;}
    root.dataset.frameLocked='true';
    scene=createIntroScene(stage);ready=true;configureFilm();display(p);
  }
  function display(progress) {
    p=clamp(progress);if(!ready||!enabled)return;
    if(p<1)root.dataset.frameLocked='true';
    onProgress(p);
    root.dataset.growthPhase=p===1?'complete':p===0?'seed':'growing';
    if(useFilm) {
      // Keep the underlying page at the film's geometry, including its restored
      // final styles. A decoder failure can expose the native scene immediately.
      scene.render(p);intro.style.visibility=p===1?'hidden':'visible';
      const duration=Number.isFinite(film.duration)?film.duration:289/24;
      const target=p*Math.max(0,duration-1/24);
      if(film.readyState>=1&&Math.abs(film.currentTime-target)>1/48)film.currentTime=target;
      film.pause();
    }else scene.render(p);
    if(p===1){voice.hidden=true;root.removeAttribute('data-frame-locked');onComplete();}
  }
  function stopGuide(){guide=false;narrationAlignment=false;if(id)cancelAnimationFrame(id);id=0;last=null;}
  function fadeNarration(){
    cancelAnimationFrame(fading);
    const start=performance.now(),volume=narration.volume;
    const fade=now=>{narration.volume=clamp(volume*(1-(now-start)/350));if(now-start<350)fading=requestAnimationFrame(fade);else{narration.pause();fading=0;}};
    fading=requestAnimationFrame(fade);voice.hidden=true;
  }
  function takeover(rebase=true){if(!enabled||!guide)return;const exact=p;stopGuide();fadeNarration();if(rebase)onTakeover(exact);}
  for(const event of ['wheel','touchmove'])addEventListener(event,()=>takeover(),{passive:true});
  addEventListener('keydown',event=>{
    if(event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    if(event.key===' '&&event.target.closest('button,a'))return;
    if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))takeover();
  });
  function tick(stamp){
    id=0;if(!guide)return;
    if(!document.hidden&&ready){if(last!==null)p=clamp(p+Math.min((stamp-last)/1000,.1)/guideSeconds);display(p);}last=stamp;
    if(p<1)id=requestAnimationFrame(tick);else stopGuide();
  }
  function alignNarration(){
    if(!narrationAlignment||!guide||!enabled||!Number.isFinite(narration.duration))return;
    narration.currentTime=p*narration.duration;narrationAlignment=false;
  }
  function listen(align=false){
    // An explicit late Listen joins the current guide. Visibility resumes keep
    // the existing audio position, including any pending metadata alignment.
    if(align){narrationAlignment=true;alignNarration();}
    narration.volume=1;narration.play().then(()=>{if(!guide||!enabled)narration.pause();voice.hidden=true;}).catch(()=>{if(guide)voice.hidden=false;});
  }
  voice.addEventListener('click',()=>listen(true));
  narration.addEventListener('loadedmetadata',alignNarration);
  film.addEventListener('loadedmetadata',()=>display(p));
  film.addEventListener('error',()=>{useFilm=false;intro.style.display='none';display(p);});
  document.addEventListener('visibilitychange',()=>{last=null;if(document.hidden)narration.pause();else if(guide)listen();});
  return {
    start(){enabled=true;guide=true;root.dataset.growthPhase='seed';prepare();listen();id=requestAnimationFrame(tick);},
    seek(progress){enabled=true;stopGuide();fadeNarration();if(!ready)prepare();display(progress);},
    open(){enabled=false;stopGuide();fadeNarration();scene?.restore();intro.style.visibility='hidden';intro.style.display='none';root.dataset.growthPhase='complete';},
    resize(){if(!enabled)return;const exact=p;scene?.destroy();scene=createIntroScene(stage);configureFilm();display(exact);},
    takeover,
    get guided(){return guide;},get progress(){return p;},
  };
}
