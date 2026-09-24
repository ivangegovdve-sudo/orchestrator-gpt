// Material parts are cropped regions of the original control artwork, not redrawn icons.
// This module has no clock: the resolve controller supplies every sample.
import { windAt } from './frontpage-ambient.mjs';
import { createPoolEffects, paint } from './frontpage-pool-effects.mjs';
import { createVines } from './frontpage-vines.mjs';
const smooth = value => { const p=Math.max(0,Math.min(1,value)); return p*p*(3-2*p); };
export const artworkParts = {
  health:[['pulse',12,24,88,65]],
  'ai-d-kit':[['flag',25.4,13.2,59.5,52],['lever',68.1,21.6,81.9,76.3]],
  growingapp:[['seed',21.7,21.5,39.6,59.1],['sapling',41.1,21.5,58.5,59.1],['tree',60.1,21.5,77.8,59.1]],
  tinkerbox:[['pin-left',17.7,20.4,25.8,72],['pin-right',74.1,20.4,82.5,72]],
  'design-gallery':[['shutter-left',12,26.1,23,75.4],['shutter-right',77,26.1,88,75.4]],
  'artificial-self':[['neuron-left',11,23,40,66],['neuron-right',60,23,89,66]],
  'my-story':[['signal',68.3,32.1,73.5,52.7]]
};

export function createWorkbench(stage,invalidate,readClock) {
  const nodes=[...stage.querySelectorAll('[data-pool-link]')].map(link=>{
    const art=link.querySelector('.portal-art');
    const image=art.querySelector('img');
    image.classList.add('workbench-base');
    const fragments={};
    const holes=[];
    for(const [name,l,t,r,b] of artworkParts[link.dataset.poolLink]) {
      if(link.dataset.poolLink==='health' || link.dataset.poolLink==='artificial-self' || link.dataset.poolLink==='my-story') continue;
      const fragment=image.cloneNode();
      fragment.src=`/web/assets/sdforest-workbench/${link.dataset.poolLink}-${name}.webp`;
      fragment.removeAttribute('fetchpriority');
      fragment.className='workbench-part';
      fragment.dataset.workbenchPart=name;
      fragment.addEventListener('error',()=>{ image.style.clipPath=''; fragment.hidden=true; });
      Object.assign(fragment.style,{left:`${l}%`,top:`${t}%`,width:`${r-l}%`,height:`${b-t}%`,transformOrigin:'50% 100%'});
      if(name==='lever') fragment.style.transformOrigin='50% 8%';
      if(name==='flag') fragment.style.transformOrigin='50% 50%';
      if(name.startsWith('shutter')) fragment.style.transformOrigin=`${name.endsWith('left')?90:10}% 50%`;
      if(/^(flag|lever|pin-|shutter)/.test(name)) {
        // Cut the original part out, so a moving lever cannot leave a second lever behind.
        holes.push(`${l}% ${t}%,${r}% ${t}%,${r}% ${b}%,${l}% ${b}%,${l}% ${t}%,0% 0%`);
        const socket=document.createElement('span');socket.className='workbench-socket';
        Object.assign(socket.style,{left:`${l}%`,top:`${t}%`,width:`${r-l}%`,height:`${b-t}%`});
        art.insertBefore(socket,image);
      }
      art.append(fragment);fragments[name]=fragment;
    }
    if(link.dataset.poolLink==='tinkerbox') {
      const lid=document.createElement('span');lid.className='workbench-lid';lid.dataset.workbenchLid='';
      const texture=image.cloneNode();texture.className='';texture.removeAttribute('fetchpriority');
      lid.append(texture);art.append(lid);fragments.lid=lid;
      const socket=document.createElement('span');socket.className='workbench-socket workbench-lid-socket';art.insertBefore(socket,image);
      holes.push('26% 21%,74% 21%,74% 79%,26% 79%,26% 21%,0% 0%');
    }
    if(holes.length) image.style.clipPath=`polygon(evenodd,0% 0%,100% 0%,100% 100%,0% 100%,0% 0%,${holes.join(',')})`;
    const effects=createPoolEffects(link.dataset.poolLink,art);
    const reveal=link.querySelector('.portal-reveal');
    const cover=document.createElement('span');cover.className='portal-reveal-cover';cover.setAttribute('aria-hidden','true');reveal.append(cover);
    const node={link,art,effects,fragments,reveal,cover,peek:0,peekFrom:0,peekTarget:0,peekStart:0,visible:true,hover:false,focus:false,selected:false,held:false,hitStart:-Infinity,value:0,from:0,target:0,start:0};
    const update=()=>{
      node.from=node.value;node.target=node.selected ? 1 : node.hover || node.focus ? .28 : 0;
      node.start=readClock();
      invalidate();
      link.dataset.effectState=node.selected?'selected':node.hover||node.focus?'engaged':'idle';
    };
    link.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){node.hover=true;update();}});
    link.addEventListener('pointerleave',()=>{node.hover=false;update();});
    link.addEventListener('focus',()=>{node.focus=true;update();});
    link.addEventListener('blur',()=>{node.focus=false;update();});
    const release=()=>{if(node.held){node.held=false;invalidate();}};
    link.addEventListener('pointerdown',event=>{
      if(event.isPrimary && event.button===0){node.held=true;invalidate();}
    });
    link.addEventListener('pointercancel',()=>{node.hitStart=-Infinity;release();});
    link.addEventListener('pointerleave',release);
    document.addEventListener('pointerup',release);
    link.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.repeat){node.held=true;invalidate();}});
    link.addEventListener('keyup',release);
    link.addEventListener('blur',release);
    node.update=update;return node;
  });
  const visiblePools=new IntersectionObserver(entries=>{
    for(const entry of entries)nodes.find(node=>node.link===entry.target).visible=entry.isIntersecting;
  });
  nodes.forEach(node=>visiblePools.observe(node.link));
  // Layout is measured only when a drawer's content/font/viewport changes, never
  // by the animation clock. Reserve its actual height in flowing phone layouts.
  const drawerSizes=new ResizeObserver(entries=>{
    for(const entry of entries) {
      const height=entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height;
      entry.target.parentElement.style.setProperty('--reveal-height',`${Math.ceil(height)}px`);
    }
  });
  nodes.forEach(node=>drawerSizes.observe(node.reveal));
  const far=stage.querySelector('.workbench-horizon');
  const mist=stage.querySelector('.workbench-mist');
  const vines=createVines(stage,invalidate);
  let moving=false, pointerX=0, pointerY=0, x=0, y=0, lastEnvironment=-Infinity;
  let viewport={width:innerWidth,height:innerHeight};
  let drag=null, enabled=false;
  const bounded=value=>Math.max(-1,Math.min(1,value));
  const interactive=target=>target.closest('a,button,input,select,textarea,[contenteditable]');
  const release=()=>{
    if(drag && stage.hasPointerCapture(drag.id))stage.releasePointerCapture(drag.id);
    drag=null;delete stage.dataset.worldDragging;
  };
  stage.addEventListener('pointerdown',event=>{
    if(!enabled || !event.isPrimary || event.button!==0 || interactive(event.target))return;
    drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,x:pointerX,y:pointerY};
    // Touch remains browser-owned: vertical swipes scroll and cancel the gesture.
    if(event.pointerType==='mouse')stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove',event=>{
    if(!enabled)return;
    if(drag && drag.id===event.pointerId) {
      const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
      if(event.pointerType!=='mouse' && Math.abs(dy)>Math.abs(dx) && Math.abs(dy)>8){release();return;}
      if(Math.abs(dx)+Math.abs(dy)>4)stage.dataset.worldDragging='true';
      pointerX=bounded(drag.x+dx/300);pointerY=bounded(drag.y+dy/240);
      invalidate();return;
    }
    if(event.pointerType!=='mouse') return;
    pointerX=bounded((event.clientX/viewport.width-.5)*2);
    pointerY=bounded((event.clientY/viewport.height-.5)*2);
    invalidate();
  },{passive:true});
  stage.addEventListener('pointerup',release);
  stage.addEventListener('pointercancel',release);
  stage.addEventListener('lostpointercapture',release);
  stage.addEventListener('pointerleave',()=>{if(!drag){pointerX=pointerY=0;invalidate();}});
  return {
    resize() { viewport={width:innerWidth,height:innerHeight};nodes.forEach(node=>node.effects.resize());vines.resize(); },
    select(link) {
      for(const node of nodes) {
        const next=node.link===link;
        if(next!==node.selected){node.selected=next;if(!next)node.hitStart=-Infinity;node.update();}
      }
    },
    activate(link) {
      const node=nodes.find(node=>node.link===link);
      if(node){node.hitStart=readClock();invalidate();}
    },
    busy() { return moving || vines.busy(); },
    engaged() {return vines.busy() || nodes.some(node=>node.visible && (node.hover||node.focus));},
    render(seconds,strength,animate=true) {
      enabled=animate;
      if(!animate){release();pointerX=pointerY=0;}
      moving=false;
      vines.render(seconds,strength,animate);
      const gust=windAt(seconds)*strength;
      const preview=nodes.find(node=>node.hover) || nodes.find(node=>node.focus) || nodes.find(node=>node.selected);
      for(const node of nodes) {
        const peekTarget=node===preview?1:0;
        if(peekTarget!==node.peekTarget){node.peekFrom=node.peek;node.peekTarget=peekTarget;node.peekStart=seconds;node.link.toggleAttribute('data-peek-open',peekTarget===1);}
        const peekProgress=animate?smooth((seconds-node.peekStart)/.28):1;
        node.peek=node.peekFrom+(node.peekTarget-node.peekFrom)*peekProgress;
        if(peekProgress<1 && Math.abs(node.peek-node.peekTarget)>.001)moving=true;
        paint(node.reveal,'opacity',node.peek);
        paint(node.reveal,'transform',`translateY(${(1-node.peek)*-6}px)`);
        paint(node.cover,'transform',`perspective(600px) rotateX(${node.peek*100}deg)`);
        paint(node.cover,'opacity',1-smooth((node.peek-.35)/.65));
        if(animate && !node.visible)continue;
        if(!animate){node.held=false;node.hitStart=-Infinity;}
        const p=animate ? smooth((seconds-node.start)/.36) : 1;
        node.value=animate ? node.from+(node.target-node.from)*p : node.selected ? 1 : 0;
        if(p<1 && Math.abs(node.value-node.target)>.001) moving=true;
        const press=node.value, f=node.fragments;
        const age=seconds-node.hitStart;
        if(animate && (node.held||age<1.4))moving=true;
        const effect=node.effects.render(seconds,press,node.hover||node.focus||node.selected,node.selected,animate,{age,held:node.held});
        const ready=smooth(press/.28), hit=effect.hit;
        const idle=animate?Math.sin(seconds*.8)*.35:0;
        const detent=animate && age>=.10 && age<.65 ? Math.sin((age-.10)*23)*Math.exp(-(age-.10)*8) : 0;
        const transform=(name,value)=>paint(f[name],'transform',value);
        const opacity=(name,value)=>paint(f[name],'opacity',value);
        switch(node.link.dataset.poolLink) {
          case 'ai-d-kit':
            transform('lever',`perspective(450px) rotateX(${-ready*12-hit*31+detent*3-idle}deg) translateY(${hit*1.8}px)`);
            transform('flag',`perspective(500px) rotateY(${press<=.28 ? ready*12 : 12+smooth((press-.28)/.72)*168}deg) rotateZ(${hit*1.2}deg)`);break;
          case 'growingapp':
            ['seed','sapling','tree'].forEach((name,i)=>{
              const phase=(effect.phase/7-i*.21)%1;
              const grow=animate?Math.max(0,Math.sin(phase*Math.PI*2))*.55:0;
              const step=animate?smooth((age-i*.13)/.06)*(1-smooth((age-i*.13-.15)/.35)):0;
              opacity(name,.65+grow*.2+step*.15);
              transform(name,`perspective(500px) rotateZ(${(grow-.2)*(i===0?3:i===1?-2:1.3)}deg) rotateY(${step*(i===0?12:5)}deg) translateY(${-grow*(1+i)-step*2}px) scale(${1+grow*.012+step*.035})`);
            });break;
          case 'tinkerbox':
            transform('pin-left',`translateX(${-smooth(ready/.45)*9-hit*2}px) rotateX(${ready*15+idle}deg)`);
            transform('pin-right',`translateX(${smooth((ready-.18)/.52)*9+hit*2}px) rotateX(${-ready*15-idle}deg)`);
            transform('lid',`perspective(500px) rotateX(${-smooth((ready-.7)/.3)*(14+smooth((press-.3)/.7)*16+hit*7-detent)}deg)`);break;
          case 'design-gallery':
            transform('shutter-left',`perspective(500px) rotateY(${-ready*26-smooth((press-.28)/.72)*38-hit*7+detent*1.4}deg)`);
            transform('shutter-right',`perspective(500px) rotateY(${smooth((ready-.18)/.82)*24+smooth((press-.28)/.72)*41+hit*7-detent}deg)`);break;
        }
      }
      const targetX=animate ? pointerX : 0,targetY=animate ? pointerY : 0;
      x=animate ? x+(targetX-x)*.18 : 0;y=animate ? y+(targetY-y)*.18 : 0;
      if(Math.abs(x-targetX)>.05 || Math.abs(y-targetY)>.05)moving=true;
      if(animate && !moving && seconds-lastEnvironment<.9)return;
      lastEnvironment=seconds;
      // Only the landscape within the opening changes viewpoint. The bark plate,
      // instrument housings and tree/contact are fixed, not another parallax plane.
      paint(far,'transform',`translate3d(${x*2}px,${y}px,0)`);
      if(mist) {
        paint(mist,'transform',`translate3d(${x*6+gust*.6}px,${y*3}px,0)`);
        paint(mist,'opacity',.12+gust*.018);
      }
    }
  };
}
