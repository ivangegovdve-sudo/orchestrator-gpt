/* SDForest Three.js layer — the walk of slams.
   One slam per project section: the icon plate arrives from the left,
   the detail panel from the right, and they collide at the seam. The
   choreography is scrubbed directly from scroll (fully reversible);
   scroll velocity deepens the overshoot so a hard fling slams harder.

   At the moment of collision this module:
     · flashes the seam (CSS vars --hit / --hit-ring on the section),
     · throws a burst of dust from the impact point (WebGL points),
     · fires a route pulse — a filament of light that shoots upward
       from the collision toward the crown and off the top of the
       screen (WebGL line), and
     · advances the lit fraction of the page-space route rail
       (--rail-lit on [data-routes]) and the per-branch lit levels the
       crown module reads (shared.slamState).

   DOM motion itself stays in CSS: this module only writes variables. */

import * as THREE from '../../vendor/three/three.module.min.js';
import { clamp, lerp, makeAdditive, mulberry32, worldX, worldY, PALETTE } from './util.js';

const HIT_AT = 0.62;          // scrub progress where the collision fires
const PULSE_LIFE = 1.5;       // seconds a route pulse lives
const PULSE_POINTS = 26;
const MAX_PULSES = 5;
const DUST_PER_BURST = 22;
const MAX_BURSTS = 5;

const state = {
  root: null,
  routes: null,
  sections: [],
  pulses: [],
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

  // Route pulses — reusable pool of upward-shooting filaments.
  const random = mulberry32(90210);
  for (let i = 0; i < MAX_PULSES; i += 1) {
    const positions = new Float32Array((PULSE_POINTS - 1) * 2 * 3);
    const colors = new Float32Array((PULSE_POINTS - 1) * 2 * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
    const line = new THREE.LineSegments(geometry, makeAdditive(new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })));
    line.visible = false;
    line.frustumCulled = false;
    line.renderOrder = 3;
    shared.scene.add(line);
    state.pulses.push({
      line, born: -1, x: 0, y: 0,
      bend: 0, drift: 0,
      color: new THREE.Color(PALETTE.green),
    });
  }

  // Impact dust — one shared Points cloud, recycled burst by burst.
  const total = MAX_BURSTS * DUST_PER_BURST;
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
  for (let i = 0; i < total; i += 1) {
    state.dustMeta.push({
      born: -1, x: 0, y: 0,
      vx: 0, vy: 0,
      color: new THREE.Color(),
      seed: random(),
    });
  }
}

function firePulse(x, y, accent, time, impact) {
  let slot = state.pulses[0];
  for (const pulse of state.pulses) {
    if (pulse.born < 0) { slot = pulse; break; }
    if (pulse.born < slot.born) slot = pulse;
  }
  slot.born = time;
  slot.x = x;
  slot.y = y;
  slot.bend = (Math.random() - 0.5) * 140;
  slot.drift = (Math.random() - 0.5) * 60;
  slot.color.copy(accent);
  slot.strength = 0.75 + impact * 0.6;
  slot.line.visible = true;
}

function fireDust(x, y, accent, time, impact) {
  for (let i = 0; i < DUST_PER_BURST; i += 1) {
    const meta = state.dustMeta[state.dustCursor];
    state.dustCursor = (state.dustCursor + 1) % state.dustMeta.length;
    meta.born = time;
    const angle = Math.random() * Math.PI * 2;
    const speed = (60 + Math.random() * 240) * (0.7 + impact * 0.8);
    meta.x = x;
    meta.y = y;
    meta.vx = Math.cos(angle) * speed;
    meta.vy = Math.sin(angle) * speed * 0.6 - 40; // biased upward
    meta.color.copy(accent).lerp(new THREE.Color(PALETTE.amber), Math.random() * 0.5);
  }
  state.dust.visible = true;
}

function updatePulses(time) {
  let any = false;
  for (const pulse of state.pulses) {
    if (pulse.born < 0) continue;
    const age = (time - pulse.born) / PULSE_LIFE;
    if (age >= 1) {
      pulse.born = -1;
      pulse.line.visible = false;
      continue;
    }
    any = true;
    const head = 1 - ((1 - age) ** 3); // easeOutCubic: fast launch
    const tail = clamp(age * 1.6 - 0.28, 0, 1);
    const positions = pulse.line.geometry.attributes.position.array;
    const colors = pulse.line.geometry.attributes.color.array;
    const reach = pulse.y + 160; // travels to 160px above the viewport top
    let cursor = 0;
    let prevX = 0;
    let prevY = 0;
    for (let i = 0; i < PULSE_POINTS; i += 1) {
      const u = tail + (head - tail) * (i / (PULSE_POINTS - 1));
      const inv = 1 - u;
      // Quadratic bend from the collision point up and off-screen.
      const px = pulse.x + pulse.bend * 2 * inv * u + pulse.drift * u * u;
      const py = pulse.y - reach * (u * u * 0.35 + u * 0.65);
      if (i > 0) {
        const glow = pulse.strength * (0.12 + (i / PULSE_POINTS) * 0.9) * (1 - age * 0.55);
        positions[cursor] = worldX(prevX); colors[cursor] = pulse.color.r * glow;
        positions[cursor + 1] = worldY(prevY); colors[cursor + 1] = pulse.color.g * glow;
        positions[cursor + 2] = 3; colors[cursor + 2] = pulse.color.b * glow;
        positions[cursor + 3] = worldX(px); colors[cursor + 3] = pulse.color.r * glow;
        positions[cursor + 4] = worldY(py); colors[cursor + 4] = pulse.color.g * glow;
        positions[cursor + 5] = 3; colors[cursor + 5] = pulse.color.b * glow;
        cursor += 6;
      }
      prevX = px;
      prevY = py;
    }
    pulse.line.geometry.attributes.position.needsUpdate = true;
    pulse.line.geometry.attributes.color.needsUpdate = true;
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
  const amp = 0.055 * (1 + scroll.impact * 1.6);
  let moving = false;
  let litUnits = 0;

  // Routes and crown branches are trail memory: once a slam has fired,
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
      section.hit = 1;
      section.hitRing = 0;
      // Collision point: the seam center of this section, in client px.
      const seamX = rect.left + rect.width / 2;
      const seamY = clamp(rect.top + rect.height / 2, 60, viewH - 60);
      if (!shared.compact() && state.pulses.length) {
        firePulse(seamX, seamY, section.accent, time, scroll.impact);
        fireDust(seamX, seamY, section.accent, time, scroll.impact);
      }
      shared.wake?.();
    } else if (section.fired && atTitle) {
      section.fired = false; // the great rewind — back to the beginning
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

  const pulsesAlive = state.pulses.length ? updatePulses(time) : false;
  const dustAlive = state.dust ? updateDust(time, dt) : false;
  state.moving = moving || pulsesAlive || dustAlive;
  return pulsesAlive || dustAlive;
}

export const slamsAnimating = () => state.moving;
export const slamsDebug = state;
