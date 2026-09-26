// Vines in the root structure: one per pool, rising from the roots at the base of its
// side, climbing the trunk braided with its neighbours, and curling onto the plaque's
// edge, which is the pool's entry point.
//
// Geometry only. Paths come from the settled layout and are recomputed on resize;
// nothing here listens to scroll, so the vines can never take the scroll over.
// The draw-in, the travelling pulse and the lit vine are CSS (frontpage-pool-vines.css).
const SVG = 'http://www.w3.org/2000/svg';
const directory = document.querySelector('.resolve-directory');
const nav = directory?.querySelector('[data-pool-directory]');

if (directory && nav) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'pool-vines');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  // Inside the plaque list: above the bark it paints on phones, below the plaques.
  nav.prepend(svg);

  // Layout position inside the plaque list, ignoring the arrival transforms.
  const offsetIn = element => {
    let x = 0, y = 0, node = element;
    while (node && node !== nav) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent; }
    return { x, y, w: element.offsetWidth, h: element.offsetHeight };
  };

  // One vine: rise from its root, sway across the trunk as it climbs, turn in, and curl
  // onto the plaque's outer edge.
  function vinePath(side, lane, box, width, height, stacked) {
    const dir = side === 'right' ? -1 : 1;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const rootX = side === 'centre'
      ? cx + (lane % 2 ? 18 : -18)
      : (side === 'left' ? 0 : width) + dir * (stacked ? 5 + lane * 3 : width * .045 + lane * 9);
    const rootY = height - 4;
    const endX = side === 'centre' ? cx : side === 'left' ? box.x + box.w * .04 : box.x + box.w * .96;
    const endY = side === 'centre' ? box.y + box.h : cy;
    const sway = stacked ? 6 : 14 + lane * 3;
    const climbTo = endY + (side === 'centre' ? 20 : 28);
    const steps = Math.max(2, Math.round((rootY - climbTo) / (stacked ? 70 : 110)));
    const stepH = (rootY - climbTo) / steps;
    const f = n => n.toFixed(1);
    let d = `M${f(rootX)} ${rootY}`;
    let leaves = '';
    let y = rootY;
    for (let i = 0; i < steps; i++) {
      const x = rootX + ((i + lane) % 2 ? 1 : -1) * sway;
      const mid = y - stepH / 2;
      y -= stepH;
      d += ` S${f(x)} ${f(mid)} ${f(rootX)} ${f(y)}`;
      if (i % 2) {
        const s = dir * (stacked ? 7 : 10);
        leaves += `M${f(x)} ${f(mid)}q${f(s)} -6 ${f(s * 1.6)} -1q${f(-s * .6)} 6 ${f(-s * 1.6)} 1z`;
      }
    }
    if (side === 'centre') {
      d += ` C${f(rootX)} ${f(endY + 8)} ${f(endX)} ${f(endY + 14)} ${f(endX)} ${f(endY)}`;
    } else {
      d += ` C${f(rootX)} ${f(endY + 6)} ${f((rootX + endX) / 2)} ${f(endY + 18)} ${f(endX)} ${f(endY)}`;
      d += ` c${f(dir * 8)} -2 ${f(dir * 10)} -12 ${f(dir * 2)} -13 c${f(-dir * 6)} 0 ${f(-dir * 6)} 6 ${f(-dir)} 7`;
    }
    return { stem: d, leaves };
  }

  function draw() {
    const width = nav.offsetWidth;
    const height = nav.offsetHeight;
    if (!width || !height) return;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.replaceChildren();
    const portals = [...nav.querySelectorAll('[data-pool-link]')];
    const boxes = portals.map(offsetIn);
    // Phones stack the plaques in one column; the vines then alternate edges.
    const stacked = boxes.length > 1 && Math.abs(boxes[0].x - boxes[1].x) < 4;
    const lanes = { left: 0, right: 0, centre: 0 };
    portals.forEach((portal, index) => {
      const box = boxes[index];
      const cx = box.x + box.w / 2;
      const side = stacked ? (index % 2 ? 'right' : 'left')
        : cx < width * .38 ? 'left' : cx > width * .62 ? 'right' : 'centre';
      const { stem, leaves } = vinePath(side, lanes[side]++, box, width, height, stacked);
      const group = document.createElementNS(SVG, 'g');
      group.setAttribute('class', 'pool-vine');
      group.dataset.vineFor = portal.dataset.poolLink;
      group.style.setProperty('--vine-index', String(index));
      for (const cls of ['pool-vine-stem', 'pool-vine-pulse']) {
        const line = document.createElementNS(SVG, 'path');
        line.setAttribute('class', cls);
        line.setAttribute('d', stem);
        line.setAttribute('pathLength', '1');
        group.append(line);
      }
      const leaf = document.createElementNS(SVG, 'path');
      leaf.setAttribute('class', 'pool-vine-leaf');
      leaf.setAttribute('d', leaves);
      group.append(leaf);
      svg.append(group);
    });
  }

  // A pool's vine lights while its plaque is hovered, focused or selected.
  const light = (id, on) => svg.querySelector(`[data-vine-for="${CSS.escape(id)}"]`)?.classList.toggle('is-lit', on);
  const plaque = event => event.target.closest?.('[data-pool-link]');
  nav.addEventListener('pointerover', e => { const p = plaque(e); if (p) light(p.dataset.poolLink, true); });
  nav.addEventListener('pointerout', e => { const p = plaque(e); if (p && !p.contains(e.relatedTarget)) light(p.dataset.poolLink, p.classList.contains('is-selected')); });
  nav.addEventListener('focusin', e => { const p = plaque(e); if (p) light(p.dataset.poolLink, true); });
  nav.addEventListener('focusout', e => { const p = plaque(e); if (p) light(p.dataset.poolLink, p.classList.contains('is-selected')); });
  new MutationObserver(records => {
    for (const r of records) if (r.target.dataset?.poolLink) light(r.target.dataset.poolLink, r.target.classList.contains('is-selected'));
  }).observe(nav, { subtree: true, attributes: true, attributeFilter: ['class'] });

  let frame = 0;
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); };
  new ResizeObserver(schedule).observe(nav);
  new MutationObserver(schedule).observe(nav, { childList: true });
  document.fonts?.ready?.then(schedule);
  schedule();
}
