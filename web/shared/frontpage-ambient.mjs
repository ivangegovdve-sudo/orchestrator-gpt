// Original, band-limited value noise. All wind responses sample this one field.
const smooth = p => p * p * (3 - 2 * p);
const fraction = x => x - Math.floor(x);
const noiseKnot = index => fraction(Math.sin(index * 127.1 + 311.7) * 43758.5453) * 2 - 1;
export function windAt(seconds) {
  const position = seconds / 9;
  const index = Math.floor(position);
  return noiseKnot(index) + (noiseKnot(index + 1) - noiseKnot(index)) * smooth(position - index);
}

// No scheduler and no geometry reads here. The resolve controller owns time.
export function createAmbient(stage) {
  const layer = stage.querySelector('.resolve-ambient');
  const grass = [...layer.querySelectorAll('[data-wind-grass]')].map(element => ({element, lag:Number(element.dataset.windGrass)}));
  const motes = [...layer.querySelectorAll('[data-ambient-mote]')];
  const motifs = [...stage.querySelectorAll('.pool-motif')].map(element => {
    const breath = document.createElement('i');
    breath.className = 'motif-breath';
    const rim = document.createElement('i');
    rim.className = 'motif-rim';
    element.append(breath,rim);
    const portal = element.closest('[data-pool-link]');
    const motif = {breath,rim,mark:element.querySelector('svg'),kind:portal.dataset.poolLink,hover:false,focus:false};
    portal.addEventListener('pointerenter',() => { motif.hover = true; });
    portal.addEventListener('pointerleave',() => { motif.hover = false; });
    portal.addEventListener('focusin',() => { motif.focus = true; });
    portal.addEventListener('focusout',() => { motif.focus = false; });
    return motif;
  });
  let count = 6;
  let previousPhase = '';
  return {
    compact(value) { count = value ? 3 : 6; },
    reveal(time) { layer.style.opacity = String(smooth(Math.max(0,Math.min(1,(time - 3.6) / .8)))); },
    render(seconds, strength) {
      const gust = windAt(seconds) * strength;
      // Isolated decoration: no inherited variables invalidating the directory.
      for (const {breath,rim,mark,kind,hover,focus} of motifs) {
        breath.style.opacity = String(.22 + gust * .07);
        rim.style.transform = `rotate(${gust * 12}deg)`;
        if (hover || focus) {
          mark.style.transform = kind === 'health' || kind === 'ai-d-kit' || kind === 'design-gallery'
            ? `scale(${1 + gust * .035})`
            : `rotate(${gust * (kind === 'artificial-self' ? 12 : 3)}deg)`;
        } else if (mark.style.transform) mark.style.transform = '';
      }
      for (const {element,lag} of grass) {
        element.style.transform = `skewX(${windAt(seconds - lag) * strength * 3}deg)`;
      }
      for (let i = 0; i < motes.length; i++) {
        const near = i % 3 === 2;
        const period = near ? 84 + i * 2.7 : 125 + i * 3.1;
        const phase = fraction(seconds / period + i * .173 + .11);
        // Each particle fades completely at both ends, including on first arrival.
        const envelope = smooth(Math.min(1,phase / .18)) * smooth(Math.min(1,(1 - phase) / .28));
        motes[i].style.transform = `translate3d(${(i * 37 % 83) - 41 + gust * (near ? 2.5 : 1.2)}px,${-phase * (near ? 108 : 76)}px,0)`;
        motes[i].style.opacity = String(i < count ? envelope * strength * (near ? .23 : .14) : 0);
      }
    },
    phase(value) {
      if (value === previousPhase) return;
      previousPhase = value;
      document.documentElement.dataset.ambientState = value;
    }
  };
}
