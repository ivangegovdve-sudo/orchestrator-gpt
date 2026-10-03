// One native scroll timeline, an exact page/video handoff and fixed Option-A UI.
import { createAmbient } from './frontpage-ambient.mjs';
import { createWorkbench } from './frontpage-workbench.mjs';
import { createGrowthIntro } from './frontpage-growth.mjs';
import './pool-directory.mjs';
const root=document.documentElement;
const stage=document.querySelector('[data-resolve-stage]');
const directory=stage.querySelector('[data-pool-directory]');
const status=document.querySelector('#workbench-status');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const frame=new URLSearchParams(location.search).get('frame');
const reload=performance.getEntriesByType('navigation')[0]?.type==='reload';
const returning=sessionStorage.getItem('sdforest-home-entered')==='true'&&!reload;
let scrub=!reduced.matches&&!frame&&!location.hash&&!returning&&scrollY===0;
let elapsed=0,paused=false,current=5,selected=null,entryControl=null,frameId=0,lastStamp=null;
let visible=true,lastAmbient=-Infinity,lastInstrument=-Infinity;
const ambient=createAmbient(stage);
const motion=stage.querySelector('.resolve-motion-toggle');
const workbench=createWorkbench(stage,schedule,()=>elapsed);
const feedback=document.querySelector('button[aria-label="Send feedback"]');
if(feedback)stage.querySelector('.resolve-history').append(feedback);
for(const link of directory.querySelectorAll('[data-final-pool]'))directory.append(link);
function schedule(){if(!frameId&&!root.hasAttribute('data-frame-locked')&&!document.hidden&&visible&&current>=4.4&&!paused&&!reduced.matches)frameId=requestAnimationFrame(tick);}
function tick(stamp){
  frameId=0;
  if(root.hasAttribute('data-frame-locked')||document.hidden||!visible||current<4.4||paused||reduced.matches){lastStamp=null;return;}
  if(lastStamp!==null)elapsed+=Math.min((stamp-lastStamp)/1000,.1);
  lastStamp=stamp;
  if(stamp-lastAmbient>=900){ambient.render(elapsed,.65);lastAmbient=stamp;}
  if(stamp-lastInstrument>=1000/30){workbench.render(elapsed,.65,true);lastInstrument=stamp;}
  schedule();
}
function closeSelection(){selected?.classList.remove('is-selected');selected?.removeAttribute('aria-describedby');selected=null;entryControl?.remove();entryControl=null;status.textContent='';workbench.select(null);}
function paintOpened(){
  for(const node of stage.querySelectorAll('[data-arrival]')){node.style.opacity='1';node.style.visibility='visible';node.inert=false;}
  for(const node of directory.querySelectorAll('[data-pool-link]')){node.style.transform='translate(0px,0px) rotate(0deg) scale(1)';node.style.filter='blur(0px)';node.style.clipPath='none';}
  root.style.setProperty('--assembly-time','5');root.style.setProperty('--resolve-utilities','1');root.style.setProperty('--resolve-utilities-visibility','visible');
  stage.querySelector('.resolve-world').style.opacity='0';
  stage.querySelector('.resolve-tree').style.filter='drop-shadow(0 0 30px rgb(34 197 94 / 0.08))';
  ambient.compact(innerWidth<=800);ambient.reveal(5);
}
function finish(){
  // Align the native runway with the guide's endpoint before manual scrolling.
  // This keeps the next wheel event from restarting at the seed.
  if(growth.guided)scrollTo(0,runway());
  current=5;root.dataset.resolveState='opened';root.dataset.growthPhase='complete';
  sessionStorage.setItem('sdforest-home-entered','true');
  for(const node of stage.querySelectorAll('.resolve-scene,.resolve-directory,.resolve-controls,.resolve-history,[data-support-control]'))node.inert=false;
  root.removeAttribute('data-frame-locked');
  workbench.render(0,0,false);ambient.render(0,0);elapsed=0;lastStamp=null;
  schedule();
}
const growth=createGrowthIntro(stage,p=>{current=-6+11*p;root.style.setProperty('--assembly-time',String(current));root.dataset.resolveState=p===1?'opened':'dissolving';if(p<1){closeSelection();for(const node of stage.querySelectorAll('.resolve-scene,.resolve-directory,.resolve-controls,.resolve-history,[data-support-control]'))node.inert=true;}},finish,p=>{scrollTo(0,p*runway());});
function runway(){return Math.max(innerHeight,stage.parentElement.offsetHeight-stage.offsetHeight);}
function openStatic(){scrub=false;root.dataset.resolveMotion='static';growth.open();paintOpened();finish();}
function freeze(){
  openStatic();root.dataset.frameLocked='true';
  if(frameId)cancelAnimationFrame(frameId);frameId=0;
  elapsed=0;lastStamp=null;workbench.render(0,0,false);ambient.render(0,0);
}
function sample(seconds){
  if(!Number.isFinite(seconds))return;
  paintOpened();
  const p=Math.max(0,Math.min(1,(seconds+6)/11));
  current=-6+11*p;growth.seek(p);if(p===1)finish();
}
window.sdforestResolve=Object.freeze({seek:sample,open:openStatic,freeze,get time(){return current;}});
paintOpened();workbench.render(0,0,false);ambient.render(0,0);
motion.hidden=false;
root.dataset.resolveMotion=scrub?'scrub':'static';
if(scrub){root.dataset.resolveState='dissolving';current=-6;growth.start();}else{growth.open();finish();}
addEventListener('scroll',()=>{if(scrub){growth.takeover(false);sample(-6+11*Math.max(0,Math.min(1,scrollY/runway())));}},{passive:true});
addEventListener('resize',()=>{
  closeSelection();workbench.resize();
  if(scrub){const p=growth.progress;growth.resize();if(!growth.guided)scrollTo(0,p*runway());}
});
addEventListener('pageshow',event=>{if(event.persisted)openStatic();});
reduced.addEventListener('change',()=>{if(reduced.matches)openStatic();else schedule();});
document.addEventListener('visibilitychange',()=>{lastStamp=null;if(document.hidden){cancelAnimationFrame(frameId);frameId=0;}else schedule();});
new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);if(!visible){cancelAnimationFrame(frameId);frameId=0;lastStamp=null;}else schedule();}).observe(stage);
motion.addEventListener('click',()=>{paused=!paused;motion.textContent=paused?'Resume motion':'Pause motion';ambient.phase(paused?'paused':'running');if(paused){cancelAnimationFrame(frameId);frameId=0;lastStamp=null;}else schedule();});
for(const link of document.querySelectorAll('a[href="#atlas"]'))link.addEventListener('click',()=>{openStatic();directory.querySelector('[data-pool-link]').focus({preventScroll:true});});
directory.addEventListener('click',event=>{
  const link=event.target.closest('[data-pool-link]');
  if(!link||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();if(event.detail>1||selected===link)return;
  closeSelection();selected=link;link.classList.add('is-selected');link.setAttribute('aria-describedby','workbench-status');
  status.textContent=`${link.querySelector('.portal-name').textContent} selected. Choose Enter to open; Escape cancels.`;
  workbench.select(link);workbench.activate(link);
  const box=link.getBoundingClientRect(),base=directory.getBoundingClientRect();
  entryControl=document.createElement('a');entryControl.className='portal-enter';entryControl.href=link.href;entryControl.textContent='Enter';
  entryControl.setAttribute('aria-label',`Enter ${link.querySelector('.portal-name').textContent}`);
  entryControl.style.left=`${box.right-base.left-50}px`;entryControl.style.top=`${box.bottom-base.top-26}px`;
  // Immediately after the selected native anchor in tab order; visual position
  // remains relative to the nav, which is the containing block for both controls.
  link.after(entryControl);
  if(event.detail===0)entryControl.focus({preventScroll:true});
  if(paused||reduced.matches)workbench.render(elapsed,0,false);else schedule();
});
directory.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.repeat)event.preventDefault();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){const prior=selected;closeSelection();prior?.focus();}});
document.addEventListener('click',event=>{if(!event.target.closest('.resolve-directory'))closeSelection();});
