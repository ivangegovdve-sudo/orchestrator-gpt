/* SDForest Three.js layer — the walk of slams.
   One slam per project section: the icon plate arrives from the left,
   the detail panel from the right, and they collide at the seam. The
   choreography is scrubbed directly from scroll (fully reversible);
   scroll velocity deepens the overshoot so a hard fling slams harder.

   At the moment of collision this module:
     · flashes the seam (CSS vars --hit / --hit-ring on the section),
     · throws a burst of dust from the impact point (WebGL points),
     · grows ROOTS — organic, branching root strands that climb upward
       from the collision point toward the crown above, wandering and
       splitting as they rise, amber at the wound and the project's
       accent at the growing tips (WebGL lines, anchored to the
       section so they ride with the page). Grown roots PERSIST — one
       system per section, accumulating as the walk continues, cleared
       only by the great rewind back to the title — and
     · advances the lit fraction of the page-space taproot
       (--rail-lit on [data-routes]) and the per-branch lit levels the
       crown module reads (shared.slamState).

   DOM motion itself stays in CSS: this module only writes variables. */

import * as THREE from '../../vendor/three/three.module.min.js';
import { clamp, lerp, easeOutCubic, makeAdditive, mulberry32, worldX, worldY, PALETTE } from './util.js?v=20260729b';

const HIT_AT = 0.62;          // scrub progress where the collision fires
const ROOT_GROW = 1.45;       // seconds a root system takes to reach full height
const MAX_ROOT_SEGS = 170;    // per root system, capped at build time
const DUST_PER_BURST = 22;
const MAX_DUST_BURSTS = 5;

const CORE = new THREE.Color(PALETTE.amber);

const state = {
  root: null,
  routes: null,
  sections: [],
  bursts: [],
  dust: null,
  dustMeta: [],
  dustCursor: 0,
  writtenRail: -1,
  moving: false,
};

/* The slam curve. p is scrubbed progress 0..1, amp the overshoot depth.
   0..0.5   approach — the halves drift toward each other (anticipation)
   0.5..HIT accelerating rush into the seam, ending past it (the slam)
   HIT..0.84 damped shiver settling back to the seat
   0.84..1  seated */
function slamCurve(p, amp) {
  if (p <= 0) return 1;
  if (p < 0.5) {
    const t = p / 0.5;
    const e = t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
    return 1 - 0.42 * e;
  }
  if (p < HIT_AT) {
    const t = (p - 0.5) / (HIT_AT - 0.5);
    return 0.58 - (0.58 + amp) * t * t;
  }
  if (p < 0.84) {
    const t = (p - HIT_AT) / (0.84 - HIT_AT);
    return -amp * ((1 - t) ** 2) * Math.cos(t * 6.5);
  }
  return 0;
}

/* Grow one root system in section-local pixels (origin at the seam,
   screen y — negative y climbs). A handful of primary roots fan
   upward, each wandering more as it rises and shedding thinner
   side-roots; every strand is pulled gently back toward vertical, the
   way roots follow gravity in reverse. Intensity (the slam's scroll
   energy) buys more strands and a longer climb. Returns segments
   sorted by growth distance so the burst can be drawn front-first. */
function buildRootSkeleton(rng, intensity) {
  const reach = 340 + rng() * 160 + intensity * 420;
  const segs = [];
  const primaries = 3 + Math.round(intensity * 2);
  for (let p = 0; p < primaries; p += 1) {
    const fan = primaries === 1 ? 0 : p / (primaries - 1) - 0.5;
    let angle = -Math.PI / 2 + fan * 0.9 + (rng() - 0.5) * 0.22;
    let x = fan * 30 + (rng() - 0.5) * 14;
    let y = 6 - rng() * 8;
    let dist = rng() * 22; // staggered awakening
    const steps = 13 + Math.floor(rng() * 6);
    const stepLen = (reach / steps) * (0.85 + rng() * 0.3);
    for (let s = 0; s < steps; s += 1) {
      // Wander plus a pull back toward up — organic, never straight.
      angle += (rng() - 0.5) * 0.36 + (-Math.PI / 2 - angle) * 0.1;
      const len = stepLen * (0.75 + rng() * 0.5);
      const nx = x + Math.cos(angle) * len;
      const ny = y + Math.sin(angle) * len;
      segs.push({ ax: x, ay: y, bx: nx, by: ny, distA: dist, depth: 0 });
      // Side-roots: thinner, dimmer, more restless.
      if (s > 2 && s < steps - 2 && rng() < 0.36 && segs.length < MAX_ROOT_SEGS - 12) {
        let ca = angle + (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.6);
        let cx = nx;
        let cy = ny;
        let cd = dist + len;
        const csteps = 4 + Math.floor(rng() * 5);
        for (let c = 0; c < csteps; c += 1) {
          ca += (rng() - 0.5) * 0.62 + (-Math.PI / 2 - ca) * 0.06;
          const cl = stepLen * (0.45 + rng() * 0.35);
          const cnx = cx + Math.cos(ca) * cl;
          const cny = cy + Math.sin(ca) * cl;
          segs.push({ ax: cx, ay: cy, bx: cnx, by: cny, distA: cd, depth: 1 });
          cx = cnx;
          cy = cny;
          cd += cl;
        }
      }
      x = nx;
      y = ny;
      dist += len;
      if (segs.length >= MAX_ROOT_SEGS) break;
    }
    if (segs.length >= MAX_ROOT_SEGS) break;
  }
  segs.sort((a, b) => a.distA - b.distA);
  const maxDist = segs.length ? Math.max(...segs.map((seg) => seg.distA)) + 30 : 1;
  return { segs, maxDist };
}

export function initSlams(shared) {
  state.root = document.documentElement;
  state.routes = document.querySelector('[data-routes]');
  const sections = [...document.querySelectorAll('[data-slam]')];
  if (!state.routes || !sections.length) return;

  state.sections = sections.map((el) => ({
    el,
    accent: new THREE.Color(
      el.style.getPropertyValue('--accent').trim() || PALETTE.green,
    ),
    cur: 0,
    hit: 0,
    hitRing: 0,
    fired: false,
    lit: 0,
    wSx: 9, // written values; impossible so first frame always writes
    wHit: -1,
    wRing: -1,
  }));

  // The crown reads this: one smoothed lit level per branch/section.
  shared.slamState = {
    lit: new Float32Array(state.sections.length),
    accents: state.sections.map((section) => section.accent),
    count: state.sections.length,
  };

  // Without WebGL the CSS choreography above is the whole show.
  if (!shared.scene) return;

  // Root systems — one persistent slot per section: once a slam grows
  // its roots they stay, so the pool must never recycle a living one.
  for (let i = 0; i < state.sections.length; i += 1) {
    const positions = new Float32Array(MAX_ROOT_SEGS * 2 * 3);
    const colors = new Float32Array(MAX_ROOT_SEGS * 2 * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setDrawRange(0, 0);
    const material = makeAdditive(new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }));
    const lines = new THREE.LineSegments(geometry, material);
    lines.visible = false;
    lines.frustumCulled = false;
    lines.renderOrder = 3;
    shared.scene.add(lines);
    state.bursts.push({
      lines,
      material,
      born: -1,
      el: null,        // section the roots grew from — they ride with it
      skeleton: null,
      maxDist: 1,
      strength: 1,
      seed: 511 + i * 977,
    });
  }

  // Impact dust — one shared Points cloud, recycled burst by burst.
  const total = MAX_DUST_BURSTS * DUST_PER_BURST;
  const dustPositions = new Float32Array(total * 3);
  const dustColors = new Float32Array(total * 3);
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3).setUsage(THREE.DynamicDrawUsage));
  dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3).setUsage(THREE.DynamicDrawUsage));
  state.dust = new THREE.Points(dustGeometry, makeAdditive(new THREE.PointsMaterial({
    size: 2.6,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })));
  state.dust.visible = false;
  state.dust.frustumCulled = false;
  state.dust.renderOrder = 3;
  shared.scene.add(state.dust);
  const random = mulberry32(90210);
  for (let i = 0; i < total; i += 1) {
    state.dustMeta.push({
      born: -1, x: 0, y: 0,
      vx: 0, vy: 0,
      color: new THREE.Color(),
      seed: random(),
    });
  }
}

function fireRoots(index, sectionEl, accent, time, intensity) {
  const slot = state.bursts[index];
  if (!slot) return;
  slot.seed = (slot.seed * 16807 + 137) % 2147483647;
  const rng = mulberry32(slot.seed);
  const { segs, maxDist } = buildRootSkeleton(rng, intensity);
  slot.skeleton = segs;
  slot.maxDist = maxDist;
  slot.born = time;
  slot.el = sectionEl;
  slot.strength = 0.35 + intensity * 0.9;
  slot.material.opacity = slot.strength; // fixed for life — roots never fade
  slot.lines.visible = true;

  // Colors are fixed at spawn: amber at the wound, the project's
  // accent at the growing tips, side-roots a shade dimmer.
  const colors = slot.lines.geometry.attributes.color.array;
  const tip = new THREE.Color();
  segs.forEach((seg, i) => {
    const t = clamp(seg.distA / maxDist, 0, 1);
    tip.copy(CORE).lerp(accent, clamp(t * 1.5, 0, 1));
    const dim = (seg.depth ? 0.55 : 1) * (1 - t * 0.25);
    colors[i * 6] = tip.r * dim;
    colors[i * 6 + 1] = tip.g * dim;
    colors[i * 6 + 2] = tip.b * dim;
    colors[i * 6 + 3] = tip.r * dim;
    colors[i * 6 + 4] = tip.g * dim;
    colors[i * 6 + 5] = tip.b * dim;
  });
  slot.lines.geometry.attributes.color.needsUpdate = true;
}

function fireDust(x, y, accent, time, intensity) {
  // A gentle seat sheds a few motes; a hard slam throws a cloud.
  const count = Math.round(5 + intensity * (DUST_PER_BURST - 5));
  for (let i = 0; i < count; i += 1) {
    const meta = state.dustMeta[state.dustCursor];
    state.dustCursor = (state.dustCursor + 1) % state.dustMeta.length;
    meta.born = time;
    const angle = Math.random() * Math.PI * 2;
    const speed = (50 + Math.random() * 220) * (0.5 + intensity * 1);
    meta.x = x;
    meta.y = y;
    meta.vx = Math.cos(angle) * speed;
    meta.vy = Math.sin(angle) * speed * 0.6 - 40; // biased upward
    meta.color.copy(accent).lerp(CORE, Math.random() * 0.5);
  }
  state.dust.visible = true;
}

function updateRootBursts(time) {
  let any = false;
  const viewH = document.documentElement.clientHeight || innerHeight;
  for (const burst of state.bursts) {
    if (burst.born < 0) continue;
    if (!burst.el) {
      burst.born = -1;
      burst.lines.visible = false;
      burst.lines.geometry.setDrawRange(0, 0);
      continue;
    }

    // Roots stay attached to the seam they grew from, riding the page.
    const rect = burst.el.getBoundingClientRect();
    const baseX = rect.left + rect.width / 2;
    const baseY = rect.top + rect.height / 2;

    // The system spans from the seam up to maxDist above it. A grown
    // system lives forever, so skip the redraw (and the render frames
    // it would force) once none of that span is on screen.
    if (baseY + 20 < -60 || baseY - burst.maxDist > viewH + 60) {
      burst.lines.visible = false;
      continue;
    }
    burst.lines.visible = true;
    any = true;

    const front = burst.maxDist * easeOutCubic(Math.min(1, (time - burst.born) / ROOT_GROW));
    const positions = burst.lines.geometry.attributes.position.array;
    let drawn = 0;
    for (let i = 0; i < burst.skeleton.length; i += 1) {
      const seg = burst.skeleton[i];
      if (seg.distA > front) break; // sorted: everything past is unborn
      positions[i * 6] = worldX(baseX + seg.ax);
      positions[i * 6 + 1] = worldY(baseY + seg.ay);
      positions[i * 6 + 2] = 3;
      positions[i * 6 + 3] = worldX(baseX + seg.bx);
      positions[i * 6 + 4] = worldY(baseY + seg.by);
      positions[i * 6 + 5] = 3;
      drawn += 1;
    }
    burst.lines.geometry.setDrawRange(0, drawn * 2);
    burst.lines.geometry.attributes.position.needsUpdate = true;
  }
  return any;
}

function updateDust(time, dt) {
  let any = false;
  const positions = state.dust.geometry.attributes.position.array;
  const colors = state.dust.geometry.attributes.color.array;
  state.dustMeta.forEach((meta, index) => {
    const base = index * 3;
    if (meta.born < 0) {
      colors[base] = colors[base + 1] = colors[base + 2] = 0;
      return;
    }
    const age = (time - meta.born) / 0.85;
    if (age >= 1) {
      meta.born = -1;
      colors[base] = colors[base + 1] = colors[base + 2] = 0;
      return;
    }
    any = true;
    meta.vx *= Math.exp(-dt * 2.2);
    meta.vy = meta.vy * Math.exp(-dt * 2.2) - 150 * dt; // drift up (screen y)
    meta.x += meta.vx * dt;
    meta.y += meta.vy * dt;
    const fade = (1 - age) ** 1.6 * (0.5 + meta.seed * 0.6);
    positions[base] = worldX(meta.x);
    positions[base + 1] = worldY(meta.y);
    positions[base + 2] = 3;
    colors[base] = meta.color.r * fade;
    colors[base + 1] = meta.color.g * fade;
    colors[base + 2] = meta.color.b * fade;
  });
  state.dust.geometry.attributes.position.needsUpdate = true;
  state.dust.geometry.attributes.color.needsUpdate = true;
  if (!any) state.dust.visible = false;
  return any;
}

export function updateSlams(shared, time, dt) {
  if (!state.sections.length) return false;
  const scroll = shared.scroll;

  // Scroll energy → slam intensity. vNorm is |velocity| smoothed over a
  // ~110ms window (see updateScrollPhysics), impact its accumulated
  // charge. A slow scroll bottoms out at a soft 0.12 — panels simply
  // lock into place — while a fling reads 1.0 and burns. The scroll
  // itself is never touched: only visual amplitude changes.
  const energy = clamp(scroll.vNorm * 0.85 + scroll.impact * 0.5, 0.12, 1);

  // Overshoot depth follows the same energy: gentle seat when slow,
  // a real slam past the seam when thrown.
  const amp = 0.018 + scroll.impact * 0.1;
  let moving = false;
  let litUnits = 0;

  // Roots and crown branches are trail memory: once a slam has fired,
  // its light survives scrolling back up to look at the crown. The
  // whole trail resets only when the walk truly rewinds to the title.
  const atTitle = scroll.writtenTitle >= 0 && scroll.writtenTitle < 0.35;

  const viewH = document.documentElement.clientHeight || innerHeight;
  state.sections.forEach((section, index) => {
    const rect = section.el.getBoundingClientRect();
    const travel = Math.max(1, viewH * 0.62);
    const raw = clamp((viewH - rect.top) / travel, 0, 1);

    // Velocity-adaptive chase: a fling stiffens the follower, so the
    // slam arrives with the energy the scroll actually carried.
    const stiffness = 8 + scroll.vNorm * 15;
    section.cur += (raw - section.cur) * (1 - Math.exp(-stiffness * dt));
    if (Math.abs(raw - section.cur) < 0.0005) section.cur = raw;
    else moving = true;

    const past = section.cur >= HIT_AT;
    if (past && !section.fired) {
      section.fired = true;
      // Flash brightness and ring amplitude carry the scroll's energy.
      section.hit = 0.22 + energy * 0.78;
      section.hitRing = 0;
      section.el.style.setProperty('--hit-amp', energy.toFixed(3));
      // Collision point: the seam center of this section, in client px.
      const seamX = rect.left + rect.width / 2;
      const seamY = clamp(rect.top + rect.height / 2, 60, viewH - 60);
      if (state.bursts.length) {
        // Mobile momentum-scrolls fast, so the effect reads clearly
        // there too — compact only trims the energy a touch.
        const e = shared.compact() ? energy * 0.85 : energy;
        fireRoots(index, section.el, section.accent, time, e);
        fireDust(seamX, seamY, section.accent, time, e);
      }
      shared.wake?.();
    } else if (section.fired && atTitle) {
      section.fired = false; // the great rewind — back to the beginning
      const burst = state.bursts[index];
      if (burst && burst.born >= 0) {
        burst.born = -1; // the persistent roots rewind with the trail
        burst.lines.visible = false;
        burst.lines.geometry.setDrawRange(0, 0);
      }
    }

    if (section.hit > 0) {
      section.hit = Math.max(0, section.hit - dt * 1.4);
      section.hitRing = Math.min(1, section.hitRing + dt * 2.4);
      moving = true;
    }

    // Crown lit level eases toward the fired state — branches wake up
    // and fall asleep smoothly, in both scroll directions.
    const litTarget = section.fired ? 1 : 0;
    section.lit += (litTarget - section.lit) * (1 - Math.exp(-dt * 3.2));
    if (Math.abs(litTarget - section.lit) < 0.002) section.lit = litTarget;
    else moving = true;
    shared.slamState.lit[index] = section.lit;

    litUnits += section.fired ? 1 : clamp((section.cur - 0.3) / (HIT_AT - 0.3), 0, 1);

    // Write CSS vars only on real movement.
    const sx = slamCurve(section.cur, amp);
    if (Math.abs(sx - section.wSx) > 0.0015) {
      section.wSx = sx;
      section.el.style.setProperty('--sx', sx.toFixed(4));
    }
    if (Math.abs(section.hit - section.wHit) > 0.004) {
      section.wHit = section.hit;
      section.el.style.setProperty('--hit', section.hit.toFixed(3));
    }
    if (Math.abs(section.hitRing - section.wRing) > 0.004) {
      section.wRing = section.hitRing;
      section.el.style.setProperty('--hit-ring', section.hitRing.toFixed(3));
    }
  });

  const lit = litUnits / state.sections.length;
  if (Math.abs(lit - state.writtenRail) > 0.002) {
    state.writtenRail = lit;
    state.routes.style.setProperty('--rail-lit', lit.toFixed(4));
  }

  const rootsAlive = state.bursts.length ? updateRootBursts(time) : false;
  const dustAlive = state.dust ? updateDust(time, dt) : false;
  state.moving = moving || rootsAlive || dustAlive;
  return rootsAlive || dustAlive;
}

export const slamsAnimating = () => state.moving;
export const slamsDebug = state;
