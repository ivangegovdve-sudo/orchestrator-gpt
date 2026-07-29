(() => {
  'use strict';

  const forestTrailsReady = import('/web/shared/forest-trails.mjs?v=20260729b')
    .then((trailModule) => {
      document.documentElement.dataset.forestTrailsState = 'ready';
      return trailModule;
    })
    .catch(() => {
      document.documentElement.dataset.forestTrailsState = 'error';
      return null;
    });

  if (window.__forestAmbient?.version === '3.0.0') {
    window.__forestAmbient.trailsReady ||= forestTrailsReady;
    return;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ambient = {
    version: '3.0.0',
    engine: 'loading',
    instances: [],
    trailsReady: forestTrailsReady,
    ready: null,
    snapshot() {
      return this.instances.map((instance) => instance.snapshot());
    },
  };
  window.__forestAmbient = ambient;

  installEntranceMotion(reduceMotion);

  // Open Overview already owns a stricter route-local renderer controller.
  // Keeping that ownership explicit prevents this shared runtime from
  // bypassing its intersection, reduced-motion, capability, and Save-Data
  // gates while still allowing shared entrances and Forest Trails.
  if (document.body.dataset.forestSceneOwner === 'route') {
    ambient.engine = 'route-managed';
    ambient.ready = Promise.resolve(ambient);
    return;
  }

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

  if (!canvases.length) {
    ambient.engine = 'not-requested';
    ambient.ready = Promise.resolve(ambient);
    return;
  }

  for (const canvas of canvases) {
    canvas.style.position ||= 'fixed';
    canvas.style.inset ||= '0';
    canvas.style.width ||= '100%';
    canvas.style.height ||= '100%';
    canvas.style.pointerEvents = 'none';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.dataset.offscreenCapable = String(
      typeof canvas.transferControlToOffscreen === 'function',
    );
  }

  ambient.ready = Promise.all([
    import('/web/vendor/three/three.module.min.js'),
    import('/web/shared/forest-themes.mjs'),
  ]).then(([THREE, themes]) => {
    ambient.engine = 'three';
    ambient.instances = canvases.map((canvas, index) => new ForestAmbientScene({
      THREE,
      canvas,
      index,
      themes,
      reduceMotion,
    }));
    return ambient;
  }).catch(() => {
    ambient.engine = 'static-fallback';
    for (const canvas of canvases) {
      canvas.dataset.forestState = 'fallback';
      canvas.hidden = true;
    }
    return ambient;
  });

  class ForestAmbientScene {
    constructor({ THREE, canvas, index, themes, reduceMotion: motionQuery }) {
      this.THREE = THREE;
      this.canvas = canvas;
      this.index = index;
      this.themes = themes;
      this.motionQuery = motionQuery;
      this.theme = themes.resolveForestTheme(
        canvas.dataset.mode || document.body.dataset.forestPage || 'portal',
      );
      this.reduced = motionQuery.matches;
      this.destroyed = false;
      this.contextLost = false;
      this.documentVisible = !document.hidden;
      this.intersectionVisible = true;
      this.raf = 0;
      this.lastFrame = 0;
      this.elapsed = 0;
      this.pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
      this.click = { x: 0, y: 0, energy: 0 };
      this.scroll = { value: 0, target: 0, y: window.scrollY, time: performance.now() };
      this.resizeQueued = false;

      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerDown = this.onPointerDown.bind(this);
      this.onScroll = this.onScroll.bind(this);
      this.onResize = this.onResize.bind(this);
      this.onVisibility = this.onVisibility.bind(this);
      this.onMotionPreference = this.onMotionPreference.bind(this);
      this.onContextLost = this.onContextLost.bind(this);
      this.onContextRestored = this.onContextRestored.bind(this);
      this.onPageHide = this.destroy.bind(this);
      this.frame = this.frame.bind(this);

      this.createRenderer();
      this.installLifecycle();
      this.resize();
      this.canvas.dataset.forestTheme = this.theme.id;
      this.canvas.dataset.forestState = 'ready';
      this.schedule();
    }

    createRenderer() {
      const THREE = this.THREE;
      const {
        AdditiveBlending,
        BufferAttribute,
        BufferGeometry,
        Color,
        PerspectiveCamera,
        Scene,
        Vector2,
      } = THREE;

      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: false,
        depth: false,
        powerPreference: 'low-power',
        premultipliedAlpha: false,
      });
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

      this.scene = new Scene();
      this.camera = new PerspectiveCamera(42, 1, 0.1, 100);
      this.camera.position.z = 5.2;

      const count = this.reduced
        ? Math.min(40, this.theme.pointCount)
        : Math.min(96, Math.max(48, Math.round(window.innerWidth / 17), this.theme.pointCount));
      const data = this.themes.createThemePoints(this.theme, count, this.index + 1);
      this.geometry = new BufferGeometry();
      this.geometry.setAttribute('position', new BufferAttribute(data.positions, 3));
      this.geometry.setAttribute('aPhase', new BufferAttribute(data.phases, 1));
      this.geometry.setAttribute('aSize', new BufferAttribute(data.sizes, 1));
      this.geometry.setAttribute('aLane', new BufferAttribute(data.lanes, 1));

      this.uniforms = {
        uTime: { value: 0 },
        uMouse: { value: new Vector2(0, 0) },
        uClick: { value: 0 },
        uClickOrigin: { value: new Vector2(0, 0) },
        uResolution: { value: new Vector2(1, 1) },
        uScroll: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
        uSpeed: { value: this.theme.speed },
        uPrimary: { value: new Color(this.theme.primary) },
        uSecondary: { value: new Color(this.theme.secondary) },
      };

      this.material = new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: `
          uniform float uTime;
          uniform vec2 uMouse;
          uniform float uClick;
          uniform vec2 uClickOrigin;
          uniform vec2 uResolution;
          uniform float uScroll;
          uniform float uPixelRatio;
          uniform float uSpeed;
          attribute float aPhase;
          attribute float aSize;
          attribute float aLane;
          varying float vLane;
          varying float vPulse;
          varying float vNearPointer;

          void main() {
            vec3 p = position;
            float aspect = uResolution.x / max(uResolution.y, 1.0);
            float time = uTime * uSpeed;
            p.x += sin(time * 1.7 + aPhase) * (0.025 + aLane * 0.025);
            p.y += cos(time * 1.2 + aPhase * 1.3) * (0.02 + (1.0 - aLane) * 0.02);
            p.z += sin(time + aPhase * 0.7) * 0.08;

            vec2 pointer = vec2(uMouse.x * 2.15 * aspect, uMouse.y * 1.65);
            vec2 toPointer = pointer - p.xy;
            float pointerDistance = length(toPointer);
            float nearPointer = 1.0 - smoothstep(0.0, 1.25, pointerDistance);
            p.xy += normalize(toPointer + vec2(0.0001)) * nearPointer * 0.13;

            vec2 clickPoint = vec2(uClickOrigin.x * 2.15 * aspect, uClickOrigin.y * 1.65);
            float clickDistance = length(p.xy - clickPoint);
            float clickRadius = (1.0 - uClick) * 2.1;
            float pulse = 1.0 - smoothstep(0.05, 0.24, abs(clickDistance - clickRadius));
            p.xy += normalize(p.xy - clickPoint + vec2(0.0001)) * pulse * uClick * 0.24;
            p.z += pulse * uClick * 0.7;

            // Scroll velocity is an input, not a timeline: a fast wheel or
            // swipe produces a stronger lateral slip, then eases back to rest.
            p.x += uScroll * (0.2 + aLane * 0.38);
            p.z += abs(uScroll) * (aLane - 0.5) * 0.34;

            vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * viewPosition;
            gl_PointSize = min(
              10.0,
              (aSize + nearPointer * 2.2 + pulse * uClick * 3.2)
                * uPixelRatio
                * (5.0 / max(1.0, -viewPosition.z))
            );
            vLane = aLane;
            vPulse = pulse * uClick;
            vNearPointer = nearPointer;
          }
        `,
        fragmentShader: `
          uniform vec3 uPrimary;
          uniform vec3 uSecondary;
          varying float vLane;
          varying float vPulse;
          varying float vNearPointer;

          void main() {
            float distanceToCenter = length(gl_PointCoord - vec2(0.5));
            float alpha = 1.0 - smoothstep(0.08, 0.5, distanceToCenter);
            vec3 color = mix(uPrimary, uSecondary, smoothstep(0.15, 0.9, vLane));
            color += vec3(vPulse * 0.48 + vNearPointer * 0.16);
            float strength = 0.22 + vLane * 0.22 + vNearPointer * 0.42 + vPulse * 0.52;
            gl_FragColor = vec4(color, alpha * strength);
          }
        `,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: AdditiveBlending,
      });

      this.points = new THREE.Points(this.geometry, this.material);
      this.scene.add(this.points);
    }

    installLifecycle() {
      window.addEventListener('pointermove', this.onPointerMove, { passive: true });
      window.addEventListener('pointerdown', this.onPointerDown, { passive: true });
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onResize, { passive: true });
      window.visualViewport?.addEventListener('resize', this.onResize, { passive: true });
      document.addEventListener('visibilitychange', this.onVisibility);
      this.motionQuery.addEventListener?.('change', this.onMotionPreference);
      this.canvas.addEventListener('webglcontextlost', this.onContextLost, false);
      this.canvas.addEventListener('webglcontextrestored', this.onContextRestored, false);
      window.addEventListener('pagehide', this.onPageHide, { once: true });

      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver(([entry]) => {
          this.intersectionVisible = entry.isIntersecting;
          if (this.intersectionVisible) this.schedule();
          else this.cancel();
        }, { rootMargin: '120px' });
        this.observer.observe(this.canvas);
      }
    }

    onPointerMove(event) {
      if (this.reduced) return;
      this.pointer.targetX = event.clientX / Math.max(window.innerWidth, 1) * 2 - 1;
      this.pointer.targetY = -(event.clientY / Math.max(window.innerHeight, 1) * 2 - 1);
      this.schedule();
    }

    onPointerDown(event) {
      if (this.reduced) return;
      this.click.x = event.clientX / Math.max(window.innerWidth, 1) * 2 - 1;
      this.click.y = -(event.clientY / Math.max(window.innerHeight, 1) * 2 - 1);
      this.click.energy = 1;
      this.uniforms.uClickOrigin.value.set(this.click.x, this.click.y);
      this.uniforms.uClick.value = 1;
      this.schedule();
    }

    onScroll() {
      if (this.reduced) return;
      const now = performance.now();
      const elapsed = Math.max(12, now - this.scroll.time);
      const delta = window.scrollY - this.scroll.y;
      this.scroll.target = clamp(delta / elapsed * 0.52, -1, 1);
      this.scroll.y = window.scrollY;
      this.scroll.time = now;
      this.schedule();
    }

    onResize() {
      if (this.resizeQueued) return;
      this.resizeQueued = true;
      requestAnimationFrame(() => {
        this.resizeQueued = false;
        if (this.destroyed) return;
        this.resize();
        this.render();
      });
    }

    onVisibility() {
      this.documentVisible = !document.hidden;
      if (this.documentVisible) this.schedule();
      else this.cancel();
    }

    onMotionPreference(event) {
      this.reduced = event.matches;
      this.elapsed = this.reduced ? 0 : this.elapsed;
      this.click.energy = 0;
      this.scroll.value = 0;
      this.scroll.target = 0;
      this.uniforms.uClick.value = 0;
      this.uniforms.uScroll.value = 0;
      this.cancel();
      this.render();
      if (!this.reduced) this.schedule();
    }

    onContextLost(event) {
      event.preventDefault();
      this.contextLost = true;
      this.canvas.dataset.forestState = 'context-lost';
      this.cancel();
    }

    onContextRestored() {
      this.contextLost = false;
      this.canvas.dataset.forestState = 'ready';
      this.resize();
      this.schedule();
    }

    resize() {
      const width = Math.max(1, this.canvas.clientWidth || window.innerWidth);
      const height = Math.max(1, this.canvas.clientHeight || window.innerHeight);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      this.renderer.setPixelRatio(pixelRatio);
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.uniforms.uResolution.value.set(width, height);
      this.uniforms.uPixelRatio.value = pixelRatio;
    }

    schedule() {
      if (
        this.raf
        || this.destroyed
        || this.contextLost
        || !this.documentVisible
        || !this.intersectionVisible
      ) return;
      this.raf = requestAnimationFrame(this.frame);
    }

    cancel() {
      if (!this.raf) return;
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }

    frame(timestamp) {
      this.raf = 0;
      if (this.destroyed || this.contextLost || !this.documentVisible || !this.intersectionVisible) return;
      const delta = this.lastFrame ? Math.min(0.05, (timestamp - this.lastFrame) / 1000) : 1 / 60;
      this.lastFrame = timestamp;

      if (!this.reduced) {
        this.elapsed += delta;
        const pointerEase = 1 - Math.exp(-delta * 7);
        this.pointer.x += (this.pointer.targetX - this.pointer.x) * pointerEase;
        this.pointer.y += (this.pointer.targetY - this.pointer.y) * pointerEase;
        this.click.energy *= Math.exp(-delta * 2.7);
        if (this.click.energy < 0.002) this.click.energy = 0;
        this.scroll.value += (this.scroll.target - this.scroll.value) * (1 - Math.exp(-delta * 10));
        this.scroll.target *= Math.exp(-delta * 8);
      }

      this.uniforms.uTime.value = this.reduced ? 0 : this.elapsed;
      this.uniforms.uMouse.value.set(this.pointer.x, this.pointer.y);
      this.uniforms.uClick.value = this.reduced ? 0 : this.click.energy;
      this.uniforms.uScroll.value = this.reduced ? 0 : this.scroll.value;
      this.render();
      if (!this.reduced) this.schedule();
    }

    render() {
      if (this.destroyed || this.contextLost) return;
      this.renderer.render(this.scene, this.camera);
    }

    snapshot() {
      return {
        engine: 'three',
        renderer: this.renderer?.isWebGLRenderer
          ? 'WebGLRenderer'
          : (this.renderer?.constructor?.name || 'unknown'),
        theme: this.theme.id,
        themeLabel: this.theme.label,
        state: this.canvas.dataset.forestState,
        reducedMotion: this.reduced,
        running: Boolean(this.raf),
        destroyed: this.destroyed,
        contextLost: this.contextLost,
        documentVisible: this.documentVisible,
        intersectionVisible: this.intersectionVisible,
        scrollVelocity: Number(this.uniforms.uScroll.value.toFixed(4)),
        uniforms: {
          uMouse: this.uniforms.uMouse.value.toArray(),
          uClick: Number(this.uniforms.uClick.value.toFixed(4)),
          uClickOrigin: this.uniforms.uClickOrigin.value.toArray(),
          uResolution: this.uniforms.uResolution.value.toArray(),
          uScroll: Number(this.uniforms.uScroll.value.toFixed(4)),
        },
      };
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      this.cancel();
      this.observer?.disconnect();
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerdown', this.onPointerDown);
      window.removeEventListener('scroll', this.onScroll);
      window.removeEventListener('resize', this.onResize);
      window.visualViewport?.removeEventListener('resize', this.onResize);
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.motionQuery.removeEventListener?.('change', this.onMotionPreference);
      this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
      this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
      this.geometry?.dispose();
      this.material?.dispose();
      this.renderer?.dispose();
      this.canvas.dataset.forestState = 'destroyed';
    }
  }

  function installEntranceMotion(motionQuery) {
    const cards = [...document.querySelectorAll(
      [
        '[data-motion-card]',
        '[data-forest-card]',
        '.forest-panel',
        '.mode-card',
        '.hub-card',
        'body[data-forest-page="kids"] .kid-card',
        'body[data-forest-page="library"] .panel',
      ].join(', '),
    )];
    const headerCandidates = [...document.querySelectorAll(
      [
        '[data-motion-header]',
        '.section-header',
        '.forest-section-label',
        'body[data-forest-page="movie"] .header-row',
        'body[data-open-overview-route] .oo-header',
      ].join(', '),
    )];
    const centered = headerCandidates.map((header) => (
      getComputedStyle(header).textAlign === 'center'
    ));

    requestAnimationFrame(() => {
      cards.forEach((card, index) => {
        card.classList.add('forest-motion-card');
        card.style.setProperty('--i', Math.min(index, 10));
      });
      headerCandidates.forEach((header, index) => {
        if (!centered[index]) header.classList.add('forest-motion-header');
      });

      const targets = [
        ...cards.map((element) => ({ element, threshold: 0.15 })),
        ...headerCandidates
          .filter((_, index) => !centered[index])
          .map((element) => ({ element, threshold: 0.2 })),
      ];
      if (motionQuery.matches || !('IntersectionObserver' in window)) {
        for (const { element } of targets) element.classList.add('in');
        return;
      }

      const thresholds = new Map(targets.map(({ element, threshold }) => [element, threshold]));
      const observer = new IntersectionObserver((entries) => {
        const visible = entries.filter((entry) => (
          entry.isIntersecting && entry.intersectionRatio >= (thresholds.get(entry.target) || 0.15)
        ));
        requestAnimationFrame(() => {
          for (const entry of visible) {
            entry.target.style.willChange = 'transform, opacity';
            entry.target.classList.add('in');
            const isCard = entry.target.classList.contains('forest-motion-card');
            const endEvent = isCard ? 'animationend' : 'transitionend';
            entry.target.addEventListener(endEvent, () => {
              entry.target.style.willChange = '';
              if (isCard) entry.target.classList.add('forest-motion-settled');
            }, { once: true });
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: [0.15, 0.2] });
      for (const { element } of targets) observer.observe(element);
    });
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }
})();
