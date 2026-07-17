/* SDForest landing — Three.js animation layer (entry).
   One shared WebGLRenderer on a single fixed transparent canvas drives
   four effects, each in its own module under ./forest-three/:

     roots.js   The living root burst — an organic mycelium of light
                radiating from the forest sigil; grows on load, bends
                toward the pointer (uMouse), pulses on click (uClick).
     panels.js  Scroll assembly: velocity-reactive spring on
                --assembly/--assembly-e plus organic dendritic fill and
                root strands growing from the forest floor into the
                arriving panels (poolside.ai-style impact reactivity).
     tiles.js   Sixteen per-portal wireframes, each with its own named
                motion identity (heartbeat rings, weaving ribbons, a
                cross-source evidence matrix, a writing feather, a growing
                math forest...).
     burst.js   Sparse ambient geometry — fireflies in the forest dark
                with a proximity-triggered spin/flatten choreography.

   The camera is calibrated so 1 world unit = 1 CSS pixel at z=0, which
   lets every effect be positioned straight from getBoundingClientRect().
   Degrades cleanly: prefers-reduced-motion never boots WebGL (CSS shows
   the assembled state); no WebGL keeps the scroll physics alone; no
   modules at all leaves the inline position-only fallback in index.html
   in charge. */

import * as THREE from '../vendor/three/three.module.min.js';
import { clamp, lerp } from './forest-three/util.js';
import { initRoots, updateRoots, rootsDebug } from './forest-three/roots.js';
import { initBurst, updateBurst, respawnBurst, burstDebug } from './forest-three/burst.js';
import { initPanels, updatePanels, panelsDebug } from './forest-three/panels.js';
import { initTiles, updateTiles, tilesAnimating, tilesDebug } from './forest-three/tiles.js?v=20260717';

(() => {
  'use strict';

  const root = document.documentElement;
  const assembly = document.querySelector('[data-assembly]');
  const landing = document.querySelector('.landing');
  if (!assembly || !landing) return;

  const query = new URLSearchParams(location.search);
  const motionOverride = query.get('motion'); // debug: ?motion=reduce|full
  const reduceMedia = matchMedia('(prefers-reduced-motion: reduce)');
  const compactMedia = matchMedia('(max-width: 900px)');
  const coarseMedia = matchMedia('(pointer: coarse)');
  const reduced = () => motionOverride === 'reduce' || (motionOverride !== 'full' && reduceMedia.matches);

  // Tell the inline fallback in index.html that a real driver owns the
  // assembly variables from now on.
  root.dataset.threeDriver = '1';

  /* ------------------------------------------------------------------ *
   * Scroll physics — runs even without WebGL.
   *   velocity  px/s, smoothed; vNorm 0..1
   *   impact    energy that builds under sustained fast scroll and
   *             decays exponentially — the "how hard did you throw the
   *             page" signal every effect listens to.
   * ------------------------------------------------------------------ */
  const scroll = {
    lastY: scrollY,
    velocity: 0,
    vNorm: 0,
    impact: 0,
    target: 0,
    current: 0,
    eased: 0,
    // Last values written to the CSS vars. -1 (impossible progress) forces
    // the first write — NaN here would poison the |delta| comparison below
    // into never writing at all.
    writtenA: -1,
    writtenE: -1,
  };

  // True once the spring has converged and all velocity energy has
  // decayed — the physics produces no new values and the loop may sleep.
  const physicsSettled = () => scroll.current === scroll.target
    && scroll.vNorm < 0.005 && scroll.impact < 0.005;

  // Pin the assembled state explicitly. The CSS reduced-motion rules only
  // follow the OS media query, so paths that bypass WebGL for another
  // reason (?motion=reduce debug override, compact layouts) must not
  // leave the vars at 0 or the panels would be stranded off-screen.
  function setAssembledVars() {
    if (scroll.writtenA === 1 && scroll.writtenE === 1) return;
    scroll.writtenA = scroll.writtenE = 1;
    root.style.setProperty('--assembly', '1');
    root.style.setProperty('--assembly-e', '1');
  }

  // Back-out ease whose overshoot strength grows with impact: a gentle
  // scroll seats the panels softly, a hard fling slams them past the seat.
  function backOut(t, strength) {
    const u = t - 1;
    return 1 + u * u * ((strength + 1) * u + strength);
  }

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

    if (compactMedia.matches || reduced()) {
      scroll.target = scroll.current = scroll.eased = 1;
      setAssembledVars();
      return;
    }

    const bounds = assembly.getBoundingClientRect();
    const travel = Math.max(1, bounds.height - innerHeight);
    scroll.target = clamp(-bounds.top / travel, 0, 1);

    // Velocity-modulated spring: faster scroll -> stiffer chase, so the
    // panels arrive with force instead of drifting in at a fixed rate.
    const stiffness = 6.5 + scroll.vNorm * 16;
    scroll.current += (scroll.target - scroll.current) * (1 - Math.exp(-stiffness * dt));
    if (Math.abs(scroll.target - scroll.current) < 0.0004) scroll.current = scroll.target;
    scroll.eased = backOut(scroll.current, 1.15 + scroll.impact * 2.4);

    // Only touch the CSS vars when they actually moved — writing them
    // every frame forces a style recalc even when the page is at rest.
    if (Math.abs(scroll.current - scroll.writtenA) > 0.0004 || Math.abs(scroll.eased - scroll.writtenE) > 0.0004) {
      scroll.writtenA = scroll.current;
      scroll.writtenE = scroll.eased;
      root.style.setProperty('--assembly', scroll.current.toFixed(4));
      root.style.setProperty('--assembly-e', scroll.eased.toFixed(4));
    }
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
    respawnBurst();
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

    let rendered = false;
    if (renderer) {
      const rootsVisible = updateRoots(shared, time, dt);
      const burstVisible = updateBurst(shared, time, dt);
      const panelsVisible = updatePanels(shared, time);
      const tilesVisible = updateTiles(shared, time, dt);
      rendered = rootsVisible || burstVisible || panelsVisible || tilesVisible;
      if (rendered) {
        renderer.render(shared.scene, camera);
        canvasDirty = true;
      } else if (canvasDirty) {
        // Clear exactly once when the last effect fades — not every frame.
        renderer.clear();
        canvasDirty = false;
      }
    }

    // Sleep when nothing animates: no spring motion left, nothing drawn,
    // no tile mid-fade. Wake events (scroll/pointer/resize/hover) restart
    // the loop. Ambient effects (roots, fireflies) keep `rendered` true
    // while on screen, so this only sleeps genuinely static frames.
    const needLoop = !physicsSettled() || rendered || tilesAnimating();
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

  function boot() {
    if (reduced()) {
      // Present the assembled state statically. Set explicitly rather
      // than relying on the CSS media query: the ?motion=reduce debug
      // override reduces without the OS-level query matching.
      setAssembledVars();
      return;
    }
    if (!renderer) {
      if (initRenderer()) {
        initRoots(shared, coarseMedia.matches);
        initBurst(shared);
        initPanels(shared);
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
    setAssembledVars();
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
    get panels() { return panelsDebug.panels; },
    get tiles() { return tilesDebug; },
    hero: burstDebug,
    roots: rootsDebug,
    get webgl() { return Boolean(renderer); },
    get sleeping() { return running && !frameHandle; },
    tick(now) { stop(); frame(now); },
    resume() { if (!reduced()) start(); },
  };

  boot();
})();
