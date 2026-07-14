/* SDForest landing — portal icon animation engine.
   Expands the shared <symbol> references into real per-portal nodes so each
   icon can carry its own idle character (forest-icons.css), then layers on:
   a scroll-triggered stroke draw-in, spring-physics hover, and spark bursts.
   Degrades cleanly: no JS = the original <use> icons keep the old shared
   keyframes; reduced motion = static icons, no loops, no particles. */
(() => {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = matchMedia('(pointer: coarse)');
  const compactViewport = matchMedia('(max-width: 900px)');
  const lightweight = () => coarsePointer.matches || compactViewport.matches;

  const grid = document.querySelector('[data-project-grid]');
  if (!grid || typeof Element.prototype.animate !== 'function') return;

  // --- 1. Expand <use> icons into real nodes -------------------------------
  // Wrapping the clone in .icon-inner keeps whole-icon idle keyframes off the
  // <svg> element itself, which the hover spring owns via inline transform.
  const icons = [];
  grid.querySelectorAll('.portal').forEach((portal) => {
    const svg = portal.querySelector('.portal-icon svg');
    const use = svg && svg.querySelector('use');
    const ref = use && (use.getAttribute('href') || use.getAttribute('xlink:href'));
    if (!ref || !ref.startsWith('#')) return;
    const symbol = document.getElementById(ref.slice(1));
    if (!symbol) return;
    const inner = document.createElementNS(SVG_NS, 'g');
    inner.setAttribute('class', 'icon-inner');
    [...symbol.children].forEach((child) => inner.appendChild(child.cloneNode(true)));
    svg.replaceChildren(inner);
    svg.dataset.icon = ref.slice(1).replace(/^icon-/, '');
    // Normalized length lets the draw-in speak 0..1 dash values regardless of
    // geometry. Rings keep their authored dash patterns (the crawl needs them).
    inner.querySelectorAll('.icon-line').forEach((path) => path.setAttribute('pathLength', '1'));
    icons.push({ portal, svg, inner });
  });
  if (!icons.length) return;

  // --- 2. Spark bursts ------------------------------------------------------
  function burst(svg, count, reach) {
    if (reduceMotion.matches) return;
    if (svg.querySelectorAll('.icon-spark').length > 24) return;
    for (let i = 0; i < count; i += 1) {
      const spark = document.createElementNS(SVG_NS, 'circle');
      spark.setAttribute('class', 'icon-spark');
      spark.setAttribute('cx', '24');
      spark.setAttribute('cy', '24');
      spark.setAttribute('r', (0.9 + Math.random() * 0.9).toFixed(2));
      svg.appendChild(spark);
      const angle = Math.random() * Math.PI * 2;
      const distance = reach * (0.7 + Math.random() * 0.5);
      const animation = spark.animate([
        { transform: 'translate(0px, 0px) scale(1)', opacity: 0.95 },
        {
          transform: `translate(${(Math.cos(angle) * distance).toFixed(1)}px, ${(Math.sin(angle) * distance).toFixed(1)}px) scale(.15)`,
          opacity: 0,
        },
      ], {
        duration: 480 + Math.random() * 260,
        easing: 'cubic-bezier(.17, .84, .44, 1)',
        fill: 'forwards',
      });
      animation.onfinish = () => spark.remove();
    }
  }

  function ripple(svg) {
    if (reduceMotion.matches) return;
    const ring = document.createElementNS(SVG_NS, 'circle');
    ring.setAttribute('class', 'icon-ripple');
    ring.setAttribute('cx', '24');
    ring.setAttribute('cy', '24');
    ring.setAttribute('r', '10');
    ring.setAttribute('stroke-width', '1.4');
    svg.appendChild(ring);
    const animation = ring.animate([
      { transform: 'scale(.3)', opacity: 0.9 },
      { transform: 'scale(2.1)', opacity: 0 },
    ], { duration: 520, easing: 'cubic-bezier(.22, .8, .36, 1)', fill: 'forwards' });
    animation.onfinish = () => ring.remove();
  }

  // --- 3. Hover spring ------------------------------------------------------
  // Semi-implicit Euler spring on scale + rotation. The rotation gets a
  // velocity kick on enter so the icon lands with a damped wobble instead of
  // a keyframed wiggle.
  function createSpring(svg) {
    const state = { scale: 1, vScale: 0, rot: 0, vRot: 0, target: 1, frame: 0, last: 0 };

    function tick(now) {
      state.frame = 0;
      const dt = Math.min((now - state.last) / 1000, 1 / 30) || 1 / 60;
      state.last = now;

      state.vScale += (-190 * (state.scale - state.target) - 13 * state.vScale) * dt;
      state.scale += state.vScale * dt;
      state.vRot += (-120 * state.rot - 9 * state.vRot) * dt;
      state.rot += state.vRot * dt;

      const settled = Math.abs(state.scale - state.target) < 0.001
        && Math.abs(state.vScale) < 0.01
        && Math.abs(state.rot) < 0.05
        && Math.abs(state.vRot) < 0.5;

      if (settled && state.target === 1) {
        state.scale = 1;
        state.rot = 0;
        svg.style.transform = '';
        return;
      }
      svg.style.transform = `scale(${state.scale.toFixed(4)}) rotate(${state.rot.toFixed(3)}deg)`;
      if (!settled) schedule();
    }

    function schedule() {
      if (!state.frame) state.frame = requestAnimationFrame(tick);
    }

    return {
      to(target, kick) {
        if (reduceMotion.matches) return;
        state.target = target;
        if (kick) state.vRot += (Math.random() < 0.5 ? -1 : 1) * (55 + Math.random() * 40);
        state.last = performance.now();
        schedule();
      },
      rest() {
        if (state.frame) cancelAnimationFrame(state.frame);
        state.frame = 0;
        state.scale = state.target = 1;
        state.vScale = state.rot = state.vRot = 0;
        svg.style.transform = '';
      },
    };
  }

  icons.forEach((icon) => {
    icon.spring = createSpring(icon.svg);
    icon.portal.addEventListener('pointerenter', () => {
      if (coarsePointer.matches) return;
      icon.spring.to(1.16, true);
      burst(icon.svg, 6, 20);
    });
    icon.portal.addEventListener('pointerleave', () => icon.spring.to(1, false));
    icon.portal.addEventListener('focus', () => icon.spring.to(1.16, true));
    icon.portal.addEventListener('blur', () => icon.spring.to(1, false));
    icon.portal.addEventListener('click', () => {
      burst(icon.svg, lightweight() ? 6 : 10, 26);
      ripple(icon.svg);
    });
  });

  // --- 4. Scroll-triggered draw-in ------------------------------------------
  // Strokes trace themselves in, rings fade up, the core pops with a back-out
  // overshoot — staggered on the same serpentine --cd delays the cards use, so
  // the icons light up in the order the lattice weaves.
  let revealed = reduceMotion.matches;
  if (!revealed) icons.forEach(({ svg }) => svg.classList.add('pre-draw'));

  function reveal() {
    if (revealed) return;
    revealed = true;
    icons.forEach(({ portal, svg, inner }, index) => {
      const cd = parseFloat(getComputedStyle(portal).getPropertyValue('--cd')) || index * 0.05;
      const delay = cd * 1000 + 80;
      const animations = [];
      inner.querySelectorAll('.icon-line').forEach((path) => {
        animations.push(path.animate([
          { strokeDasharray: '1 1', strokeDashoffset: 1 },
          { strokeDasharray: '1 1', strokeDashoffset: 0 },
        ], { duration: 950, delay, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'both' }));
      });
      inner.querySelectorAll('.icon-ring').forEach((ring) => {
        animations.push(ring.animate(
          [{ opacity: 0 }, { opacity: 0.42 }],
          { duration: 700, delay: delay + 200, easing: 'ease-out', fill: 'both' },
        ));
      });
      inner.querySelectorAll('.icon-fill').forEach((fill) => {
        animations.push(fill.animate([
          { transform: 'scale(0)' },
          { transform: 'scale(1.35)', offset: 0.7 },
          { transform: 'scale(1)' },
        ], { duration: 420, delay: delay + 620, easing: 'cubic-bezier(.34, 1.56, .64, 1)', fill: 'both' }));
      });
      Promise.all(animations.map((animation) => animation.finished)).then(() => {
        // Drop the hold class before cancelling so CSS idles take over on the
        // exact frame the WAAPI fill state disappears.
        svg.classList.remove('pre-draw');
        animations.forEach((animation) => animation.cancel());
        if (!lightweight()) burst(svg, 3, 14);
      }).catch(() => {
        svg.classList.remove('pre-draw');
      });
    });
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      reveal();
    }, { threshold: 0.15 });
    observer.observe(grid);
    // Belt and suspenders: if the observer is starved (background tab at
    // load, odd embedding), a one-shot rect check on scroll still lights
    // the lattice — icons must never stay invisible.
    const fallback = () => {
      if (revealed) {
        window.removeEventListener('scroll', fallback);
        return;
      }
      const bounds = grid.getBoundingClientRect();
      if (bounds.top < innerHeight * 0.9 && bounds.bottom > 0) {
        window.removeEventListener('scroll', fallback);
        observer.disconnect();
        reveal();
      }
    };
    window.addEventListener('scroll', fallback, { passive: true });
  } else {
    reveal();
  }

  // --- 5. Reduced-motion live switch ---------------------------------------
  reduceMotion.addEventListener?.('change', () => {
    if (!reduceMotion.matches) return;
    icons.forEach((icon) => {
      icon.spring.rest();
      icon.svg.classList.remove('pre-draw');
      icon.svg.querySelectorAll('.icon-spark, .icon-ripple').forEach((node) => node.remove());
      icon.svg.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    });
    revealed = true;
  });
})();
