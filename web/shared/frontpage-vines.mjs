import { windAt } from './frontpage-ambient.mjs';
import { paint } from './frontpage-pool-effects.mjs';

// Input supplies displacement; the existing scene clock supplies all time.
// Capture belongs only to these narrow strands, never to the scene or navigation.
export function createVines(stage, invalidate) {
  let enabled=false, previous=null;
  const vines=[...stage.querySelectorAll('button[data-wind-vine]')].map((element,i)=>{
    const vine={element,i,angle:0,velocity:0,drag:null,length:element.clientHeight};
    const release=()=>{
      const pointer=vine.drag?.pointer;
      vine.drag=null;delete element.dataset.dragging;
      if(pointer!==undefined && element.hasPointerCapture(pointer))element.releasePointerCapture(pointer);
      invalidate();
    };
    element.addEventListener('pointerdown',event=>{
      if(!enabled || event.button!==0 || vine.drag)return;
      vine.drag={pointer:event.pointerId,x:event.clientX,start:vine.angle,target:vine.angle,moved:false};
      element.dataset.dragging='true';
      element.setPointerCapture(event.pointerId);
      invalidate();
    });
    element.addEventListener('pointermove',event=>{
      if(!vine.drag || event.pointerId!==vine.drag.pointer)return;
      const dx=event.clientX-vine.drag.x;
      vine.drag.moved ||= Math.abs(dx)>4;
      vine.drag.target=Math.max(-22,Math.min(22,vine.drag.start-dx/Math.max(100,vine.length)*70));
      invalidate();
    });
    element.addEventListener('pointerup',event=>{
      if(!vine.drag || event.pointerId!==vine.drag.pointer)return;
      if(!vine.drag.moved)vine.velocity+=(i ? -1 : 1)*45;
      release();
    });
    element.addEventListener('pointercancel',release);
    element.addEventListener('lostpointercapture',()=>{if(vine.drag)release();});
    element.addEventListener('click',event=>{
      // Pointer taps were handled on release; native keyboard clicks have detail 0.
      if(enabled && event.detail===0){vine.velocity+=(i ? -1 : 1)*45;invalidate();}
    });
    element.addEventListener('keydown',event=>{
      if(event.key==='Escape')release();
      if(enabled && ['ArrowLeft','ArrowRight'].includes(event.key)){
        event.preventDefault();vine.velocity+=event.key==='ArrowLeft'?45:-45;invalidate();
      }
    });
    vine.release=release;return vine;
  });
  return {
    resize() {vines.forEach(v=>{v.length=v.element.clientHeight;});},
    busy() {return vines.some(v=>v.drag || Math.abs(v.angle)>.015 || Math.abs(v.velocity)>.03);},
    render(seconds,strength,animate) {
      enabled=animate;
      const dt=previous===null?0:Math.max(0,Math.min(.05,seconds-previous));previous=seconds;
      for(const v of vines) {
        v.element.disabled=!animate;
        if(!animate){if(v.drag)v.release();v.angle=v.velocity=0;}
        else if(v.drag){
          const before=v.angle;
          v.angle+=(v.drag.target-v.angle)*Math.min(1,dt*25);
          if(dt>0)v.velocity=Math.max(-90,Math.min(90,(v.angle-before)/dt));
        } else {
          v.velocity+=(-v.angle*24-v.velocity*4)*dt;
          v.angle+=v.velocity*dt;
          if(Math.abs(v.angle)<.015 && Math.abs(v.velocity)<.03)v.angle=v.velocity=0;
        }
        const gust=animate?windAt(seconds-v.i*.8)*strength*1.6:0;
        paint(v.element,'transform',`rotate(${v.angle+gust}deg)`);
        paint(v.element.querySelector('.vine-tip'),'transform',`rotate(${-v.angle*.24}deg)`);
      }
    }
  };
}
