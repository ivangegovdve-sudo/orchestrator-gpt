const clamp01 = (value) => Math.min(1, Math.max(0, value));
const ease = (value) => value * value * (3 - 2 * value);

/**
 * Paints this page's illustrated directory from ScrollCraft's public --sc-p.
 * No existing Forest modules or pool runtime are loaded here.
 */
export function initAtlas(root = document) {
  const act = root.matches?.('[data-atlas]') ? root : root.querySelector('[data-atlas]');
  if (!act) return { destroy() {} };

  const stage = act.querySelector('.atlas-stage');
  const note = act.querySelector('[data-atlas-fieldnote]');
  const defaultNote = note.textContent;
  const links = [...act.querySelectorAll('[data-atlas-path] a')];
  const paths = [...act.querySelectorAll('[data-atlas-branch]')].map((element) => ({
    element,
    stem: element.querySelector('.atlas-stem'),
    leaf: element.querySelector('.atlas-leaf'),
    leafAnchor: element.querySelector('.atlas-leaf').getAttribute('d').match(/^M([\d.]+) ([\d.]+)/).slice(1).map(Number),
    leafAt: .8,
    originalShape: element.querySelector('.atlas-stem').getAttribute('d'),
    id: element.dataset.atlasBranch,
    start: Number(element.dataset.atlasStart),
    end: Number(element.dataset.atlasEnd),
    last: -1,
  }));
  const compact = matchMedia('(max-width: 760px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let nearby = true;
  let mode = 'native';
  let frame = 0;
  let destroyed = false;
  let lastState = '';
  let activeId = '';
  let needsLayout = true;

  function layoutTips() {
    needsLayout = false;
    if (mode !== 'scroll') return;
    const stageBounds = stage.getBoundingClientRect();
    if (!stageBounds.height) return;
    for (const path of paths) {
      const link = links.find((candidate) => candidate.closest('[data-atlas-path]').dataset.atlasPath === path.id);
      const tip = (link.getBoundingClientRect().bottom - stageBounds.top + 12) / stageBounds.height * 900;
      // Keep the authored curves, but meet each label beneath its real line box
      // when the viewport has a different proportion from the drawing.
      path.stem.setAttribute('d', path.originalShape.replace(/C([^C]*)$/, (_, finalCurve) => {
        const points = finalCurve.trim().split(/\s+/).map(Number);
        const difference = tip - points[5];
        points[1] += difference * .24;
        points[3] += difference * .76;
        points[5] = tip;
        return `C${points.join(' ')}`;
      }));

      // Attach the leaf to the reshaped stem and wait until the stem reaches
      // that junction before drawing it. Leaves never float ahead of growth.
      const length = path.stem.getTotalLength();
      const distanceAt = (fraction) => {
        const point = path.stem.getPointAtLength(length * fraction);
        return (point.x - path.leafAnchor[0]) ** 2 + (point.y - path.leafAnchor[1]) ** 2;
      };
      let closest = 0;
      let distance = Infinity;
      for (let step = 0; step <= 32; step++) {
        const candidate = step / 32;
        const candidateDistance = distanceAt(candidate);
        if (candidateDistance < distance) { closest = candidate; distance = candidateDistance; }
      }
      let low = Math.max(0, closest - 1 / 32);
      let high = Math.min(1, closest + 1 / 32);
      for (let step = 0; step < 12; step++) {
        const first = low + (high - low) / 3;
        const second = high - (high - low) / 3;
        if (distanceAt(first) < distanceAt(second)) high = second;
        else low = first;
      }
      path.leafAt = (low + high) / 2;
      const junction = path.stem.getPointAtLength(length * path.leafAt);
      path.leaf.setAttribute('transform', `translate(${junction.x - path.leafAnchor[0]} ${junction.y - path.leafAnchor[1]})`);
      path.last = -1;
    }
  }

  function paint() {
    frame = 0;
    if (destroyed || (!nearby && mode === 'scroll')) return;
    if (needsLayout) layoutTips();

    const published = Number.parseFloat(getComputedStyle(act).getPropertyValue('--sc-p'));
    const progress = mode === 'native' ? 1 : clamp01(Number.isFinite(published) ? published : 0);
    const visible = [];

    for (const path of paths) {
      const growth = mode === 'native' || path.id === activeId ? 1 : ease(clamp01((progress - path.start) / (path.end - path.start)));
      const quantized = Math.round(growth * 1000) / 1000;
      visible.push(quantized);
      if (path.last === quantized) continue;
      path.last = quantized;
      path.element.style.setProperty('--atlas-dash', String(1 - quantized));
      path.element.style.setProperty('--atlas-leaf-dash', String(1 - ease(clamp01((quantized - path.leafAt) / (1 - path.leafAt)))));
    }

    // These represent painted paths, rather than merely the scroll input.
    const phase = visible.every((value) => value === 1) ? 'resolved' : visible.some((value) => value > 0) ? 'branching' : 'seed';
    const state = `${phase}:${visible.join(',')}:${activeId || 'none'}`;
    if (state !== lastState) {
      stage.dataset.scVerifyState = state;
      stage.dataset.scVerifyHold = String(phase === 'resolved');
      lastState = state;
    }
  }

  function schedule() {
    if (destroyed || frame || (!nearby && mode === 'scroll')) return;
    frame = requestAnimationFrame(paint);
  }

  function updateMode() {
    mode = compact.matches || reduced.matches || document.documentElement.classList.contains('motion-off') ? 'native' : 'scroll';
    act.dataset.atlasMode = mode;
    act.dataset.scAct = mode === 'scroll' ? 'pin' : 'flow';
    act.classList.toggle('sc-act--pinned', mode === 'scroll');
    stage.classList.toggle('sc-stage', mode === 'scroll');
    document.documentElement.classList.add('atlas-ready');
    needsLayout = true;
    // Atlas is prepared before mount. Later viewport or motion changes update
    // the existing act record and reuse the unchanged runtime's own layout.
    const engine = window.ScrollCraft?.instance;
    const record = engine?.acts.find((candidate) => candidate.el === act);
    if (record) {
      record.device = act.dataset.scAct;
      record.pinned = mode === 'scroll';
      record.stage = stage;
      record.span = 2.4;
      record.stageChecked = false;
      if (mode === 'native') act.style.removeProperty('height');
      engine.layout();
      engine.read();
    }
    // A mode change affects every path even if its prior value was complete.
    paths.forEach((path) => { path.last = -1; });
    paint();
  }

  function highlight(link) {
    const item = link?.closest('[data-atlas-path]');
    const nextId = item?.dataset.atlasPath || '';
    if (nextId === activeId) return;
    activeId = nextId;
    paths.forEach((path) => path.element.classList.toggle('is-active', path.id === activeId));
    note.textContent = link?.dataset.atlasDetail || defaultNote;
    // A highlight visibly changes the paths, so it changes the proof state too.
    paint();
  }

  const events = [];
  const listen = (element, type, handler) => {
    element.addEventListener(type, handler);
    events.push(() => element.removeEventListener(type, handler));
  };
  links.forEach((link) => {
    listen(link, 'pointerenter', () => highlight(link));
    listen(link, 'pointerleave', () => highlight(links.find((candidate) => candidate === document.activeElement)));
    listen(link, 'focus', () => highlight(link));
    listen(link, 'blur', () => highlight(null));
  });

  // The engine writes --sc-p in its scroll reader. Observing that single style
  // attribute keeps this painter independent of the engine's private records.
  const changes = new MutationObserver(schedule);
  changes.observe(act, { attributes: true, attributeFilter: ['style'] });
  const visibility = new IntersectionObserver(([entry]) => {
    nearby = entry.isIntersecting;
    if (nearby) schedule();
  }, { rootMargin: '50% 0px', threshold: 0 });
  visibility.observe(act);
  compact.addEventListener('change', updateMode);
  reduced.addEventListener('change', updateMode);
  listen(window, 'sdforest:motion', updateMode);
  listen(window, 'resize', () => { needsLayout = true; schedule(); });
  document.fonts?.ready.then(() => { needsLayout = true; schedule(); });
  updateMode();

  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      changes.disconnect();
      visibility.disconnect();
      compact.removeEventListener('change', updateMode);
      reduced.removeEventListener('change', updateMode);
      events.forEach((remove) => remove());
      act.dataset.atlasMode = 'native';
      act.dataset.scAct = 'flow';
      paths.forEach((path) => {
        path.element.style.removeProperty('--atlas-dash');
        path.element.style.removeProperty('--atlas-leaf-dash');
        path.element.classList.remove('is-active');
        path.stem.setAttribute('d', path.originalShape);
        path.leaf.removeAttribute('transform');
      });
      note.textContent = defaultNote;
      stage.dataset.scVerifyState = 'resolved';
      stage.dataset.scVerifyHold = 'true';
    },
  };
}
