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
  const vines = stage.querySelector('.forest-vines');
  const grass = [...layer.querySelectorAll('[data-wind-grass]')].map(element => ({element, lag:Number(element.dataset.windGrass)}));
  const motes = [...layer.querySelectorAll('[data-ambient-mote]')];
  let count = 6;
  let previousPhase = '';
  return {
    compact(value) { count = value ? 3 : 6; },
    reveal(time) {
      const opacity=String(smooth(Math.max(0,Math.min(1,(time - 3.6) / .8))));
      layer.style.opacity=opacity;vines.style.opacity=opacity;
      vines.inert=time<4.4;
      if(vines.inert && vines.contains(document.activeElement))document.activeElement.blur();
    },
    render(seconds, strength) {
      const gust = windAt(seconds) * strength;
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
