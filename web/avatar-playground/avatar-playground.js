/* Avatar Playground — page controller.

   The engine on stage is the real ChloeAvatar.js (vendored verbatim, see
   vendor/chloe-avatar/SOURCE.md). This file never touches the engine's
   internals: everything goes through its public API — setState, setExpression,
   showSymbol, pulse, setAudioLevel, setTuning/getTuning, setQuality, speak.

   Two rules shape the whole file:
   1. Every state renders. The poster inside the stage always says what is
      going on: loading, unsupported browser, no WebGL, engine failure,
      context lost, stopped. Blank space is a bug.
   2. Chloé is never given another voice. The voice panel offers only engines
      the proxy flags as hers, and a clip the service produced with a
      substitute engine is refused, not played. */
(() => {
  'use strict';

  const V = '20260905a';
  const BASE = '/web/avatar-playground/';
  const MAX_CHARS = 200;          // the proxy allows 500; a reaction preview needs less
  const POLL_MS = 900;
  const TIMEOUT_MS = 90000;

  const $ = (id) => document.getElementById(id);

  // ---- Vocabulary ----------------------------------------------------------
  // Labels and one-liners for the engine's states, used by chips and the HUD.
  // Colours are the states' colorA, so the chip swatch matches the cloud.
  const STATES = [
    ['idle', 'Idle', '#6B8CAE', 'Slow drift, four-second breath, soft web.'],
    ['listening', 'Listening', '#4FB3A1', 'Tightens and stills; inward teal ripples on sound.'],
    ['thinking', 'Thinking', '#3D52A0', 'Contracts; neurons fire and cascade along the web.'],
    ['excited', 'Excited', '#E8A045', 'Speed ×2.5, wider field, denser lines.'],
    ['wandering', 'Wandering', '#5C8A8A', 'Drifts, then settles into a sustained “?”.'],
    ['speaking', 'Speaking', '#E8DCC8', 'Spreads wide and moves with the voice.'],
    ['transmitting', 'Transmitting', '#4CAF50', 'Green wave outward, then back to the last state.'],
  ];
  const EXPRESSIONS = [
    ['warmth', 'Warmth ♡'], ['delight', 'Delight ☺'], ['curiosity', 'Curiosity ?'],
    ['surprise', 'Surprise !'], ['pondering', 'Pondering …'], ['affirm', 'Affirm ✓'],
    ['calm', 'Calm'], ['attentive', 'Attentive'], ['energized', 'Energized'],
  ];
  const SYMBOLS = [['?', '?'], ['check', '✓'], ['ellipsis', '…'], ['!', '!'], ['smiley', '☺'], ['heart', '♡']];

  const LINES = [
    'I am here. What are we building tonight?',
    'Give me a moment — I want to check that before I answer.',
    'Yes. That is exactly the shape I had in mind.',
    'Careful: the last deploy overwrote the file we were editing.',
    'Good morning, Ivan. The fleet is quiet and the queue is empty.',
  ];

  // Per-state rules the engine exposes through setTuning. Ranges bracket the
  // shipped values with room to feel each one; TUNING.md is the glossary.
  const STATE_KNOBS = [
    ['speed', 'Speed', 0, 0.6, 0.005], ['noiseAmp', 'Noise amplitude', 0, 3, 0.01],
    ['noiseFreq', 'Noise frequency', 0.3, 2, 0.01], ['noiseEvo', 'Noise evolution', 0, 0.6, 0.005],
    ['radius', 'Home radius', 0.4, 1.8, 0.01], ['centerK', 'Pull home', 0, 3, 0.01],
    ['orbit', 'Orbit', 0, 1, 0.01], ['jitter', 'Jitter', 0, 1.2, 0.01],
    ['dartRate', 'Dart rate', 0, 0.3, 0.001], ['dwell', 'Dwell', 0, 1, 0.01],
    ['cohesion', 'Cohesion', 0, 2, 0.01], ['align', 'Alignment', 0, 1, 0.01],
    ['lineThreshold', 'Web reach', 0.1, 0.7, 0.005], ['lineOpacity', 'Web opacity', 0, 0.7, 0.005],
    ['fireRate', 'Fire rate', 0, 8, 0.05], ['breatheAmp', 'Breath depth', 0, 0.15, 0.001],
    ['breathePeriod', 'Breath period', 1, 8, 0.05], ['dotOpacity', 'Dot opacity', 0.3, 1, 0.01],
    ['haloIntensity', 'Halo', 0, 1.2, 0.01],
  ];
  const GLOBAL_KNOBS = [
    ['cloudScale', 'Cloud scale', 0.2, 1, 0.01], ['glow', 'Glow', 0.3, 1.6, 0.01], ['sizeScale', 'Dot size', 0.5, 2, 0.01],
  ];
  const DEFAULT_CLOUD_SCALE = 1;      // 0.35 is a companion widget; a stage wants the whole canvas

  // ---- Elements ------------------------------------------------------------
  const stage = $('ap-stage');
  const host = $('ap-host');
  const poster = $('ap-poster');
  const posterKicker = $('ap-poster-kicker');
  const posterTitle = $('ap-poster-title');
  const posterBody = $('ap-poster-body');
  const posterActions = $('ap-poster-actions');
  const hud = $('ap-hud');
  const hudState = $('ap-hud-state');
  const hudFps = $('ap-hud-fps');
  const hudDots = $('ap-hud-dots');
  const hudLines = $('ap-hud-lines');
  const hudMotion = $('ap-hud-motion');
  const stopBtn = $('ap-stop');
  const statesEl = $('ap-states');
  const intensity = $('ap-intensity');
  const intensityOut = $('ap-intensity-out');
  const expressionsEl = $('ap-expressions');
  const symbolsEl = $('ap-symbols');
  const pulseBtn = $('ap-pulse');
  const scriptBtn = $('ap-script');
  const scriptStatus = $('ap-script-status');
  const controlsHint = $('ap-controls-status');

  const synthBtn = $('ap-synth');
  const micBtn = $('ap-mic');
  const fileInput = $('ap-file');
  const fileLabel = $('ap-file-label');
  const meter = $('ap-meter');
  const soundStatus = $('ap-sound-status');
  const soundAlert = $('ap-sound-alert');

  const voiceTag = $('ap-voice-tag');
  const voices = $('ap-voices');
  const voicesStatus = $('ap-voices-status');
  const keyBox = $('ap-key');
  const keyInput = $('ap-key-input');
  const linesEl = $('ap-lines');
  const text = $('ap-text');
  const count = $('ap-count');
  const sayBtn = $('ap-say');
  const saySpin = $('ap-say-spin');
  const sayLabel = $('ap-say-label');
  const voiceStatus = $('ap-voice-status');
  const voiceAlert = $('ap-voice-alert');
  const voiceOut = $('ap-voice-out');
  const audio = $('ap-audio');
  const replayBtn = $('ap-replay');
  const voiceNote = $('ap-voice-note');

  const tuneState = $('ap-tune-state');
  const globalEl = $('ap-global');
  const stateSlidersEl = $('ap-state-sliders');
  const resetBtn = $('ap-reset');
  const qualitySel = $('ap-quality');
  const seedInput = $('ap-seed');
  const reseedBtn = $('ap-reseed');

  const callEl = $('ap-call');
  const patchEl = $('ap-patch');
  const copyCall = $('ap-copy-call');
  const copyPatch = $('ap-copy-patch');
  const copyStatus = $('ap-copy-status');

  // ---- Small helpers ------------------------------------------------------
  const reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false, addEventListener() {} };
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const fmt = (v, step) => {
    const decimals = step >= 1 ? 0 : Math.min(3, Math.max(0, Math.ceil(-Math.log10(step))));
    return Number(v).toFixed(decimals);
  };
  const hexOf = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);
  const intOf = (hex) => parseInt(hex.replace('#', ''), 16);

  const showAlert = (box, title, body, action, tone) => {
    box.querySelector('b').textContent = title;
    box.querySelector('p').textContent = body;
    const btn = box.querySelector('button');
    if (action) { btn.textContent = action.label; btn.hidden = false; btn.onclick = action.run; }
    else { btn.hidden = true; btn.onclick = null; }
    if (tone) box.dataset.tone = tone; else delete box.dataset.tone;
    box.hidden = false;
  };
  const hideAlert = (box) => { box.hidden = true; };

  const setCall = (code) => { callEl.textContent = code; };

  // ---- Poster: the stage's own status board --------------------------------
  // kind: ready | loading | unsupported | nogl | error | lost | stopped
  function setPoster(kind, kicker, title, body, actions) {
    poster.dataset.kind = kind;
    posterKicker.textContent = kicker;
    posterTitle.textContent = title;
    posterBody.textContent = body;
    posterActions.replaceChildren();
    for (const a of actions || []) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ap-btn' + (a.secondary ? ' secondary' : '');
      if (a.spinning) {
        const s = document.createElement('span'); s.className = 'ap-spin'; s.setAttribute('aria-hidden', 'true'); b.append(s);
      }
      b.append(document.createTextNode(a.label));
      b.disabled = Boolean(a.disabled);
      b.onclick = a.run || null;
      posterActions.append(b);
    }
    stage.dataset.state = 'poster';
    hud.hidden = true;
  }

  // ---- Capability probes ---------------------------------------------------
  const missing = [];
  if (!('noModule' in HTMLScriptElement.prototype)) missing.push('ES modules');
  if (!window.ResizeObserver) missing.push('ResizeObserver');
  if (!window.matchMedia) missing.push('matchMedia');
  if (!window.requestAnimationFrame) missing.push('requestAnimationFrame');
  if (!window.Float32Array) missing.push('typed arrays');

  function webglAvailable() {
    try {
      const c = document.createElement('canvas');
      return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
    } catch { return false; }
  }

  // ---- Engine loading ------------------------------------------------------
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(src));
      document.head.append(s);
    });
  }

  let enginePromise = null;
  function loadEngine() {
    if (window.ChloeAvatar) return Promise.resolve();
    if (enginePromise) return enginePromise;
    enginePromise = (async () => {
      let piece = 'Three.js';
      try {
        await import(`${BASE}three-global.mjs?v=${V}`);
        piece = 'the shaders';
        await loadScript(`${BASE}vendor/chloe-avatar/chloe-shaders.js?v=${V}`);
        piece = 'the engine';
        await loadScript(`${BASE}vendor/chloe-avatar/ChloeAvatar.js?v=${V}`);
        if (!window.ChloeAvatar) throw new Error('ChloeAvatar global missing after load');
      } catch (err) {
        enginePromise = null;
        const e = new Error(`${piece} did not load`);
        e.piece = piece; e.cause = err;
        throw e;
      }
    })();
    return enginePromise;
  }

  // ---- Stage lifecycle -----------------------------------------------------
  let avatar = null;
  let defaults = null;        // getTuning() of a fresh instance — the diff base
  let pendingPatch = null;    // tuning to re-apply across a restart (seed change)
  let statsTimer = 0;
  let starting = null;
  let seed = 0xC10E;

  function readyPoster(kicker, title, body) {
    setPoster('ready', kicker || 'Ready', title || 'Start the cloud',
      body || 'One WebGL canvas, started on request so nothing runs until you ask. Every control on this page starts it too.',
      [{ label: 'Start the cloud', run: () => ensureAvatar() }]);
  }

  function ensureAvatar() {
    if (avatar) return Promise.resolve(avatar);
    if (starting) return starting;
    starting = start().finally(() => { starting = null; });
    return starting;
  }

  async function start() {
    if (missing.length) {
      setPoster('unsupported', 'Unsupported browser', 'This browser cannot run the cloud',
        `The engine needs ${missing.join(', ')}, which this browser does not provide. The rest of the page still works; the stage cannot.`, []);
      return null;
    }
    setPoster('loading', 'Loading', 'Loading the engine', 'Fetching Three.js, the shaders and ChloeAvatar.js from this site. Nothing leaves the page.',
      [{ label: 'Loading', spinning: true, disabled: true }]);
    try {
      await loadEngine();
    } catch (err) {
      setPoster('error', 'Engine failed', `Could not load ${err.piece || 'the engine'}`,
        `${err.message}. That is a network or hosting problem, not this browser. Try again in a moment.`,
        [{ label: 'Try again', run: () => ensureAvatar() }]);
      return null;
    }
    if (!webglAvailable()) {
      setPoster('nogl', 'No WebGL', 'WebGL is unavailable here',
        'The cloud is drawn with WebGL and this browser or device is not offering a context (often a disabled GPU, a strict privacy setting, or a remote desktop). Nothing else on this page needs it: the voice panel and the tuning patch still work.',
        [{ label: 'Check again', run: () => ensureAvatar() }]);
      return null;
    }
    try {
      avatar = new window.ChloeAvatar(host, { quality: qualitySel.value, cloudScale: DEFAULT_CLOUD_SCALE, seed });
    } catch (err) {
      avatar = null;
      setPoster('error', 'Engine failed', 'The engine threw while starting',
        `${err && err.message ? err.message : err}. This is a bug in the engine or the shim around it, not something to fix on your side.`,
        [{ label: 'Try again', run: () => ensureAvatar() }]);
      return null;
    }
    defaults = avatar.getTuning();
    if (pendingPatch) avatar.setTuning(pendingPatch);
    avatar.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      teardown();
      setPoster('lost', 'Context lost', 'The graphics context was lost',
        'The browser reclaimed the WebGL context — usually memory pressure or a GPU reset. Nothing is broken; start the cloud again.',
        [{ label: 'Restart', run: () => ensureAvatar() }]);
    });
    stage.dataset.state = 'live';
    hud.hidden = false;
    hudMotion.textContent = reduceMotion.matches ? 'motion reduced' : 'full motion';
    hudMotion.dataset.tone = reduceMotion.matches ? 'warn' : '';
    clearInterval(statsTimer);
    statsTimer = setInterval(paintStats, 500);
    paintStats();
    syncStateChips();
    buildStateSliders();
    paintPatch();
    setCall(`const avatar = new ChloeAvatar(container, { quality: '${qualitySel.value}', cloudScale: ${DEFAULT_CLOUD_SCALE}, seed: ${seed} });`);
    return avatar;
  }

  function teardown() {
    stopDriver();
    cancelScript();
    clearInterval(statsTimer);
    if (avatar) {
      pendingPatch = currentPatch();
      try { avatar.destroy(); } catch { /* already gone */ }
      avatar = null;
    }
    host.replaceChildren();
  }

  function stop() {
    teardown();
    readyPoster('Stopped', 'The cloud is stopped', 'The renderer and its GPU buffers are released. Your tuning is kept and comes back when you start again.');
  }

  function paintStats() {
    if (!avatar) return;
    const s = avatar.getStats();
    hudState.textContent = s.state;
    hudFps.textContent = String(s.fps);
    hudDots.textContent = String(s.dots);
    hudLines.textContent = String(s.lines);
    // states that auto-return (transmitting) or are set by expressions show up
    // here first, so keep the chips honest without waiting for a click
    syncStateChips();
  }

  // ---- State / expression / symbol controls --------------------------------
  function syncStateChips() {
    const cur = avatar ? avatar.getState() : null;
    for (const b of statesEl.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.state === cur));
    if (cur) hudState.textContent = cur;
    if (cur && tuneState.textContent !== cur) { tuneState.textContent = cur; buildStateSliders(); }
  }

  for (const [name, label, color, blurb] of STATES) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ap-chipbtn'; b.dataset.state = name; b.title = blurb;
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<span class="ap-sw" style="--sw:${color}" aria-hidden="true"></span>${label}`;
    b.addEventListener('click', () => setState(name));
    statesEl.append(b);
  }
  async function setState(name) {
    const a = await ensureAvatar(); if (!a) return;
    const level = intensity.value / 100;
    a.setState(name, { intensity: level });
    setCall(name === 'thinking'
      ? `avatar.setState('thinking', { intensity: ${level.toFixed(2)} });`
      : `avatar.setState('${name}');`);
    syncStateChips();
  }

  intensity.addEventListener('input', () => {
    const v = intensity.value / 100;
    intensityOut.textContent = v.toFixed(2);
    if (avatar) { avatar.setThinkingIntensity(v); setCall(`avatar.setThinkingIntensity(${v.toFixed(2)});`); }
  });

  for (const [name, label] of EXPRESSIONS) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ap-chipbtn'; b.textContent = label;
    b.addEventListener('click', async () => {
      const a = await ensureAvatar(); if (!a) return;
      a.setExpression(name, 0.7);
      setCall(`avatar.setExpression('${name}', 0.7);`);
      syncStateChips();
    });
    expressionsEl.append(b);
  }

  for (const [name, glyph] of SYMBOLS) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ap-chipbtn'; b.setAttribute('aria-label', `Form the symbol ${glyph}`);
    b.innerHTML = `<span class="ap-glyph">${glyph}</span>`;
    b.addEventListener('click', async () => {
      const a = await ensureAvatar(); if (!a) return;
      a.showSymbol(name);
      setCall(`avatar.showSymbol('${name}');`);
    });
    symbolsEl.append(b);
  }
  pulseBtn.addEventListener('click', async () => {
    const a = await ensureAvatar(); if (!a) return;
    a.pulse('transmit');
    setCall(`avatar.pulse('transmit');`);
  });

  // A scripted 15-second exchange so a visitor sees the vocabulary in the
  // order a real turn uses it: attend, reason, gesture, answer, settle.
  let scriptTimers = [];
  function cancelScript() {
    for (const t of scriptTimers) clearTimeout(t);
    scriptTimers = [];
    scriptBtn.textContent = 'Play a conversation';
    scriptBtn.setAttribute('aria-pressed', 'false');
    scriptStatus.textContent = '';
  }
  scriptBtn.addEventListener('click', async () => {
    if (scriptTimers.length) { cancelScript(); if (driver === 'synth') stopDriver(); return; }
    const a = await ensureAvatar(); if (!a) return;
    scriptBtn.textContent = 'Stop the conversation';
    scriptBtn.setAttribute('aria-pressed', 'true');
    const steps = [
      [0, 'Someone speaks — she listens', () => a.setState('listening')],
      [2600, 'She thinks: fire spreads along the web', () => a.setState('thinking', { intensity: 0.85 })],
      [6200, 'Holding space for a moment', () => a.setExpression('pondering', 0.7)],
      [8200, 'She answers (synthetic envelope)', () => { a.setState('speaking'); startSynth(); }],
      [13200, 'Understood, settled', () => { stopDriver(); a.setExpression('affirm', 0.7); }],
      [15200, 'Back to idle', () => { a.setState('idle'); cancelScript(); }],
    ];
    for (const [at, label, run] of steps) {
      scriptTimers.push(setTimeout(() => { scriptStatus.textContent = label; run(); syncStateChips(); }, at));
    }
    setCall(`// conversation script: listening → thinking(0.85) → pondering → speaking + audio → affirm → idle`);
  });

  // ---- Audio: one context, one analyser, several drivers --------------------
  let ctx = null, analyser = null, buf = null, pumpRaf = 0, smooth = 0;
  let driver = null;            // 'synth' | 'mic' | 'file' | 'voice'
  let driverPrevState = null;
  let synthTimer = 0;
  let micStream = null, micSource = null;
  let fileSource = null;
  let voiceSource = null;       // MediaElementSource — can only be created once per element

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    buf = new Float32Array(analyser.fftSize);
    return ctx;
  }

  async function ensureRunning() {
    const c = ensureCtx();
    if (!c) {
      showAlert(soundAlert, 'No Web Audio here', 'This browser does not provide an AudioContext, so sound cannot be measured. The synthetic envelope still works — it needs no audio at all.');
      return false;
    }
    if (c.state === 'suspended') { try { await c.resume(); } catch { /* handled below */ } }
    if (c.state !== 'running') {
      showAlert(soundAlert, 'Sound is blocked until you interact', 'The browser suspended audio under its autoplay policy. Enable it and the meter will follow.',
        { label: 'Enable sound', run: async () => { try { await c.resume(); } catch { /* still blocked */ } if (c.state === 'running') hideAlert(soundAlert); } }, 'info');
      return false;
    }
    return true;
  }

  function setLevel(v) {
    smooth = v;
    meter.style.width = `${Math.round(clamp01(v) * 100)}%`;
    if (avatar) avatar.setAudioLevel(clamp01(v));
  }

  function pump() {
    pumpRaf = requestAnimationFrame(pump);
    if (!analyser) return;
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let k = 0; k < buf.length; k++) sum += buf[k] * buf[k];
    const rms = Math.sqrt(sum / buf.length);
    const FLOOR = 0.010, FULL = 0.18;                 // RMS window for speech
    const v = clamp01((rms - FLOOR) / (FULL - FLOOR));
    setLevel(smooth + (v - smooth) * (v > smooth ? 0.5 : 0.12));  // fast attack, slow release
  }

  function beginDriver(name, state) {
    if (driver && driver !== name) stopDriver();
    driver = name;
    if (avatar) {
      driverPrevState = avatar.getState();
      if (state && driverPrevState !== state) avatar.setState(state);
      syncStateChips();
    }
    document.body.classList.toggle('ap-sounding', name === 'voice');
    synthBtn.setAttribute('aria-pressed', String(name === 'synth'));
    micBtn.setAttribute('aria-pressed', String(name === 'mic'));
    fileLabel.classList.toggle('is-on', name === 'file');
  }

  function stopDriver() {
    if (!driver) return;
    const was = driver;
    driver = null;
    clearInterval(synthTimer); synthTimer = 0;
    cancelAnimationFrame(pumpRaf); pumpRaf = 0;
    if (micSource) { try { micSource.disconnect(); } catch { /* noop */ } micSource = null; }
    if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
    if (fileSource) { try { fileSource.onended = null; fileSource.stop(); fileSource.disconnect(); } catch { /* noop */ } fileSource = null; }
    if (was === 'voice' && !audio.paused) audio.pause();
    setLevel(0);
    if (avatar && driverPrevState && avatar.getState() !== driverPrevState) {
      // only hand the state back if the driver is what set it; a click in
      // between means the visitor took over
      const mine = (was === 'mic' && avatar.getState() === 'listening') || (was !== 'mic' && avatar.getState() === 'speaking');
      if (mine) avatar.setState(driverPrevState);
    }
    driverPrevState = null;
    document.body.classList.remove('ap-sounding');
    synthBtn.setAttribute('aria-pressed', 'false');
    micBtn.setAttribute('aria-pressed', 'false');
    fileLabel.classList.remove('is-on');
    soundStatus.textContent = '';
    soundStatus.classList.remove('error');
    syncStateChips();
  }

  // Synthetic envelope: syllable-like bursts with pauses. No audio, no
  // permissions — the same shape demo-v6.html uses, so it reads as speech.
  function startSynth() {
    beginDriver('synth', 'speaking');
    soundStatus.textContent = 'Synthetic envelope — amplitude only, no sound plays.';
    const t0 = performance.now();
    synthTimer = setInterval(() => {
      const synthPhase = (performance.now() - t0) / 1000 * 2.25;   // 0.09 per 40 ms tick, clock-based
      const syllable = Math.max(0, Math.sin(synthPhase * 7.3)) * (0.55 + 0.45 * Math.sin(synthPhase * 1.7));
      const pause = Math.sin(synthPhase * 0.61) > -0.35 ? 1 : 0.05;
      setLevel(Math.min(1, syllable * pause * (0.7 + Math.random() * 0.3)));
    }, 40);
    setCall(`avatar.setState('speaking');\n// every 40 ms: avatar.setAudioLevel(level)  // 0–1`);
  }
  synthBtn.addEventListener('click', async () => {
    hideAlert(soundAlert);
    if (driver === 'synth') { stopDriver(); return; }
    await ensureAvatar();   // the stage may refuse (no WebGL); the meter still moves
    startSynth();
  });

  micBtn.addEventListener('click', async () => {
    hideAlert(soundAlert);
    if (driver === 'mic') { stopDriver(); return; }
    if (!window.isSecureContext) {
      return showAlert(soundAlert, 'Microphone needs a secure page', 'Browsers only hand out the microphone on HTTPS (or localhost). Open this page over HTTPS and try again.');
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return showAlert(soundAlert, 'No microphone API', 'This browser does not expose getUserMedia, so the microphone cannot be read. The synthetic envelope and a local file still work.');
    }
    await ensureAvatar();
    if (!(await ensureRunning())) return;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (err) {
      const name = err && err.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        return showAlert(soundAlert, 'Microphone access was refused', 'The browser did not grant the microphone. Allow it in the address-bar permissions and click again. Nothing is recorded or sent — the level is measured locally.');
      }
      if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        return showAlert(soundAlert, 'No microphone found', 'No audio input device is available to this browser.');
      }
      return showAlert(soundAlert, 'Microphone could not start', `${name || 'Error'}: ${err && err.message ? err.message : 'unknown reason'}.`);
    }
    beginDriver('mic', 'listening');
    micSource = ctx.createMediaStreamSource(micStream);
    micSource.connect(analyser);          // analyser only — never to the speakers
    soundStatus.textContent = 'Microphone live — measured locally, never sent.';
    pump();
    setCall(`avatar.setState('listening');\n// per frame: avatar.setAudioLevel(rms)  // from an AnalyserNode`);
  });

  fileInput.addEventListener('change', async () => {
    hideAlert(soundAlert);
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    await ensureAvatar();
    if (!(await ensureRunning())) return;
    let decoded;
    try {
      decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    } catch {
      return showAlert(soundAlert, 'That file could not be decoded', `“${file.name}” is not an audio format this browser can read. Try MP3, WAV, OGG or M4A.`);
    }
    beginDriver('file', 'speaking');
    fileSource = ctx.createBufferSource();
    fileSource.buffer = decoded;
    fileSource.connect(analyser);
    analyser.connect(ctx.destination);
    fileSource.onended = () => { if (driver === 'file') stopDriver(); };
    fileSource.start();
    soundStatus.textContent = `Playing “${file.name}” from this device — decoded in the browser, not uploaded.`;
    pump();
    setCall(`avatar.setState('speaking');\n// per frame: avatar.setAudioLevel(rms)  // from an AnalyserNode on the file`);
  });

  // ---- Chloé's voice through the proxy -------------------------------------
  let engines = [];
  const selectedEngine = () => engines.find((e) => e.id === (voices.querySelector('input:checked') || {}).value) || null;

  const eq = '<span class="ap-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';

  function paintVoiceTag(text, tone) {
    voiceTag.textContent = text;
    if (tone) voiceTag.dataset.tone = tone; else delete voiceTag.dataset.tone;
  }

  fetch('/api/voice?route=engines')
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then((data) => {
      engines = (data.engines || []).filter((e) => e.chloe === true);
      voicesStatus.remove();
      if (!engines.length) {
        paintVoiceTag('Not registered', 'warn');
        const p = document.createElement('p'); p.className = 'ap-status error';
        p.textContent = 'The voice service lists no engine registered as Chloé’s voice, so there is nothing to play here. No other voice is offered in her place.';
        voices.append(p);
        sayBtn.disabled = true;
        return;
      }
      let firstUsable = null;
      for (const engine of engines) {
        const off = engine.available === false;
        const unknown = engine.available == null;
        const label = document.createElement('label');
        label.className = 'ap-voice';
        label.innerHTML = `
          <input type="radio" name="ap-voice" value="${engine.id}" ${off ? 'disabled' : ''}>
          ${eq}
          <span>
            <b>Chloé — ${engine.label}${off ? '<span class="ap-tag" data-tone="warn">Unavailable</span>' : unknown ? '<span class="ap-tag">Unverified</span>' : '<span class="ap-tag" data-tone="ok">Ready</span>'}${engine.requiresKey ? '<span class="ap-tag">Key</span>' : ''}</b>
            <span>${engine.blurb}</span>
          </span>`;
        voices.append(label);
        if (!off && !firstUsable) firstUsable = label.querySelector('input');
      }
      if (firstUsable) {
        firstUsable.checked = true;
        // `available` is null when the proxy could not reach the service: the
        // engine is offered, but the tag must not promise what nobody checked.
        const ready = engines.filter((e) => e.available === true).length;
        if (engines.some((e) => e.available == null)) paintVoiceTag(`${engines.length} registered · unverified`);
        else paintVoiceTag(`${ready} of ${engines.length} ready`, 'ok');
      }
      else {
        paintVoiceTag('Unavailable', 'warn');
        showAlert(voiceAlert, 'No engine can serve Chloé’s voice right now', 'Every engine registered as hers is reported unavailable. Nothing is played in her place; check back later.');
        sayBtn.disabled = true;
      }
      voices.addEventListener('change', () => { syncKey(); hideAlert(voiceAlert); });
      syncKey();
    })
    .catch(() => {
      paintVoiceTag('Unreachable', 'warn');
      voicesStatus.textContent = 'The voice service could not be reached, so it is unknown whether any engine can serve Chloé’s voice. Nothing else is offered in her place.';
      voicesStatus.classList.add('error');
      sayBtn.disabled = true;
    });

  function syncKey() {
    const e = selectedEngine();
    keyBox.hidden = !(e && e.requiresKey);
  }

  for (const line of LINES) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ap-line'; b.textContent = line;
    b.addEventListener('click', () => { text.value = line; syncCount(); text.focus(); });
    linesEl.append(b);
  }
  const syncCount = () => {
    count.textContent = `${text.value.length} / ${MAX_CHARS}`;
    count.classList.toggle('over', text.value.length >= MAX_CHARS);
  };
  text.addEventListener('input', syncCount);
  syncCount();

  const sayStatus = (msg, isError) => { voiceStatus.textContent = msg; voiceStatus.classList.toggle('error', Boolean(isError)); };
  let busy = false;
  const setBusy = (state, label) => {
    busy = state; sayBtn.disabled = state; saySpin.hidden = !state;
    sayLabel.textContent = label || (state ? 'Working' : 'Hear it');
  };

  // Failure copy with no escape hatch to another voice: that is the rule.
  function explainVoice(err) {
    const code = err.code || 0;
    const raw = err.message || 'Something went wrong.';
    if (code === 401 || code === 403) return showAlert(voiceAlert, 'That key was not accepted', 'Check the access key and try again. Chloé’s voice stays behind it; there is no keyless stand-in.');
    if (code === 429) return showAlert(voiceAlert, 'This engine is out of headroom', 'It runs on a metered allowance that is used up for the moment. Pick the other engine if it is available, or come back later. Nothing else will read this in her place.');
    if (code === 502 || code === 503 || code === 504 || err.timedOut) {
      return showAlert(voiceAlert, 'Chloé’s voice is not available right now',
        err.timedOut ? 'The preview took longer than it should, which usually means the narrator is backed up.' : 'The narration service did not answer. It may be restarting.');
    }
    if (code === 413) return showAlert(voiceAlert, 'That is longer than a preview', `Keep it to ${MAX_CHARS} characters.`);
    return showAlert(voiceAlert, 'That preview did not happen', raw);
  }

  const poll = (jobId, startedAt) => new Promise((resolve, reject) => {
    const tick = async () => {
      if (Date.now() - startedAt > TIMEOUT_MS) { const e = new Error('Timed out.'); e.timedOut = true; return reject(e); }
      try {
        const r = await fetch(`/api/voice?route=status&job=${encodeURIComponent(jobId)}`);
        const data = await r.json();
        if (!r.ok || data.status === 'error') { const e = new Error(data.error || 'Preview failed.'); e.code = r.ok ? 0 : r.status; return reject(e); }
        if (data.ready) return resolve(data);
        sayStatus('Narrating…');
        setTimeout(tick, POLL_MS);
      } catch (e) { reject(e); }
    };
    tick();
  });

  async function playVoice(line) {
    if (!ensureCtx()) {
      // no Web Audio: the clip can still play, the cloud just won't hear it
      try { await audio.play(); } catch { return false; }
      return true;
    }
    if (!voiceSource) {
      voiceSource = ctx.createMediaElementSource(audio);
      voiceSource.connect(analyser);
      analyser.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') { try { await ctx.resume(); } catch { /* handled by play() failing */ } }
    try { await audio.play(); } catch { return false; }
    beginDriver('voice', 'speaking');
    pump();
    if (avatar) avatar.speak(line, { transmit: false });
    return true;
  }
  audio.addEventListener('ended', () => { if (driver === 'voice') stopDriver(); });
  audio.addEventListener('pause', () => { if (driver === 'voice' && audio.ended === false && audio.currentTime > 0 && audio.currentTime < audio.duration) stopDriver(); });

  replayBtn.addEventListener('click', async () => {
    hideAlert(voiceAlert);
    audio.currentTime = 0;
    const ok = await playVoice(text.value.trim());
    if (!ok) showAlert(voiceAlert, 'Playback was blocked', 'The browser refused to start audio. Click Play again — a direct click is what it wants.', null, 'info');
  });

  sayBtn.addEventListener('click', async () => {
    if (busy) return;
    hideAlert(voiceAlert);
    const line = text.value.trim();
    if (!line) return sayStatus('Pick a line or type one first.', true);
    if (line.length > MAX_CHARS) return sayStatus(`Keep it under ${MAX_CHARS} characters.`, true);
    const engine = selectedEngine();
    if (!engine) return sayStatus('No engine is selected.', true);
    if (engine.requiresKey && !keyInput.value.trim()) {
      return showAlert(voiceAlert, 'Chloé’s voice needs the access key', 'Paste the operator key beside the picker. Without it nothing plays — this page never reads her lines in another voice. The drivers above still show how the cloud reacts to sound.');
    }
    await ensureAvatar();
    voiceOut.hidden = true;
    audio.pause();
    setBusy(true, 'Working');
    sayStatus('Sending…');
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (engine.requiresKey) headers['X-Audiobook-Key'] = keyInput.value.trim();
      const r = await fetch('/api/voice?route=speak', { method: 'POST', headers, body: JSON.stringify({ text: line, voice: engine.id }) });
      const data = await r.json();
      if (!r.ok) { const e = new Error(data.error || 'The voice service refused this preview.'); e.code = r.status; throw e; }
      const result = await poll(data.job_id, Date.now());
      if (result.substituted) {
        sayStatus('', false);
        showAlert(voiceAlert, 'The service answered with a different voice — not played',
          'The engine you chose could not serve Chloé’s voice and the service fell back to another narrator. That clip is not her, so this page did not play it and will not offer it.');
        setCall(`// refused: upstream substituted another voice for '${engine.id}'`);
        return;
      }
      audio.src = `/api/voice?route=audio&job=${encodeURIComponent(data.job_id)}`;
      voiceOut.hidden = false;
      voiceNote.textContent = result.duration ? `${result.duration} · her voice, this engine` : 'Her voice, this engine';
      sayStatus('Ready.');
      const ok = await playVoice(line);
      if (!ok) showAlert(voiceAlert, 'Ready, but playback was blocked', 'The browser will not start audio without a direct click. Press Play.', null, 'info');
      setCall(`avatar.setState('speaking');\navatar.speak(${JSON.stringify(line)}, { transmit: false });\n// per frame: avatar.setAudioLevel(rms)  // AnalyserNode on the <audio> element`);
    } catch (err) {
      sayStatus('', true);
      explainVoice(err);
    } finally {
      setBusy(false);
    }
  });

  // ---- Tuning ---------------------------------------------------------------
  function sliderRow(key, label, min, max, step, value, onInput, kind) {
    const row = document.createElement('div');
    row.className = 'ap-slider'; row.dataset.key = key;
    const id = `ap-k-${key}`;
    const lab = document.createElement('label'); lab.htmlFor = id; lab.textContent = label;
    let input;
    const out = document.createElement('output');
    if (kind === 'color') {
      input = document.createElement('input'); input.type = 'color'; input.id = id; input.value = hexOf(value);
      out.textContent = hexOf(value);
      input.addEventListener('input', () => { out.textContent = input.value; onInput(intOf(input.value)); });
    } else {
      input = document.createElement('input'); input.type = 'range'; input.id = id;
      input.min = String(min); input.max = String(max); input.step = String(step); input.value = String(value);
      out.textContent = fmt(value, step);
      input.addEventListener('input', () => { out.textContent = fmt(input.value, step); onInput(Number(input.value)); });
    }
    row.append(lab, input, out);
    return row;
  }

  function buildGlobalSliders() {
    globalEl.replaceChildren();
    const g = (avatar ? avatar.getTuning().global : { cloudScale: DEFAULT_CLOUD_SCALE, glow: 1, sizeScale: 1 });
    for (const [key, label, min, max, step] of GLOBAL_KNOBS) {
      globalEl.append(sliderRow(key, label, min, max, step, g[key], async (v) => {
        const a = await ensureAvatar(); if (!a) return;
        a.setTuning({ global: { [key]: v } });
        setCall(`avatar.setTuning({ global: { ${key}: ${v} } });`);
        paintPatch();
      }));
    }
  }

  function buildStateSliders() {
    stateSlidersEl.replaceChildren();
    const name = avatar ? avatar.getState() : 'idle';
    tuneState.textContent = name;
    const s = avatar ? avatar.getTuning().states[name] : null;
    if (!s) {
      const p = document.createElement('p'); p.className = 'ap-note';
      p.textContent = 'Start the cloud to edit the rules of the state on stage.';
      stateSlidersEl.append(p);
      return;
    }
    for (const [key, label, min, max, step] of STATE_KNOBS) {
      stateSlidersEl.append(sliderRow(key, label, min, max, step, s[key], (v) => {
        if (!avatar) return;
        avatar.setTuning({ states: { [name]: { [key]: v } } });
        setCall(`avatar.setTuning({ states: { ${name}: { ${key}: ${v} } } });`);
        paintPatch();
      }));
    }
    for (const [key, label] of [['colorA', 'Colour A'], ['colorB', 'Colour B']]) {
      stateSlidersEl.append(sliderRow(key, label, 0, 0, 0, s[key], (v) => {
        if (!avatar) return;
        avatar.setTuning({ states: { [name]: { [key]: v } } });
        setCall(`avatar.setTuning({ states: { ${name}: { ${key}: 0x${v.toString(16).toUpperCase().padStart(6, '0')} } } });`);
        paintPatch();
      }, 'color'));
    }
    markChanged();
  }

  function currentPatch() {
    if (!avatar || !defaults) return pendingPatch || null;
    const now = avatar.getTuning();
    const patch = {};
    const states = {};
    for (const name of Object.keys(now.states)) {
      const d = defaults.states[name] || {};
      const diff = {};
      for (const k of Object.keys(now.states[name])) {
        if (now.states[name][k] !== d[k]) diff[k] = now.states[name][k];
      }
      if (Object.keys(diff).length) states[name] = diff;
    }
    if (Object.keys(states).length) patch.states = states;
    const g = {};
    for (const k of Object.keys(now.global)) {
      const base = k === 'cloudScale' ? DEFAULT_CLOUD_SCALE : defaults.global[k];
      if (now.global[k] !== base) g[k] = now.global[k];
    }
    if (Object.keys(g).length) patch.global = g;
    return Object.keys(patch).length ? patch : null;
  }

  function paintPatch() {
    const patch = currentPatch();
    patchEl.textContent = patch ? JSON.stringify(patch, (k, v) => (k === 'colorA' || k === 'colorB') && typeof v === 'number' ? hexOf(v) : v, 2) : '{}  // nothing changed from the shipped rule set';
    markChanged();
  }

  function markChanged() {
    const patch = currentPatch() || {};
    const name = avatar ? avatar.getState() : null;
    const changed = new Set(Object.keys((patch.states && name && patch.states[name]) || {}));
    for (const row of stateSlidersEl.querySelectorAll('.ap-slider')) row.classList.toggle('is-changed', changed.has(row.dataset.key));
    const gchanged = new Set(Object.keys(patch.global || {}));
    for (const row of globalEl.querySelectorAll('.ap-slider')) row.classList.toggle('is-changed', gchanged.has(row.dataset.key));
  }

  resetBtn.addEventListener('click', () => {
    pendingPatch = null;
    if (avatar && defaults) {
      avatar.setTuning({ states: JSON.parse(JSON.stringify(defaults.states)), global: { ...defaults.global, cloudScale: DEFAULT_CLOUD_SCALE } });
    }
    buildGlobalSliders();
    buildStateSliders();
    paintPatch();
    setCall('// tuning reset to the shipped rule set');
  });

  qualitySel.addEventListener('change', async () => {
    const a = await ensureAvatar(); if (!a) return;
    a.setQuality(qualitySel.value);
    setCall(`avatar.setQuality('${qualitySel.value}');  // high 120 · medium 80 · low 50 dots`);
  });

  seedInput.value = String(seed);
  reseedBtn.addEventListener('click', async () => {
    const v = Number(seedInput.value);
    seed = Number.isFinite(v) ? (v >>> 0) : (Math.random() * 0xFFFFFFFF) >>> 0;
    seedInput.value = String(seed);
    teardown();
    await ensureAvatar();
  });

  // ---- Take-away -------------------------------------------------------------
  async function copy(el, label) {
    const value = el.textContent;
    try {
      await navigator.clipboard.writeText(value);
      copyStatus.textContent = `${label} copied.`;
    } catch {
      const range = document.createRange(); range.selectNodeContents(el);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      copyStatus.textContent = `Clipboard blocked — ${label.toLowerCase()} is selected, press Ctrl/Cmd+C.`;
    }
  }
  copyCall.addEventListener('click', () => copy(callEl, 'Call'));
  copyPatch.addEventListener('click', () => copy(patchEl, 'Patch'));

  // ---- Keyboard --------------------------------------------------------------
  document.addEventListener('keydown', (event) => {
    const t = event.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const idx = Number(event.key) - 1;
    if (idx >= 0 && idx < STATES.length) { event.preventDefault(); setState(STATES[idx][0]); return; }
    if (event.key === 's' || event.key === 'S') { event.preventDefault(); synthBtn.click(); return; }
    if (event.key === 'm' || event.key === 'M') { event.preventDefault(); micBtn.click(); return; }
    if (event.key === 'Escape') { stopDriver(); cancelScript(); }
  });

  // ---- Wiring the rest -------------------------------------------------------
  // The live instance, for the console: fleet developers can poke the same
  // API the buttons use (window.chloeAvatar.setState(...)). Read-only handle.
  Object.defineProperty(window, 'chloeAvatar', { get: () => avatar, configurable: true });

  stopBtn.addEventListener('click', stop);
  reduceMotion.addEventListener('change', () => {
    hudMotion.textContent = reduceMotion.matches ? 'motion reduced' : 'full motion';
    hudMotion.dataset.tone = reduceMotion.matches ? 'warn' : '';
  });
  document.addEventListener('visibilitychange', () => {
    // a hidden tab pauses requestAnimationFrame on its own; the synthetic
    // interval would keep running, so hold it too
    if (document.hidden && driver === 'synth') stopDriver();
  });
  window.addEventListener('pagehide', () => { stopDriver(); });

  buildGlobalSliders();
  buildStateSliders();
  paintPatch();
  controlsHint.textContent = missing.length
    ? `This browser lacks ${missing.join(', ')} — the stage cannot start here.`
    : '';
  if (missing.length) {
    setPoster('unsupported', 'Unsupported browser', 'This browser cannot run the cloud',
      `The engine needs ${missing.join(', ')}, which this browser does not provide. The voice panel and the notes below still work.`, []);
  } else {
    readyPoster();
  }
})();
