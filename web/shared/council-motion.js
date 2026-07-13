(() => {
  'use strict';

  // Ambient council field: a quiet drift of motes that wakes up while the
  // council is thinking, leans toward the speaking card while it streams, and
  // rings once when a stage lands. Reads activity from the DOM (streaming /
  // thinking / typing markers) so it needs no hooks inside the page logic.

  const body = document.body;
  const council = body.dataset.council;
  if (!council) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const canvas = document.createElement('canvas');
  canvas.className = 'cm-field';
  canvas.setAttribute('aria-hidden', 'true');
  body.prepend(canvas);
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;

  const styles = getComputedStyle(body);
  const rgbText = (styles.getPropertyValue('--cm-rgb').trim() || '139,92,246');

  let width = 0;
  let height = 0;
  let dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = Math.max(1, innerWidth);
    height = Math.max(1, innerHeight);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const moteCount = Math.min(56, Math.max(30, Math.round(innerWidth / 26)));
  const motes = Array.from({ length: moteCount }, (_, index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    drift: .08 + Math.random() * .3,
    phase: Math.random() * Math.PI * 2,
    size: .6 + Math.random() * 1.5,
    // Motes live near the margins so the reading column stays clean.
    lane: index % 2 === 0 ? -1 : 1,
  }));
  const sparks = [];
  const rings = [];

  // Activity model: 0.2 idle → 0.65 thinking → 1 streaming.
  let energy = .2;
  let energyTarget = .2;
  let focusRect = null;
  let pointerX = .5;
  let pointerY = .5;

  window.addEventListener('pointermove', (event) => {
    pointerX = event.clientX / Math.max(innerWidth, 1);
    pointerY = event.clientY / Math.max(innerHeight, 1);
  }, { passive: true });

  function readActivity() {
    const streaming = document.querySelector('.stage-content.streaming, .typing');
    const thinking = document.querySelector('.stage-status.thinking, .dot.live');
    energyTarget = streaming ? 1 : thinking ? .65 : .2;
    const focus = document.querySelector('.stage-card.active') ||
      (streaming && streaming.closest('.stage-card, .chat, .panel'));
    focusRect = focus ? focus.getBoundingClientRect() : null;
  }

  function ringAt(x, y) {
    if (reduceMotion.matches) return;
    rings.push({ x, y, life: 1 });
  }

  // Watch the conversation: new cards burst softly, finished stages ring.
  const seenDone = new WeakSet();
  const observer = new MutationObserver((mutations) => {
    let dirty = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        dirty = true;
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.('.stage-card, .msg, .round-header, .synthesis')) {
            const rect = node.getBoundingClientRect();
            ringAt(rect.left + rect.width * .5, Math.min(height - 20, rect.top + 26));
          }
        }
      } else if (mutation.type === 'attributes') {
        dirty = true;
        const target = mutation.target;
        if (target.nodeType === 1 && target.matches?.('.stage-card.done, .stage-card.failed') && !seenDone.has(target)) {
          seenDone.add(target);
          const rect = target.getBoundingClientRect();
          ringAt(rect.left + rect.width * .5, rect.top + rect.height * .5);
        }
      }
    }
    if (dirty) scheduleActivityRead();
  });
  observer.observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  let activityTimer = 0;
  function scheduleActivityRead() {
    if (activityTimer) return;
    activityTimer = setTimeout(() => {
      activityTimer = 0;
      readActivity();
    }, 120);
  }

  let documentVisible = !document.hidden;
  document.addEventListener('visibilitychange', () => {
    documentVisible = !document.hidden;
    if (documentVisible) {
      lastFrame = 0;
      scheduleDraw();
    }
  });

  let lastFrame = 0;
  let animationFrame = 0;
  let sparkClock = 0;

  function scheduleDraw() {
    if (!animationFrame) animationFrame = requestAnimationFrame(draw);
  }

  function draw(timestamp) {
    animationFrame = 0;
    if (!documentVisible) return;
    if (reduceMotion.matches) {
      drawStatic();
      return;
    }
    if (timestamp - lastFrame < 32) {
      scheduleDraw();
      return;
    }
    const delta = lastFrame ? Math.min(64, timestamp - lastFrame) : 16;
    lastFrame = timestamp;
    const time = timestamp * .001;

    energy += (energyTarget - energy) * .04;

    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = 'lighter';

    // Motes: margin-dwelling drift, brighter and faster as energy rises.
    const speed = .5 + energy * 1.4;
    for (const mote of motes) {
      mote.y -= mote.drift * speed * (delta / 16);
      mote.x += Math.sin(time * .6 + mote.phase) * .18;
      if (mote.y < -8) {
        mote.y = height + 8;
        const edge = Math.random() * .3;
        mote.x = (mote.lane < 0 ? edge : 1 - edge) * width;
      }
      const parallax = (pointerX - .5) * 14 * mote.size;
      const alpha = (.1 + energy * .26) * (0.6 + Math.sin(time + mote.phase) * .4);
      context.beginPath();
      context.arc(mote.x + parallax, mote.y + (pointerY - .5) * 6, mote.size + energy * .8, 0, Math.PI * 2);
      context.fillStyle = `rgba(${rgbText},${Math.max(0, alpha)})`;
      context.fill();
    }

    // While a card speaks, it sheds sparks from its left edge.
    sparkClock += delta;
    if (focusRect && energy > .5 && sparkClock > 200 && sparks.length < 26) {
      sparkClock = 0;
      sparks.push({
        x: focusRect.left + Math.random() * 8,
        y: focusRect.top + Math.random() * Math.max(20, focusRect.height * .8),
        vx: -(.2 + Math.random() * .5),
        vy: -(.25 + Math.random() * .55),
        life: 1,
        size: .8 + Math.random() * 1.3,
      });
    }
    for (let index = sparks.length - 1; index >= 0; index -= 1) {
      const spark = sparks[index];
      spark.x += spark.vx * (delta / 16);
      spark.y += spark.vy * (delta / 16);
      spark.life -= .012 * (delta / 16);
      if (spark.life <= 0) {
        sparks.splice(index, 1);
        continue;
      }
      context.beginPath();
      context.arc(spark.x, spark.y, spark.size * spark.life, 0, Math.PI * 2);
      context.fillStyle = `rgba(${rgbText},${spark.life * .5})`;
      context.fill();
    }

    // Completion rings expand and fade.
    for (let index = rings.length - 1; index >= 0; index -= 1) {
      const ring = rings[index];
      ring.life -= .02 * (delta / 16);
      if (ring.life <= 0) {
        rings.splice(index, 1);
        continue;
      }
      context.beginPath();
      context.arc(ring.x, ring.y, (1 - ring.life) * 130 + 8, 0, Math.PI * 2);
      context.strokeStyle = `rgba(${rgbText},${ring.life * .3})`;
      context.lineWidth = 1;
      context.stroke();
    }

    context.globalCompositeOperation = 'source-over';
    scheduleDraw();
  }

  function drawStatic() {
    context.clearRect(0, 0, width, height);
    for (const mote of motes) {
      context.beginPath();
      context.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
      context.fillStyle = `rgba(${rgbText},.12)`;
      context.fill();
    }
  }

  reduceMotion.addEventListener?.('change', () => {
    lastFrame = 0;
    scheduleDraw();
  });

  readActivity();
  setInterval(readActivity, 900);
  scheduleDraw();
})();
