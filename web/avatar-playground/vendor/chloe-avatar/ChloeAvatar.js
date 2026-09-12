/**
 * ChloeAvatar.js — Chloe's living dot-cloud avatar.
 *
 * A cloud of 50–120 dots drifting through an evolving 3D simplex-noise field,
 * connected by an ever-shifting web of proximity lines. Five states (idle,
 * thinking, excited, wandering, transmitting), stochastic neuron fire with
 * cascading avalanches, and symbol formation (? ✓ … !).
 *
 * No framework dependencies. Requires THREE (r120+) and CHLOE_SHADERS to be
 * loaded first (plain <script> tags), or resolvable via require().
 *
 *   const avatar = new ChloeAvatar(canvasOrContainer, { quality: 'high' });
 *   avatar.setState('thinking', { intensity: 0.7 });
 *   avatar.showSymbol('?');
 *   avatar.pulse('transmit');
 *   avatar.setAudioLevel(0.8);
 *   avatar.destroy();
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('three'), require('./shaders/chloe-shaders.js'));
  } else {
    root.ChloeAvatar = factory(root.THREE, root.CHLOE_SHADERS);
  }
})(typeof self !== 'undefined' ? self : this, function (THREE, SHADERS) {
  'use strict';

  if (!THREE) throw new Error('ChloeAvatar: THREE not found — load three.min.js first');
  if (!SHADERS) throw new Error('ChloeAvatar: CHLOE_SHADERS not found — load shaders/chloe-shaders.js first');

  /* ────────────────────────────────────────────────────────────
     Seeded PRNG (mulberry32) — deterministic runs, debuggable art
  ──────────────────────────────────────────────────────────── */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ────────────────────────────────────────────────────────────
     Per-dot morph easing — a flock, not a switch. Each dot owns one
     of three curves for the whole session; formations and state
     changes ripple through mixed temperaments instead of moving in
     lockstep. Type 1 overshoots ~10% (clamped visually in-shader).
  ──────────────────────────────────────────────────────────── */
  function easeMorph(type, u) {
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    if (type === 0) {              // cubic in-out — the steady ones
      return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    }
    if (type === 1) {              // light spring — arrives with a small flourish
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
    }
    return 1 - Math.pow(1 - u, 4); // quart out — eager starters, soft landing
  }

  /* ────────────────────────────────────────────────────────────
     3D simplex noise (Gustavson/Wagner), seeded permutation table
  ──────────────────────────────────────────────────────────── */
  const F3 = 1 / 3, G3 = 1 / 6;
  const GRAD3 = new Float32Array([
    1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
    1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
    0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1,
  ]);

  function makeNoise3D(rand) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = (rand() * (i + 1)) | 0;
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    const perm = new Uint8Array(512);
    const permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
      permMod12[i] = perm[i] % 12;
    }

    return function noise3(x, y, z) {
      const s = (x + y + z) * F3;
      const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
      const t = (i + j + k) * G3;
      const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t);

      let i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) {
        if (y0 >= z0)      { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
        else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
        else               { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
      } else {
        if (y0 < z0)       { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
        else if (x0 < z0)  { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
        else               { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      }

      const x1 = x0 - i1 + G3,     y1 = y0 - j1 + G3,     z1 = z0 - k1 + G3;
      const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
      const x3 = x0 - 1 + 3 * G3,  y3 = y0 - 1 + 3 * G3,  z3 = z0 - 1 + 3 * G3;

      const ii = i & 255, jj = j & 255, kk = k & 255;
      let n = 0;

      let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
      if (t0 > 0) {
        const g = permMod12[ii + perm[jj + perm[kk]]] * 3;
        t0 *= t0;
        n += t0 * t0 * (GRAD3[g] * x0 + GRAD3[g + 1] * y0 + GRAD3[g + 2] * z0);
      }
      let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
      if (t1 > 0) {
        const g = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
        t1 *= t1;
        n += t1 * t1 * (GRAD3[g] * x1 + GRAD3[g + 1] * y1 + GRAD3[g + 2] * z1);
      }
      let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
      if (t2 > 0) {
        const g = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
        t2 *= t2;
        n += t2 * t2 * (GRAD3[g] * x2 + GRAD3[g + 1] * y2 + GRAD3[g + 2] * z2);
      }
      let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
      if (t3 > 0) {
        const g = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
        t3 *= t3;
        n += t3 * t3 * (GRAD3[g] * x3 + GRAD3[g + 1] * y3 + GRAD3[g + 2] * z3);
      }
      return 32 * n; // ~[-1, 1]
    };
  }

  /* ────────────────────────────────────────────────────────────
     Symbol point clouds — sampled strokes, normalized ~[-0.6, 0.7]
  ──────────────────────────────────────────────────────────── */
  function samplePolyline(pts, n) {
    const segLen = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1];
      const l = Math.sqrt(dx * dx + dy * dy);
      segLen.push(l); total += l;
    }
    const out = [];
    for (let k = 0; k < n; k++) {
      let d = (n === 1) ? 0 : (k / (n - 1)) * total;
      let i = 0;
      while (i < segLen.length - 1 && d > segLen[i]) { d -= segLen[i]; i++; }
      const f = segLen[i] > 0 ? d / segLen[i] : 0;
      out.push([
        pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f,
        pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f,
      ]);
    }
    return out;
  }

  function sampleArc(cx, cy, r, a0, a1, n) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const a = a0 + (a1 - a0) * (k / (n - 1));
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return out;
  }

  function dotCluster(cx, cy, r, n) {
    const out = [[cx, cy]];
    for (let k = 1; k < n; k++) {
      const a = ((k - 1) / (n - 1)) * Math.PI * 2;
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return out;
  }

  function buildSymbols() {
    // Each symbol is an ordered list of STROKES (ordered point runs) so the
    // sketch renderer can draw "thought lines" along consecutive glyph dots.
    const S = {};
    S['?'] = [
      sampleArc(0, 0.40, 0.30, Math.PI, -Math.PI * 0.33, 15),
      samplePolyline([[0.14, 0.12], [0.02, 0.02], [0, -0.10]], 5),
      dotCluster(0, -0.44, 0.045, 5),
    ];
    S['check'] = [samplePolyline([[-0.44, 0.06], [-0.11, -0.32], [0.48, 0.40]], 15)];
    S['ellipsis'] = [
      dotCluster(-0.42, 0, 0.055, 5),
      dotCluster(0,     0, 0.055, 5),
      dotCluster(0.42,  0, 0.055, 5),
    ];
    S['!'] = [
      samplePolyline([[0, 0.55], [0, -0.12]], 10),
      dotCluster(0, -0.44, 0.05, 5),
    ];
    S['smiley'] = [
      dotCluster(-0.22, 0.28, 0.05, 5),                               // left eye
      dotCluster(0.22, 0.28, 0.05, 5),                                // right eye
      sampleArc(0, 0.08, 0.42, -Math.PI * 0.85, -Math.PI * 0.15, 14), // mouth
    ];
    S['heart'] = [
      samplePolyline([
        [0, -0.45], [-0.42, 0.05], [-0.38, 0.28], [-0.20, 0.38],
        [0, 0.22], [0.20, 0.38], [0.38, 0.28], [0.42, 0.05], [0, -0.45],
      ], 22),
    ];
    // Aliases
    S['✓'] = S['check'];       // ✓
    S['…'] = S['ellipsis'];    // …
    S['...'] = S['ellipsis'];
    S[':)'] = S['smiley'];
    S['☺'] = S['smiley'];
    S['♡'] = S['heart'];
    return S;
  }
  const SYMBOLS = buildSymbols();

  /* ────────────────────────────────────────────────────────────
     Expression vocabulary — Chloe's own gestures, by name.
     This is the seam for the directive channel: today the client
     calls setExpression() when it decides she should react; the
     long-term intent is that Chloe's brain sends these herself
     (and eventually curates this table). Names describe HER
     expression, never the emotion she is responding to.
  ──────────────────────────────────────────────────────────── */
  const EXPRESSIONS = {
    warmth:    { symbol: '♡' },          // moved, comforting, glad you're here
    delight:   { symbol: '☺' },          // openly pleased
    curiosity: { symbol: '?' },          // wondering, wanting more
    surprise:  { symbol: '!' },          // struck by something
    pondering: { symbol: '…' },          // taking a moment, holding space
    affirm:    { symbol: '✓' },          // understood, settled, done
    calm:      { state: 'idle' },        // settled presence
    attentive: { state: 'listening' },   // leaning in
    energized: { state: 'excited' },     // lit up
  };

  const SYMBOL_SCALE = 1.9;         // world units per symbol unit
  // per-symbol stroke roughness — '?' asked to be jagged, '…' stays tidy
  const SYMBOL_ROUGHNESS = { '?': 0.055, 'check': 0.035, '✓': 0.035, 'ellipsis': 0.015, '…': 0.015, '...': 0.015, '!': 0.035,
    'smiley': 0.030, ':)': 0.030, '☺': 0.030, 'heart': 0.035, '♡': 0.035 };

  /* ────────────────────────────────────────────────────────────
     State definitions — every animated property routes through these
  ──────────────────────────────────────────────────────────── */
  const STATES = {
    idle: {
      speed: 0.06, noiseAmp: 1.0, noiseFreq: 0.85, noiseEvo: 0.10,
      radius: 1.15, centerK: 0.6, centerPull: 0, orbit: 0.22, jitter: 0.12,
      dartRate: 0.020, dwell: 0.55, cohesion: 0.5, align: 0.3,
      breatheAmp: 0.050, breathePeriod: 4.0,
      lineThreshold: 0.38, lineOpacity: 0.28,
      fireRate: 0, dotOpacity: 0.95, haloIntensity: 0.42,
      colorA: 0x6B8CAE, colorB: 0x4A6FA5,
    },
    listening: {
      speed: 0.09, noiseAmp: 0.9, noiseFreq: 0.9, noiseEvo: 0.14,
      radius: 1.0, centerK: 0.9, centerPull: 0, orbit: 0.30, jitter: 0.25,
      dartRate: 0.030, dwell: 0.62, cohesion: 0.7, align: 0.45,
      breatheAmp: 0.050, breathePeriod: 3.0,
      lineThreshold: 0.36, lineOpacity: 0.30,
      fireRate: 0, dotOpacity: 1.0, haloIntensity: 0.60,
      colorA: 0x4FB3A1, colorB: 0x77D0C0,
    },
    thinking: {
      // still, inward, connective: no jitter, dots settle toward the center
      // without ever reaching it (inner void), and link up as they gather
      speed: 0.08, noiseAmp: 0.9, noiseFreq: 1.1, noiseEvo: 0.22,
      radius: 0.72, centerK: 2.0, centerPull: 0.10, orbit: 0.38, jitter: 0.06,
      dartRate: 0.040, dwell: 0.65, cohesion: 1.3, align: 0.3,
      breatheAmp: 0.030, breathePeriod: 2.6,
      lineThreshold: 0.24, lineOpacity: 0.32,
      fireRate: 2.0, /* + 3 × intensity, applied at runtime */
      dotOpacity: 0.9, haloIntensity: 0.55,
      colorA: 0x3D52A0, colorB: 0x5566C4,
    },
    excited: {
      speed: 0.42, noiseAmp: 2.0, noiseFreq: 0.8, noiseEvo: 0.34,
      radius: 1.2, centerK: 2.6, centerPull: 0, orbit: 0.55, jitter: 0.9,
      dartRate: 0.150, dwell: 0.10, cohesion: 0.45, align: 0.8,
      breatheAmp: 0.065, breathePeriod: 2.2,
      lineThreshold: 0.40, lineOpacity: 0.34,
      fireRate: 0, dotOpacity: 1.0, haloIntensity: 0.75,
      colorA: 0xE8A045, colorB: 0xF4C842,
    },
    wandering: {
      speed: 0.045, noiseAmp: 0.7, noiseFreq: 0.8, noiseEvo: 0.08,
      radius: 1.15, centerK: 0.5, centerPull: 0, orbit: 0.10, jitter: 0.08,
      dartRate: 0.008, dwell: 0.70, cohesion: 0.35, align: 0.2,
      breatheAmp: 0.040, breathePeriod: 5.0,
      lineThreshold: 0.33, lineOpacity: 0.18,
      fireRate: 0, dotOpacity: 0.85, haloIntensity: 0.35,
      colorA: 0x5C8A8A, colorB: 0x4E7878,
    },
    speaking: {
      // outward and vocal: the cloud spreads wide and moves with energy;
      // streamed audio amplitude rides on top (breathe + motion kick)
      speed: 0.20, noiseAmp: 1.3, noiseFreq: 0.85, noiseEvo: 0.20,
      radius: 1.35, centerK: 0.8, centerPull: 0, orbit: 0.35, jitter: 0.35,
      dartRate: 0.070, dwell: 0.30, cohesion: 0.5, align: 0.55,
      breatheAmp: 0.075, breathePeriod: 2.4,
      lineThreshold: 0.40, lineOpacity: 0.30,
      fireRate: 0, dotOpacity: 1.0, haloIntensity: 0.70,
      colorA: 0xE8DCC8, colorB: 0xF5EFE0,
    },
    transmitting: {
      speed: 0.16, noiseAmp: 1.0, noiseFreq: 0.85, noiseEvo: 0.16,
      radius: 1.1, centerK: 0.6, centerPull: 0, orbit: 0.30, jitter: 0.3,
      dartRate: 0.050, dwell: 0.30, cohesion: 0.7, align: 0.5,
      breatheAmp: 0.045, breathePeriod: 3.4,
      lineThreshold: 0.36, lineOpacity: 0.30,
      fireRate: 0, dotOpacity: 1.0, haloIntensity: 0.85,
      colorA: 0x4CAF50, colorB: 0x6BC77A,
    },
  };

  const BLENDED_KEYS = [
    'speed', 'noiseAmp', 'noiseFreq', 'noiseEvo', 'radius', 'centerK', 'centerPull',
    'orbit', 'jitter', 'dartRate', 'dwell', 'cohesion', 'align',
    'breatheAmp', 'breathePeriod', 'lineThreshold', 'lineOpacity',
    'fireRate', 'dotOpacity', 'haloIntensity',
  ];

  const QUALITY_DOTS = { high: 120, medium: 80, low: 50 };
  const N_MAX = 120;
  const MAX_SEGMENTS = 1600;

  const FIRE_RISE = 0.05, FIRE_DECAY = 0.22;      // neuron flash envelope (s)
  const LINE_FIRE_FADE = 0.15;                     // synced-line flash (s)
  const COINCIDENCE_WINDOW = 0.10;                 // two fires within this → line fires
  const PULSE_DURATION = 1.2;                      // transmit wave travel time (s)
  const TRANSMIT_TOTAL = 1.5;                      // full transmit state duration (s)
  const CAMERA_Z = 5.2, CAMERA_FOV = 42;

  function detectMobile() {
    return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ||
      (Math.min(screen.width, screen.height) < 768);
  }

  /* ════════════════════════════════════════════════════════════
     ChloeAvatar
  ════════════════════════════════════════════════════════════ */
  class ChloeAvatar {
    constructor(target, opts = {}) {
      this.opts = opts;
      this.rand = mulberry32(opts.seed != null ? opts.seed : 0xC10E);
      this.noise3 = makeNoise3D(mulberry32((opts.seed != null ? opts.seed : 0xC10E) ^ 0x9E37));

      /* ── canvas ── */
      if (target && target.tagName === 'CANVAS') {
        this.canvas = target;
        this._ownsCanvas = false;
      } else {
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = 'display:block;width:100%;height:100%;';
        target.appendChild(this.canvas);
        this._ownsCanvas = true;
      }

      /* ── quality ── */
      const q = opts.quality || (detectMobile() ? 'low' : 'high');
      this.quality = QUALITY_DOTS[q] ? q : 'high';
      this.targetCount = QUALITY_DOTS[this.quality];
      this.activeCount = this.targetCount;
      this.targetFPS = detectMobile() ? 30 : 60;

      /* ── reduced motion ── */
      this._mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
      this.motionScale = (this._mq && this._mq.matches) ? 0.25 : 1.0;
      this._onMQ = () => { this.motionScale = this._mq.matches ? 0.25 : 1.0; };
      if (this._mq && this._mq.addEventListener) this._mq.addEventListener('change', this._onMQ);

      /* ── three.js scene ── */
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas, antialias: true, alpha: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setClearColor(0x000000, 0);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 50);
      this.camera.position.z = CAMERA_Z;

      this.group = new THREE.Group();   // breathes via scale
      this.scene.add(this.group);

      this._buildSimulation();
      this._buildDots();
      this._buildLines();
      this._buildHalo();
      this.halo.scale.setScalar(opts.cloudScale != null ? opts.cloudScale : 0.35);

      /* ── state machine ── */
      // per-instance copy — every state rule is runtime-tunable (setTuning)
      this.states = JSON.parse(JSON.stringify(STATES));
      this.stateName = 'idle';
      this.prevStateName = 'idle';
      this.thinkingIntensity = 0.5;
      this.cur = {};                 // blended live parameters
      const s0 = this.states.idle;
      for (const k of BLENDED_KEYS) this.cur[k] = s0[k];
      this.colorA = new THREE.Color(s0.colorA);
      this.colorB = new THREE.Color(s0.colorB);
      this._tgtColorA = new THREE.Color(s0.colorA);
      this._tgtColorB = new THREE.Color(s0.colorB);
      this._excited = this.states.excited;

      /* ── dynamics bookkeeping ── */
      this.time = 0;
      // Phase accumulators — breathing and field evolution integrate dt·rate.
      // (Multiplying absolute time by a blending rate makes the phase jump on
      // every state change — the source of the transition shudder.)
      this._breathePhase = 0;
      this._fieldT = 0;
      this.cloudScale = opts.cloudScale != null ? opts.cloudScale : 0.35;
      // compact clouds need a touch more luminance — but stay starlike, not glowy
      this._dotBoost = 1 + Math.max(0, 1 - this.cloudScale) * 0.35;
      this._glowScale = 1;   // runtime-tunable via setTuning
      this._sizeScale = 1;
      this._lastNow = performance.now();
      this.audioLevel = 0;
      this._audioSm = 0;
      this.symbol = null;
      this.pulseStart = -10;
      this._transmitUntil = -1;
      this._stateAge = 0;
      this._wanderSymbolArmed = false;
      this.recentFires = [];         // {i, t}
      this.lineFires = [];           // {a, b, t}
      this.pendingFires = [];        // {i, t} cascade queue
      this._activeFireCount = 0;
      this._fromParams = null;       // outgoing state snapshot during recruitment
      this._transT0 = -10;
      this._meanEngage = 1;
      this._reactT = -10;            // state-change acknowledgment flash
      this._react = 0;
      this.synapses = [];            // long-range faint bonds {a, b, t0, ttl}
      this._sheetNext = 6 + this.rand() * 8;   // next idle heat-lightning
      this._lineFrameSkip = 0;

      /* ── fps ── */
      this._fpsEMA = 60;
      this._adaptTimer = 0;

      /* ── resize ── */
      this._resize();
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(this.canvas.parentElement || this.canvas);

      /* ── go ── */
      this._destroyed = false;
      this._raf = requestAnimationFrame((t) => this._tick(t));
    }

    /* ──────────────────────────────────────────────
       Public API
    ────────────────────────────────────────────── */

    setState(name, o = {}) {
      if (!this.states[name]) { console.warn('[ChloeAvatar] unknown state:', name); return; }
      if (o.intensity != null) this.thinkingIntensity = Math.max(0, Math.min(1, o.intensity));
      if (name === this.stateName) return;

      // leaving wandering releases its sustained '?'
      if (this.stateName === 'wandering' && this.symbol && this.symbol.sustained) this.hideSymbol();

      this.prevStateName = this.stateName;
      this.stateName = name;
      this._stateAge = 0;
      this._wanderSymbolArmed = (name === 'wandering');

      const s = this.states[name];
      this._tgtColorA.setHex(s.colorA);
      this._tgtColorB.setHex(s.colorB);

      // ── recruitment: the new state spreads through the fleet ──
      // Freeze the outgoing look/behavior as "from"; a few far-apart seed
      // dots engage first (each with a soft glow), then engagement spreads
      // by proximity. Every dot blends from→to at its own moment.
      this._fromParams = Object.assign({}, this.cur);
      this._fromColorA = this.colorA.clone();
      this._fromColorB = this.colorB.clone();
      this._transT0 = this.time;
      const n = this.activeCount;
      this.engage.fill(0, 0, N_MAX);
      this.engageStarted.fill(0, 0, N_MAX);
      // greedy far-apart seed pick: first random, then maximize min-distance
      this._reactT = this.time;   // instant acknowledgment — glow + wiggle now,
                                  // deep behavioral change propagates behind it
      const seeds = [(this.rand() * n) | 0];
      for (let k = 0; k < 4; k++) {
        let best = -1, bestD = -1;
        for (let c = 0; c < 12; c++) {
          const cand = (this.rand() * n) | 0;
          let minD = 1e9;
          for (const sd of seeds) {
            const dx = this.pos[cand * 3] - this.pos[sd * 3];
            const dy = this.pos[cand * 3 + 1] - this.pos[sd * 3 + 1];
            minD = Math.min(minD, dx * dx + dy * dy);
          }
          if (minD > bestD) { bestD = minD; best = cand; }
        }
        seeds.push(best);
      }
      for (const sd of seeds) {
        this.engageStarted[sd] = 1;
        this.fireT[sd] = this.time;        // seed glow — the first spark
        this.fireSlow[sd] = 1;
      }

      if (name === 'transmitting') {
        this.pulse('transmit');
        this._transmitUntil = this.time + TRANSMIT_TOTAL;
      } else {
        this._transmitUntil = -1;
      }
    }

    getState() { return this.stateName; }

    setThinkingIntensity(v) { this.thinkingIntensity = Math.max(0, Math.min(1, v)); }

    setAudioLevel(v) { this.audioLevel = Math.max(0, Math.min(1, v)); }

    showSymbol(sym, o = {}) {
      const strokes = SYMBOLS[sym];
      if (!strokes) { console.warn('[ChloeAvatar] unknown symbol:', sym); return; }
      // Sketch, don't typeset: recruit only a sparse subset of path points,
      // scatter them loosely, tilt and roughen the whole glyph — then let
      // thought-lines (drawn in _updateLines) suggest the strokes.
      const rot = (this.rand() - 0.5) * 0.26;              // ±7.5°
      // symbols shrink less than the cloud — a compact avatar still needs
      // a legible glyph, so compensate part of the cloudScale reduction
      const compensate = 1 + Math.max(0, 1 - this.cloudScale) * 0.55;
      const scl = (0.9 + this.rand() * 0.22) * SYMBOL_SCALE * compensate;
      const jag = (SYMBOL_ROUGHNESS[sym] != null ? SYMBOL_ROUGHNESS[sym] : 0.03) * 2;
      const cr = Math.cos(rot), sr = Math.sin(rot);

      // Full point set — quality comes from progressive recruitment, not density cuts
      const targets = [];
      const strokeOf = [];       // stroke id per slot, in path order
      for (let s = 0; s < strokes.length; s++) {
        const st = strokes[s];
        for (let k = 0; k < st.length; k++) {
          const p = st[k];
          const rx = p[0] * cr - p[1] * sr;
          const ry = p[0] * sr + p[1] * cr;
          targets.push([
            (rx + (this.rand() * 2 - 1) * jag) * scl,
            (ry + (this.rand() * 2 - 1) * jag) * scl,
          ]);
          strokeOf.push(s);
        }
      }

      const assign = this._assignSlots(targets);
      const slotDot = new Int16Array(targets.length).fill(-1);
      for (let i = 0; i < this.activeCount; i++) {
        if (assign[i] >= 0) slotDot[assign[i]] = i;
      }

      // Progressive recruitment order: golden-ratio interleave spreads the
      // pioneers across the whole glyph, then joiners densify it evenly.
      const total = targets.length;
      const order = Array.from({ length: total }, (_, k) => k)
        .sort((a, b) => ((a * 0.6180339887) % 1) - ((b * 0.6180339887) % 1));
      const rank = new Int16Array(total);
      for (let r = 0; r < total; r++) rank[order[r]] = r;

      this.symbol = {
        targets,
        assign,
        slotDot,
        strokeOf,
        rank,
        slotOnT: new Float32Array(total).fill(-1),   // when each slot came alive
        active: 0,                                    // recruited slot count
        t0: this.time,
        sustained: !!o.sustained,
        releasing: false,
        releaseT: -1,
        extent: scl * 0.75,
      };
    }

    hideSymbol() {
      if (this.symbol && !this.symbol.releasing) {
        this.symbol.releasing = true;
        this.symbol.releaseT = this.time;
        // drift-kicks now fire per dot at each one's personal release moment
        // (see the symbol channel in _simulate) — no simultaneous scatter
        this._relKick.fill(0, 0, N_MAX);
      }
    }

    pulse(type) {
      if (type === 'transmit' || type == null) this.pulseStart = this.time;
    }

    /**
     * setExpression — one call, one gesture from Chloe's own vocabulary.
     * The public face of the future soul-server directive channel: external
     * drivers say WHAT she expresses ('warmth', 0.8), the engine owns HOW.
     * intensity > 0.9 sustains a symbol until the next expression or state
     * change; otherwise symbols are one-shot (form, hold, dissolve).
     */
    setExpression(name, intensity = 0.7) {
      const ex = EXPRESSIONS[name];
      if (!ex) { console.warn('[ChloeAvatar] unknown expression:', name); return false; }
      const level = Math.max(0, Math.min(1, intensity));
      if (ex.state) this.setState(ex.state, { intensity: level });
      if (ex.symbol) this.showSymbol(ex.symbol, { sustained: level > 0.9 });
      this._expression = { name, intensity: level, t: this.time };
      return true;
    }

    getExpression() { return this._expression || null; }

    /**
     * Speak: words fade through the center of the field one by one, timed
     * to a natural speech rhythm (or drive timing yourself by calling
     * speak(word) per TTS word-boundary event). The fleet reacts to every
     * word — a small kick plus firings near the center. By default the
     * avatar holds 'transmitting' for the duration.
     */
    speak(text, o = {}) {
      const words = String(text).split(/\s+/).filter(Boolean);
      if (!words.length) return;
      this._ensureWordEl();
      this._speech = { words, idx: -1, nextT: this.time, wordT: 0, wordDur: 0 };
      if (o.transmit !== false) {
        const est = words.reduce((s, w) => s + Math.max(0.24, w.length * 0.058) + 0.07, 0.4);
        if (this.stateName !== 'transmitting') this.setState('transmitting');
        this._transmitUntil = this.time + est;
      }
    }

    _ensureWordEl() {
      if (this._wordEl) return;
      const parent = this.canvas.parentElement || document.body;
      if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
      const el = document.createElement('div');
      el.style.cssText =
        'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
        'pointer-events:none;opacity:0;color:#dbe6f4;' +
        'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,system-ui,sans-serif;' +
        'font-size:1.35rem;font-weight:300;letter-spacing:0.22em;text-transform:lowercase;' +
        'text-shadow:0 0 18px rgba(120,160,220,0.55);user-select:none;';
      parent.appendChild(el);
      this._wordEl = el;
    }

    _updateSpeech(t) {
      const sp = this._speech;
      if (!sp) return;
      if (t >= sp.nextT) {
        sp.idx++;
        if (sp.idx >= sp.words.length) {
          this._speech = null;
          if (this._wordEl) this._wordEl.style.opacity = 0;
          return;
        }
        const w = sp.words[sp.idx];
        sp.wordT = t;
        sp.wordDur = Math.max(0.24, w.length * 0.058);
        sp.nextT = t + sp.wordDur + 0.07;
        this._wordEl.textContent = w;
        // the field notices each word: a small kick + sparks near the center
        this._wordKickT = t;
        for (let k = 0; k < 2; k++) {
          const i = (this.rand() * this.activeCount) | 0;
          const r = Math.hypot(this.pos[i * 3], this.pos[i * 3 + 1]);
          if (r < 0.7 && t - this.fireT[i] > 0.3) { this.fireSlow[i] = 0; this._fire(i, t, 1); }
        }
      }
      // per-frame envelope: quick fade-in, soft fade-out
      const age = t - sp.wordT;
      const oIn = Math.min(1, age / 0.12);
      const oOut = Math.max(0, Math.min(1, (sp.wordDur + 0.05 - age) / 0.18));
      this._wordEl.style.opacity = (oIn * oOut * 0.92).toFixed(3);
    }

    setQuality(q) {
      if (!QUALITY_DOTS[q]) return;
      this.quality = q;
      this.targetCount = QUALITY_DOTS[q];
      this.activeCount = Math.min(this.activeCount, this.targetCount);
      if (this.activeCount < this.targetCount) this.activeCount = this.targetCount;
      this.dotsGeo.setDrawRange(0, this.activeCount);
      // newly activated dots join the current state immediately
      if (!this._fromParams) { this.engage.fill(1, 0, N_MAX); this.engageStarted.fill(1, 0, N_MAX); }
    }

    /**
     * Runtime tuning — Chloe's recursive feedback hook. Accepts a partial
     * patch and applies it live; getTuning() returns the full current rule
     * set so an agent can read, reason about, diff, and persist it.
     *   avatar.setTuning({ states: { idle: { dartRate: 0.05 } },
     *                      global: { glow: 0.8, sizeScale: 1.2 } })
     */
    setTuning(patch = {}) {
      if (patch.states) {
        for (const name of Object.keys(patch.states)) {
          if (this.states[name]) Object.assign(this.states[name], patch.states[name]);
        }
        const s = this.states[this.stateName];
        this._tgtColorA.setHex(s.colorA);
        this._tgtColorB.setHex(s.colorB);
      }
      if (patch.global) {
        const g = patch.global;
        if (g.cloudScale != null) {
          this.cloudScale = g.cloudScale;
          this.halo.scale.setScalar(g.cloudScale);
          this._dotBoost = 1 + Math.max(0, 1 - g.cloudScale) * 0.35;
        }
        if (g.sizeScale != null) this._sizeScale = g.sizeScale;
        if (g.glow != null) this._glowScale = g.glow;
      }
    }

    getTuning() {
      return {
        states: JSON.parse(JSON.stringify(this.states)),
        global: { cloudScale: this.cloudScale, sizeScale: this._sizeScale, glow: this._glowScale },
      };
    }

    getFPS() { return this._fpsEMA; }

    getStats() {
      return { fps: Math.round(this._fpsEMA), dots: this.activeCount, lines: this._segCount, state: this.stateName };
    }

    destroy() {
      this._destroyed = true;
      cancelAnimationFrame(this._raf);
      this._ro.disconnect();
      if (this._mq && this._mq.removeEventListener) this._mq.removeEventListener('change', this._onMQ);
      this.dotsGeo.dispose(); this.dotsMat.dispose();
      this.linesGeo.dispose(); this.linesMat.dispose();
      this.haloGeo.dispose(); this.haloMat.dispose();
      this.renderer.dispose();
      if (this._wordEl) this._wordEl.remove();
      if (this._ownsCanvas) this.canvas.remove();
    }

    /* ──────────────────────────────────────────────
       Construction
    ────────────────────────────────────────────── */

    _buildSimulation() {
      const n = N_MAX, rand = this.rand;
      this.pos = new Float32Array(n * 3);
      this.vel = new Float32Array(n * 3);
      this.sizes = new Float32Array(n);
      this.seeds = new Float32Array(n);
      this.speedFac = new Float32Array(n);
      this.fireT = new Float32Array(n).fill(-10);
      this.fireSlow = new Uint8Array(n);        // 1 → slow sheet-flash envelope
      this.fireVal = new Float32Array(n);
      this.pulseVal = new Float32Array(n);
      this.symVal = new Float32Array(n);
      this.engage = new Float32Array(n).fill(1);   // recruitment into current state
      this.engageStarted = new Uint8Array(n).fill(1);
      this.homeAngle = new Float32Array(n);        // personal floating anchor
      this.homeZ = new Float32Array(n);
      // intention: 0 drift · 1 dart (purposeful hop) · 2 dwell (attentive stillness)
      this.mode = new Uint8Array(n);
      this.modeT = new Float32Array(n);            // when this dot re-decides
      this.dartT = new Float32Array(n * 3);        // dart destination

      // murmuration personality — every dot senses and reacts differently
      this.sepR = new Float32Array(n);     // personal space radius
      this.cohR = new Float32Array(n);     // how far this dot senses the flock
      this.sepW = new Float32Array(n);     // how firmly it defends its space
      this.cohW = new Float32Array(n);     // how much it cares about company
      this.aliW = new Float32Array(n);     // how much it matches neighbors' motion
      this.audioVal = new Float32Array(n); // per-dot audio response (spatial)
      // per-frame neighbor accumulators
      this._cohS = new Float32Array(n * 3);
      this._aliS = new Float32Array(n * 3);
      this._sepS = new Float32Array(n * 3);
      this._nCnt = new Float32Array(n);

      // per-dot individuality — no two dots share a temperament
      this.noiseOff = new Float32Array(n * 3);   // private region of the noise field
      this.radiusBias = new Float32Array(n);     // preferred orbit distance
      this.jitterAmp = new Float32Array(n);      // nervousness
      this.orbitDir = new Float32Array(n);       // swirl direction around the center
      this.orbitSpd = new Float32Array(n);
      this.wobSeed = new Float32Array(n);        // symbol-hold wobble identity
      // morph personality — how THIS dot joins and leaves a formation.
      // Assigned once, stable for the session: her gestures stay hers.
      this.morphOff = new Float32Array(n);       // personal start delay, 0–200 ms
      this.morphDur = new Float32Array(n);       // duration multiplier, ±20–25%
      this.morphEase = new Uint8Array(n);        // easeMorph curve type 0/1/2
      this._relKick = new Uint8Array(n);         // release drift-kick fired yet?

      for (let i = 0; i < n; i++) {
        // uniform-ish sphere with soft z (front-facing cloud, subtle parallax)
        const a = rand() * Math.PI * 2;
        const r = Math.pow(rand(), 0.6);
        const z = (rand() * 2 - 1) * 0.5;
        this.pos[i * 3]     = Math.cos(a) * r;
        this.pos[i * 3 + 1] = Math.sin(a) * r * 0.95;
        this.pos[i * 3 + 2] = z * r;
        this.vel[i * 3] = this.vel[i * 3 + 1] = this.vel[i * 3 + 2] = 0;

        const s = 1.0 + Math.pow(rand(), 1.4) * 1.6;   // 1.0–2.6 px — tiny, starlike
        this.sizes[i] = s;
        this.seeds[i] = rand();
        // larger dots move slower — mass feel
        this.speedFac[i] = 1.25 - ((s - 1.0) / 1.6) * 0.6;

        this.noiseOff[i * 3]     = rand() * 90;
        this.noiseOff[i * 3 + 1] = rand() * 90;
        this.noiseOff[i * 3 + 2] = rand() * 90;
        this.radiusBias[i] = 0.6 + rand() * 0.8;            // 0.6–1.4 — roomier shell
        this.jitterAmp[i] = Math.pow(rand(), 2);             // most calm, a few nervous
        this.orbitDir[i] = rand() < 0.5 ? -1 : 1;            // counter-rotating mix
        this.orbitSpd[i] = 0.3 + rand() * 0.7;
        this.wobSeed[i] = rand() * 90;
        this.morphOff[i] = rand() * 0.20;
        this.morphDur[i] = 0.80 + rand() * 0.45;
        this.morphEase[i] = rand() < 0.34 ? 0 : (rand() < 0.5 ? 1 : 2);
        this.homeAngle[i] = rand() * Math.PI * 2;   // personal drift heading (wanders)
        this.homeZ[i] = (rand() * 2 - 1) * 0.4;

        this.sepR[i] = 0.07 + rand() * 0.10;
        this.cohR[i] = 0.28 + rand() * 0.30;
        this.sepW[i] = 0.6 + rand() * 1.0;
        this.cohW[i] = 0.15 + rand() * 0.40;
        this.aliW[i] = 0.15 + rand() * 0.50;
      }
    }

    _buildDots() {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(this.seeds, 1));
      geo.setAttribute('aFire', new THREE.BufferAttribute(this.fireVal, 1).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('aPulse', new THREE.BufferAttribute(this.pulseVal, 1).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('aSym', new THREE.BufferAttribute(this.symVal, 1).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('aEngage', new THREE.BufferAttribute(this.engage, 1).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('aAudio', new THREE.BufferAttribute(this.audioVal, 1).setUsage(THREE.DynamicDrawUsage));
      geo.setDrawRange(0, this.activeCount);

      const mat = new THREE.ShaderMaterial({
        vertexShader: SHADERS.dots.vertex,
        fragmentShader: SHADERS.dots.fragment,
        uniforms: {
          uTime:       { value: 0 },
          uPixelRatio: { value: 1 },
          uSizeAtten:  { value: CAMERA_Z },
          uBrightness: { value: 1 },
          uAudio:      { value: 0 },
          uSizeScale:  { value: 1 },
          uColorA:     { value: new THREE.Color(0x6B8CAE) },
          uColorB:     { value: new THREE.Color(0x4A6FA5) },
          uColorFromA: { value: new THREE.Color(0x6B8CAE) },
          uColorFromB: { value: new THREE.Color(0x4A6FA5) },
          uFireColor:  { value: new THREE.Color(0xCFE4FF) },  // white / electric blue
          uPulseColor: { value: new THREE.Color(0x4CAF50) },
          uOpacity:    { value: 0.95 },
        },
        transparent: true, depthWrite: false, depthTest: false,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
      });

      this.dotsGeo = geo;
      this.dotsMat = mat;
      this.dots = new THREE.Points(geo, mat);
      this.dots.frustumCulled = false;
      this.dots.renderOrder = 2;
      this.group.add(this.dots);
    }

    _buildLines() {
      const geo = new THREE.BufferGeometry();
      this.linePos = new Float32Array(MAX_SEGMENTS * 2 * 3);
      this.lineAlpha = new Float32Array(MAX_SEGMENTS * 2);
      this.lineFire = new Float32Array(MAX_SEGMENTS * 2);
      this.lineThought = new Float32Array(MAX_SEGMENTS * 2);
      geo.setAttribute('position', new THREE.BufferAttribute(this.linePos, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.lineAlpha, 1).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('aFire', new THREE.BufferAttribute(this.lineFire, 1).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('aThought', new THREE.BufferAttribute(this.lineThought, 1).setUsage(THREE.DynamicDrawUsage));
      geo.setDrawRange(0, 0);

      const mat = new THREE.ShaderMaterial({
        vertexShader: SHADERS.lines.vertex,
        fragmentShader: SHADERS.lines.fragment,
        uniforms: {
          uLineColor:    { value: new THREE.Color(0x5A7DA6) },
          uFireColor:    { value: new THREE.Color(0xE8F2FF) },
          uThoughtColor: { value: new THREE.Color(0xD9C9FF) },  // pale violet — inner thought
          uBrightness:   { value: 1 },
        },
        transparent: true, depthWrite: false, depthTest: false,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
      });

      this.linesGeo = geo;
      this.linesMat = mat;
      this.lines = new THREE.LineSegments(geo, mat);
      this.lines.frustumCulled = false;
      this.lines.renderOrder = 1;
      this.group.add(this.lines);
      this._segCount = 0;
    }

    _buildHalo() {
      const geo = new THREE.PlaneGeometry(9, 9);
      const mat = new THREE.ShaderMaterial({
        vertexShader: SHADERS.halo.vertex,
        fragmentShader: SHADERS.halo.fragment,
        uniforms: {
          uColor:     { value: new THREE.Color(0x4A6FA5) },
          uTime:      { value: 0 },
          uIntensity: { value: 0.10 },
        },
        transparent: true, depthWrite: false, depthTest: false,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
      });
      this.haloGeo = geo;
      this.haloMat = mat;
      this.halo = new THREE.Mesh(geo, mat);
      this.halo.position.z = -1.6;
      this.halo.renderOrder = 0;
      this.scene.add(this.halo);
    }

    /* ──────────────────────────────────────────────
       Symbol assignment — greedy nearest pairing
    ────────────────────────────────────────────── */
    _assignSlots(targets) {
      const n = this.activeCount;
      const assign = new Int16Array(N_MAX).fill(-1);
      const pairs = [];
      for (let s = 0; s < targets.length; s++) {
        const tx = targets[s][0], ty = targets[s][1];
        for (let i = 0; i < n; i++) {
          const dx = this.pos[i * 3] - tx, dy = this.pos[i * 3 + 1] - ty;
          pairs.push([dx * dx + dy * dy, i, s]);
        }
      }
      pairs.sort((a, b) => a[0] - b[0]);
      const slotTaken = new Uint8Array(targets.length);
      const dotTaken = new Uint8Array(n);
      let filled = 0;
      for (let k = 0; k < pairs.length && filled < targets.length; k++) {
        const [, i, s] = pairs[k];
        if (slotTaken[s] || dotTaken[i]) continue;
        slotTaken[s] = 1; dotTaken[i] = 1;
        assign[i] = s;
        filled++;
      }
      return assign;
    }

    /* ──────────────────────────────────────────────
       Recruitment — state change spreads dot-to-dot
    ────────────────────────────────────────────── */
    _updateEngagement(t, dt) {
      if (!this._fromParams) { this._meanEngage = 1; return; }
      const n = this.activeCount;
      const thr = this.cur.lineThreshold * 1.7;
      const thr2 = thr * thr;
      const forceAll = (t - this._transT0) > 1.8;   // no stragglers past 1.8 s
      let mean = 0, done = true;

      for (let i = 0; i < n; i++) {
        if (!this.engageStarted[i]) {
          // recruit if an engaged dot is near, or force-start late
          let near = forceAll;
          if (!near) {
            for (let j = 0; j < n; j++) {
              if (this.engage[j] < 0.55) continue;
              const dx = this.pos[i * 3] - this.pos[j * 3];
              const dy = this.pos[i * 3 + 1] - this.pos[j * 3 + 1];
              const dz = this.pos[i * 3 + 2] - this.pos[j * 3 + 2];
              if (dx * dx + dy * dy + dz * dz < thr2) { near = true; break; }
            }
          }
          if (near && (forceAll || this.rand() < dt * 9)) {
            this.engageStarted[i] = 1;
            // joining glow — soft, slow, per-dot moment of "switching on"
            if (t - this.fireT[i] > 0.5) { this.fireT[i] = t; this.fireSlow[i] = 1; }
          }
        }
        if (this.engageStarted[i] && this.engage[i] < 1) {
          this.engage[i] = Math.min(1, this.engage[i] + dt * (1.5 + this.seeds[i] * 0.9));
        }
        mean += this.engage[i];
        if (this.engage[i] < 1) done = false;
      }
      this._meanEngage = mean / n;
      this.dotsGeo.attributes.aEngage.needsUpdate = true;
      if (done) {
        this._fromParams = null;    // transition complete — "from" retired
        this._meanEngage = 1;
      }
    }

    /* ──────────────────────────────────────────────
       Neuron fire — Poisson process + cascade avalanches
    ────────────────────────────────────────────── */
    _fire(i, t, depth) {
      this.fireT[i] = t;
      this.recentFires.push({ i, t });

      // Coincidence detection: two fires within 100 ms + proximity → line fires
      const thr = this.cur.lineThreshold, thr2 = thr * thr;
      for (let k = 0; k < this.recentFires.length; k++) {
        const f = this.recentFires[k];
        if (f.i === i || t - f.t > COINCIDENCE_WINDOW) continue;
        const dx = this.pos[i * 3] - this.pos[f.i * 3];
        const dy = this.pos[i * 3 + 1] - this.pos[f.i * 3 + 1];
        const dz = this.pos[i * 3 + 2] - this.pos[f.i * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < thr2) {
          this.lineFires.push({ a: Math.min(i, f.i), b: Math.max(i, f.i), t });
        }
      }

      // Cascade: excite a few nearby dots with decaying probability → organic
      // avalanches. Children capped at 3 per fire and suppressed while many
      // dots are already lit, so the branching stays subcritical — bursts of
      // roughly 3–15 dots, never a whole-cloud strobe.
      if (depth < 3 && this._activeFireCount < this.activeCount * 0.15) {
        const inRange = [];
        const n = this.activeCount;
        for (let j = 0; j < n; j++) {
          if (j === i) continue;
          const dx = this.pos[i * 3] - this.pos[j * 3];
          const dy = this.pos[i * 3 + 1] - this.pos[j * 3 + 1];
          const dz = this.pos[i * 3 + 2] - this.pos[j * 3 + 2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 >= thr2) continue;
          // the fire physically stirs its local cluster — a tiny puff
          // away from the firing dot; the rest of the fleet feels nothing
          const d = Math.sqrt(d2) || 1e-6;
          const push = 0.05 * (1 - d / thr);
          this.vel[j * 3]     -= (dx / d) * push;
          this.vel[j * 3 + 1] -= (dy / d) * push;
          this.vel[j * 3 + 2] -= (dz / d) * push * 0.5;
          if (t - this.fireT[j] >= 0.35) inRange.push(j);
        }
        const p = 0.55 * Math.pow(0.5, depth);
        const picks = Math.min(3, inRange.length);
        for (let k = 0; k < picks; k++) {
          // sample without replacement
          const idx = (this.rand() * inRange.length) | 0;
          const j = inRange[idx];
          inRange[idx] = inRange[inRange.length - 1]; inRange.pop();
          if (this.rand() < p) {
            this.pendingFires.push({ i: j, t: t + 0.03 + this.rand() * 0.09, depth: depth + 1 });
          }
        }
      }
    }

    _updateFires(t, dt) {
      // Poisson arrivals (rate scales with thinkingIntensity in 'thinking',
      // and with recruitment — fire starts sparse while the state spreads)
      let rate = this.cur.fireRate;
      if (this.stateName === 'thinking') {
        rate = (this.states.thinking.fireRate + 3 * this.thinkingIntensity) * this._meanEngage;
      }
      // sound sparks firings in any state — silence stays sparse
      rate = rate * (1 + this._audioSm * 1.5) + this._audioSm * 2.2;
      rate *= this.motionScale === 1 ? 1 : 0.4;
      if (rate > 0) {
        // two Bernoulli draws per frame ≈ Poisson for small λ·dt
        const p = rate * dt * 0.5;
        for (let k = 0; k < 2; k++) {
          if (this.rand() < p) {
            const i = (this.rand() * this.activeCount) | 0;
            if (t - this.fireT[i] > 0.3) { this.fireSlow[i] = 0; this._fire(i, t, 0); }
          }
        }
      }

      // Heat lightning — rare, slow, dim sheet-flashes deep in the cloud
      // while she idles or wanders. A thundercloud at rest.
      if ((this.stateName === 'idle' || this.stateName === 'wandering') && t > this._sheetNext) {
        this._sheetNext = t + 6 + this.rand() * 10;
        const ci = (this.rand() * this.activeCount) | 0;
        const cx = this.pos[ci * 3], cy = this.pos[ci * 3 + 1], cz = this.pos[ci * 3 + 2];
        for (let j = 0; j < this.activeCount; j++) {
          const dx = this.pos[j * 3] - cx, dy = this.pos[j * 3 + 1] - cy, dz = this.pos[j * 3 + 2] - cz;
          if (dx * dx + dy * dy + dz * dz < 0.25 && t - this.fireT[j] > 0.5) {
            this.fireT[j] = t + this.rand() * 0.18;   // staggered, like sheet lightning
            this.fireSlow[j] = 1;
          }
        }
      }

      // Cascade queue
      for (let k = this.pendingFires.length - 1; k >= 0; k--) {
        const pf = this.pendingFires[k];
        if (t >= pf.t) {
          this.pendingFires.splice(k, 1);
          if (t - this.fireT[pf.i] > 0.3) this._fire(pf.i, t, pf.depth);
        }
      }

      // Envelopes — sharp neuron spikes, or slow soft sheets (fireSlow)
      const n = this.activeCount;
      const fireCap = this.motionScale === 1 ? 1 : 0.5;
      let lit = 0;
      for (let i = 0; i < n; i++) {
        const age = t - this.fireT[i];
        const slow = this.fireSlow[i] === 1;
        const rise = slow ? 0.25 : FIRE_RISE;
        const decay = slow ? 0.80 : FIRE_DECAY;
        const amp = slow ? 0.45 : 1;
        let v = 0;
        if (age >= 0 && age < rise + decay) {
          v = (age < rise ? age / rise : 1 - (age - rise) / decay) * amp;
        } else if (slow && age >= rise + decay) {
          this.fireSlow[i] = 0;
        }
        this.fireVal[i] = v * fireCap;
        if (v > 0.1) lit++;
      }
      this._activeFireCount = lit;

      // Prune
      const cutoff = t - (COINCIDENCE_WINDOW + 0.05);
      while (this.recentFires.length && this.recentFires[0].t < cutoff) this.recentFires.shift();
      const lfCut = t - (LINE_FIRE_FADE + 0.05);
      this.lineFires = this.lineFires.filter(lf => lf.t > lfCut);
    }

    _updatePulse(t) {
      const age = t - this.pulseStart;
      const n = this.activeCount;
      if (age < 0 || age > PULSE_DURATION) {
        // Listening: sound flows INWARD — ripple shells travel from the rim
        // to the core, amplitude following the live mic level.
        if (this.stateName === 'listening' && this._audioSm > 0.02) {
          this._pulseActive = true;
          this._listenPhase = (this._listenPhase || 0) + (t - (this._listenT || t)) * (0.9 + this._audioSm * 1.6);
          this._listenT = t;
          const maxR = this.cur.radius * 1.35;
          const shellR = (1 - (this._listenPhase % 1)) * maxR;
          const sigma = 0.16;
          const amp = Math.min(1, this._audioSm * 1.6);
          for (let i = 0; i < n; i++) {
            const x = this.pos[i * 3], y = this.pos[i * 3 + 1], z = this.pos[i * 3 + 2];
            const d = Math.sqrt(x * x + y * y + z * z) - shellR;
            this.pulseVal[i] = Math.exp(-(d * d) / (2 * sigma * sigma)) * amp;
          }
          return;
        }
        this._listenT = t;
        if (this._pulseActive) {
          this.pulseVal.fill(0, 0, n);
          this._pulseActive = false;
        }
        return;
      }
      this._pulseActive = true;
      const maxR = this.cur.radius * 1.7;
      const waveR = (age / PULSE_DURATION) * maxR;
      const sigma = 0.22;
      const fade = 1 - age / PULSE_DURATION;
      const brighten = Math.max(0, 1 - age / 0.3) * 0.35;   // initial global lift
      for (let i = 0; i < n; i++) {
        const x = this.pos[i * 3], y = this.pos[i * 3 + 1], z = this.pos[i * 3 + 2];
        const r = Math.sqrt(x * x + y * y + z * z);
        const d = r - waveR;
        this.pulseVal[i] = Math.exp(-(d * d) / (2 * sigma * sigma)) * fade + brighten;
      }
    }

    /* ──────────────────────────────────────────────
       Per-frame simulation
    ────────────────────────────────────────────── */
    _blendParams(dt) {
      const tgt = this.states[this.stateName];
      const f = 1 - Math.exp(-dt * 3.0);
      for (const k of BLENDED_KEYS) {
        this.cur[k] += (tgt[k] - this.cur[k]) * f;
      }

      // Audio drives real-time excitement — blend toward the excited profile
      this._audioSm += (this.audioLevel - this._audioSm) * (1 - Math.exp(-dt * 8));
      const a = this._audioSm * 0.9;
      if (a > 0.01) {
        const e = this._excited;
        this.cur.speed        += (e.speed - this.cur.speed) * a;
        this.cur.noiseAmp     += (e.noiseAmp - this.cur.noiseAmp) * a;
        this.cur.radius       += (e.radius - this.cur.radius) * a * 0.5;
        this.cur.lineOpacity  += (e.lineOpacity - this.cur.lineOpacity) * a;
      }

      // Colors converge fast — the visible sweep now comes from per-dot
      // recruitment in the shader, not from this global lerp
      const cf = 1 - Math.exp(-dt * 6.0);
      this.colorA.lerp(this._tgtColorA, cf);
      this.colorB.lerp(this._tgtColorB, cf);
      if (a > 0.01) {
        this.colorA.lerp(new THREE.Color(this._excited.colorA), a * 0.3);
        this.colorB.lerp(new THREE.Color(this._excited.colorB), a * 0.3);
      }
    }

    _simulate(t, dt) {
      const n = this.activeCount;
      const c = this.cur;
      const F = this._fromParams;                // outgoing state during recruitment
      const ms = this.motionScale;
      const freq = c.noiseFreq;
      this._fieldT += dt * c.noiseEvo * ms;      // integrated — no jump when the rate blends
      const ft = this._fieldT;
      const noise3 = this.noise3;
      const reactJit = 1 + this._react * 4.0;   // state-change wiggle (audio is spatial now)

      // ── the speaking region: a point that wanders slowly through the
      // cloud; audio energy radiates from it, so nearby dots respond
      // hard while the periphery barely notices. No global synchrony.
      const spx = noise3(ft * 0.25, 3.7, 9.1) * 0.6;
      const spy = noise3(9.1, ft * 0.25, 3.7) * 0.5;
      this._speakPos = [spx, spy];
      const aud = this._audioSm;

      // ── murmuration prepass: what does each dot see around itself?
      // (separation / cohesion / alignment sums within personal radii)
      const CS = this._cohS, AS = this._aliS, SS = this._sepS, NC = this._nCnt;
      CS.fill(0); AS.fill(0); SS.fill(0); NC.fill(0);
      const P = this.pos, V = this.vel;
      for (let i = 0; i < n; i++) {
        const ix = P[i * 3], iy = P[i * 3 + 1], iz = P[i * 3 + 2];
        for (let j = i + 1; j < n; j++) {
          const dx = ix - P[j * 3], dy = iy - P[j * 3 + 1], dz = iz - P[j * 3 + 2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > 0.36) continue;                     // beyond anyone's senses
          const d = Math.sqrt(d2) || 1e-6;
          // i's view of j
          if (d < this.cohR[i]) {
            CS[i * 3] += P[j * 3]; CS[i * 3 + 1] += P[j * 3 + 1]; CS[i * 3 + 2] += P[j * 3 + 2];
            AS[i * 3] += V[j * 3]; AS[i * 3 + 1] += V[j * 3 + 1]; AS[i * 3 + 2] += V[j * 3 + 2];
            NC[i]++;
          }
          if (d < this.sepR[i]) {
            const w = (this.sepR[i] - d) / (this.sepR[i] * d);
            SS[i * 3] += dx * w; SS[i * 3 + 1] += dy * w; SS[i * 3 + 2] += dz * w;
          }
          // j's view of i
          if (d < this.cohR[j]) {
            CS[j * 3] += ix; CS[j * 3 + 1] += iy; CS[j * 3 + 2] += iz;
            AS[j * 3] += V[i * 3]; AS[j * 3 + 1] += V[i * 3 + 1]; AS[j * 3 + 2] += V[i * 3 + 2];
            NC[j]++;
          }
          if (d < this.sepR[j]) {
            const w = (this.sepR[j] - d) / (this.sepR[j] * d);
            SS[j * 3] -= dx * w; SS[j * 3 + 1] -= dy * w; SS[j * 3 + 2] -= dz * w;
          }
        }
      }

      // symbol phase — pioneers first, then a wave of joiners densifies the
      // glyph: 4 dots rush in immediately, recruitment adds ~14 slots/s
      let symRamp = 0, sym = this.symbol;
      if (sym) {
        if (sym.releasing) {
          const relAge = t - sym.releaseT;
          symRamp = Math.max(0, 1 - relAge / 0.45);
          // per-dot dissolves outlive this global envelope — keep the symbol
          // until the last straggler (max offset + slowest duration) lets go
          if (relAge > 0.85) { this.symbol = null; sym = null; }
        } else {
          const age = t - sym.t0;
          symRamp = Math.min(1, age / 0.4);
          symRamp = symRamp * symRamp * (3 - 2 * symRamp);   // smoothstep
          const total = sym.targets.length;
          sym.active = Math.min(total, 4 + Math.max(0, Math.floor((age - 0.15) * 14)));
          for (let s = 0; s < total; s++) {
            if (sym.rank[s] < sym.active && sym.slotOnT[s] < 0) {
              sym.slotOnT[s] = t;
              const d = sym.slotDot[s];
              if (d >= 0 && t - this.fireT[d] > 0.4) {
                this.fireT[d] = t; this.fireSlow[d] = 1;   // joining spark
              }
            }
          }
          // one-shot: growth ~1.7 s + hold ~1.9 s, then release
          if (!sym.sustained && age > 3.6) this.hideSymbol();
        }
      }
      this._symRamp = symRamp;

      // per-dot symbol channel: members glow as they come alive (+),
      // bystanders recede (−). symVal doubles as the per-dot spring ramp.
      // Every dot joins on its own clock — personal delay, personal duration,
      // personal curve — so the glyph emerges like a wave, never a switch-flip.
      for (let i = 0; i < n; i++) {
        let v = 0;
        if (sym) {
          const slot = sym.assign[i];
          if (slot >= 0) {
            const onT = sym.slotOnT[slot];
            let on = 0;
            if (onT >= 0) {
              const u = (t - onT - this.morphOff[i]) / (0.4 * this.morphDur[i]);
              on = easeMorph(this.morphEase[i], u);
            }
            if (sym.releasing) {
              // personal dissolve: own delay + duration, accelerating exit
              const ur = (t - sym.releaseT - this.morphOff[i]) / (0.45 * this.morphDur[i]);
              const rel = ur <= 0 ? 1 : (ur >= 1 ? 0 : 1 - ur * ur);
              if (ur > 0 && !this._relKick[i]) {
                // the drift-kick fires the moment THIS dot lets go
                this._relKick[i] = 1;
                this.vel[i * 3]     += (this.rand() - 0.5) * 0.5;
                this.vel[i * 3 + 1] += (this.rand() - 0.5) * 0.5;
                this.vel[i * 3 + 2] += (this.rand() - 0.5) * 0.25;
              }
              v = on * rel;
            } else {
              v = on;
            }
          } else {
            v = -0.6 * symRamp;
          }
        }
        this.symVal[i] = v;
      }
      this.dotsGeo.attributes.aSym.needsUpdate = true;

      for (let i = 0; i < n; i++) {
        const i3 = i * 3;
        let x = this.pos[i3], y = this.pos[i3 + 1], z = this.pos[i3 + 2];
        let vx = this.vel[i3], vy = this.vel[i3 + 1], vz = this.vel[i3 + 2];
        const sf = this.speedFac[i];

        const assigned = sym && sym.assign[i] >= 0;
        const eff = assigned ? Math.max(0, this.symVal[i]) : 0;   // per-dot symbol grip
        const noiseFloor = sym && sym.sustained ? 0.30 : 0.15;
        const noiseW = assigned ? (1 - (1 - noiseFloor) * eff) : 1;

        // ── per-dot rules, not global animation: each dot follows the state
        // it has personally been recruited into (engage = 0 → old rules,
        // engage = 1 → new rules), so behavior sweeps through the fleet.
        // The raw ramp is linear; each dot shapes it through its own curve —
        // springs briefly overshoot the new state, quarts leap then settle.
        const e = easeMorph(this.morphEase[i], this.engage[i]);
        const spd  = (F ? F.speed + (c.speed - F.speed) * e : c.speed) * ms;
        const nAmp = F ? F.noiseAmp + (c.noiseAmp - F.noiseAmp) * e : c.noiseAmp;
        const orb  = F ? F.orbit + (c.orbit - F.orbit) * e : c.orbit;
        const jit  = F ? F.jitter + (c.jitter - F.jitter) * e : c.jitter;
        const rad  = F ? F.radius + (c.radius - F.radius) * e : c.radius;
        const cK   = F ? F.centerK + (c.centerK - F.centerK) * e : c.centerK;
        const cP   = F ? F.centerPull + (c.centerPull - F.centerPull) * e : c.centerPull;
        const dRt  = F ? F.dartRate + (c.dartRate - F.dartRate) * e : c.dartRate;
        const dwl  = F ? F.dwell + (c.dwell - F.dwell) * e : c.dwell;
        const coh  = F ? F.cohesion + (c.cohesion - F.cohesion) * e : c.cohesion;
        const ali  = F ? F.align + (c.align - F.align) * e : c.align;

        // spatial audio: energy falls off with distance from the speaking
        // region — central voices, peripheral witnesses
        const sdx = x - spx, sdy = y - spy;
        const audioLocal = aud * Math.max(0, 1 - Math.sqrt(sdx * sdx + sdy * sdy) / 0.9);
        this.audioVal[i] = audioLocal;

        // ── intention: each dot decides what it is doing right now ──
        // drift (ride the field) · dart (a deliberate hop, then settle) ·
        // dwell (hold still, attentive). Deterministic rules, personal timing.
        if (t > this.modeT[i] && !assigned) {
          const roll = this.rand();
          if (roll < dRt * 8) {
            this.mode[i] = 1;
            const ang = this.rand() * Math.PI * 2;
            const hop = (0.15 + this.rand() * 0.3) * Math.max(0.5, rad);
            this.dartT[i3]     = x + Math.cos(ang) * hop;
            this.dartT[i3 + 1] = y + Math.sin(ang) * hop;
            this.dartT[i3 + 2] = z + (this.rand() - 0.5) * hop * 0.5;
            this.modeT[i] = t + 0.3 + this.rand() * 0.35;
            // a dart is a move of intent: afterwards the dot keeps drifting
            // the way it went — neighborhoods keep reshuffling
            this.homeAngle[i] = Math.atan2(this.dartT[i3 + 1] - y, this.dartT[i3] - x) + (this.rand() - 0.5) * 0.4;
          } else if (roll < dRt * 8 + dwl) {
            this.mode[i] = 2;
            this.modeT[i] = t + 0.6 + this.rand() * 1.8;
          } else {
            this.mode[i] = 0;
            this.modeT[i] = t + 0.8 + this.rand() * 1.6;
          }
        }
        const mode = assigned ? 0 : this.mode[i];
        const intentW = mode === 2 ? 0.15 : (mode === 1 ? 0.25 : 1.0);

        // Each dot samples its OWN region of the noise field (noiseOff) —
        // neighbors stay decorrelated, so no chained "tentacle" flocks.
        const ox = this.noiseOff[i3], oy = this.noiseOff[i3 + 1], oz = this.noiseOff[i3 + 2];
        const nx = noise3(x * freq + ox + ft, y * freq + oy, z * freq + oz);
        const ny = noise3(x * freq + ox, y * freq + oy + ft, z * freq + oz + 13.7);
        const nz = noise3(x * freq + ox + 27.1, y * freq + oy + 51.3, z * freq + oz + ft);

        // Personal drift heading — each dot has its own slowly wandering
        // preferred direction (no shared center, no circular streamlines)
        this.homeAngle[i] += (this.rand() - 0.5) * 0.9 * dt * this.orbitSpd[i];
        const ov = orb * this.orbitSpd[i];
        const hcos = Math.cos(this.homeAngle[i]), hsin = Math.sin(this.homeAngle[i]);
        const spdA = spd * (1 + audioLocal * 1.5);   // sound energizes the field
        const tvx = (nx * nAmp + hcos * ov) * spdA * sf * noiseW * intentW;
        const tvy = (ny * nAmp + hsin * ov) * spdA * sf * noiseW * intentW;
        const tvz = nz * 0.55 * spdA * nAmp * sf * noiseW * intentW;

        // steer velocity toward the field (heavier dots steer slower)
        const steer = Math.min(1, dt * 2.2 * sf);
        vx += (tvx - vx) * steer;
        vy += (tvy - vy) * steer;
        vz += (tvz - vz) * steer;

        if (mode === 1) {
          // darting: commit to the destination, ease in, settle
          vx += (this.dartT[i3] - x) * 11.0 * dt;
          vy += (this.dartT[i3 + 1] - y) * 11.0 * dt;
          vz += (this.dartT[i3 + 2] - z) * 7.0 * dt;
          const dd = Math.exp(-dt * 3.5);
          vx *= dd; vy *= dd; vz *= dd;
        } else if (mode === 2) {
          // dwelling: hold position with a faint tremble
          const dd = Math.exp(-dt * 4.0);
          vx *= dd; vy *= dd; vz *= dd;
        }

        // per-dot nervousness — a touch of high-frequency independence
        // (spatial: sound shakes the dots near the voice, not the fleet)
        const ja = jit * this.jitterAmp[i] * (reactJit + audioLocal * 3.0) * noiseW * ms;
        if (ja > 0.001) {
          vx += (this.rand() * 2 - 1) * ja * dt * 3.0;
          vy += (this.rand() * 2 - 1) * ja * dt * 3.0;
          vz += (this.rand() * 2 - 1) * ja * dt * 1.5;
        }

        // personal breath — each dot inhales on its own detuned clock;
        // breathing widens/narrows its personal space, not a shared ring
        const pm = 0.75 + ((this.seeds[i] * 13.7) % 1) * 0.5;
        const br = 1 + c.breatheAmp * 1.5 *
          Math.sin(this._breathePhase * pm * Math.PI * 2 + this.seeds[i] * 6.2832);

        // ── murmuration: emergent cohesion from local rules only ──
        // separation (defend personal space), cohesion (drift toward the
        // neighbors THIS dot can sense), alignment (loosely match their
        // motion). All weights personal; sound tightens the gathering.
        const cnt = NC[i];
        if (cnt > 0) {
          const inv = 1 / cnt;
          const cohK = coh * this.cohW[i] * (1 + audioLocal * 0.8) * dt;
          vx += (CS[i3] * inv - x) * cohK;
          vy += (CS[i3 + 1] * inv - y) * cohK;
          vz += (CS[i3 + 2] * inv - z) * cohK;
          const aliK = ali * this.aliW[i] * dt * 2.0;
          vx += (AS[i3] * inv - vx) * Math.min(1, aliK);
          vy += (AS[i3 + 1] * inv - vy) * Math.min(1, aliK);
          vz += (AS[i3 + 2] * inv - vz) * Math.min(1, aliK);
        }
        const sepK = this.sepW[i] * br * dt * 0.5;
        vx += SS[i3] * sepK; vy += SS[i3 + 1] * sepK; vz += SS[i3 + 2] * sepK;

        // soft far bound — quadratic, personal, felt only in real escape;
        // shape comes from the flock, not from a boundary
        const r = Math.sqrt(x * x + y * y + z * z) || 1e-6;
        const farR = rad * 1.35 * (0.85 + this.seeds[i] * 0.3);
        if (r > farR) {
          const excess = r - farR;
          const k = excess * excess * cK * 2.5 * dt;
          vx -= (x / r) * k; vy -= (y / r) * k; vz -= (z / r) * k;
          const drag = Math.exp(-dt * excess * 2.0);
          vx *= drag; vy *= drag; vz *= drag;
        }
        // per-dot radial drive: >0 contracts (thinking), <0 inflates (excited)
        if (cP > 0.005 || cP < -0.005) {
          const k = cP * dt;
          vx -= x * k; vy -= y * k; vz -= z * k;
          // gathering states approach the center but never own it
          const voidR = rad * 0.35;
          if (cP > 0.005 && r < voidR) {
            const kv = (voidR - r) * 2.5 * dt;
            vx += (x / r) * kv; vy += (y / r) * kv; vz += (z / r) * kv;
          }
        }
        // gentle z-flattening keeps the cloud front-facing
        vz -= z * 0.25 * dt;

        // symbol spring — targets breathe with noise so the glyph never
        // freezes into OCR; it holds shape while staying alive
        if (assigned && eff > 0.01) {
          const s = sym.targets[sym.assign[i]];
          const ws = this.wobSeed[i];
          const wobAmp = sym.sustained ? 0.06 : 0.035;
          const tx2 = s[0] + noise3(ws, ft * 0.9, 7.7) * wobAmp;
          const ty2 = s[1] + noise3(7.7, ws, ft * 0.9) * wobAmp;
          // spring stiffness follows the dot's tempo — quick dots snap to
          // their slot, slow dots glide in on a soft leash
          const sk = 9.0 / this.morphDur[i];
          vx += (tx2 - x) * sk * eff * dt;
          vy += (ty2 - y) * sk * eff * dt;
          vz += (0 - z) * (sk * 0.66) * eff * dt;
          const damp = Math.exp(-dt * (5.0 / this.morphDur[i]) * eff);
          vx *= damp; vy *= damp; vz *= damp;
        } else if (sym && symRamp > 0 && !sym.releasing && !assigned) {
          // unassigned dots make room, gently — the fleet keeps living
          const rr2 = Math.sqrt(x * x + y * y) || 1e-6;
          if (rr2 < sym.extent * 1.15) {
            const push = (1 - rr2 / (sym.extent * 1.15)) * 0.9 * symRamp * dt;
            vx += (x / rr2) * push; vy += (y / rr2) * push;
          }
        }

        x += vx * dt; y += vy * dt; z += vz * dt;

        // hard safety net — teleport-free clamp far outside view
        const r2 = x * x + y * y + z * z;
        if (r2 > 8.5) {
          const rr = Math.sqrt(r2);
          x *= 2.9 / rr; y *= 2.9 / rr; z *= 2.9 / rr;
          vx *= 0.2; vy *= 0.2; vz *= 0.2;
        }

        this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
        this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
      }

      // Centroid recentering — low-frequency noise moves the cloud coherently;
      // this keeps Chloe's presence anchored without touching relative motion.
      // Suspended while a symbol holds (targets are already origin-centered).
      let mx = 0, my = 0, mz = 0;
      for (let i = 0; i < n; i++) { mx += this.pos[i * 3]; my += this.pos[i * 3 + 1]; mz += this.pos[i * 3 + 2]; }
      mx /= n; my /= n; mz /= n;
      const recenter = (1 - Math.exp(-dt * 1.4)) * (1 - symRamp);
      if (recenter > 0) {
        for (let i = 0; i < n; i++) {
          this.pos[i * 3] -= mx * recenter;
          this.pos[i * 3 + 1] -= my * recenter;
          this.pos[i * 3 + 2] -= mz * recenter;
        }
      }
    }

    _updateLines(t) {
      const n = this.activeCount;
      // threshold & opacity follow the recruitment clock — the same clock the
      // dots' spatial config follows — so transitions can't over-connect
      const F2 = this._fromParams, me2 = this._meanEngage;
      const thr = F2 ? F2.lineThreshold + (this.cur.lineThreshold - F2.lineThreshold) * me2 : this.cur.lineThreshold;
      const thr2 = thr * thr;
      let baseOp = F2 ? F2.lineOpacity + (this.cur.lineOpacity - F2.lineOpacity) * me2 : this.cur.lineOpacity;
      // luminance budget: a dense web dims per-line so the fleet never whites out
      baseOp *= Math.min(1, 550 / Math.max(1, this._segCount));
      let seg = 0;

      // index line-fires for O(1) pair lookup
      let fireMap = null;
      if (this.lineFires.length) {
        fireMap = new Map();
        for (const lf of this.lineFires) {
          const age = t - lf.t;
          const v = Math.max(0, 1 - age / LINE_FIRE_FADE);
          if (v > 0) fireMap.set(lf.a * N_MAX + lf.b, v);
        }
      }

      // While a symbol is formed: fade lines that cross the symbol boundary
      // (they smear the glyph); keep symbol-internal lines — they trace the stroke.
      const symRamp = this._symRamp || 0;
      const sym = this.symbol;

      const P = this.pos, LP = this.linePos, LA = this.lineAlpha, LF = this.lineFire, LT = this.lineThought;
      for (let i = 0; i < n && seg < MAX_SEGMENTS; i++) {
        const ix = P[i * 3], iy = P[i * 3 + 1], iz = P[i * 3 + 2];
        for (let j = i + 1; j < n && seg < MAX_SEGMENTS; j++) {
          const dx = ix - P[j * 3], dy = iy - P[j * 3 + 1], dz = iz - P[j * 3 + 2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 >= thr2) continue;
          const d = Math.sqrt(d2);
          const frac = d / thr;
          // Tiered connectivity: sharp falloff — near pairs bright, the far
          // end of the range a whisper, nothing uniform in between
          let alpha = Math.pow(1 - frac, 2.2) * baseOp * 1.6;
          if (sym && symRamp > 0) {
            const aI = sym.assign[i] >= 0, aJ = sym.assign[j] >= 0;
            if (aI !== aJ) alpha *= 1 - 0.9 * symRamp;        // boundary-crossing
            else if (!aI) alpha *= 1 - 0.6 * symRamp;         // outside chatter
          }
          const fire = fireMap ? (fireMap.get(i * N_MAX + j) || 0) : 0;

          const jx = P[j * 3], jy = P[j * 3 + 1], jz = P[j * 3 + 2];
          const o = seg * 6, ao = seg * 2;
          LP[o]     = ix; LP[o + 1] = iy; LP[o + 2] = iz;
          LP[o + 3] = jx; LP[o + 4] = jy; LP[o + 5] = jz;
          LA[ao] = alpha; LA[ao + 1] = alpha;
          LF[ao] = fire;  LF[ao + 1] = fire;
          LT[ao] = 0;     LT[ao + 1] = 0;
          seg++;

          // closest tier renders double-stroked with a hair of perpendicular
          // offset — actual perceived width, not just brightness
          if (frac < 0.45 && seg < MAX_SEGMENTS) {
            const inv = 1 / (d || 1e-6);
            const px = -dy * inv * 0.008, py = dx * inv * 0.008;
            const o2 = seg * 6, ao2 = seg * 2;
            LP[o2]     = ix + px; LP[o2 + 1] = iy + py; LP[o2 + 2] = iz;
            LP[o2 + 3] = jx + px; LP[o2 + 4] = jy + py; LP[o2 + 5] = jz;
            LA[ao2] = alpha * 0.7; LA[ao2 + 1] = alpha * 0.7;
            LF[ao2] = fire; LF[ao2 + 1] = fire;
            LT[ao2] = 0;    LT[ao2 + 1] = 0;
            seg++;
          }
        }
      }

      // Long-range synapses — a slowly rotating set of faint cross-cloud
      // bonds between dots far beyond line range. Complexity, not clutter:
      // each lives a few seconds, fades in and out, then yields to a fresh
      // random pair.
      for (let k = this.synapses.length - 1; k >= 0; k--) {
        if (t > this.synapses[k].t0 + this.synapses[k].ttl) this.synapses.splice(k, 1);
      }
      if (this.synapses.length < Math.floor(n / 5) && this.rand() < 0.1) {
        const i2 = (this.rand() * n) | 0, j2 = (this.rand() * n) | 0;
        if (i2 !== j2) {
          const dx = P[i2 * 3] - P[j2 * 3], dy = P[i2 * 3 + 1] - P[j2 * 3 + 1];
          if (dx * dx + dy * dy > thr2 * 1.2) {
            this.synapses.push({ a: i2, b: j2, t0: t, ttl: 3 + this.rand() * 4 });
          }
        }
      }
      for (let k = 0; k < this.synapses.length && seg < MAX_SEGMENTS; k++) {
        const sy = this.synapses[k];
        const age = t - sy.t0;
        const env = Math.min(1, age / 0.7) * Math.min(1, (sy.ttl - age) / 1.2);
        if (env <= 0) continue;
        const flick = 0.6 + 0.4 * this.noise3(sy.a * 3.1, this._fieldT * 1.1, sy.b * 1.7);
        const alpha = 0.09 * env * flick;
        const o = seg * 6, ao = seg * 2;
        LP[o]     = P[sy.a * 3]; LP[o + 1] = P[sy.a * 3 + 1]; LP[o + 2] = P[sy.a * 3 + 2];
        LP[o + 3] = P[sy.b * 3]; LP[o + 4] = P[sy.b * 3 + 1]; LP[o + 5] = P[sy.b * 3 + 2];
        LA[ao] = alpha; LA[ao + 1] = alpha;
        LF[ao] = 0;     LF[ao + 1] = 0;
        LT[ao] = 0;     LT[ao + 1] = 0;
        seg++;
      }

      // Thought lines — each recruited glyph dot links to the NEXT recruited
      // dot along its stroke, however far apart: the pioneers sketch the
      // shape with long reaches, and every joiner subdivides the links until
      // the glyph reads. Flickering, in its own color — inferred, not drawn.
      if (sym && symRamp > 0.1 && sym.slotDot) {
        const ftk = this._fieldT;
        const total = sym.targets.length;
        let prevSlot = -1;
        for (let s = 0; s < total && seg < MAX_SEGMENTS; s++) {
          if (s > 0 && sym.strokeOf[s] !== sym.strokeOf[s - 1]) prevSlot = -1;
          if (sym.slotOnT[s] < 0 || sym.slotDot[s] < 0) continue;
          if (prevSlot >= 0) {
            const da = sym.slotDot[prevSlot], db = sym.slotDot[s];
            const flicker = 0.55 + 0.45 * this.noise3(s * 9.3, ftk * 1.6, 4.2);
            const onA = Math.min(1, (t - sym.slotOnT[prevSlot]) / 0.4);
            const onB = Math.min(1, (t - sym.slotOnT[s]) / 0.4);
            const alpha = symRamp * Math.min(onA, onB) * (0.16 + 0.30 * flicker);
            const o = seg * 6, ao = seg * 2;
            LP[o]     = P[da * 3]; LP[o + 1] = P[da * 3 + 1]; LP[o + 2] = P[da * 3 + 2];
            LP[o + 3] = P[db * 3]; LP[o + 4] = P[db * 3 + 1]; LP[o + 5] = P[db * 3 + 2];
            LA[ao] = alpha; LA[ao + 1] = alpha;
            LF[ao] = 0;     LF[ao + 1] = 0;
            LT[ao] = 1;     LT[ao + 1] = 1;
            seg++;
          }
          prevSlot = s;
        }
      }

      this._segCount = seg;
      this.linesGeo.setDrawRange(0, seg * 2);
      this.linesGeo.attributes.position.needsUpdate = true;
      this.linesGeo.attributes.aAlpha.needsUpdate = true;
      this.linesGeo.attributes.aFire.needsUpdate = true;
      this.linesGeo.attributes.aThought.needsUpdate = true;
    }

    _adaptQuality(dt) {
      this._adaptTimer += dt;
      if (this._adaptTimer < 2) return;
      this._adaptTimer = 0;
      const fps = this._fpsEMA;
      const floor = this.targetFPS * 0.8;
      if (fps < floor && this.activeCount > 40) {
        this.activeCount = Math.max(40, this.activeCount - 12);
        this.dotsGeo.setDrawRange(0, this.activeCount);
      } else if (fps > this.targetFPS * 0.96 && this.activeCount < this.targetCount) {
        this.activeCount = Math.min(this.targetCount, this.activeCount + 6);
        this.dotsGeo.setDrawRange(0, this.activeCount);
      }
    }

    _tick(now) {
      if (this._destroyed) return;
      this._raf = requestAnimationFrame((t) => this._tick(t));

      let dt = (now - this._lastNow) / 1000;
      this._lastNow = now;
      if (dt <= 0) return;
      dt = Math.min(dt, 0.05);
      this.time += dt;
      const t = this.time;
      this._stateAge += dt;

      // fps EMA
      this._fpsEMA += ((1 / dt) - this._fpsEMA) * 0.04;

      // acknowledgment flash: instant, decays over ~0.4 s
      // (spoken words contribute a smaller kick of the same kind)
      const rAge = t - this._reactT;
      const wAge = t - (this._wordKickT != null ? this._wordKickT : -10);
      this._react = Math.max(
        rAge >= 0 ? Math.exp(-rAge * 2.8) : 0,
        wAge >= 0 ? 0.5 * Math.exp(-wAge * 3.5) : 0
      );

      this._updateSpeech(t);

      // transmitting auto-returns to the previous state
      if (this._transmitUntil > 0 && t >= this._transmitUntil) {
        this._transmitUntil = -1;
        this.setState(this.prevStateName === 'transmitting' ? 'idle' : this.prevStateName);
      }

      // wandering gradually forms a '?'
      if (this.stateName === 'wandering' && this._wanderSymbolArmed && this._stateAge > 0.9) {
        this._wanderSymbolArmed = false;
        this.showSymbol('?', { sustained: true });
      }

      this._blendParams(dt);
      this._updateEngagement(t, dt);
      this._simulate(t, dt);
      this._updateFires(t, dt);
      this._updatePulse(t);

      // proximity web — every other frame under load
      this._lineFrameSkip++;
      const skipLines = this._fpsEMA < this.targetFPS * 0.7 && (this._lineFrameSkip % 2 === 1);
      if (!skipLines) this._updateLines(t);

      this._adaptQuality(dt);

      // breathing — mostly personal (per-dot, in _simulate); only a faint
      // collective swell remains so the flock feels loosely together
      this._breathePhase += dt / this.cur.breathePeriod;
      const bAmp = this.cur.breatheAmp * 0.35 * (1 + this._audioSm * 0.8) *
        (this.motionScale === 1 ? 1 : 0.5);
      const breathe = 1 + Math.sin(this._breathePhase * Math.PI * 2) * bAmp;
      this.group.scale.setScalar(breathe * this.cloudScale);

      // uniforms
      const dm = this.dotsMat.uniforms;
      dm.uTime.value = t;
      dm.uAudio.value = this._audioSm;
      dm.uColorA.value.copy(this.colorA);
      dm.uColorB.value.copy(this.colorB);
      if (this._fromParams && this._fromColorA) {
        dm.uColorFromA.value.copy(this._fromColorA);
        dm.uColorFromB.value.copy(this._fromColorB);
      } else {
        dm.uColorFromA.value.copy(this.colorA);
        dm.uColorFromB.value.copy(this.colorB);
      }
      // ripple color: sound out = green, sound in (listening) = bright teal
      dm.uPulseColor.value.setHex(this.stateName === 'listening' ? 0x9FE8DA : 0x4CAF50);
      dm.uOpacity.value = this.cur.dotOpacity;
      dm.uBrightness.value = (1 + this._audioSm * 1.1 + this._react * 0.45) * this._dotBoost * this._glowScale;
      dm.uSizeScale.value = this._sizeScale;

      // lines & halo follow the fleet's overall recruitment progress
      const me = this._meanEngage;
      const lineA = this._fromColorA && this._fromParams
        ? this._fromColorA.clone().lerp(this.colorA, me) : this.colorA;
      const lineB = this._fromColorB && this._fromParams
        ? this._fromColorB.clone().lerp(this.colorB, me) : this.colorB;

      const lm = this.linesMat.uniforms;
      lm.uLineColor.value.copy(lineA).lerp(lineB, 0.5);
      lm.uBrightness.value = (1 + this._audioSm * 0.6) * (1 + (this._dotBoost - 1) * 0.5);

      const hm = this.haloMat.uniforms;
      hm.uTime.value = t;
      hm.uColor.value.copy(lineA);
      hm.uIntensity.value = this.cur.haloIntensity * 0.20;

      this.dotsGeo.attributes.position.needsUpdate = true;
      this.dotsGeo.attributes.aFire.needsUpdate = true;
      this.dotsGeo.attributes.aPulse.needsUpdate = true;
      this.dotsGeo.attributes.aAudio.needsUpdate = true;

      this.renderer.render(this.scene, this.camera);
    }

    _resize() {
      const el = this.canvas;
      const w = el.clientWidth || (el.parentElement && el.parentElement.clientWidth) || 600;
      const h = el.clientHeight || (el.parentElement && el.parentElement.clientHeight) || 600;
      const cap = this.quality === 'low' ? 1.5 : 2;
      const dpr = Math.min(window.devicePixelRatio || 1, cap);
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.dotsMat.uniforms.uPixelRatio.value = dpr;

      // keep the cloud fully visible in narrow containers
      const fitScale = Math.min(1, this.camera.aspect);
      this.group.position.set(0, 0, 0);
      this._fitScale = fitScale;
    }
  }

  ChloeAvatar.STATES = Object.keys(STATES);
  ChloeAvatar.SYMBOLS = ['?', 'check', 'ellipsis', '!', 'smiley', 'heart'];
  ChloeAvatar.EXPRESSIONS = Object.keys(EXPRESSIONS);
  ChloeAvatar.VERSION = '1.1.0';

  return ChloeAvatar;
});
