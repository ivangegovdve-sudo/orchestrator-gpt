/* SDForest landing — Three.js animation layer.
   Owns three effects on one shared WebGLRenderer (single fixed transparent
   canvas, pointer-events: none):

     1. Assembly physics + panel fill. Scroll VELOCITY — not just position —
        drives a spring on --assembly/--assembly-e (the DOM panels keep their
        CSS transforms so they stay interactive HTML), while two shader planes
        track the panel rects and render an energy fill whose brightness,
        sweep and shockwave scale with how hard you scroll (poolside.ai-style
        impact fill).
     2. Per-tile hover wireframes. Every portal gets its own hand-built line
        geometry themed to the project; it materializes over the tile on
        pointerenter (or tap-selection on touch), idles, and fades on leave.
     3. Hero shape burst. Wireframe cubes/octahedra/tetrahedra drift in the
        landing area; cursor proximity triggers a choreographed sequence —
        colorize, fade in, 360° multi-axis spin while scaling up and back,
        flatten to a 2D plane, vanish, respawn elsewhere.

   The camera is calibrated so 1 world unit = 1 CSS pixel at z=0, which lets
   every effect be positioned straight from getBoundingClientRect().
   Degrades cleanly: prefers-reduced-motion never boots WebGL (CSS shows the
   assembled state); no WebGL keeps the scroll physics alone; no modules at
   all leaves the inline position-only fallback in index.html in charge. */

import * as THREE from '../vendor/three/three.module.min.js';

(() => {
  'use strict';

  const root = document.documentElement;
  const assembly = document.querySelector('[data-assembly]');
  const landing = document.querySelector('.landing');
  const board = document.querySelector('.portal-board');
  const stage = document.querySelector('[data-preview-stage]');
  const portals = [...document.querySelectorAll('[data-project-grid] .portal')];
  if (!assembly || !landing || !board || !stage || !portals.length) return;

  const query = new URLSearchParams(location.search);
  const motionOverride = query.get('motion'); // debug: ?motion=reduce|full
  const reduceMedia = matchMedia('(prefers-reduced-motion: reduce)');
  const compactMedia = matchMedia('(max-width: 900px)');
  const coarseMedia = matchMedia('(pointer: coarse)');
  const reduced = () => motionOverride === 'reduce' || (motionOverride !== 'full' && reduceMedia.matches);

  // Tell the inline fallback in index.html that a real driver owns the
  // assembly variables from now on.
  root.dataset.threeDriver = '1';

  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ------------------------------------------------------------------ *
   * 1. Scroll physics — runs even without WebGL.
   *    velocity  px/s, smoothed; vNorm 0..1
   *    impact    energy that builds under sustained fast scroll and
   *              decays exponentially — the "how hard did you throw the
   *              page" signal every effect listens to.
   * ------------------------------------------------------------------ */
  const scroll = {
    lastY: scrollY,
    velocity: 0,
    vNorm: 0,
    impact: 0,
    target: 0,
    current: 0,
    eased: 0,
  };

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
      root.style.removeProperty('--assembly');
      root.style.removeProperty('--assembly-e');
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

    root.style.setProperty('--assembly', scroll.current.toFixed(4));
    root.style.setProperty('--assembly-e', scroll.eased.toFixed(4));
  }

  /* ------------------------------------------------------------------ *
   * 2. Renderer + camera (1 world unit = 1 CSS pixel at the z=0 plane).
   * ------------------------------------------------------------------ */
  let renderer = null;
  let scene = null;
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
    scene = new THREE.Scene();
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
  }

  const worldX = (px) => px - innerWidth / 2;
  const worldY = (px) => innerHeight / 2 - px;

  /* ------------------------------------------------------------------ *
   * 3. Panel fill planes — the velocity-reactive assembly effect.
   * ------------------------------------------------------------------ */
  const PANEL_VERT = /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  // uSide: -1 board (arrives from the left), +1 preview (from the right).
  // The energy front enters from each panel's OUTER edge and sweeps toward
  // its seat; velocity widens + brightens it, impact fires a shockwave.
  const PANEL_FRAG = /* glsl */`
    precision highp float;
    varying vec2 vUv;
    uniform float uTime, uProgress, uVel, uImpact, uSide;
    uniform vec2 uSize;
    uniform vec3 uAccent;

    float gridGlow(vec2 p, float width) {
      vec2 cell = abs(fract(p) - 0.5);
      return smoothstep(width, 0.0, min(cell.x, cell.y));
    }

    void main() {
      // 0 at the outer edge the panel arrives from, 1 at its seat.
      float axis = uSide > 0.0 ? 1.0 - vUv.x : vUv.x;
      float front = uProgress * 1.18 + uImpact * 0.22 - axis;

      // Scan grid inside the filled region, energized by velocity.
      vec2 gridUv = vUv * uSize / 44.0;
      float grid = gridGlow(gridUv, 0.055);
      float filled = smoothstep(0.0, 0.22, front);
      float scan = 0.5 + 0.5 * sin(vUv.y * uSize.y * 0.32 - uTime * (5.0 + uVel * 34.0));

      // Bright leading edge — sharper when slow, wider + hotter when fast.
      float edge = exp(-abs(front) * (9.0 - uVel * 5.0)) * (0.3 + uVel * 1.5 + uImpact * 1.1);

      // Impact shockwave: a ring radiating from the outer edge midpoint.
      vec2 origin = vec2(uSide > 0.0 ? uSize.x : 0.0, uSize.y * 0.5);
      float dist = distance(vUv * uSize, origin);
      float ringRadius = (1.0 - uImpact) * (uSize.x * 1.35);
      float ring = exp(-abs(dist - ringRadius) * 0.02) * uImpact * 0.8;

      vec3 col = uAccent * (edge * 1.25 + grid * filled * (0.08 + uVel * 0.55) * scan + ring);

      // Master fade: the layer only exists while assembling or while the
      // page is being scrolled hard — at rest the panels are clean DOM.
      float master = clamp((1.0 - uProgress) * 1.25 + uVel * 1.1 + uImpact * 0.9, 0.0, 1.0);
      master *= smoothstep(0.0, 0.04, uProgress);
      gl_FragColor = vec4(col * master, 1.0);
    }
  `;

  const panels = [];

  function initPanels() {
    [[board, -1], [stage, 1]].forEach(([element, side]) => {
      const material = new THREE.ShaderMaterial({
        vertexShader: PANEL_VERT,
        fragmentShader: PANEL_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uVel: { value: 0 },
          uImpact: { value: 0 },
          uSide: { value: side },
          uSize: { value: new THREE.Vector2(1, 1) },
          uAccent: { value: new THREE.Color('#79f2a8') },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
      mesh.visible = false;
      mesh.renderOrder = 2;
      scene.add(mesh);
      panels.push({ element, mesh, material });
    });
  }

  function updatePanels(time) {
    const active = !compactMedia.matches
      && scroll.eased > 0.001
      && (scroll.current < 0.999 || scroll.vNorm > 0.02 || scroll.impact > 0.02);
    let visible = false;
    for (const panel of panels) {
      if (!active) { panel.mesh.visible = false; continue; }
      const rect = panel.element.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight || rect.width < 2) {
        panel.mesh.visible = false;
        continue;
      }
      panel.mesh.visible = true;
      visible = true;
      panel.mesh.position.set(worldX(rect.left + rect.width / 2), worldY(rect.top + rect.height / 2), 2);
      panel.mesh.scale.set(rect.width, rect.height, 1);
      const u = panel.material.uniforms;
      u.uTime.value = time;
      u.uProgress.value = clamp(scroll.eased, 0, 1.2);
      u.uVel.value = scroll.vNorm;
      u.uImpact.value = scroll.impact;
      u.uSize.value.set(rect.width, rect.height);
      const accentSource = panel.element === stage
        ? getComputedStyle(stage).getPropertyValue('--preview-accent').trim() || '#79f2a8'
        : '#79f2a8';
      u.uAccent.value.set(accentSource);
    }
    return visible;
  }

  /* ------------------------------------------------------------------ *
   * 4. Per-tile wireframes — 15 unique line geometries.
   *    Builders author in a roughly [-1, 1] unit box; the manager scales
   *    them to the hovered tile's rect. Dynamic sub-parts (a clock hand,
   *    a dividing cell) get their own child + update callback.
   * ------------------------------------------------------------------ */
  const lineBuilder = () => {
    const positions = [];
    return {
      positions,
      line(ax, ay, az, bx, by, bz) { positions.push(ax, ay, az, bx, by, bz); },
      polyline(points, close = false) {
        for (let i = 0; i < points.length - 1; i += 1) {
          positions.push(...points[i], ...points[i + 1]);
        }
        if (close && points.length > 2) {
          positions.push(...points[points.length - 1], ...points[0]);
        }
      },
      circle(radius, segments, cx = 0, cy = 0, cz = 0, plane = 'xy', arc = Math.PI * 2, start = 0) {
        const points = [];
        for (let i = 0; i <= segments; i += 1) {
          const a = start + (i / segments) * arc;
          const u = Math.cos(a) * radius;
          const v = Math.sin(a) * radius;
          if (plane === 'xy') points.push([cx + u, cy + v, cz]);
          else if (plane === 'yz') points.push([cx, cy + u, cz + v]);
          else points.push([cx + u, cy, cz + v]);
        }
        this.polyline(points, arc >= Math.PI * 2 - 1e-6);
      },
      geometry() {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
        return geo;
      },
    };
  };

  function boxEdges(builder, w, h, d, cx = 0, cy = 0, cz = 0) {
    const x = w / 2, y = h / 2, z = d / 2;
    const c = [
      [cx - x, cy - y, cz - z], [cx + x, cy - y, cz - z], [cx + x, cy + y, cz - z], [cx - x, cy + y, cz - z],
      [cx - x, cy - y, cz + z], [cx + x, cy - y, cz + z], [cx + x, cy + y, cz + z], [cx - x, cy + y, cz + z],
    ];
    [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
      .forEach(([a, b]) => builder.line(...c[a], ...c[b]));
  }

  // Every builder returns { static: BufferGeometry, dynamic?: { geometry,
  // update(object, time) } }. Keyed by the tile's data-project value.
  const WIREFRAMES = {
    // Life in Time — a clock face whose spiral is the years coiling
    // outward; the hand is dynamic and keeps real time-like motion.
    time() {
      const b = lineBuilder();
      b.circle(1, 56);
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        b.line(Math.cos(a) * 0.88, Math.sin(a) * 0.88, 0, Math.cos(a) * 1, Math.sin(a) * 1, 0);
      }
      const spiral = [];
      for (let i = 0; i <= 90; i += 1) {
        const t = (i / 90) * Math.PI * 4.6;
        spiral.push([Math.cos(t) * (0.06 + t * 0.052), Math.sin(t) * (0.06 + t * 0.052), t * 0.018]);
      }
      b.polyline(spiral);
      const hand = lineBuilder();
      hand.line(0, 0, 0.05, 0, 0.62, 0.05);
      hand.line(0, 0, 0.05, 0.3, -0.12, 0.05);
      return {
        static: b.geometry(),
        dynamic: { geometry: hand.geometry(), update: (obj, t) => { obj.rotation.z = -t * 0.7; } },
      };
    },

    // VFX Portfolio — a camera frustum opening onto a film gate with
    // aperture blades.
    vfx() {
      const b = lineBuilder();
      const apex = [0, 0, 0.95];
      const gate = [[-0.85, -0.58, -0.3], [0.85, -0.58, -0.3], [0.85, 0.58, -0.3], [-0.85, 0.58, -0.3]];
      gate.forEach((corner) => b.line(...apex, ...corner));
      b.polyline(gate, true);
      b.circle(0.44, 40, 0, 0, -0.3);
      const hex = [];
      for (let i = 0; i <= 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        hex.push([Math.cos(a) * 0.28, Math.sin(a) * 0.28, -0.3]);
      }
      b.polyline(hex);
      return { static: b.geometry() };
    },

    // Kids Corner — a small house with a pitched roof and a door.
    kids() {
      const b = lineBuilder();
      boxEdges(b, 1.3, 0.72, 0.9, 0, -0.28, 0);
      const roofL = [-0.72, 0.08, 0], roofR = [0.72, 0.08, 0];
      const ridgeF = [0, 0.62, 0.42], ridgeB = [0, 0.62, -0.42];
      b.line(-0.65, 0.08, 0.45, ...ridgeF); b.line(0.65, 0.08, 0.45, ...ridgeF);
      b.line(-0.65, 0.08, -0.45, ...ridgeB); b.line(0.65, 0.08, -0.45, ...ridgeB);
      b.line(...ridgeF, ...ridgeB);
      b.line(-0.65, 0.08, 0.45, -0.65, 0.08, -0.45); b.line(0.65, 0.08, 0.45, 0.65, 0.08, -0.45);
      b.polyline([[-0.16, -0.64, 0.46], [-0.16, -0.18, 0.46], [0.16, -0.18, 0.46], [0.16, -0.64, 0.46]]);
      return { static: b.geometry() };
    },

    // Women's Health OS — a heart curve inside a cycle ring that
    // breathes (the dynamic pulse).
    health() {
      const b = lineBuilder();
      const heart = [];
      for (let i = 0; i <= 72; i += 1) {
        const t = (i / 72) * Math.PI * 2;
        heart.push([
          (16 * Math.sin(t) ** 3) / 24,
          (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 24,
          0,
        ]);
      }
      b.polyline(heart, true);
      heart.forEach((p, i) => { if (i % 6 === 0) b.line(p[0], p[1], 0, p[0] * 0.96, p[1] * 0.96, -0.16); });
      const ring = lineBuilder();
      ring.circle(1.02, 48);
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        ring.circle(0.05, 8, Math.cos(a) * 1.02, Math.sin(a) * 1.02, 0);
      }
      return {
        static: b.geometry(),
        dynamic: {
          geometry: ring.geometry(),
          update: (obj, t) => { const s = 1 + Math.sin(t * 2.2) * 0.05; obj.scale.set(s, s, 1); },
        },
      };
    },

    // Councils — seven seats in a ring, every voice connected to every
    // other: the complete graph of a round table.
    council() {
      const b = lineBuilder();
      const seats = [];
      for (let i = 0; i < 7; i += 1) {
        const a = (i / 7) * Math.PI * 2 + Math.PI / 2;
        seats.push([Math.cos(a) * 0.88, Math.sin(a) * 0.88, Math.sin(i * 2.4) * 0.12]);
      }
      for (let i = 0; i < 7; i += 1) {
        for (let j = i + 1; j < 7; j += 1) b.line(...seats[i], ...seats[j]);
      }
      seats.forEach(([x, y, z]) => b.circle(0.09, 10, x, y, z));
      return { static: b.geometry() };
    },

    // Library — an open book: two ruled page grids meeting at the spine.
    library() {
      const b = lineBuilder();
      const page = (side) => {
        const tilt = 0.5 * side;
        for (let row = 0; row <= 3; row += 1) {
          const y = -0.45 + row * 0.3;
          b.line(0, y, 0.15, side * 0.95, y + 0.12, 0.15 - Math.abs(tilt) * 0.5);
        }
        for (let col = 1; col <= 3; col += 1) {
          const x = side * 0.95 * (col / 3);
          const z = 0.15 - Math.abs(tilt) * 0.5 * (col / 3);
          b.line(x, -0.45 + 0.12 * (col / 3), z, x, 0.45 + 0.12 * (col / 3), z);
        }
      };
      page(-1); page(1);
      b.line(0, -0.45, 0.15, 0, 0.45, 0.15);
      b.line(0, -0.55, 0.02, 0, 0.35, 0.02);
      return { static: b.geometry() };
    },

    // Calendar Generator — the month grid with one day lit up (dynamic).
    calendar() {
      const b = lineBuilder();
      const w = 1.5, h = 1.1;
      b.polyline([[-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], [w / 2, h / 2, 0], [-w / 2, h / 2, 0]], true);
      b.line(-w / 2, h / 2 - 0.22, 0, w / 2, h / 2 - 0.22, 0);
      for (let col = 1; col < 7; col += 1) {
        const x = -w / 2 + (w / 7) * col;
        b.line(x, -h / 2, 0, x, h / 2 - 0.22, 0);
      }
      for (let row = 1; row < 4; row += 1) {
        const y = -h / 2 + ((h - 0.22) / 4) * row;
        b.line(-w / 2, y, 0, w / 2, y, 0);
      }
      const cell = lineBuilder();
      boxEdges(cell, w / 7 - 0.05, (h - 0.22) / 4 - 0.05, 0.14, -w / 2 + (w / 7) * 3.5, -h / 2 + ((h - 0.22) / 4) * 1.5, 0.07);
      return {
        static: b.geometry(),
        dynamic: {
          geometry: cell.geometry(),
          update: (obj, t) => { obj.position.z = 0.05 + Math.sin(t * 3) * 0.05; },
        },
      };
    },

    // Hyper Trophy OS — a dumbbell: bar, plates, and hex collars.
    muscle() {
      const b = lineBuilder();
      [[-0.02, 0.02], [0.02, 0.02], [0.02, -0.02], [-0.02, -0.02]].forEach(([y, z]) => b.line(-0.52, y, z, 0.52, y, z));
      [-1, 1].forEach((side) => {
        [0.44, 0.34].forEach((radius, index) => {
          const x = side * (0.55 + index * 0.13);
          b.circle(radius, 32, x, 0, 0, 'yz');
          b.circle(radius, 32, x + side * 0.07, 0, 0, 'yz');
          for (let i = 0; i < 6; i += 1) {
            const a = (i / 6) * Math.PI * 2;
            b.line(x, Math.cos(a) * radius, Math.sin(a) * radius, x + side * 0.07, Math.cos(a) * radius, Math.sin(a) * radius);
          }
        });
      });
      return { static: b.geometry() };
    },

    // Manifesto for a Newborn — an unrolling scroll with text rules.
    manifesto() {
      const b = lineBuilder();
      [-1, 1].forEach((side) => {
        b.circle(0.16, 20, side * 0.8, 0.42, 0, 'yz');
        const coil = [];
        for (let i = 0; i <= 30; i += 1) {
          const t = (i / 30) * Math.PI * 3;
          coil.push([side * 0.8, 0.42 + Math.cos(t) * 0.16 * (1 - i / 40), Math.sin(t) * 0.16 * (1 - i / 40)]);
        }
        b.polyline(coil);
      });
      for (let i = 0; i <= 4; i += 1) {
        const x = -0.8 + (i / 4) * 1.6;
        const sag = Math.sin((i / 4) * Math.PI) * 0.12;
        b.line(x, 0.42, 0.16, x, -0.72 - sag * 0.4, 0.16 - sag);
      }
      for (let row = 0; row < 4; row += 1) {
        const y = 0.18 - row * 0.24;
        const sag = 0.05 + row * 0.02;
        b.polyline([[-0.62, y, 0.14], [0, y - sag, 0.1], [0.62, y, 0.14]]);
      }
      return { static: b.geometry() };
    },

    // M.Popova Poetry — a night flower: an eight-petal rose curve cupped
    // in z, on a stem.
    poetry() {
      const b = lineBuilder();
      const rose = [];
      for (let i = 0; i <= 220; i += 1) {
        const t = (i / 220) * Math.PI * 2;
        const r = Math.cos(4 * t);
        rose.push([Math.cos(t) * r * 0.95, Math.sin(t) * r * 0.95 + 0.15, 0.18 * Math.abs(r)]);
      }
      b.polyline(rose);
      b.circle(0.1, 12, 0, 0.15, 0.2);
      b.polyline([[0, 0.05, 0], [0.05, -0.4, 0], [-0.03, -0.85, 0]]);
      b.polyline([[0.02, -0.5, 0], [0.3, -0.62, 0.08], [0.16, -0.42, 0.05], [0.02, -0.5, 0]]);
      return { static: b.geometry() };
    },

    // Power Law Odyssey — axes, the heavy-tail curve as a ribbon, and a
    // histogram: one enormous hit, many ordinary misses.
    power() {
      const b = lineBuilder();
      b.line(-0.9, -0.62, 0, 0.95, -0.62, 0);
      b.line(-0.9, -0.62, 0, -0.9, 0.8, 0);
      const curve = (z) => {
        const points = [];
        for (let i = 0; i <= 60; i += 1) {
          const x = 0.055 + (i / 60) * 1.75;
          points.push([-0.9 + x, -0.62 + Math.min(1.38, 0.16 / x ** 1.35), z]);
        }
        return points;
      };
      const near = curve(0), far = curve(0.14);
      b.polyline(near);
      b.polyline(far);
      near.forEach((p, i) => { if (i % 10 === 0) b.line(...p, ...far[i]); });
      [[0.12, 1.3], [0.34, 0.42], [0.56, 0.2], [0.98, 0.1], [1.5, 0.05]].forEach(([x, height]) => {
        b.polyline([
          [-0.9 + x, -0.62, -0.1], [-0.9 + x, -0.62 + height, -0.1],
          [-0.82 + x, -0.62 + height, -0.1], [-0.82 + x, -0.62, -0.1],
        ]);
      });
      return { static: b.geometry() };
    },

    // Morning News — a broadcast tower with waves rippling out (dynamic).
    news() {
      const b = lineBuilder();
      const legs = [[-0.42, -0.42], [0.42, -0.42], [0.42, 0.42], [-0.42, 0.42]];
      legs.forEach(([x, z]) => b.line(x, -0.75, z, 0, 0.35, 0));
      [0.55, 0.75].forEach((f) => {
        const level = legs.map(([x, z]) => [x * (1 - f), -0.75 + f * 1.1, z * (1 - f)]);
        b.polyline(level, true);
      });
      b.line(0, 0.35, 0, 0, 0.68, 0);
      const waves = lineBuilder();
      [0.2, 0.38, 0.56].forEach((radius) => {
        waves.circle(radius, 22, 0, 0.68, 0, 'xy', Math.PI * 0.7, Math.PI * 0.15);
      });
      return {
        static: b.geometry(),
        dynamic: {
          geometry: waves.geometry(),
          update: (obj, t) => {
            const phase = (t * 0.9) % 1;
            obj.scale.setScalar(0.75 + phase * 0.5);
            obj.material.opacity = obj.userData.baseOpacity * (1 - phase);
          },
        },
      };
    },

    // Replicator Void — a wireframe cell with a daughter cell budding
    // off (dynamic mitosis pulse) inside an orbit ring.
    void() {
      const b = lineBuilder();
      const ico = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.72, 0));
      const array = ico.attributes.position.array;
      for (let i = 0; i < array.length; i += 3) b.positions.push(array[i], array[i + 1], array[i + 2]);
      ico.dispose();
      b.circle(1.05, 48, 0, 0, 0, 'xz');
      const bud = lineBuilder();
      const small = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.3, 0));
      const smallArray = small.attributes.position.array;
      for (let i = 0; i < smallArray.length; i += 3) bud.positions.push(smallArray[i], smallArray[i + 1], smallArray[i + 2]);
      small.dispose();
      return {
        static: b.geometry(),
        dynamic: {
          geometry: bud.geometry(),
          update: (obj, t) => {
            const cycle = 0.5 + 0.5 * Math.sin(t * 1.6);
            obj.position.set(0.55 + cycle * 0.35, 0.4 + cycle * 0.25, 0.1);
            obj.scale.setScalar(0.55 + cycle * 0.65);
          },
        },
      };
    },

    // Multiply Magic Studio — two beams crossed into a ×, with orbiting
    // product dots at the corners.
    multiply() {
      const b = lineBuilder();
      [Math.PI / 4, -Math.PI / 4].forEach((angle) => {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const local = lineBuilder();
        boxEdges(local, 1.7, 0.26, 0.26);
        for (let i = 0; i < local.positions.length; i += 3) {
          const x = local.positions[i], y = local.positions[i + 1];
          b.positions.push(x * cos - y * sin, x * sin + y * cos, local.positions[i + 2]);
        }
      });
      [[-0.95, 0], [0.95, 0], [0, 0.95], [0, -0.95]].forEach(([x, y]) => {
        b.polyline([[x, y + 0.09, 0], [x + 0.09, y, 0], [x, y - 0.09, 0], [x - 0.09, y, 0]], true);
      });
      return { static: b.geometry() };
    },

    // Math Forest — a recursive fractal tree: mathematics growing.
    math() {
      const b = lineBuilder();
      const grow = (x, y, z, angle, tilt, length, depth) => {
        const nx = x + Math.cos(angle) * length;
        const ny = y + Math.sin(angle) * length;
        const nz = z + tilt * length * 0.4;
        b.line(x, y, z, nx, ny, nz);
        if (depth === 0) return;
        grow(nx, ny, nz, angle + 0.52, -tilt, length * 0.72, depth - 1);
        grow(nx, ny, nz, angle - 0.44, tilt, length * 0.72, depth - 1);
      };
      grow(0, -0.95, 0, Math.PI / 2, 0.5, 0.55, 4);
      return { static: b.geometry() };
    },
  };

  const tiles = [];

  function initTiles() {
    portals.forEach((portal) => {
      const key = portal.dataset.project;
      const build = WIREFRAMES[key];
      if (!build) return;
      const accent = portal.style.getPropertyValue('--accent').trim() || '#79f2a8';
      const built = build();
      const group = new THREE.Group();
      group.visible = false;
      const makeMaterial = (opacity) => new THREE.LineBasicMaterial({
        color: new THREE.Color(accent),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      });
      const mainLines = new THREE.LineSegments(built.static, makeMaterial());
      mainLines.userData.baseOpacity = 0.85;
      group.add(mainLines);
      const parts = [mainLines];
      let dynamic = null;
      if (built.dynamic) {
        dynamic = new THREE.LineSegments(built.dynamic.geometry, makeMaterial());
        dynamic.userData.baseOpacity = 0.85;
        group.add(dynamic);
        parts.push(dynamic);
      }
      group.renderOrder = 3;
      scene.add(group);
      const tile = {
        element: portal,
        group,
        parts,
        dynamicUpdate: built.dynamic ? built.dynamic.update : null,
        dynamicObject: dynamic,
        alpha: 0,
        target: 0,
        seed: Math.random() * Math.PI * 2,
      };
      tiles.push(tile);

      const show = () => { tiles.forEach((t) => { t.target = t === tile ? 1 : 0; }); };
      const hide = () => { tile.target = 0; };
      portal.addEventListener('pointerenter', () => { if (!coarseMedia.matches) show(); });
      portal.addEventListener('pointerleave', () => { if (!coarseMedia.matches) hide(); });
      portal.addEventListener('focus', show);
      portal.addEventListener('blur', hide);
      // Touch equivalent: tapping a tile (which selects it) wakes its
      // wireframe; tapping another moves the hologram there.
      portal.addEventListener('click', () => { if (coarseMedia.matches) show(); });
    });
  }

  const easeOutBack = (t) => 1 + 2.7 * ((t - 1) ** 3) + 1.7 * ((t - 1) ** 2);

  function updateTiles(time, dt) {
    let visible = false;
    for (const tile of tiles) {
      tile.alpha += (tile.target - tile.alpha) * clamp(dt * 7.5, 0, 1);
      if (tile.alpha < 0.012 && tile.target === 0) {
        tile.group.visible = false;
        continue;
      }
      const rect = tile.element.getBoundingClientRect();
      if (rect.bottom < -40 || rect.top > innerHeight + 40) {
        tile.group.visible = false;
        continue;
      }
      tile.group.visible = true;
      visible = true;
      const scale = Math.min(rect.height, 150) * 0.62 * (0.82 + 0.18 * easeOutBack(clamp(tile.alpha, 0, 1)));
      tile.group.position.set(worldX(rect.left + rect.width / 2), worldY(rect.top + rect.height / 2), 30);
      tile.group.scale.setScalar(scale);
      tile.group.rotation.y = time * 0.55 + tile.seed + (1 - tile.alpha) * 0.7;
      tile.group.rotation.x = Math.sin(time * 0.7 + tile.seed) * 0.12 - 0.12;
      for (const part of tile.parts) part.material.opacity = part.userData.baseOpacity * tile.alpha;
      if (tile.dynamicUpdate) tile.dynamicUpdate(tile.dynamicObject, time + tile.seed);
    }
    return visible;
  }

  /* ------------------------------------------------------------------ *
   * 5. Hero shape burst.
   *    Faces: 3 InstancedMeshes (box / octa / tetra), per-instance color
   *    doubling as brightness (additive blending). Edges: ONE merged
   *    LineSegments rebuilt on the CPU each frame (~26 shapes, cheap).
   * ------------------------------------------------------------------ */
  const HERO_ACCENTS = ['#79f2a8', '#7ee2ff', '#a282ff', '#ffd15a', '#ff7fb0', '#70eade', '#ffc258', '#51ebff'];
  const HERO_COUNT = 26;
  const hero = { shapes: [], meshes: [], edges: null, edgePositions: null, edgeColors: null };
  const HERO_TYPES = [
    { geo: () => new THREE.BoxGeometry(1, 1, 1) },
    { geo: () => new THREE.OctahedronGeometry(0.72, 0) },
    { geo: () => new THREE.TetrahedronGeometry(0.85, 0) },
  ];

  function heroSpawnPosition() {
    // Landing-local coordinates; keep shapes out of the title column so
    // the type stays readable.
    const margin = 60;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const x = margin + Math.random() * (innerWidth - margin * 2);
      const y = 40 + Math.random() * (innerHeight * 0.92);
      const cx = innerWidth / 2;
      if (Math.abs(x - cx) < innerWidth * 0.24 && y > innerHeight * 0.2 && y < innerHeight * 0.78) continue;
      return { x, y };
    }
    return { x: margin, y: margin };
  }

  function initHero() {
    const faceMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const perType = Math.ceil(HERO_COUNT / HERO_TYPES.length);
    let edgeVertexTotal = 0;
    HERO_TYPES.forEach((type, typeIndex) => {
      const geometry = type.geo();
      const mesh = new THREE.InstancedMesh(geometry, faceMaterial.clone(), perType);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.renderOrder = 1;
      mesh.frustumCulled = false;
      scene.add(mesh);
      hero.meshes.push(mesh);
      const edgeGeometry = new THREE.EdgesGeometry(geometry);
      const baseEdges = Array.from(edgeGeometry.attributes.position.array);
      edgeGeometry.dispose();
      let used = 0;
      for (let i = 0; i < perType && hero.shapes.length < HERO_COUNT; i += 1) {
        used += 1;
        const spawn = heroSpawnPosition();
        hero.shapes.push({
          typeIndex,
          instanceIndex: i,
          baseEdges,
          local: spawn,
          size: 16 + Math.random() * 26,
          drift: Math.random() * Math.PI * 2,
          accent: new THREE.Color(HERO_ACCENTS[Math.floor(Math.random() * HERO_ACCENTS.length)]),
          idleColor: new THREE.Color('#9db8a5'),
          spinAxis: new THREE.Vector3().randomDirection(),
          spinAxis2: new THREE.Vector3().randomDirection(),
          state: 'idle',
          t: Math.random() * 5,
          cooldown: 0,
        });
        edgeVertexTotal += baseEdges.length / 3;
      }
      // HERO_COUNT rarely divides evenly; an untouched instance would
      // render as an identity-matrix artifact at screen center.
      mesh.count = used;
    });
    hero.edgePositions = new Float32Array(edgeVertexTotal * 3);
    hero.edgeColors = new Float32Array(edgeVertexTotal * 3);
    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute('position', new THREE.BufferAttribute(hero.edgePositions, 3).setUsage(THREE.DynamicDrawUsage));
    edgeGeometry.setAttribute('color', new THREE.BufferAttribute(hero.edgeColors, 3).setUsage(THREE.DynamicDrawUsage));
    hero.edges = new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    hero.edges.frustumCulled = false;
    hero.edges.renderOrder = 1;
    scene.add(hero.edges);
  }

  const pointer = { x: -9999, y: -9999, seen: false };
  window.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.seen = true;
  }, { passive: true });

  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);

  const heroMatrix = new THREE.Matrix4();
  const heroQuat = new THREE.Quaternion();
  const heroQuat2 = new THREE.Quaternion();
  const heroScale = new THREE.Vector3();
  const heroPos = new THREE.Vector3();
  const heroColor = new THREE.Color();
  const heroFaceColor = new THREE.Color();
  const heroVec = new THREE.Vector3();

  function updateHero(time, dt) {
    const rect = landing.getBoundingClientRect();
    if (rect.bottom < -80) {
      hero.meshes.forEach((mesh) => { mesh.visible = false; });
      hero.edges.visible = false;
      return false;
    }
    hero.meshes.forEach((mesh) => { mesh.visible = true; });
    hero.edges.visible = true;

    let edgeCursor = 0;
    for (const shape of hero.shapes) {
      shape.t += dt;
      // Screen position: shapes are pinned to the landing section so they
      // scroll away with it.
      const sx = shape.local.x + Math.sin(time * 0.4 + shape.drift) * 14;
      const sy = rect.top + shape.local.y + Math.cos(time * 0.33 + shape.drift * 1.7) * 10;

      // --- choreography state machine -------------------------------
      let brightness = 0.1;
      let scaleAll = 1;
      let flat = 1;
      let extraRotation = 0;
      heroColor.copy(shape.idleColor);

      if (shape.state === 'idle') {
        shape.cooldown = Math.max(0, shape.cooldown - dt);
        const distance = pointer.seen ? Math.hypot(pointer.x - sx, pointer.y - sy) : Infinity;
        if (distance < 130 && shape.cooldown === 0) {
          shape.state = 'act';
          shape.t = 0;
        }
        brightness = 0.1 + Math.sin(time * 1.3 + shape.drift) * 0.04;
      } else if (shape.state === 'act') {
        const IGNITE = 0.2, SPIN = 1.0, FLATTEN = 0.3, FADE = 0.24;
        const t = shape.t;
        if (t < IGNITE) {
          // Colorize + fade in.
          const k = t / IGNITE;
          heroColor.copy(shape.idleColor).lerp(shape.accent, k);
          brightness = lerp(0.1, 1, k);
        } else if (t < IGNITE + SPIN) {
          // 360° on two axes, scale up then back.
          const k = easeInOutCubic((t - IGNITE) / SPIN);
          heroColor.copy(shape.accent);
          brightness = 1;
          extraRotation = k * Math.PI * 2;
          scaleAll = 1 + Math.sin(k * Math.PI) * 0.62;
        } else if (t < IGNITE + SPIN + FLATTEN) {
          // Compress to a 2D plane.
          const k = (t - IGNITE - SPIN) / FLATTEN;
          heroColor.copy(shape.accent);
          brightness = 1;
          extraRotation = Math.PI * 2;
          flat = 1 - easeInOutCubic(k) * 0.985;
        } else if (t < IGNITE + SPIN + FLATTEN + FADE) {
          const k = (t - IGNITE - SPIN - FLATTEN) / FADE;
          heroColor.copy(shape.accent);
          brightness = 1 - k;
          extraRotation = Math.PI * 2;
          flat = 0.015;
        } else {
          shape.state = 'gone';
          shape.t = 0;
          shape.respawnDelay = 1.2 + Math.random() * 2.4;
        }
      } else if (shape.state === 'gone') {
        brightness = 0;
        if (shape.t > shape.respawnDelay) {
          shape.local = heroSpawnPosition();
          shape.accent = new THREE.Color(HERO_ACCENTS[Math.floor(Math.random() * HERO_ACCENTS.length)]);
          shape.spinAxis.randomDirection();
          shape.spinAxis2.randomDirection();
          shape.state = 'idle';
          shape.t = 0;
          shape.cooldown = 0.6;
        }
      }

      // --- compose transform ----------------------------------------
      heroPos.set(worldX(sx), worldY(sy), -40);
      const idleSpin = time * 0.22 + shape.drift;
      heroQuat.setFromAxisAngle(shape.spinAxis, idleSpin + extraRotation);
      heroQuat2.setFromAxisAngle(shape.spinAxis2, extraRotation * 0.85);
      heroQuat.multiply(heroQuat2);
      heroScale.set(shape.size * scaleAll, shape.size * scaleAll, shape.size * scaleAll * flat);
      heroMatrix.compose(heroPos, heroQuat, heroScale);

      const mesh = hero.meshes[shape.typeIndex];
      mesh.setMatrixAt(shape.instanceIndex, heroMatrix);
      // Face brightness runs dimmer than edges so shapes read as glass.
      heroFaceColor.copy(heroColor).multiplyScalar(brightness * 0.16);
      mesh.setColorAt(shape.instanceIndex, heroFaceColor);

      // --- merged edge buffer ----------------------------------------
      const base = shape.baseEdges;
      const positions = hero.edgePositions;
      const colors = hero.edgeColors;
      const r = heroColor.r * brightness, g = heroColor.g * brightness, bch = heroColor.b * brightness;
      for (let i = 0; i < base.length; i += 3) {
        heroVec.set(base[i], base[i + 1], base[i + 2]).applyMatrix4(heroMatrix);
        positions[edgeCursor] = heroVec.x;
        colors[edgeCursor] = r;
        positions[edgeCursor + 1] = heroVec.y;
        colors[edgeCursor + 1] = g;
        positions[edgeCursor + 2] = heroVec.z;
        colors[edgeCursor + 2] = bch;
        edgeCursor += 3;
      }
    }

    hero.meshes.forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    hero.edges.geometry.attributes.position.needsUpdate = true;
    hero.edges.geometry.attributes.color.needsUpdate = true;
    return true;
  }

  /* ------------------------------------------------------------------ *
   * 6. Frame loop + lifecycle.
   * ------------------------------------------------------------------ */
  let running = false;
  let frameHandle = 0;
  let lastTime = 0;
  const stats = { fps: 60 };

  function frame(now) {
    frameHandle = 0;
    const time = now / 1000;
    const dt = clamp(lastTime ? time - lastTime : 1 / 60, 0.001, 1 / 20);
    lastTime = time;
    stats.fps = lerp(stats.fps, 1 / dt, 0.05);

    updateScrollPhysics(dt);

    if (renderer) {
      const panelsVisible = updatePanels(time);
      const tilesVisible = updateTiles(time, dt);
      const heroVisible = updateHero(time, dt);
      if (panelsVisible || tilesVisible || heroVisible) {
        renderer.render(scene, camera);
      } else {
        renderer.clear();
      }
    }

    if (running && !document.hidden) schedule();
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

  function stop() {
    running = false;
    if (frameHandle) cancelAnimationFrame(frameHandle);
    frameHandle = 0;
  }

  function boot() {
    if (reduced()) {
      // CSS's reduced-motion rules present the assembled state; make sure
      // no stale inline vars (e.g. from the inline fallback) override them.
      root.style.removeProperty('--assembly');
      root.style.removeProperty('--assembly-e');
      return;
    }
    if (!renderer) {
      if (initRenderer()) {
        initPanels();
        initTiles();
        initHero();
        window.addEventListener('resize', resizeRenderer, { passive: true });
      }
    }
    if (canvas) canvas.style.display = '';
    start();
  }

  function shutdown() {
    stop();
    if (canvas) canvas.style.display = 'none';
    root.style.removeProperty('--assembly');
    root.style.removeProperty('--assembly-e');
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
    panels,
    tiles,
    hero,
    get webgl() { return Boolean(renderer); },
    tick(now) { stop(); frame(now); },
    resume() { if (!reduced()) start(); },
  };

  boot();
})();
