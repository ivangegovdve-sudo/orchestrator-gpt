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
const flash=(age,duration=.3)=>age<0 || age>duration ? 0 : Math.exp(-age*12)*(1-age/duration);
// A signal must reach the next soma before that soma can fire. Shared by the
// visible heads, their trailing charge and the receiving membrane highlights.
export function sampleNeuralCircuit(age) {
  const starts=[0,.4,.04,.12,.43,.82,.88];
  return {
    cores:[0,.4,.8].map(start=>flash(age-start)),
    travel:starts.map((start,i)=>clamp((age-start)/(i<2?.4:.24))),
    alive:starts.map((start,i)=>age>=start && age<start+(i<2?.48:.32))
  };
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
    element=document.createElement('span');element.className='pool-instrument ecg-instrument';
    const trace=d=>`<svg viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
    const lobes=[['p','M0 55H45L57 43L68 55H94','M0 55H94'],['qrs','M94 55H105L113 66L123 7L133 88L143 55H174','M94 55H174'],['t','M174 55H183L199 32L219 55H300','M174 55H300']];
    element.innerHTML=`<span class="ecg-screen"><span class="ecg-grid"></span><span data-ecg-wave>${lobes.map(([name,d,line])=>`<span class="ecg-rest" data-ecg-rest="${name}">${trace(line)}</span><span class="ecg-deflection" data-ecg-${name}>${trace(d)}</span>`).join('')}</span><span data-ecg-flat>${trace('M0 55H300')}</span><i class="ecg-beat-led"></i></span><i class="instrument-glass"></i>`;
  } else if(id==='artificial-self') {
    element=document.createElement('span');element.className='pool-instrument neural-instrument';
    element.append(svg('neural-wires',wires.map(p=>`<path class="neural-wire" d="M${p[0]}C${p[1]} ${p[2]} ${p[3]}"/>`).join('')));
    for(const [i,p] of wires.entries()) {
      const charge=document.createElement('span');charge.className='neural-charge';charge.dataset.neuralCharge=i;
      charge.append(svg('neural-wires',`<path d="M${p[0]}C${p[1]} ${p[2]} ${p[3]}"/>`));element.append(charge);
    }
    element.insertAdjacentHTML('beforeend',wires.map((p,i)=>`<i data-neural-impulse="${i}"></i><i data-neural-tail="${i}:1"></i><i data-neural-tail="${i}:2"></i>`).join('')+
      [[297,196],[568,203],[838,220]].map(([x,y],i)=>`<i data-neural-halo="${i}" style="left:${x/11}%;top:${y/4.58}%"></i><i data-neural-core="${i}" style="left:${x/11}%;top:${y/4.58}%"></i>`).join(''));
  } else if(id==='my-story') {
    element=document.createElement('span');element.className='pool-instrument signal-instrument';
    element.innerHTML='<i class="signal-channel"></i>'+[199,387,580,779].map((x,i)=>`<i data-signal-node="${i}" style="left:${x/11}%"></i>`).join('')+'<i data-signal-head></i>';
  } else if(id==='design-gallery') {
    element=document.createElement('span');element.className='pool-instrument exhibit-light';
  } else {
    element=document.createElement('span');element.className=`pool-instrument mechanism-light mechanism-light-${id}`;
  }
  if(element)art.append(element);
  const wave=element?.querySelector('[data-ecg-wave]');
  const deflections=['p','qrs','t'].map(part=>wave?.querySelector(`[data-ecg-${part}]`));
  const baselines=['p','qrs','t'].map(part=>wave?.querySelector(`[data-ecg-rest="${part}"]`));
  const flat=element?.querySelector('[data-ecg-flat]');
  const impulses=[...element?.querySelectorAll('[data-neural-impulse]')||[]];
  const tails=[...element?.querySelectorAll('[data-neural-tail]')||[]];
  const charges=[...element?.querySelectorAll('[data-neural-charge]')||[]];
  const cores=[...element?.querySelectorAll('[data-neural-core]')||[]];
  const halos=[...element?.querySelectorAll('[data-neural-halo]')||[]];
  const signals=[...element?.querySelectorAll('[data-signal-node]')||[]];
  const head=element?.querySelector('[data-signal-head]');
  let phase=.17,previous=null,energy=0,wasEngaged=false;
  let width=art.clientWidth,height=art.clientHeight;
  return {
    resize() {width=art.clientWidth;height=art.clientHeight;},
    render(seconds,press,engaged,selected,animate,activation={age:Infinity,held:false}) {
      const dt=previous===null?0:Math.max(0,Math.min(.1,seconds-previous));previous=seconds;
      energy=animate ? energy+(Number(engaged)-energy)*Math.min(1,dt*7) : 0;
      phase=animate ? phase+dt*(1.05+energy*(id==='health'?.95:1.35)) : .17;
      if(id==='artificial-self' && animate && engaged && !wasEngaged)phase=0;
      wasEngaged=engaged;
      const age=animate?activation.age:Infinity;
      const hit=animate ? (activation.held?1:age<.62?smooth(age/.045)*(1-smooth((age-.10)/.52)):0) : 0;
      if(wave) {
        // Fixed endpoints and fixed QRS location: deflect, then return to baseline.
        // The three lobes share the beat phase; nothing is translated horizontally.
        const beat=fract(phase);
        [[.04,.14],[.20,.39],[.45,.62]].forEach(([start,end],i)=>{
          const p=clamp((beat-start)/(end-start));
          const amplitude=animate ? Math.min(clamp(p/.12),clamp((1-p)/.2)) : 0;
          paint(deflections[i],'transform',`scaleY(${amplitude})`);
          paint(baselines[i],'opacity',amplitude<.025?1:0);
        });
        const flatNow=animate && (activation.held || age<.16);
        paint(wave,'opacity',flatNow?0:1);paint(flat,'opacity',flatNow?1:0);
        paint(element,'transform',`perspective(700px) rotateX(${hit*2.2}deg) translateY(${hit*.7}px)`);
        paint(element.querySelector('.instrument-glass'),'opacity',.25+energy*.2+hit*.25);
        paint(element.querySelector('.ecg-beat-led'),'opacity',flatNow?.9:.16+(beat>.20&&beat<.39?.7:0));
      }
      // The deliberate click completes its three-cell cascade before the
      // shared-clock navigation acknowledgement ends. Idle propagation is slower.
      const circuit=sampleNeuralCircuit(age<.5?age*2.8:fract(phase/5)*5);
      impulses.forEach((impulse,i)=>{
        const travel=circuit.travel[i];
        [impulse,tails[i*2],tails[i*2+1]].forEach((particle,j)=>{
          const t=clamp(travel-j*.075),point=curve(wires[i],t);
          paint(particle,'transform',`translate3d(${point[0]/1100*width}px,${point[1]/458*height}px,0) scale(${1-j*.2})`);
          paint(particle,'opacity',animate && circuit.alive[i] ? smooth(t*18)*smooth((1-t)*12)*(1-j*.25) : 0);
        });
        paint(charges[i],'opacity',animate && circuit.alive[i]?(.18+energy*.32)*Math.sin(travel*Math.PI):0);
      });
      cores.forEach((core,i)=>{
        const pulse=animate?circuit.cores[i]:0;
        paint(core,'opacity',.2+pulse*.8);
        paint(core,'transform',`translate(-50%,-50%) scale(${.75+pulse*.65})`);
        paint(halos[i],'opacity',pulse*.75);
        paint(halos[i],'transform',`translate(-50%,-50%) scale(${1+(1-pulse)*.5})`);
      });
      signals.forEach((signal,i)=>{
        const p=age<.8?clamp(age/.8):fract(phase/8);
        const near=Math.max(0,1-Math.abs(p-i/3)*7);
        paint(signal,'opacity',.08+i*.17+(animate?near*(age<.8?.4:.25):0));
        paint(signal,'transform',`translate(-50%,-50%) scale(${1+near*(animate?.22:0)})`);
      });
      if(head) {paint(head,'transform',`translate3d(${(age<.8?clamp(age/.8):fract(phase/8))*580/1100*width}px,0,0) scaleX(${age<.8?2:1})`);paint(head,'opacity',animate?.64:0);}
      if(id==='design-gallery') {
        paint(element,'opacity',.10+energy*.15+hit*.24);
        paint(element,'transform',`translateX(${animate?Math.sin(seconds*.35)*3:0}px) scaleX(${1+energy*.16})`);
      }
      if(element?.classList.contains('mechanism-light')) {
        paint(element,'opacity',.16+(animate?Math.sin(seconds*.7)*.04:0)+energy*.14+hit*.25);
        paint(element,'transform',`translateX(${animate?Math.sin(seconds*.28)*3:0}px)`);
      }
      return {phase,energy,hit,age};
    }
  };
}
