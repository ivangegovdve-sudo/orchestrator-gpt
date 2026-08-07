/* SDForest Three.js layer — per-tile wireframe motion identities.
   Every portal gets its own hand-built line geometry AND its own named
   motion, after the destination-motion-presets strip in the design refs:

     time      Time rings assemble & heartbeat pulse
     vfx       Portal becomes a reel aperture (iris spins)
     kids      Blocks bloom and spores bounce into place
     health    Cycle ring rotates with evidence particles
     council   Dialogue ribbons weave between nodes
     library   Knowledge lattice expands and indexes
     open-overview Cross-source evidence matrix connects two ecosystems
     calendar  Day grid sweeps in with events
     muscle    Muscle fibers contract and glow
     manifesto Ink feather writes and unfolds
     poetry    Floral glyphs blossom and breathe
     power     Heavy-tail curve draws with outliers
     news      Waveform packets stream in real time
     void      Organism field grows and mutates
     multiply  Multiply magic sparkles
     math      Math forest grows

   A tile is a Group of parts. Each part is a LineSegments (or Points)
   with an optional update(object, time, tile) called every frame while
   the tile is materialized — after the manager has set
   material.opacity = baseOpacity * tile.alpha, so updates may modulate
   opacity multiplicatively. Materialization itself (tile.alpha 0→1) is
   part of the choreography: several identities assemble against it. */

import * as THREE from '../../vendor/three/three.module.min.js';
import { clamp, easeOutBack, lineBuilder, boxEdges, makeAdditive } from './util.js?v=20260729b';

// Even 2-vertex steps for LineSegments drawRange.
const lineRange = (geometry, fraction) => {
  const total = geometry.attributes.position.count;
  geometry.setDrawRange(0, Math.min(total, Math.floor((clamp(fraction, 0, 1) * total) / 2) * 2));
};

// A double-beat (lub-dub) envelope with period ~1.15s.
function heartbeat(t) {
  const m = (t % 1.15) / 1.15;
  return Math.exp(-((m - 0.1) ** 2) / 0.0022) + 0.55 * Math.exp(-((m - 0.28) ** 2) / 0.0028);
}

const BUILDERS = {
  // Life in Time — rings + ticks assemble as the tile materializes; the
  // whole face carries a resting heartbeat; the hand keeps turning.
  time() {
    const face = lineBuilder();
    face.circle(1, 56);
    const spiral = [];
    for (let i = 0; i <= 90; i += 1) {
      const t = (i / 90) * Math.PI * 4.6;
      spiral.push([Math.cos(t) * (0.06 + t * 0.052), Math.sin(t) * (0.06 + t * 0.052), t * 0.018]);
    }
    face.polyline(spiral);
    const ticks = lineBuilder();
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      ticks.line(Math.cos(a) * 0.88, Math.sin(a) * 0.88, 0, Math.cos(a) * 1, Math.sin(a) * 1, 0);
    }
    const hand = lineBuilder();
    hand.line(0, 0, 0.05, 0, 0.62, 0.05);
    hand.line(0, 0, 0.05, 0.3, -0.12, 0.05);
    return [
      {
        geometry: face.geometry(),
        update(object, time, tile) { tile.pulseScale = 1 + heartbeat(time) * 0.045; },
      },
      {
        geometry: ticks.geometry(),
        update(object, time, tile) { lineRange(object.geometry, tile.alpha * 1.25); },
      },
      {
        geometry: hand.geometry(),
        update(object, time) { object.rotation.z = -time * 0.7; },
      },
    ];
  },

  // VFX Portfolio — the camera frustum opens onto a gate whose aperture
  // iris slowly spins: portal becomes reel.
  vfx() {
    const body = lineBuilder();
    const apex = [0, 0, 0.95];
    const gate = [[-0.85, -0.58, -0.3], [0.85, -0.58, -0.3], [0.85, 0.58, -0.3], [-0.85, 0.58, -0.3]];
    gate.forEach((corner) => body.line(...apex, ...corner));
    body.polyline(gate, true);
    const iris = lineBuilder();
    iris.circle(0.44, 40, 0, 0, -0.3);
    const hex = [];
    for (let i = 0; i <= 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      hex.push([Math.cos(a) * 0.28, Math.sin(a) * 0.28, -0.3]);
    }
    iris.polyline(hex);
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      iris.line(Math.cos(a) * 0.28, Math.sin(a) * 0.28, -0.3, Math.cos(a + 0.45) * 0.44, Math.sin(a + 0.45) * 0.44, -0.3);
    }
    return [
      { geometry: body.geometry() },
      {
        geometry: iris.geometry(),
        update(object, time) { object.rotation.z = time * 0.6; },
      },
    ];
  },

  // Kids Corner — three toy blocks bloom into place one after another as
  // the tile materializes; spores bounce around them.
  kids() {
    const makeBlock = (w, cx, cy, tilt) => {
      const b = lineBuilder();
      boxEdges(b, w, w, w);
      const geo = b.geometry();
      geo.rotateZ(tilt);
      geo.translate(cx, cy, 0);
      return geo;
    };
    const blocks = [
      { geo: makeBlock(0.62, 0, -0.42, 0.05), delay: 0 },
      { geo: makeBlock(0.44, -0.42, 0.22, -0.18), delay: 0.3 },
      { geo: makeBlock(0.3, 0.45, 0.32, 0.3), delay: 0.55 },
    ];
    const sporeCount = 7;
    const sporeGeo = new THREE.BufferGeometry();
    sporeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sporeCount * 3), 3).setUsage(THREE.DynamicDrawUsage));
    return [
      ...blocks.map(({ geo, delay }) => ({
        geometry: geo,
        update(object, time, tile) {
          const k = clamp((tile.alpha - delay) / (1 - delay), 0, 1);
          object.scale.setScalar(Math.max(0.001, easeOutBack(k)));
          object.position.y = Math.sin(time * 1.6 + delay * 9) * 0.02;
        },
      })),
      {
        kind: 'points',
        geometry: sporeGeo,
        baseOpacity: 0.9,
        update(object, time) {
          const array = object.geometry.attributes.position.array;
          for (let i = 0; i < sporeCount; i += 1) {
            const phase = i * 1.7;
            array[i * 3] = Math.sin(i * 2.4) * 0.85 + Math.sin(time * 0.9 + phase) * 0.08;
            array[i * 3 + 1] = -0.5 + Math.abs(Math.sin(time * 1.9 + phase)) * (0.9 + Math.sin(i) * 0.3);
            array[i * 3 + 2] = 0.2;
          }
          object.geometry.attributes.position.needsUpdate = true;
        },
      },
    ];
  },

  // Women's Health OS — the heart breathes inside a cycle ring that
  // rotates, carrying its evidence particles around.
  health() {
    const heart = lineBuilder();
    const curve = [];
    for (let i = 0; i <= 72; i += 1) {
      const t = (i / 72) * Math.PI * 2;
      curve.push([
        (16 * Math.sin(t) ** 3) / 24,
        (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 24,
        0,
      ]);
    }
    heart.polyline(curve, true);
    curve.forEach((p, i) => { if (i % 6 === 0) heart.line(p[0], p[1], 0, p[0] * 0.96, p[1] * 0.96, -0.16); });
    const ring = lineBuilder();
    ring.circle(1.02, 48);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      ring.circle(0.05, 8, Math.cos(a) * 1.02, Math.sin(a) * 1.02, 0);
    }
    return [
      {
        geometry: heart.geometry(),
        update(object, time) {
          const s = 1 + heartbeat(time * 0.8) * 0.06;
          object.scale.set(s, s, 1);
        },
      },
      {
        geometry: ring.geometry(),
        update(object, time) { object.rotation.z = time * 0.4; },
      },
    ];
  },

  // Councils — seven seats; dialogue ribbons weave between them, a bright
  // voice travelling from chord to chord.
  council() {
    const seats = [];
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 7) * Math.PI * 2 + Math.PI / 2;
      seats.push([Math.cos(a) * 0.88, Math.sin(a) * 0.88, Math.sin(i * 2.4) * 0.12]);
    }
    const nodes = lineBuilder();
    seats.forEach(([x, y, z]) => nodes.circle(0.09, 10, x, y, z));
    const chords = lineBuilder();
    for (let i = 0; i < 7; i += 1) {
      for (let j = i + 1; j < 7; j += 1) chords.line(...seats[i], ...seats[j]);
    }
    const chordGeo = chords.geometry();
    const chordCount = chordGeo.attributes.position.count / 2;
    chordGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(chordGeo.attributes.position.count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    return [
      { geometry: nodes.geometry() },
      {
        geometry: chordGeo,
        vertexColors: true,
        update(object, time, tile) {
          const colors = object.geometry.attributes.color.array;
          const voice = (time * 2.2) % chordCount;
          const accent = tile.accentColor;
          for (let i = 0; i < chordCount; i += 1) {
            let d = Math.abs(i - voice);
            d = Math.min(d, chordCount - d);
            const bright = 0.22 + Math.max(0, 1 - d / 2.5) * 0.9;
            for (let v = 0; v < 2; v += 1) {
              const o = (i * 2 + v) * 3;
              colors[o] = accent.r * bright;
              colors[o + 1] = accent.g * bright;
              colors[o + 2] = accent.b * bright;
            }
          }
          object.geometry.attributes.color.needsUpdate = true;
        },
      },
    ];
  },

  // Library — the open book's page lattices expand and settle in
  // counter-phase, knowledge indexing itself.
  library() {
    const makePage = (side) => {
      const page = lineBuilder();
      const tilt = 0.5 * side;
      for (let row = 0; row <= 3; row += 1) {
        const y = -0.45 + row * 0.3;
        page.line(0, y, 0.15, side * 0.95, y + 0.12, 0.15 - Math.abs(tilt) * 0.5);
      }
      for (let col = 1; col <= 3; col += 1) {
        const x = side * 0.95 * (col / 3);
        const z = 0.15 - Math.abs(tilt) * 0.5 * (col / 3);
        page.line(x, -0.45 + 0.12 * (col / 3), z, x, 0.45 + 0.12 * (col / 3), z);
      }
      return page.geometry();
    };
    const spine = lineBuilder();
    spine.line(0, -0.45, 0.15, 0, 0.45, 0.15);
    spine.line(0, -0.55, 0.02, 0, 0.35, 0.02);
    return [
      {
        geometry: makePage(-1),
        update(object, time) { const s = 1 + Math.sin(time * 1.3) * 0.045; object.scale.set(s, 1, s); },
      },
      {
        geometry: makePage(1),
        update(object, time) { const s = 1 + Math.sin(time * 1.3 + Math.PI) * 0.045; object.scale.set(s, 1, s); },
      },
      {
        geometry: spine.geometry(),
        update(object, time) { object.material.opacity *= 0.7 + 0.3 * Math.sin(time * 3.1) ** 2; },
      },
    ];
  },

  // Open Overview — OpenRouter and GitHub node columns exchange evidence
  // through a central matrix; cyan-to-violet links pulse across sources.
  'open-overview'() {
    const matrix = lineBuilder();
    matrix.polyline([[-0.95, -0.76, 0], [0.95, -0.76, 0], [0.95, 0.76, 0], [-0.95, 0.76, 0]], true);
    [-0.32, 0.32].forEach((x) => matrix.line(x, -0.76, 0, x, 0.76, 0));
    [-0.25, 0.25].forEach((y) => matrix.line(-0.95, y, 0, 0.95, y, 0));

    const network = lineBuilder();
    const left = [[-0.68, 0.46, 0.08], [-0.68, 0, 0.08], [-0.68, -0.46, 0.08]];
    const right = [[0.68, 0.46, 0.08], [0.68, 0, 0.08], [0.68, -0.46, 0.08]];
    [...left, ...right].forEach(([x, y, z]) => network.circle(0.075, 10, x, y, z));
    [[0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1]]
      .forEach(([from, to]) => network.line(...left[from], ...right[to]));
    const networkGeometry = network.geometry();
    networkGeometry.setAttribute('color', new THREE.BufferAttribute(
      new Float32Array(networkGeometry.attributes.position.count * 3),
      3,
    ).setUsage(THREE.DynamicDrawUsage));

    const evidence = lineBuilder();
    evidence.circle(0.2, 28, 0, 0, 0.2);
    evidence.polyline([[0, 0.29, 0.2], [0.29, 0, 0.2], [0, -0.29, 0.2], [-0.29, 0, 0.2]], true);

    return [
      {
        geometry: matrix.geometry(),
        baseOpacity: 0.62,
        update(object, time, tile) {
          lineRange(object.geometry, tile.alpha * 1.3);
          object.rotation.z = Math.sin(time * 0.5) * 0.035;
        },
      },
      {
        geometry: networkGeometry,
        vertexColors: true,
        baseOpacity: 0.9,
        update(object, time, tile) {
          const colors = object.geometry.attributes.color.array;
          const segmentCount = object.geometry.attributes.position.count / 2;
          for (let segment = 0; segment < segmentCount; segment += 1) {
            const pulse = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(time * 2.2 + segment * 0.55)) ** 3;
            for (let vertex = 0; vertex < 2; vertex += 1) {
              const color = vertex === 0 ? tile.accentColor : tile.secondaryColor;
              const offset = (segment * 2 + vertex) * 3;
              colors[offset] = color.r * pulse;
              colors[offset + 1] = color.g * pulse;
              colors[offset + 2] = color.b * pulse;
            }
          }
          object.geometry.attributes.color.needsUpdate = true;
        },
      },
      {
        geometry: evidence.geometry(),
        update(object, time) {
          const pulse = 1 + Math.sin(time * 1.8) * 0.08;
          object.scale.setScalar(pulse);
          object.rotation.z = time * 0.28;
          object.material.opacity *= 0.7 + 0.3 * Math.sin(time * 2.4) ** 2;
        },
      },
    ];
  },

  // Calendar — the month frame holds while one lit day sweeps through the
  // grid, cell by cell, popping at each step.
  calendar() {
    const w = 1.5, h = 1.1;
    const frame = lineBuilder();
    frame.polyline([[-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], [w / 2, h / 2, 0], [-w / 2, h / 2, 0]], true);
    frame.line(-w / 2, h / 2 - 0.22, 0, w / 2, h / 2 - 0.22, 0);
    for (let col = 1; col < 7; col += 1) {
      const x = -w / 2 + (w / 7) * col;
      frame.line(x, -h / 2, 0, x, h / 2 - 0.22, 0);
    }
    for (let row = 1; row < 4; row += 1) {
      const y = -h / 2 + ((h - 0.22) / 4) * row;
      frame.line(-w / 2, y, 0, w / 2, y, 0);
    }
    const cell = lineBuilder();
    boxEdges(cell, w / 7 - 0.05, (h - 0.22) / 4 - 0.05, 0.14);
    const cellW = w / 7, cellH = (h - 0.22) / 4;
    return [
      { geometry: frame.geometry() },
      {
        geometry: cell.geometry(),
        update(object, time) {
          const step = Math.floor(time * 2.4) % 28;
          const inStep = (time * 2.4) % 1;
          const col = step % 7, row = Math.floor(step / 7) % 4;
          object.position.set(-w / 2 + cellW * (col + 0.5), -h / 2 + cellH * (row + 0.5), 0.07 + (1 - inStep) * 0.08);
          object.material.opacity *= 0.5 + (1 - inStep) * 0.5;
        },
      },
    ];
  },

  // Hyper Trophy OS — the plates squeeze toward center and glow on each
  // contraction, releasing slowly: fibers under load.
  muscle() {
    const bar = lineBuilder();
    [[-0.02, 0.02], [0.02, 0.02], [0.02, -0.02], [-0.02, -0.02]].forEach(([y, z]) => bar.line(-0.52, y, z, 0.52, y, z));
    const makePlates = (side) => {
      const plates = lineBuilder();
      [0.44, 0.34].forEach((radius, index) => {
        const x = side * (0.55 + index * 0.13);
        plates.circle(radius, 32, x, 0, 0, 'yz');
        plates.circle(radius, 32, x + side * 0.07, 0, 0, 'yz');
        for (let i = 0; i < 6; i += 1) {
          const a = (i / 6) * Math.PI * 2;
          plates.line(x, Math.cos(a) * radius, Math.sin(a) * radius, x + side * 0.07, Math.cos(a) * radius, Math.sin(a) * radius);
        }
      });
      return plates.geometry();
    };
    const contraction = (time) => ((0.5 + 0.5 * Math.sin(time * 2.2)) ** 3);
    return [
      { geometry: bar.geometry() },
      {
        geometry: makePlates(-1),
        update(object, time) {
          const c = contraction(time);
          object.position.x = c * 0.09;
          object.material.opacity *= 0.65 + c * 0.35;
        },
      },
      {
        geometry: makePlates(1),
        update(object, time) {
          const c = contraction(time);
          object.position.x = -c * 0.09;
          object.material.opacity *= 0.65 + c * 0.35;
        },
      },
    ];
  },

  // Manifesto for a Newborn — an ink feather: barbs unfold as the tile
  // materializes, and beneath it a line of ink writes itself, over and
  // over, patient as a parent.
  manifesto() {
    const shaftPoints = [];
    for (let i = 0; i <= 24; i += 1) {
      const u = i / 24;
      shaftPoints.push([-0.55 + u * 1.15, -0.45 + u * 1.05 + Math.sin(u * Math.PI) * 0.18, u * 0.1]);
    }
    const shaft = lineBuilder();
    shaft.polyline(shaftPoints);
    shaft.line(-0.55, -0.45, 0, -0.68, -0.62, 0); // the nib
    const barbs = lineBuilder();
    for (let i = 3; i <= 21; i += 2) {
      const [x, y, z] = shaftPoints[i];
      const [px, py] = shaftPoints[i - 1];
      // Barbs grow from the shaft's normal on both sides, swept back
      // toward the quill like a real feather.
      const tx = x - px, ty = y - py;
      const tLen = Math.hypot(tx, ty) || 1;
      const nx = -ty / tLen, ny = tx / tLen;
      const u = i / 24;
      const len = 0.3 * Math.sin(Math.min(1, u * 1.25) * Math.PI * 0.72 + 0.35);
      [-1, 1].forEach((side) => {
        barbs.polyline([
          [x, y, z],
          [x + (nx * side - tx / tLen * 0.9) * len, y + (ny * side - ty / tLen * 0.9) * len, z + 0.04],
        ]);
      });
    }
    const ink = lineBuilder();
    const inkPoints = [];
    for (let i = 0; i <= 30; i += 1) {
      const u = i / 30;
      inkPoints.push([-0.8 + u * 1.5, -0.78 + Math.sin(u * 21) * 0.025, 0]);
    }
    ink.polyline(inkPoints);
    return [
      {
        geometry: shaft.geometry(),
        update(object, time) { object.rotation.z = Math.sin(time * 0.9) * 0.05; },
      },
      {
        geometry: barbs.geometry(),
        update(object, time, tile) {
          object.rotation.z = Math.sin(time * 0.9) * 0.05;
          lineRange(object.geometry, tile.alpha * 1.3 - 0.15);
        },
      },
      {
        geometry: ink.geometry(),
        update(object, time) { lineRange(object.geometry, ((time * 0.32) % 1.35)); },
      },
    ];
  },

  // M.Popova Poetry — the night flower blossoms and breathes; language
  // unfolding petal by petal.
  poetry() {
    const rose = lineBuilder();
    const petals = [];
    for (let i = 0; i <= 220; i += 1) {
      const t = (i / 220) * Math.PI * 2;
      const r = Math.cos(4 * t);
      petals.push([Math.cos(t) * r * 0.95, Math.sin(t) * r * 0.95 + 0.15, 0.18 * Math.abs(r)]);
    }
    rose.polyline(petals);
    rose.circle(0.1, 12, 0, 0.15, 0.2);
    const stem = lineBuilder();
    stem.polyline([[0, 0.05, 0], [0.05, -0.4, 0], [-0.03, -0.85, 0]]);
    stem.polyline([[0.02, -0.5, 0], [0.3, -0.62, 0.08], [0.16, -0.42, 0.05], [0.02, -0.5, 0]]);
    return [
      {
        geometry: rose.geometry(),
        update(object, time) {
          const s = 1 + Math.sin(time * 1.05) * 0.05;
          object.scale.set(s, s, 1);
          object.rotation.z = Math.sin(time * 0.45) * 0.07;
        },
      },
      { geometry: stem.geometry() },
    ];
  },

  // Power Law Odyssey — the heavy-tail curve draws itself over and over
  // while the histogram flickers: one enormous hit, many ordinary misses.
  power() {
    const axes = lineBuilder();
    axes.line(-0.9, -0.62, 0, 0.95, -0.62, 0);
    axes.line(-0.9, -0.62, 0, -0.9, 0.8, 0);
    const curveB = lineBuilder();
    const sample = (z) => {
      const points = [];
      for (let i = 0; i <= 60; i += 1) {
        const x = 0.055 + (i / 60) * 1.75;
        points.push([-0.9 + x, -0.62 + Math.min(1.38, 0.16 / x ** 1.35), z]);
      }
      return points;
    };
    curveB.polyline(sample(0));
    curveB.polyline(sample(0.14));
    const bars = lineBuilder();
    const heights = [[0.12, 1.3], [0.34, 0.42], [0.56, 0.2], [0.98, 0.1], [1.5, 0.05]];
    heights.forEach(([x, height]) => {
      bars.polyline([
        [-0.9 + x, -0.62, -0.1], [-0.9 + x, -0.62 + height, -0.1],
        [-0.82 + x, -0.62 + height, -0.1], [-0.82 + x, -0.62, -0.1],
      ]);
    });
    const barGeo = bars.geometry();
    barGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(barGeo.attributes.position.count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    return [
      { geometry: axes.geometry() },
      {
        geometry: curveB.geometry(),
        update(object, time) { lineRange(object.geometry, ((time * 0.42) % 1.55)); },
      },
      {
        geometry: barGeo,
        vertexColors: true,
        update(object, time, tile) {
          const colors = object.geometry.attributes.color.array;
          const accent = tile.accentColor;
          const vertsPerBar = object.geometry.attributes.position.count / 5;
          for (let bar = 0; bar < 5; bar += 1) {
            const flick = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * (2.2 + bar * 0.9) + bar * 2.7)) ** 2;
            for (let v = 0; v < vertsPerBar; v += 1) {
              const o = (bar * vertsPerBar + v) * 3;
              colors[o] = accent.r * flick;
              colors[o + 1] = accent.g * flick;
              colors[o + 2] = accent.b * flick;
            }
          }
          object.geometry.attributes.color.needsUpdate = true;
        },
      },
    ];
  },

  // Morning News — the broadcast tower streams waveform packets upward
  // in real time.
  news() {
    const tower = lineBuilder();
    const legs = [[-0.42, -0.42], [0.42, -0.42], [0.42, 0.42], [-0.42, 0.42]];
    legs.forEach(([x, z]) => tower.line(x, -0.75, z, 0, 0.35, 0));
    [0.55, 0.75].forEach((f) => {
      const level = legs.map(([x, z]) => [x * (1 - f), -0.75 + f * 1.1, z * (1 - f)]);
      tower.polyline(level, true);
    });
    tower.line(0, 0.35, 0, 0, 0.68, 0);
    const waves = lineBuilder();
    [0.2, 0.38, 0.56].forEach((radius) => {
      waves.circle(radius, 22, 0, 0.68, 0, 'xy', Math.PI * 0.7, Math.PI * 0.15);
    });
    return [
      { geometry: tower.geometry() },
      {
        geometry: waves.geometry(),
        update(object, time) {
          const phase = (time * 0.9) % 1;
          object.scale.setScalar(0.75 + phase * 0.5);
          object.material.opacity *= (1 - phase);
        },
      },
    ];
  },

  // Replicator Void — the organism's membrane mutates continuously while
  // a daughter cell buds off in a mitosis cycle.
  void() {
    const body = lineBuilder();
    const ico = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.72, 0));
    const icoArray = ico.attributes.position.array;
    for (let i = 0; i < icoArray.length; i += 3) body.positions.push(icoArray[i], icoArray[i + 1], icoArray[i + 2]);
    ico.dispose();
    const bodyGeo = body.geometry();
    const basePositions = Float32Array.from(bodyGeo.attributes.position.array);
    bodyGeo.attributes.position.setUsage(THREE.DynamicDrawUsage);
    const orbit = lineBuilder();
    orbit.circle(1.05, 48, 0, 0, 0, 'xz');
    const bud = lineBuilder();
    const small = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.3, 0));
    const smallArray = small.attributes.position.array;
    for (let i = 0; i < smallArray.length; i += 3) bud.positions.push(smallArray[i], smallArray[i + 1], smallArray[i + 2]);
    small.dispose();
    return [
      {
        geometry: bodyGeo,
        update(object, time) {
          const array = object.geometry.attributes.position.array;
          for (let i = 0; i < array.length; i += 3) {
            const wobble = 1 + Math.sin(time * 2.1 + basePositions[i] * 5.3 + basePositions[i + 1] * 7.1) * 0.06;
            array[i] = basePositions[i] * wobble;
            array[i + 1] = basePositions[i + 1] * wobble;
            array[i + 2] = basePositions[i + 2] * wobble;
          }
          object.geometry.attributes.position.needsUpdate = true;
        },
      },
      { geometry: orbit.geometry() },
      {
        geometry: bud.geometry(),
        update(object, time) {
          const cycle = 0.5 + 0.5 * Math.sin(time * 1.6);
          object.position.set(0.55 + cycle * 0.35, 0.4 + cycle * 0.25, 0.1);
          object.scale.setScalar(0.55 + cycle * 0.65);
        },
      },
    ];
  },

  // Multiply Magic Studio — the crossed beams hold while product sparks
  // twinkle around them in sequence.
  multiply() {
    const beams = lineBuilder();
    [Math.PI / 4, -Math.PI / 4].forEach((angle) => {
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const local = lineBuilder();
      boxEdges(local, 1.7, 0.26, 0.26);
      for (let i = 0; i < local.positions.length; i += 3) {
        const x = local.positions[i], y = local.positions[i + 1];
        beams.positions.push(x * cos - y * sin, x * sin + y * cos, local.positions[i + 2]);
      }
    });
    const sparks = lineBuilder();
    [[-0.95, 0], [0.95, 0], [0, 0.95], [0, -0.95]].forEach(([x, y]) => {
      sparks.polyline([[x, y + 0.09, 0], [x + 0.09, y, 0], [x, y - 0.09, 0], [x - 0.09, y, 0]], true);
    });
    const sparkGeo = sparks.geometry();
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(sparkGeo.attributes.position.count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    return [
      { geometry: beams.geometry() },
      {
        geometry: sparkGeo,
        vertexColors: true,
        update(object, time, tile) {
          object.rotation.z = time * 0.35;
          const colors = object.geometry.attributes.color.array;
          const accent = tile.accentColor;
          const vertsPerSpark = object.geometry.attributes.position.count / 4;
          for (let s = 0; s < 4; s += 1) {
            const tw = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(time * 2.6 + s * (Math.PI / 2))) ** 3;
            for (let v = 0; v < vertsPerSpark; v += 1) {
              const o = (s * vertsPerSpark + v) * 3;
              colors[o] = accent.r * tw;
              colors[o + 1] = accent.g * tw;
              colors[o + 2] = accent.b * tw;
            }
          }
          object.geometry.attributes.color.needsUpdate = true;
        },
      },
    ];
  },

  // Math Forest — the fractal tree grows from trunk to canopy, level by
  // level, then seeds itself again. Segments are bucketed breadth-first
  // so drawRange growth reads as a tree growing, not a pen plotting.
  math() {
    const levels = [[], [], [], [], []];
    const grow = (x, y, z, angle, tilt, length, depth) => {
      const nx = x + Math.cos(angle) * length;
      const ny = y + Math.sin(angle) * length;
      const nz = z + tilt * length * 0.4;
      levels[depth].push([x, y, z, nx, ny, nz]);
      if (depth === 4) return;
      grow(nx, ny, nz, angle + 0.52, -tilt, length * 0.72, depth + 1);
      grow(nx, ny, nz, angle - 0.44, tilt, length * 0.72, depth + 1);
    };
    grow(0, -0.95, 0, Math.PI / 2, 0.5, 0.55, 0);
    const tree = lineBuilder();
    levels.flat().forEach((seg) => tree.line(...seg));
    return [
      {
        geometry: tree.geometry(),
        update(object, time) {
          const cycle = (time * 0.36) % 1.7;
          lineRange(object.geometry, cycle);
          object.rotation.z = Math.sin(time * 0.8) * 0.03;
        },
      },
    ];
  },
};

const state = { tiles: [] };

export function initTiles(shared, coarse) {
  const portals = [...document.querySelectorAll('[data-project-grid] .portal')];
  portals.forEach((portal) => {
    const build = BUILDERS[portal.dataset.project];
    if (!build) return;
    const primary = portal.style.getPropertyValue('--accent').trim() || '#79f2a8';
    const secondary = portal.style.getPropertyValue('--accent-secondary').trim() || primary;
    const accent = new THREE.Color(primary);
    const secondaryAccent = new THREE.Color(secondary);
    const group = new THREE.Group();
    group.visible = false;
    group.renderOrder = 3;
    const parts = build().map((part) => {
      const material = makeAdditive(part.vertexColors
        ? new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthTest: false, depthWrite: false })
        : part.kind === 'points'
          ? new THREE.PointsMaterial({ color: accent, size: 3, sizeAttenuation: false, transparent: true, opacity: 0, depthTest: false, depthWrite: false })
          : new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
      const object = part.kind === 'points'
        ? new THREE.Points(part.geometry, material)
        : new THREE.LineSegments(part.geometry, material);
      object.userData.baseOpacity = part.baseOpacity ?? 0.85;
      group.add(object);
      return { object, update: part.update || null };
    });
    shared.scene.add(group);
    const tile = {
      element: portal,
      group,
      parts,
      accentColor: accent,
      secondaryColor: secondaryAccent,
      alpha: 0,
      target: 0,
      pulseScale: 1,
      seed: Math.random() * Math.PI * 2,
    };
    state.tiles.push(tile);

    const show = () => { state.tiles.forEach((t) => { t.target = t === tile ? 1 : 0; }); shared.wake(); };
    const hide = () => { tile.target = 0; shared.wake(); };
    portal.addEventListener('pointerenter', () => { if (!coarse()) show(); });
    portal.addEventListener('pointerleave', () => { if (!coarse()) hide(); });
    portal.addEventListener('focus', show);
    portal.addEventListener('blur', hide);
    // Touch equivalent: tapping a tile (which selects it) wakes its
    // wireframe; tapping another moves the hologram there.
    portal.addEventListener('click', () => { if (coarse()) show(); });
  });
}

export function updateTiles(shared, time, dt) {
  let visible = false;
  for (const tile of state.tiles) {
    tile.alpha += (tile.target - tile.alpha) * clamp(dt * 7.5, 0, 1);
    if (tile.alpha < 0.012 && tile.target === 0) {
      tile.group.visible = false;
      continue;
    }
    const rect = tile.element.getBoundingClientRect();
    if (rect.bottom < -40 || rect.top > innerHeight + 40
      || rect.right < -40 || rect.left > innerWidth + 40) {
      tile.group.visible = false;
      continue;
    }
    tile.group.visible = true;
    visible = true;
    tile.pulseScale = 1;
    for (const part of tile.parts) {
      part.object.material.opacity = part.object.userData.baseOpacity * tile.alpha;
      if (part.update) part.update(part.object, time + tile.seed, tile);
    }
    const scale = Math.min(rect.height, 150) * 0.62
      * (0.82 + 0.18 * easeOutBack(clamp(tile.alpha, 0, 1)))
      * tile.pulseScale;
    tile.group.position.set(
      rect.left + rect.width / 2 - innerWidth / 2,
      innerHeight / 2 - (rect.top + rect.height / 2),
      30,
    );
    tile.group.scale.setScalar(scale);
    // A living object hovering, not a turntable: oscillate instead of spin
    // so flat identities (calendar, curve) never turn edge-on.
    tile.group.rotation.y = Math.sin(time * 0.5 + tile.seed) * 0.32 + (1 - tile.alpha) * 0.6;
    tile.group.rotation.x = Math.sin(time * 0.7 + tile.seed) * 0.1 - 0.1;
  }
  return visible;
}

export const tilesAnimating = () => state.tiles.some((tile) => tile.target > 0 || tile.alpha > 0.012);
export const tilesDebug = state.tiles;
