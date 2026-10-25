/*
 * SD Forest arrival: DOM controller. It owns the text-first page and the input
 * model, and dynamically imports the Three.js scene so that a missing/broken
 * runtime can never take the controls down with it.
 *
 * INPUT MODEL
 *   Normal mode  : the page has a bounded scroll track (.scroll-track, ~320vh tall) and the
 *                  stage is position:sticky. The scroll fraction through the track is the target
 *                  scalar p; the scene eases toward it for smoothness (the scene is still a pure
 *                  function of its current p). Pointer hover raycasts the instanced stones and
 *                  only changes their local emissive/bloom lift; it never changes the timeline.
 *   "Awaken the stones" button (fallback): scrolls to the end of the track (p=1); pressed again
 *                  it scrolls back to the top. aria-pressed mirrors "p is at the end".
 *   Keyboard focus: tabbing into the hero controls (focus-visible) holds the gate resolved (p=1)
 *                  until the visitor scrolls (wheel/touch/scroll keys) or focus leaves.
 *   Step into link: forces p=1, plays the iris mask, then navigates (native navigation if reduced).
 *   Reduced motion: no scroll track; one static resolved frame (p=1, frozen time).
 *   ?capture=1   : capture mode (see ../../CONTRACT.md). No rAF loop, no scroll/hover/focus input,
 *                  DOM chrome hidden by CSS; window.__sdfIntro.setProgress(p) renders one frame.
 *   ?smoke=red   : use the original red fallback palette for the self-hosted reveal layer (blue default).
 *
 * body[data-scene]   loading | webgpu | webgl2 | fallback
 * body[data-quiet]   "true" when the visitor chose the quiet (text-first) view
 * body[data-capture] "true" in capture mode
 */
const body = document.body;
const canvas = document.getElementById('intro-canvas');
const revealCanvas = document.getElementById('reveal-canvas');
const stage = document.getElementById('stage');
const track = document.getElementById('track');
const awakenBtn = document.getElementById('awaken');
const stepLink = document.getElementById('step-in');
const quietBtn = document.getElementById('quiet-toggle');
const iris = document.getElementById('iris');
const engineLabel = document.getElementById('engine-label');
const stateLabel = document.getElementById('stage-state');
const heroCopy = document.querySelector('.hero-copy');

const params = new URLSearchParams(window.location.search);
const capture = params.get('capture') === '1';
const reducedQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const reduced = !!(reducedQuery && reducedQuery.matches);
body.setAttribute('data-reduced-motion', String(reduced));
body.setAttribute('data-scene', 'loading');
body.setAttribute('data-capture', String(capture));
body.setAttribute('data-scroll', 'false');
if (capture) body.setAttribute('data-quiet', 'false');

let scene = null;
let reveal = null;
let focusHold = false;
let leaving = false;
let lastLabel = '';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const readQuiet = () => { try { return sessionStorage.getItem('sdf-quiet') === '1'; } catch (_) { return false; } };
const writeQuiet = (v) => { try { sessionStorage.setItem('sdf-quiet', v ? '1' : '0'); } catch (_) { /* private mode */ } };

function setLabel(text) { if (stateLabel && text !== lastLabel) { stateLabel.textContent = text; lastLabel = text; } }

const PHASE_TEXT = {
  rest: 'Fallen stones at rest',
  'detach-scatter': 'The stones lift from the ground',
  vortex: 'The stones spiral into the gate vortex',
  approach: 'The stones arc toward the gate',
  settle: 'The stones seat themselves into the gate',
  reveal: 'The gate opens a window'
};

// ---- scroll track -> target scalar ----
function scrollEnabled() {
  return !capture && !reduced && scene && body.getAttribute('data-quiet') !== 'true' && body.getAttribute('data-scene') !== 'fallback';
}
function trackMax() { return Math.max(0, track.offsetHeight - window.innerHeight); }
function scrollFraction() {
  const max = trackMax();
  if (max <= 1) return 0;
  return clamp01((window.scrollY - track.offsetTop) / max);
}
function currentTarget() {
  if (leaving || focusHold) return 1;
  return scrollFraction();
}
function syncTarget() {
  if (!scene || capture) return;
  // Integration repair (orchestrator): reduced motion stays on the static resolved frame; a resize
  // must not re-label it from the (absent) scroll track as "at rest".
  if (reduced) { setLabel('Gate resolved (reduced motion)'); return; }
  const t = currentTarget();
  scene.setTarget(t);
  if (awakenBtn) awakenBtn.setAttribute('aria-pressed', String(t >= 0.98));
  body.setAttribute('data-awake', String(t > 0.02));
  if (!scene.running) setLabel(PHASE_TEXT[scene.phaseName(t)] || PHASE_TEXT.rest);
}
function onFrameProgress(p) {
  stage.style.setProperty('--p', p.toFixed(3));
  setLabel(PHASE_TEXT[scene.phaseName(p)] || PHASE_TEXT.rest);
  if (reveal) {
    reveal.setProgress(p);
    body.setAttribute('data-reveal-active', String(reveal.reveal > 0.001));
  }
}

function enterFallback(reason) {
  body.setAttribute('data-scene', 'fallback');
  body.setAttribute('data-scene-reason', reason);
  body.setAttribute('data-scroll', 'false');
  body.setAttribute('data-reveal-active', 'false');
  if (engineLabel) engineLabel.textContent = 'Text-first view';
  setLabel('The scene is unavailable; the link still works');
  if (awakenBtn) awakenBtn.hidden = true;
}

function applyScrollMode() {
  const on = !!scrollEnabled();
  body.setAttribute('data-scroll', String(on));
  if (!on && !capture) window.scrollTo(0, 0);
}

function setQuiet(on) {
  body.setAttribute('data-quiet', String(on));
  body.classList.toggle('is-quiet', on);
  quietBtn.setAttribute('aria-pressed', String(on));
  quietBtn.setAttribute('aria-label', on ? 'Wake the forest scene' : 'Quiet the forest scene');
  writeQuiet(on);
  if (scene) {
    if (on) scene.stop();
    else { scene.resize(); if (reduced) scene.renderStatic(true); else scene.start(); }
    if (reveal) {
      if (on) reveal.stop();
      else reveal.setProgress(scene.getState().p);
    }
    applyScrollMode();
    if (!on) syncTarget();
  }
  if (awakenBtn && body.getAttribute('data-scene') !== 'fallback') awakenBtn.hidden = on || reduced;
}

// ---- input wiring ----
if (!capture) {
  window.addEventListener('scroll', () => {
    if (focusHold) focusHold = false; // the visitor took over
    syncTarget();
  }, { passive: true });
  const release = () => { if (focusHold) { focusHold = false; syncTarget(); } };
  window.addEventListener('wheel', release, { passive: true });
  window.addEventListener('touchmove', release, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) release();
  });
  heroCopy.addEventListener('focusin', (e) => {
    let visible = true;
    try { visible = e.target.matches(':focus-visible'); } catch (_) { visible = true; }
    if (visible && scrollEnabled()) { focusHold = true; syncTarget(); }
  });
  heroCopy.addEventListener('focusout', (e) => {
    if (!heroCopy.contains(e.relatedTarget)) { focusHold = false; syncTarget(); }
  });

  awakenBtn.addEventListener('click', () => {
    if (!scrollEnabled()) return;
    focusHold = false;
    const atEnd = scrollFraction() >= 0.98;
    const top = atEnd ? 0 : track.offsetTop + trackMax();
    window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  });
  quietBtn.addEventListener('click', () => setQuiet(body.getAttribute('data-quiet') !== 'true'));

  // ---- step through: 500-700ms visual mask, then navigate ----
  stepLink.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (reduced || leaving) return; // immediate (native) navigation
    e.preventDefault();
    leaving = true;
    syncTarget();
    const target = stepLink.href;
    let cx = 0.62; let cy = 0.46;
    if (scene && body.getAttribute('data-quiet') !== 'true') {
      try { const s = scene.portalScreen(); cx = s.x; cy = s.y; } catch (_) { /* keep defaults */ }
    }
    iris.style.setProperty('--ix', `${(cx * 100).toFixed(1)}%`);
    iris.style.setProperty('--iy', `${(cy * 100).toFixed(1)}%`);
    iris.classList.add('is-active');
    body.setAttribute('data-leaving', 'true');
    const go = () => { window.location.href = target; };
    try {
      const anim = iris.animate([
        { opacity: 0, transform: 'scale(1.35)' },
        { opacity: 0.85, transform: 'scale(1.05)', offset: 0.45 },
        { opacity: 1, transform: 'scale(1)' }
      ], { duration: 620, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)', fill: 'forwards' });
      anim.onfinish = go;
      setTimeout(go, 760); // safety net if onfinish never fires
    } catch (_) {
      iris.style.opacity = '1';
      setTimeout(go, 600);
    }
  });

  // bfcache: coming back must not show a stuck mask
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      leaving = false;
      iris.classList.remove('is-active');
      iris.getAnimations && iris.getAnimations().forEach((a) => a.cancel());
      body.removeAttribute('data-leaving');
      syncTarget();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!scene || body.getAttribute('data-quiet') === 'true' || reduced) return;
    if (document.hidden) {
      scene.stop();
      if (reveal) reveal.stop();
    } else {
      scene.start();
      if (reveal && reveal.reveal > 0.001) reveal.start();
    }
  });
}

let resizeTimer = 0;
window.addEventListener('resize', () => {
  if (!scene) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (capture || body.getAttribute('data-quiet') !== 'true') {
      scene.resize();
      if (reveal) reveal.resize();
      syncTarget();
    }
  }, 80);
});

// ---- boot ----
let resolveReady;
const readyPromise = new Promise((resolve) => { resolveReady = resolve; });

async function boot() {
  const quiet = capture ? false : readQuiet();
  body.setAttribute('data-quiet', String(quiet));
  body.classList.toggle('is-quiet', quiet);
  quietBtn.setAttribute('aria-pressed', String(quiet));
  if (quiet) quietBtn.setAttribute('aria-label', 'Wake the forest scene');
  if ((reduced || capture) && awakenBtn) awakenBtn.hidden = true;
  try {
    const mod = await import('./intro-scene.js');
    scene = await mod.createIntroScene({ canvas, reduced, capture });
  } catch (err) {
    console.warn('[sdforest intro] scene unavailable, using text-first view:', err);
    scene = null;
    enterFallback(String(err && err.message ? err.message : err).slice(0, 160));
    resolveReady({ fallback: true, reason: String(err && err.message ? err.message : err).slice(0, 160) });
    return;
  }
  try {
    const smoke = await import('./reveal-smoke.js');
    reveal = smoke.createRevealSmoke(revealCanvas, {
      palette: params.get('smoke') === 'red' ? 'red' : 'blue'
    });
    window.__sdfReveal = reveal;
    reveal.resize();
  } catch (err) {
    // The stone gate remains the primary experience if this optional layer cannot start.
    console.warn('[sdforest intro] reveal layer unavailable:', err);
  }
  body.setAttribute('data-scene', scene.backend);
  body.setAttribute('data-rocks', scene.info.rockSource.startsWith('rock_09') ? 'rock_09-gltf' : 'procedural');
  body.setAttribute('data-stones', String(scene.info.stoneInstances));
  body.setAttribute('data-gate', 'same-stone-rock_09');
  body.setAttribute('data-asset-failures', String(scene.info.failures.length));
  if (engineLabel) engineLabel.textContent = scene.backend === 'webgpu' ? 'Three.js r186 / WebGPU + TSL' : 'Three.js r186 / WebGL2 backend + TSL';
  scene.onFrame = onFrameProgress;
  if (capture) {
    scene.resize();
    await scene.setProgress(0);
    resolveReady(scene.info);
    return;
  }
  applyScrollMode();
  if (quiet) { resolveReady(scene.info); return; }
  if (reduced) {
    body.setAttribute('data-portal', 'static-resolved');
    scene.renderStatic(true);
    setLabel('Gate resolved (reduced motion)');
  } else if (!document.hidden) {
    scene.setTarget(scrollFraction());
    scene.start();
    syncTarget();
  }
  resolveReady(scene.info);
}
boot();

// Capture contract surface (read-only object; only setProgress mutates, and only the scalar).
const api = {
  ready: readyPromise,
  async setProgress(p, opts) {
    await readyPromise;
    if (!scene) throw new Error('scene unavailable');
    const result = await scene.setProgress(p, opts);
    // The live renderer reaches this hook from its rAF loop. Capture mode has
    // no loop, so forward the deterministic scalar explicitly or optional
    // layers (the self-hosted reveal included) would lag behind the gate.
    onFrameProgress(result && Number.isFinite(result.p) ? result.p : p);
    return result;
  },
  getState() {
    if (!scene) return { p: 0, phase: 'rest', time: 0, backend: 'fallback', capture, stoneInstances: 0, gateTargets: 0, rockTriangles: 0, waterReflection: 'flat', failures: ['scene unavailable'] };
    return scene.getState();
  },
  get timeline() { return scene ? scene.timeline : null; },
  get scene() { return scene; },
  get info() { return scene ? scene.info : null; },
  get reveal() { return reveal ? reveal.getState() : null; },
  setRevealPalette(name) { return reveal ? reveal.setPalette(name) : null; }
};
window.__sdfIntro = api;
