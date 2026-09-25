const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => {
  const p = clamp(value);
  return p * p * (3 - 2 * p);
};

export function createGrowthIntro(stage, onFailure, enabled) {
  const root = document.documentElement;
  const intro = stage.querySelector('[data-growth-intro]');
  const film = stage.querySelector('[data-growth-film]');
  const fallbackDuration = 25.208333;
  let duration = fallbackDuration;
  let current = -6;
  let failed = false;

  function render(time) {
    current = time;
    const growth = clamp((time + 6) / 5.5);
    const reframe = ease((growth - .86) / .14);
    const handoff = ease((time + .5) / .5);
    const treeReveal = handoff * handoff;
    const target = growth * duration;

    if (!failed && film.readyState >= 1 && Math.abs(film.currentTime - target) > 1 / 48) {
      film.currentTime = Math.min(Math.max(0, target), Math.max(0, duration - 1 / 48));
    }
    film.pause();
    intro.style.opacity = String(1 - treeReveal);
    intro.style.visibility = handoff === 1 ? 'hidden' : 'visible';
    intro.style.setProperty('--growth-reframe',String(reframe));
    intro.style.setProperty('--growth-focus-x',`${50 - 24 * reframe}%`);
    intro.style.setProperty('--growth-handoff',String(handoff));
    root.dataset.growthPhase = handoff === 1 ? 'complete' : growth === 0 ? 'seed' : growth === 1 ? 'handoff' : 'growing';
  }

  function open() {
    intro.style.opacity = '0';
    intro.style.visibility = 'hidden';
    root.dataset.growthPhase = 'complete';
    film.pause();
  }

  film.addEventListener('loadedmetadata',() => {
    if (Number.isFinite(film.duration) && film.duration > 0) duration = film.duration;
    render(current);
  });
  film.addEventListener('error',() => {
    if (failed) return;
    failed = true;
    root.dataset.growthPhase = 'failed';
    open();
    onFailure();
  });
  film.pause();
  if (enabled) {
    film.src = film.dataset.src;
    film.load();
  } else {
    open();
  }

  return Object.freeze({ render, open });
}
