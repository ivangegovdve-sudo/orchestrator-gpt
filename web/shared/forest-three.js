/* SDForest landing — Three.js animation layer (entry).
   One shared WebGLRenderer on a single fixed transparent canvas drives
   four effects, each in its own module under ./forest-three/:

     roots.js   The living mycelium behind the hero title: organic
                filaments (amber at the heart, green at the tips) with
                drifting spore particles. Grows outward on load, bends
                toward the pointer, pulses light on click. The forest-
                sigil SVG is its hidden anchor — kept in the DOM for
                getBoundingClientRect() but rendered invisible.
     crown.js   The tree crown: trunk, sixteen project branches with
                progressively random limbs down to the smallest twigs,
                and a canopy of beveled diamond leaves that bloom from
                flat 2D into rotating 3D and settle back into the page.
                Branches light up as their slams fire below.
     slams.js   The walk: one scroll-scrubbed slam per project section
                (icon plate meets detail panel at the seam). Each
                collision grows branching roots upward from the impact
                point toward the crown, throws impact dust, and lights
                the taproot rail. Writes CSS vars; DOM motion itself
                stays in stylesheets.
     tiles.js   Per-portal wireframes in the atlas grid, each with its
                own named motion identity.

   The camera is calibrated so 1 world unit = 1 CSS pixel at z=0, which
   lets every effect be positioned straight from getBoundingClientRect().
   Degrades cleanly: prefers-reduced-motion never boots (CSS presents
   the seated, lit state); no WebGL keeps the scroll-scrubbed CSS slams
   without the light effects; no modules at all leaves plain content. */

import * as THREE from '../vendor/three/three.module.min.js';
import { clamp, lerp } from './forest-three/util.js';
import { initSlams, updateSlams, slamsAnimating, slamsDebug } from './forest-three/slams.js?v=20260724c';
import { initCrown, updateCrown, crownDebug } from './forest-three/crown.js?v=20260724c';
import { initTiles, updateTiles, tilesAnimating, tilesDebug } from './forest-three/tiles.js?v=20260723';
import { initRoots, updateRoots, rootsDebug } from './forest-three/roots.js';

(() => {
  'use strict';

  const root = document.documentElement;
  const routes = document.querySelector('[data-routes]');
  const landing = document.querySelector('.landing');
  if (!routes || !landing) return;

  const query = new URLSearchParams(location.search);
  const motionOverride = query.get('motion'); // debug: ?motion=reduce|full
  const reduceMedia = matchMedia('(prefers-reduced-motion: reduce)');
  const compactMedia = matchMedia('(max-width: 900px)');
  const coarseMedia = matchMedia('(pointer: coarse)');
  const reduced = () => motionOverride === 'reduce' || (motionOverride !== 'full' && reduceMedia.matches);

  // Tell the CSS that a driver owns the choreography vars from now on.
  root.dataset.threeDriver = '1';

  /* ------------------------------------------------------------------ *
   * Scroll physics — runs even without WebGL.
   *   velocity  px/s, smoothed; vNorm 0..1
   *   impact    energy that builds under sustained fast scroll and
   *             decays exponentially — the "how hard did you throw the
   *             page" signal the slams and pulses listen to.
   * Also folds the title plate away (--title-p) as the walk begins.
   * ------------------------------------------------------------------ */
  const scroll = {
    lastY: scrollY,
    velocity: 0,
    vNorm: 0,
    impact: 0,
    writtenTitle: -1,
  };

  const physicsSettled = () => scroll.vNorm < 0.005 && scroll.impact < 0.005;

  function updateScrollPhysics(dt) {
    const y = scrollY;
    const instant = dt > 0 ? (y - scroll.lastY) / dt : 0;
    scroll.lastY = y;
    scroll.velocity += (instant - scroll.velocity) * clamp(dt * 9, 0, 1);
    scroll.vNorm = clamp(Math.abs(scroll.velocity) / 2600, 0, 1);
    scroll.impact = clamp(
      scroll.impact * Math.exp(-dt * 2.8) + scroll.vNorm * scroll.vNorm * dt * 6,
      0, 1,
    );

    const viewH = document.documentElement.clientHeight || innerHeight;
    const titleP = clamp(y / (viewH * 0.7), 0, 1);
    if (Math.abs(titleP - scroll.writtenTitle) > 0.002) {
      scroll.writtenTitle = titleP;
      root.style.setProperty('--title-p', titleP.toFixed(3));
    }
  }

  // Pin the resting state explicitly for paths that never run the loop
  // (?motion=reduce debug override): title present, rail lit, slams
  // seated. The OS-level media query is already handled in CSS.
  function setRestingVars() {
    root.style.setProperty('--title-p', '0');
    routes.style.setProperty('--rail-lit', '1');
    document.querySelectorAll('[data-slam]').forEach((section) => {
      section.style.setProperty('--sx', '0');
      section.style.setProperty('--hit', '0');
    });
  }

  /* ------------------------------------------------------------------ *
   * Renderer + camera (1 world unit = 1 CSS pixel at the z=0 plane) and
   * the shared context the effect modules read.
   * ------------------------------------------------------------------ */
  const pointer = { x: -9999, y: -9999, seen: false };
  const shared = {
    scene: null,
    pointer,
    scroll,
    slamState: null, // created by initSlams, read by crown.js
    compact: () => compactMedia.matches,
    wake, // effect modules restart a sleeping loop on their events
  };

  let renderer = null;
  let camera = null;
  let canvas = null;

  function initRenderer() {
    canvas = document.createElement('canvas');
    canvas.className = 'forest-three';
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      zIndex: '5',
      pointerEvents: 'none',
    });
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch (error) {
      canvas = null;
      return false;
    }
    renderer.setClearColor(0x000000, 0);
    shared.scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, 1, 10, 6000);
    resizeRenderer();
    document.body.appendChild(canvas);
    return true;
  }

  function resizeRenderer() {
    const dprCap = coarseMedia.matches ? 1.5 : 1.75;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.position.set(0, 0, (innerHeight / 2) / Math.tan(THREE.MathUtils.degToRad(35 / 2)));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    // Point sprites need DPR x camera distance to size in CSS pixels.
    shared.pointScale = renderer.getPixelRatio() * camera.position.z;
  }

  window.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.seen = true;
  }, { passive: true });

  /* ------------------------------------------------------------------ *
   * Frame loop + lifecycle.
   * ------------------------------------------------------------------ */
  let running = false;
  let frameHandle = 0;
  let lastTime = 0;
  let canvasDirty = false;
  const stats = { fps: 60 };

  function frame(now) {
    frameHandle = 0;
    const time = now / 1000;
    const dt = clamp(lastTime ? time - lastTime : 1 / 60, 0.001, 1 / 20);
    lastTime = time;
    stats.fps = lerp(stats.fps, 1 / dt, 0.05);

    updateScrollPhysics(dt);

    // The slams write CSS vars whether or not WebGL exists; their
    // return value reports WebGL light (pulses / dust) drawn.
    const slamsDrawn = updateSlams(shared, time, dt);

    let rendered = false;
    if (renderer) {
      const rootsVisible = updateRoots(shared, time, dt);
      const crownVisible = updateCrown(shared, time);
      const tilesVisible = updateTiles(shared, time, dt);
      rendered = rootsVisible || crownVisible || tilesVisible || slamsDrawn;
      if (rendered) {
        renderer.render(shared.scene, camera);
        canvasDirty = true;
      } else if (canvasDirty) {
        // Clear exactly once when the last effect fades — not every frame.
        renderer.clear();
        canvasDirty = false;
      }
    }

    // Sleep when nothing animates: no scroll energy, no slam mid-flight,
    // nothing drawn, no tile mid-fade. Wake events restart the loop.
    const needLoop = !physicsSettled() || rendered || tilesAnimating() || slamsAnimating();
    if (running && !document.hidden && needLoop) schedule();
    else lastTime = 0;
  }

  function schedule() {
    if (!frameHandle) frameHandle = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = 0;
    scroll.lastY = scrollY;
    schedule();
  }

  // Restart a sleeping loop. Drops the first scroll delta (dt across the
  // sleep is unknowable, so deriving velocity from it would spike).
  function wake() {
    if (!running || document.hidden || frameHandle) return;
    lastTime = 0;
    scroll.lastY = scrollY;
    schedule();
  }

  function stop() {
    running = false;
    if (frameHandle) cancelAnimationFrame(frameHandle);
    frameHandle = 0;
    lastTime = 0;
  }

  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('pointermove', wake, { passive: true });
  window.addEventListener('pointerdown', wake, { passive: true });
  window.addEventListener('resize', wake, { passive: true });

  let effectsReady = false;

  function boot() {
    if (reduced()) {
      setRestingVars();
      return;
    }
    if (!effectsReady) {
      effectsReady = true;
      const webgl = initRenderer();
      initSlams(shared); // CSS choreography works even without WebGL
      if (webgl) {
        initRoots(shared, coarseMedia.matches);
        initCrown(shared);
        initTiles(shared, () => coarseMedia.matches);
        window.addEventListener('resize', resizeRenderer, { passive: true });
      }
    }
    if (canvas) canvas.style.display = '';
    start();
  }

  function shutdown() {
    stop();
    if (canvas) canvas.style.display = 'none';
    setRestingVars();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (!reduced()) start();
  });

  reduceMedia.addEventListener?.('change', () => {
    if (reduced()) shutdown();
    else boot();
  });

  // Debug handle: lets automated checks read fps / effect state and pump
  // deterministic frames without relying on screenshots (which time out
  // on this page) or on the tab being visible (rAF pauses when hidden).
  window.__forestThree = {
    stats,
    scroll,
    get slams() { return slamsDebug; },
    get roots() { return rootsDebug; },
    get crown() { return crownDebug; },
    get tiles() { return tilesDebug; },
    get webgl() { return Boolean(renderer); },
    get sleeping() { return running && !frameHandle; },
    tick(now) { stop(); frame(now); },
    resume() { if (!reduced()) start(); },
  };

  boot();
})();
