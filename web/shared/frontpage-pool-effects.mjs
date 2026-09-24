// Original, code-native display instruments. The resolve controller owns time.
// Painted frames remain unchanged; these paths are independent animation layers.
const NS='http://www.w3.org/2000/svg';
const fract=x=>x-Math.floor(x);
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const p=clamp(x);return p*p*(3-2*p);};
const painted=new WeakMap();
export function paint(element,property,value) {
  if(!element)return;
  const next=String(value).replace(/-?\d+\.\d{4,}/g,n=>String(Math.round(Number(n)*1000)/1000));
  let previous=painted.get(element);
  if(!previous){previous={};painted.set(element,previous);}
  if(previous[property]===next)return;
  element.style[property]=next;previous[property]=next;
}
const wires=[
  [[297,196],[403,176],[408,272],[568,203]],
  [[568,203],[679,285],[696,161],[838,220]],
  [[297,196],[257,126],[218,182],[150,155]],
  [[297,196],[295,254],[329,243],[360,288]],
  [[568,203],[547,139],[517,158],[483,109]],
  [[838,220],[882,181],[907,199],[951,149]],
  [[838,220],[862,260],[908,256],[938,290]]
];
function curve(points,t) {
  const u=1-t;
  return [0,1].map(axis=>u*u*u*points[0][axis]+3*u*u*t*points[1][axis]+3*u*t*t*points[2][axis]+t*t*t*points[3][axis]);
}
function svg(className,markup) {
  const el=document.createElementNS(NS,'svg');
  el.setAttribute('class',className);el.setAttribute('viewBox','0 0 1100 458');
  el.setAttribute('aria-hidden','true');el.setAttribute('focusable','false');
  el.innerHTML=markup;return el;
}
export function createPoolEffects(id,art) {
  let element;
  if(id==='health') {
    const wave=Array.from({length:5},(_,i)=>{
      const x=i*300;
      return `L${x+45} 55 Q${x+59} 42 ${x+69} 55 L${x+94} 55 L${x+106} 64 L${x+118} 12 L${x+130} 86 L${x+141} 46 L${x+152} 55 L${x+174} 55 Q${x+196} 34 ${x+216} 55 L${x+300} 55`;
    }).join(' ');
    element=document.createElement('span');element.className='pool-instrument ecg-instrument';
    element.innerHTML=`<span class="ecg-screen"><span data-ecg-wave><svg viewBox="0 0 900 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 55 ${wave}"/></svg></span><span data-ecg-flat><svg viewBox="0 0 600 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 55H600"/></svg></span></span>`;
  } else if(id==='artificial-self') {
    element=document.createElement('span');element.className='pool-instrument neural-instrument';
    element.append(svg('neural-wires',wires.map(p=>`<path class="neural-wire" d="M${p[0]}C${p[1]} ${p[2]} ${p[3]}"/>`).join('')));
    element.insertAdjacentHTML('beforeend',wires.map((p,i)=>`<i data-neural-impulse="${i}"></i>`).join('')+
      [[297,196],[568,203],[838,220]].map(([x,y],i)=>`<i data-neural-core="${i}" style="left:${x/11}%;top:${y/4.58}%"></i>`).join(''));
  } else if(id==='my-story') {
    element=document.createElement('span');element.className='pool-instrument signal-instrument';
    element.innerHTML=[199,387,580,779].map((x,i)=>`<i data-signal-node="${i}" style="left:${x/11}%"></i>`).join('')+'<i data-signal-head></i>';
  } else if(id==='design-gallery') {
    element=document.createElement('span');element.className='pool-instrument exhibit-light';
  }
  if(element)art.append(element);
  const wave=element?.querySelector('[data-ecg-wave]');
  const flat=element?.querySelector('[data-ecg-flat]');
  const impulses=[...element?.querySelectorAll('[data-neural-impulse]')||[]];
  const cores=[...element?.querySelectorAll('[data-neural-core]')||[]];
  const signals=[...element?.querySelectorAll('[data-signal-node]')||[]];
  const head=element?.querySelector('[data-signal-head]');
  let phase=.17,previous=null,energy=0;
  let width=art.clientWidth,height=art.clientHeight;
  return {
    resize() {width=art.clientWidth;height=art.clientHeight;},
    render(seconds,press,engaged,selected,animate) {
      const dt=previous===null?0:Math.max(0,Math.min(.1,seconds-previous));previous=seconds;
      energy=animate ? energy+(Number(engaged)-energy)*Math.min(1,dt*7) : 0;
      phase=animate ? phase+dt*(1.2+energy*(id==='health'?1.05:3.6)) : .17;
      if(wave) {
        paint(wave,'transform',`translate3d(${-fract(phase)*100/3}%,0,0)`);
        paint(wave,'opacity',selected?0:1);paint(flat,'opacity',selected?1:0);
      }
      impulses.forEach((impulse,i)=>{
        const cycle=fract(phase/3.9+i*.137);
        const travel=clamp(cycle/(.22+energy*.28));
        const point=curve(wires[i],selected && i!==0 ? 1-travel : travel);
        paint(impulse,'transform',`translate3d(${point[0]/1100*width}px,${point[1]/458*height}px,0)`);
        paint(impulse,'opacity',animate ? smooth(travel*10)*smooth((1-travel)*8)*(.48+energy*.4) : 0);
      });
      cores.forEach((core,i)=>{
        const pulse=animate ? Math.max(0,1-fract(phase/3.9+i*.137)*8) : 0;
        paint(core,'opacity',selected ? .9 : .28+pulse*(.3+energy*.35));
        paint(core,'transform',`translate(-50%,-50%) scale(${1+press*.2+pulse*.13})`);
      });
      signals.forEach((signal,i)=>{
        const p=fract(phase/8);
        const near=Math.max(0,1-Math.abs(p-i/3)*7);
        paint(signal,'opacity',.08+i*.18+(animate?near*.22:0)+(selected&&i===3?.3:0));
      });
      if(head) {paint(head,'transform',`translate3d(${fract(phase/8)*580/1100*width}px,0,0)`);paint(head,'opacity',animate?.48:0);}
      if(id==='design-gallery')paint(element,'opacity',.08+energy*.18+press*.18);
      return {phase,energy};
    }
  };
}
