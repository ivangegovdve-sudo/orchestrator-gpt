// Reproducible, free, code-rendered growth of the LOCKED Option-A composition.
// The final sample restores the very same DOM styles used for the captured page.
export const clamp = value => Math.max(0,Math.min(1,value));
const smooth = value => { const p=clamp(value); return p*p*(3-2*p); };
export function growthState(progress) {
  const p=clamp(progress);
  return {progress:p,cameraScale:2.6-1.6*p,treeScale:smooth(p/.82),branchGrowth:clamp((p-.08)/.67),assembly:smooth((p-.48)/.5)};
}
export function createIntroScene(stage) {
  const tree=stage.querySelector('.resolve-tree');
  const treeBox=tree.getBoundingClientRect();
  const base=stage.getBoundingClientRect();
  const anchor={x:treeBox.left-base.left+treeBox.width*.47,y:treeBox.bottom-base.top};
  const saved=[];
  const write=(node,key,value)=>{
    if(!saved.some(entry=>entry.node===node&&entry.key===key))saved.push({node,key,value:node.style[key]});
    node.style[key]=value;
  };
  const seed=document.createElement('span');
  seed.className='forest-intro-seed';
  Object.assign(seed.style,{position:'absolute',left:`${anchor.x-6}px`,top:`${anchor.y-9}px`,width:'12px',height:'9px',borderRadius:'65% 35% 60% 40%',background:'#706745',border:'1px solid #ac9563',boxShadow:'0 3px 5px #17261b',zIndex:3,pointerEvents:'none'});
  stage.querySelector('.resolve-scene').append(seed);
  const planes=[...stage.children].filter(node=>!node.matches('.resolve-growth-runway,.resolve-scroll-cue,.intro-voice-control,[data-growth-intro]'));
  const windows=[...stage.querySelectorAll('[data-pool-link]')];
  let finished=false;
  function restore(repaint=false) {
    for(const entry of saved)entry.node.style[entry.key]=entry.value;
    seed.hidden=true;
    if(repaint) {
      // Discard scaled intermediate raster caches before the final compositor
      // sample. Both writes happen before paint; this is not a visible transition.
      const display=stage.style.display;stage.style.display='none';void stage.offsetHeight;stage.style.display=display;
    }
  }
  function render(progress) {
    const state=growthState(progress),p=state.progress;
    if(p===1){restore(true);finished=true;return state;}
    finished=false;seed.hidden=p>.14;
    for(const plane of planes) {
      if(plane.matches('[data-support-control]')) {write(plane,'transform',`translateY(${(1-state.assembly)*innerHeight}px)`);continue;}
      // offsetLeft/Top are layout positions, independent of the prior camera sample.
      write(plane,'transformOrigin',`${anchor.x-plane.offsetLeft}px ${anchor.y-plane.offsetTop}px`);
      write(plane,'transform',`translateY(${(innerHeight*.77-anchor.y)*(1-p)}px) scale(${state.cameraScale})`);
    }
    // Grow the connected source anatomy from its planted roots. Scaling the
    // complete art avoids chopped branches, detached foliage and late fades.
    write(tree,'transformOrigin','47% 100%');
    write(tree,'transform',`translate(-50%,-50%) scale(${state.treeScale})`);
    windows.forEach((node,index)=>{
      const side=index%2 ? 1 : -1;
      write(node,'transform',`translate(${side*innerWidth*(1-state.assembly)}px,${innerHeight*.35*(1-state.assembly)}px) rotate(${side*8*(1-state.assembly)}deg)`);
    });
    const machine=stage.querySelector('.forest-machine');
    if(machine) {
      write(machine,'transform',`translateY(${innerHeight*(1-state.assembly)}px)`);
      write(machine.querySelector('.machine-rail'),'transform',`translateX(${-300*(1-state.assembly)}px)`);
      write(machine.querySelector('.machine-gear'),'transform',`translate(209px,76px) rotate(${-270*(1-state.assembly)}deg)`);
      write(machine.querySelector('.machine-piston'),'transform',`translateY(${100*(1-state.assembly)}px)`);
    }
    const sprout=smooth((p-.78)/.2);
    for(const node of stage.querySelectorAll('.forest-project-dot')) {
      write(node,'visibility',sprout===0?'hidden':'visible');
      write(node,'transform',`translateY(${-12*(1-sprout)}px) scale(${sprout})`);
    }
    for(const node of stage.querySelectorAll('.resolve-controls,.resolve-history'))write(node,'visibility',p<.99?'hidden':'');
    return state;
  }
  return {render,restore,get finished(){return finished;},destroy(){restore();seed.remove();}};
}
