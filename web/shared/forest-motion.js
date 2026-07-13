(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const palette = {
    portal: [121, 242, 168],
    time: [126, 226, 255],
    kids: [255, 207, 90],
    health: [255, 127, 176],
    council: [172, 144, 255],
    library: [96, 236, 193],
    calendar: [108, 175, 255],
    muscle: [255, 116, 92],
    ink: [238, 220, 184],
    poetry: [224, 132, 255],
    power: [255, 194, 88],
    news: [112, 234, 222],
    void: [81, 235, 255],
    vfx: [162, 130, 255],
  };

  // Shader-style names keep the interaction contract explicit even in the
  // resilient Canvas2D renderer: uMouse bends the field; uClick emits a pulse.
  const uniforms = {
    uMouse: { x: .5, y: .5, targetX: .5, targetY: .5 },
    uClick: { x: .5, y: .5, energy: 0 },
  };

  let canvases = [...document.querySelectorAll('canvas[data-forest-scene]')];
  if (!canvases.length && document.body.dataset.forestPage) {
    const canvas = document.createElement('canvas');
    canvas.className = 'forest-scene';
    canvas.dataset.forestScene = '';
    canvas.dataset.mode = document.body.dataset.forestPage;
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);
    canvases = [canvas];
  }
  if (!canvases.length) return;

  let documentVisible = !document.hidden;
  let pointerSeen = false;

  window.addEventListener('pointermove', (event) => {
    pointerSeen = true;
    uniforms.uMouse.targetX = event.clientX / Math.max(innerWidth, 1);
    uniforms.uMouse.targetY = event.clientY / Math.max(innerHeight, 1);
  }, { passive: true });

  window.addEventListener('pointerdown', (event) => {
    uniforms.uClick.x = event.clientX / Math.max(innerWidth, 1);
    uniforms.uClick.y = event.clientY / Math.max(innerHeight, 1);
    uniforms.uClick.energy = 1;
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    documentVisible = !document.hidden;
  });

  canvases.forEach((canvas, canvasIndex) => {
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) {
      canvas.dataset.fallback = 'true';
      return;
    }

    const mode = canvas.dataset.mode || document.body.dataset.forestPage || 'portal';
    const rgb = palette[mode] || palette.portal;
    const rgbText = rgb.join(',');
    const nodeCount = reduceMotion.matches ? 22 : Math.min(74, Math.max(38, Math.round(innerWidth / 19)));
    const seed = [...mode].reduce((sum, char) => sum + char.charCodeAt(0), 37 + canvasIndex);
    const random = mulberry32(seed);
    const nodes = Array.from({ length: nodeCount }, (_, index) => ({
      x: random(),
      y: random(),
      baseX: random() * Math.PI * 2,
      baseY: random() * Math.PI * 2,
      speed: .12 + random() * .34,
      phase: random() * Math.PI * 2,
      size: .5 + random() * 1.7,
      lane: index % 5,
    }));
    const points = nodes.map((node, index) => ({ node, index, x: 0, y: 0 }));

    let width = 0;
    let height = 0;
    let lastFrame = 0;
    let intersectionVisible = true;
    let animationFrame = 0;

    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => {
          intersectionVisible = entries.some((entry) => entry.isIntersecting);
          if (intersectionVisible) {
            lastFrame = 0;
            scheduleDraw();
          }
        }, { rootMargin: '120px' })
      : null;
    observer?.observe(canvas);

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, rect.width || innerWidth);
      height = Math.max(1, rect.height || innerHeight);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function scheduleDraw() {
      if (!animationFrame) animationFrame = requestAnimationFrame(draw);
    }

    function draw(timestamp) {
      animationFrame = 0;
      if (!documentVisible || !intersectionVisible) return;
      if (reduceMotion.matches && lastFrame) return;
      if (timestamp - lastFrame < 32) {
        scheduleDraw();
        return;
      }
      lastFrame = timestamp;

      if (canvas.clientWidth !== width || canvas.clientHeight !== height) resize();

      const time = timestamp * .001;
      const mouse = uniforms.uMouse;
      mouse.x += (mouse.targetX - mouse.x) * .065;
      mouse.y += (mouse.targetY - mouse.y) * .065;
      uniforms.uClick.energy *= .94;

      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = 'lighter';

      for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        const point = points[index];
        const idleX = Math.sin(time * node.speed + node.baseX) * (10 + node.lane * 2);
        const idleY = Math.cos(time * node.speed * .82 + node.baseY) * (8 + node.lane * 2);
        let x = node.x * width + idleX;
        let y = node.y * height + idleY;

        if (pointerSeen && !reduceMotion.matches) {
          const dx = mouse.x * width - x;
          const dy = mouse.y * height - y;
          const distance = Math.hypot(dx, dy) || 1;
          const pull = Math.max(0, 1 - distance / 320) * 34;
          x += (dx / distance) * pull;
          y += (dy / distance) * pull;
        }
        point.x = x;
        point.y = y;
      }

      for (let a = 0; a < points.length; a += 1) {
        const first = points[a];
        let near1 = null;
        let distance1 = Infinity;
        let near2 = null;
        let distance2 = Infinity;
        for (let b = a + 1; b < points.length; b += 1) {
          const second = points[b];
          const distance = Math.hypot(first.x - second.x, first.y - second.y);
          if (distance >= 155) continue;
          if (distance < distance1) {
            near2 = near1;
            distance2 = distance1;
            near1 = second;
            distance1 = distance;
          } else if (distance < distance2) {
            near2 = second;
            distance2 = distance;
          }
        }
        for (let neighbor = 0; neighbor < 2; neighbor += 1) {
          const second = neighbor === 0 ? near1 : near2;
          const distance = neighbor === 0 ? distance1 : distance2;
          if (!second) continue;
          const alpha = (1 - distance / 155) * .2;
          context.beginPath();
          context.moveTo(first.x, first.y);
          const bend = mode === 'time' || mode === 'poetry' ? 18 : 7;
          context.quadraticCurveTo(
            (first.x + second.x) / 2 + Math.sin(time + first.node.phase) * bend,
            (first.y + second.y) / 2 + Math.cos(time + second.node.phase) * bend,
            second.x,
            second.y,
          );
          context.strokeStyle = `rgba(${rgbText},${alpha})`;
          context.lineWidth = .65;
          context.stroke();
        }
      }

      for (let index = 0; index < points.length; index += 1) {
        const point = points[index];
        const vivid = pointerSeen
          ? Math.max(0, 1 - Math.hypot(point.x - mouse.x * width, point.y - mouse.y * height) / 250)
          : 0;
        context.beginPath();
        context.arc(point.x, point.y, point.node.size + vivid * 1.8, 0, Math.PI * 2);
        context.fillStyle = `rgba(${rgbText},${.22 + vivid * .5})`;
        context.fill();
      }

      if (uniforms.uClick.energy > .02) {
        const radius = (1 - uniforms.uClick.energy) * 190 + 12;
        context.beginPath();
        context.arc(uniforms.uClick.x * width, uniforms.uClick.y * height, radius, 0, Math.PI * 2);
        context.strokeStyle = `rgba(${rgbText},${uniforms.uClick.energy * .42})`;
        context.lineWidth = 1.2;
        context.stroke();
      }

      context.globalCompositeOperation = 'source-over';
      if (!reduceMotion.matches) scheduleDraw();
    }

    resize();
    scheduleDraw();
    window.addEventListener('resize', () => {
      resize();
      lastFrame = 0;
      scheduleDraw();
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (documentVisible) {
        lastFrame = 0;
        scheduleDraw();
      }
    });
    reduceMotion.addEventListener?.('change', () => {
      lastFrame = 0;
      scheduleDraw();
    });
  });

  function mulberry32(seed) {
    let value = seed | 0;
    return function seededRandom() {
      value = (value + 0x6D2B79F5) | 0;
      let result = value;
      result = Math.imul(result ^ result >>> 15, result | 1);
      result ^= result + Math.imul(result ^ result >>> 7, result | 61);
      return ((result ^ result >>> 14) >>> 0) / 4294967296;
    };
  }
})();
