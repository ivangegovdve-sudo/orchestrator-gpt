// Material parts are cropped regions of the original control artwork, not redrawn icons.
// This module has no clock: the resolve controller supplies every sample.
import { windAt } from './frontpage-ambient.mjs';
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
    const fragments={};
    const holes=[];
    for(const [name,l,t,r,b] of artworkParts[link.dataset.poolLink]) {
      const fragment=image.cloneNode();
      fragment.src=`/web/assets/sdforest-workbench/${link.dataset.poolLink}-${name}.webp`;
      fragment.removeAttribute('fetchpriority');
      fragment.className='workbench-part';
      fragment.dataset.workbenchPart=name;
      fragment.addEventListener('error',()=>{ image.style.clipPath=''; fragment.hidden=true; });
      Object.assign(fragment.style,{left:`${l}%`,top:`${t}%`,width:`${r-l}%`,height:`${b-t}%`,transformOrigin:'50% 100%'});
      if(name==='lever') fragment.style.transformOrigin='50% 8%';
      if(name.startsWith('shutter')) fragment.style.transformOrigin=`${name.endsWith('left')?90:10}% 50%`;
      if(/^(flag|lever|pin-|shutter)/.test(name)) {
        // Cut the original part out, so a moving lever cannot leave a second lever behind.
        holes.push(`${l}% ${t}%,${r}% ${t}%,${r}% ${b}%,${l}% ${b}%,${l}% ${t}%,0% 0%`);
      }
      art.append(fragment);fragments[name]=fragment;
    }
    if(holes.length) image.style.clipPath=`polygon(evenodd,0% 0%,100% 0%,100% 100%,0% 100%,0% 0%,${holes.join(',')})`;
    const node={link,fragments,hover:false,focus:false,selected:false,value:0,from:0,target:0,start:0};
    const update=()=>{
      node.from=node.value;node.target=node.selected ? 1 : node.hover || node.focus ? .28 : 0;
      node.start=readClock();invalidate();
    };
    link.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){node.hover=true;update();}});
    link.addEventListener('pointerleave',()=>{node.hover=false;update();});
    link.addEventListener('focus',()=>{node.focus=true;update();});
    link.addEventListener('blur',()=>{node.focus=false;update();});
    node.update=update;return node;
  });
  const far=stage.querySelector('.workbench-horizon');
  let moving=false, pointerX=0, pointerY=0, x=0, y=0;
  let viewport={width:innerWidth,height:innerHeight};
  stage.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse') return;
    pointerX=(event.clientX/viewport.width-.5)*8;
    pointerY=(event.clientY/viewport.height-.5)*4;
    invalidate();
  },{passive:true});
  stage.addEventListener('pointerleave',()=>{pointerX=pointerY=0;invalidate();});
  return {
    resize() { viewport={width:innerWidth,height:innerHeight}; },
    select(link) {
      for(const node of nodes) {
        const next=node.link===link;
        if(next!==node.selected){node.selected=next;node.update();}
      }
    },
    busy() { return moving; },
    render(seconds,strength,animate=true) {
      moving=false;
      const gust=windAt(seconds)*strength;
      for(const node of nodes) {
        const p=animate ? smooth((seconds-node.start)/.36) : 1;
        node.value=node.from+(node.target-node.from)*p;
        if(p<1 && Math.abs(node.value-node.target)>.001) moving=true;
        const press=node.value, f=node.fragments;
        const transform=(name,value)=>{if(f[name])f[name].style.transform=value;};
        const opacity=(name,value)=>{if(f[name])f[name].style.opacity=String(value);};
        switch(node.link.dataset.poolLink) {
          case 'health':
            opacity('pulse',.4+.25*windAt(seconds-1)*strength+.25*press);
            break;
          case 'ai-d-kit':
            transform('lever',`translateY(${press*5}px) scaleY(${1-press*.14})`);
            transform('flag',`perspective(500px) rotateX(${-press*28+gust*.5}deg)`);break;
          case 'growingapp':
            ['seed','sapling','tree'].forEach((name,i)=>opacity(name,.2+.3*(windAt(seconds-i*1.1)*strength+1)+press*.3));break;
          case 'tinkerbox':
            transform('pin-left',`translateX(${-press*10-gust*.25}px)`);
            transform('pin-right',`translateX(${press*10+gust*.25}px)`);break;
          case 'design-gallery':
            transform('shutter-left',`perspective(500px) rotateY(${-press*24+gust*.5}deg)`);
            transform('shutter-right',`perspective(500px) rotateY(${press*24-gust*.5}deg)`);break;
          case 'artificial-self':
            opacity('neuron-left',.4+.25*windAt(seconds-1.4)*strength+.25*press);
            opacity('neuron-right',.4+.25*windAt(seconds-3.2)*strength+.25*press);break;
          case 'my-story':opacity('signal',.25+.2*(gust+1)+.25*press);break;
        }
      }
      const targetX=animate ? pointerX : 0,targetY=animate ? pointerY : 0;
      x=animate ? x+(targetX-x)*.18 : 0;y=animate ? y+(targetY-y)*.18 : 0;
      if(Math.abs(x-targetX)>.05 || Math.abs(y-targetY)>.05)moving=true;
      far.style.transform=`translate3d(${x+gust*.3}px,${y}px,0)`;
    }
  };
}
