/* ═══════════════════════════════════════════════════════════════
   FOREST ICONS — live Three.js micro-scenes for the portal grid
   ---------------------------------------------------------------
   One WebGLRenderer, one fixed transparent canvas; every portal
   icon is a tiny scene rendered into its ring's screen rect via
   scissor/viewport (the three.js "multiple elements" pattern —
   13 separate contexts would exhaust the browser's context pool).

   · Idle: each scene loops its portal's signature motion.
   · uMouse: scenes react to pointer proximity (speed / bloom /
     contraction), reading ForestMotion.pointer.
   · Fallback: if WebGL or motion is unavailable the animated SVG
     icons simply stay — this module only upgrades them.
   Budget: unlit materials, ≤ a few hundred verts and 1–3 draw
   calls per scene, instancing for repeated geometry.
   ═══════════════════════════════════════════════════════════════ */
import * as THREE from './vendor/three.module.min.js';

(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var rings = Array.prototype.slice.call(
    document.querySelectorAll('.hub-card[data-preset] .hub-icon-ring'));
  if (!rings.length) return;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch (e) { return; }                      /* no WebGL → SVGs remain */

  var DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(DPR);
  renderer.autoClear = false;

  var canvas = renderer.domElement;
  canvas.id = 'forest-icons-gl';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;';
  document.body.appendChild(canvas);
  document.documentElement.classList.add('fx-icons');   /* CSS fades the SVGs out */

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  resize();
  window.addEventListener('resize', resize);

  /* ── tiny helpers ─────────────────────────────────────────── */
  var TAU = Math.PI * 2;
  function mat(color, opacity) {
    return new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity == null ? 1 : opacity });
  }
  function lineMat(color, opacity) {
    return new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity == null ? 1 : opacity });
  }
  function cssColor(el, prop, fallback) {
    var v = getComputedStyle(el).getPropertyValue(prop).trim();
    return new THREE.Color(v || fallback);
  }

  /* ═════════════════════════════════════════════════════════════
     Scene builders — build(A, B) → { group, update(t, dt, react) }
     A = portal primary color, B = secondary. `react` ∈ [0..1] is
     smoothed pointer proximity / hover.
     ═════════════════════════════════════════════════════════════ */
  var builders = {};

  /* Life in Time — time rings assemble & heartbeat pulse */
  builders.rings = function (A, B) {
    var g = new THREE.Group();
    var geo = new THREE.TorusGeometry(1.5, 0.035, 6, 64);
    var rs = [];
    [[1.5, A, 0.9], [1.05, B, 0.6], [0.62, A, 0.45]].forEach(function (d, i) {
      var m = new THREE.Mesh(geo, mat(d[1], d[2]));
      m.scale.setScalar(d[0] / 1.5);
      m.rotation.x = 0.5 + i * 0.4;
      g.add(m); rs.push(m);
    });
    var heart = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), mat(A));
    g.add(heart);
    return {
      group: g,
      update: function (t, dt, r) {
        var s = 1 + r * 1.6;
        rs[0].rotation.z += dt * 0.4 * s; rs[0].rotation.y += dt * 0.15 * s;
        rs[1].rotation.z -= dt * 0.55 * s; rs[1].rotation.x += dt * 0.2 * s;
        rs[2].rotation.z += dt * 0.8 * s;
        var beat = 1 + 0.25 * Math.max(0, Math.sin(t * 4.4)) * (0.5 + r);
        heart.scale.setScalar(beat);
        g.scale.setScalar(1 + 0.06 * r);
      }
    };
  };

  /* VFX / External — reel aperture blades breathe open */
  builders.aperture = function (A, B) {
    var g = new THREE.Group();
    var ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.04, 6, 64), mat(A, 0.85));
    g.add(ring);
    var blades = new THREE.Group();
    var bGeo = new THREE.BoxGeometry(1.25, 0.055, 0.05);
    for (var i = 0; i < 8; i++) {
      var pivot = new THREE.Group();
      pivot.rotation.z = (i / 8) * TAU;
      var blade = new THREE.Mesh(bGeo, mat(i % 2 ? A : B, 0.9));
      blade.position.x = 0.85;
      pivot.add(blade);
      blades.add(pivot);
    }
    g.add(blades);
    return {
      group: g,
      update: function (t, dt, r) {
        blades.rotation.z += dt * (0.3 + r * 1.4);
        var open = 0.55 + 0.25 * Math.sin(t * 0.9) + r * 0.5;
        blades.children.forEach(function (p, i) {
          p.children[0].position.x = 0.55 + open * 0.55;
          p.children[0].rotation.z = 0.5 - open * 0.45;
        });
        ring.rotation.z -= dt * 0.1;
      }
    };
  };

  /* Kids — blocks bloom and spores bounce into place */
  builders.blocks = function (A, B) {
    var g = new THREE.Group();
    var N = 6;
    var im = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.62, 0.62, 0.62),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.92 }), N);
    var seeds = [];
    var dummy = new THREE.Object3D();
    var cA = new THREE.Color(A), cB = new THREE.Color(B);
    for (var i = 0; i < N; i++) {
      var a = (i / N) * TAU;
      seeds.push({ a: a, r: 0.95 + (i % 3) * 0.22, ph: i * 1.7, sp: 0.6 + (i % 4) * 0.2 });
      im.setColorAt(i, i % 2 ? cA : cB);
    }
    g.add(im);
    return {
      group: g,
      update: function (t, dt, r) {
        for (var i = 0; i < N; i++) {
          var s = seeds[i];
          var bounce = Math.abs(Math.sin(t * s.sp * (1 + r * 1.5) + s.ph));
          dummy.position.set(
            Math.cos(s.a + t * 0.12) * s.r,
            Math.sin(s.a + t * 0.12) * s.r * 0.8 + bounce * (0.16 + r * 0.3),
            0);
          dummy.rotation.set(t * 0.3 + s.ph, t * 0.4 + s.ph, 0);
          var sc = 0.8 + 0.2 * bounce;
          dummy.scale.setScalar(sc);
          dummy.updateMatrix();
          im.setMatrixAt(i, dummy.matrix);
        }
        im.instanceMatrix.needsUpdate = true;
        g.rotation.z = Math.sin(t * 0.2) * 0.08;
      }
    };
  };

  /* Voice / Morning News — waveform packets stream */
  builders.waveform = function (A, B) {
    var g = new THREE.Group();
    var N = 18;
    var im = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.11, 1, 0.11),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95 }), N);
    var dummy = new THREE.Object3D();
    var cA = new THREE.Color(A), cB = new THREE.Color(B);
    for (var i = 0; i < N; i++) im.setColorAt(i, i % 3 === 1 ? cB : cA);
    g.add(im);
    return {
      group: g,
      update: function (t, dt, r) {
        for (var i = 0; i < N; i++) {
          var u = i / (N - 1);
          var x = (u - 0.5) * 3.2;
          var env = Math.pow(Math.sin(u * Math.PI), 1.2);
          var hgt = 0.12 + env * Math.abs(
            Math.sin(u * 9 - t * (2.4 + r * 3)) * (0.9 + 0.5 * Math.sin(u * 3 + t * 1.3))
          ) * (1.1 + r * 0.9);
          dummy.position.set(x, 0, 0);
          dummy.scale.set(1, hgt, 1);
          dummy.updateMatrix();
          im.setMatrixAt(i, dummy.matrix);
        }
        im.instanceMatrix.needsUpdate = true;
      }
    };
  };

  /* Women's Health — cycle ring rotates with evidence particles */
  builders.cycle = function (A, B) {
    var g = new THREE.Group();
    var arcs = new THREE.Group();
    for (var i = 0; i < 4; i++) {
      var arc = new THREE.Mesh(
        new THREE.TorusGeometry(1.35, i === 0 ? 0.075 : 0.045, 6, 32, TAU / 4 * 0.9),
        mat(i % 2 ? B : A, 0.9));
      arc.rotation.z = (i / 4) * TAU;
      arcs.add(arc);
    }
    g.add(arcs);
    var P = 14;
    var pGeo = new THREE.BufferGeometry();
    var pPos = new Float32Array(P * 3);
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    var pts = new THREE.Points(pGeo, new THREE.PointsMaterial({
      color: A, size: 0.09, transparent: true, opacity: 0.85, sizeAttenuation: true }));
    g.add(pts);
    var seeds = [];
    for (var k = 0; k < P; k++) seeds.push({ a: (k * 2.4) % TAU, r: 0.5 + (k % 5) * 0.16, v: 0.4 + (k % 3) * 0.3 });
    return {
      group: g,
      update: function (t, dt, r) {
        arcs.rotation.z += dt * (0.35 + r * 1.2);
        for (var k = 0; k < P; k++) {
          var s = seeds[k];
          var a = s.a + t * s.v * (1 + r);
          pPos[k * 3] = Math.cos(a) * s.r;
          pPos[k * 3 + 1] = Math.sin(a) * s.r * 0.92;
          pPos[k * 3 + 2] = Math.sin(a * 2) * 0.2;
        }
        pGeo.attributes.position.needsUpdate = true;
        g.rotation.x = 0.35 + Math.sin(t * 0.3) * 0.05;
      }
    };
  };

  /* Councils — dialogue ribbons weave between nodes */
  builders.ribbons = function (A, B) {
    var g = new THREE.Group();
    var N = 5, nodes = [], nodePts = [];
    var nGeo = new THREE.SphereGeometry(0.14, 10, 10);
    for (var i = 0; i < N; i++) {
      var a = (i / N) * TAU + 0.5;
      var p = new THREE.Vector3(Math.cos(a) * 1.25, Math.sin(a) * 1.05, 0);
      var m = new THREE.Mesh(nGeo, mat(i % 2 ? B : A, 0.95));
      m.position.copy(p);
      g.add(m); nodes.push(m); nodePts.push(p);
    }
    /* weave: connect every node to node+2 through a soft center pull */
    var order = [];
    for (var j = 0; j < N; j++) order.push(nodePts[(j * 2) % N]);
    var curve = new THREE.CatmullRomCurve3(order, true, 'catmullrom', 0.8);
    var CPTS = 120;
    var lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(CPTS));
    var line = new THREE.Line(lineGeo, lineMat(A, 0.4));
    g.add(line);
    var token = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), mat(B));
    g.add(token);
    return {
      group: g,
      update: function (t, dt, r) {
        g.rotation.z += dt * (0.12 + r * 0.5);
        var u = (t * (0.1 + r * 0.15)) % 1;
        token.position.copy(curve.getPointAt(u));
        nodes.forEach(function (n, i) {
          n.scale.setScalar(1 + 0.25 * Math.max(0, Math.sin(t * 2 + i * 1.3)) * (0.6 + r));
        });
        line.material.opacity = 0.3 + r * 0.4;
      }
    };
  };

  /* TinyLM — a sprouting seedling among tiny minds */
  builders.sprout = function (A, B) {
    var g = new THREE.Group();
    var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.5, 6), mat(A, 0.95));
    stem.position.y = -0.15;
    g.add(stem);
    var leafGeo = new THREE.SphereGeometry(0.42, 10, 8);
    leafGeo.scale(1, 0.42, 0.55);
    var l1 = new THREE.Mesh(leafGeo, mat(A, 0.85));
    l1.position.set(-0.42, 0.55, 0); l1.rotation.z = 0.5;
    var l2 = new THREE.Mesh(leafGeo, mat(B, 0.7));
    l2.position.set(0.42, 0.75, 0); l2.rotation.z = -0.5;
    g.add(l1); g.add(l2);
    var P = 8;
    var pGeo = new THREE.BufferGeometry();
    var pPos = new Float32Array(P * 3);
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    var minds = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: B, size: 0.08, transparent: true, opacity: 0.8 }));
    g.add(minds);
    return {
      group: g,
      update: function (t, dt, r) {
        var sway = Math.sin(t * (0.8 + r * 1.6)) * (0.08 + r * 0.12);
        g.rotation.z = sway;
        l1.rotation.z = 0.5 + sway * 2;
        l2.rotation.z = -0.5 + sway * 2;
        for (var k = 0; k < P; k++) {
          var a = t * 0.5 + k * (TAU / P);
          pPos[k * 3] = Math.cos(a) * 1.3;
          pPos[k * 3 + 1] = Math.sin(a * 1.3 + k) * 0.9 + 0.2;
          pPos[k * 3 + 2] = Math.sin(a) * 0.4;
        }
        pGeo.attributes.position.needsUpdate = true;
      }
    };
  };

  /* Library — knowledge lattice expands and indexes */
  builders.lattice = function (A, B) {
    var g = new THREE.Group();
    var frame = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.BoxGeometry(1.9, 1.9, 1.9, 2, 2, 2)),
      lineMat(B, 0.35));
    g.add(frame);
    var N = 27;
    var im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95 }), N);
    var dummy = new THREE.Object3D();
    var cA = new THREE.Color(A), cB = new THREE.Color(B);
    var idx = 0;
    for (var x = -1; x <= 1; x++) for (var y = -1; y <= 1; y++) for (var z = -1; z <= 1; z++) {
      dummy.position.set(x * 0.95, y * 0.95, z * 0.95);
      dummy.updateMatrix();
      im.setMatrixAt(idx, dummy.matrix);
      im.setColorAt(idx, (x + y + z + 3) % 2 ? cA : cB);
      idx++;
    }
    g.add(im);
    return {
      group: g,
      update: function (t, dt, r) {
        g.rotation.y += dt * (0.25 + r * 0.9);
        g.rotation.x = 0.4 + Math.sin(t * 0.4) * 0.1;
        var breathe = 1 + 0.05 * Math.sin(t * 1.2) + r * 0.12;
        g.scale.setScalar(breathe * 0.8);
      }
    };
  };

  /* Calendar — day grid sweeps with event ripples */
  builders.grid = function (A, B) {
    var g = new THREE.Group();
    var C = 7, R = 5, N = C * R;
    var im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.34, 0.34),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, side: THREE.DoubleSide }), N);
    var dummy = new THREE.Object3D();
    var cA = new THREE.Color(A), cB = new THREE.Color(B);
    for (var i = 0; i < N; i++) im.setColorAt(i, (i * 7) % 11 > 7 ? cB : cA);
    g.add(im);
    return {
      group: g,
      update: function (t, dt, r) {
        for (var i = 0; i < N; i++) {
          var cx = i % C, cy = Math.floor(i / C);
          var x = (cx - (C - 1) / 2) * 0.45, y = ((R - 1) / 2 - cy) * 0.45;
          var d = Math.hypot(x, y);
          var w = Math.sin(d * 2.4 - t * (2 + r * 3));
          dummy.position.set(x, y, w * 0.12);
          dummy.scale.setScalar(0.62 + 0.3 * (0.5 + 0.5 * w));
          dummy.updateMatrix();
          im.setMatrixAt(i, dummy.matrix);
        }
        im.instanceMatrix.needsUpdate = true;
        g.rotation.x = -0.35 + Math.sin(t * 0.3) * 0.04;
      }
    };
  };

  /* Hyper Trophy — muscle fibers contract and glow */
  builders.fibers = function (A, B) {
    var g = new THREE.Group();
    var F = 7, lines = [], geos = [];
    for (var i = 0; i < F; i++) {
      var y = (i - (F - 1) / 2) * 0.3;
      var pts = [];
      for (var s = 0; s <= 20; s++) {
        var u = s / 20;
        pts.push(new THREE.Vector3(
          (u - 0.5) * 3,
          y + Math.sin(u * Math.PI) * 0.24 * (i % 2 ? 1 : -1) * 0.4,
          0));
      }
      var geo = new THREE.BufferGeometry().setFromPoints(pts);
      var ln = new THREE.Line(geo, lineMat(i % 3 === 1 ? B : A, 0.7));
      g.add(ln); lines.push(ln); geos.push(geo);
    }
    return {
      group: g,
      update: function (t, dt, r) {
        var contract = 0.8 + 0.2 * Math.sin(t * (1.6 + r * 2.6));
        g.scale.x = contract - r * 0.12;
        g.scale.y = 1 + (1 - contract) * 0.9 + r * 0.1;
        lines.forEach(function (ln, i) {
          ln.material.opacity = 0.45 + 0.5 * Math.max(0, Math.sin(t * (1.6 + r * 2.6) + i * 0.35));
        });
      }
    };
  };

  /* Manifesto — ink line writes itself, feather drifts */
  builders.ink = function (A, B) {
    var g = new THREE.Group();
    var STEPS = 80;
    var pts = [];
    for (var s = 0; s <= STEPS; s++) {
      var u = s / STEPS;
      pts.push(new THREE.Vector3(
        (u - 0.5) * 2.9,
        Math.sin(u * Math.PI * 2.2) * 0.5 * (1 - u * 0.35),
        0));
    }
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    var line = new THREE.Line(geo, lineMat(A, 0.9));
    geo.setDrawRange(0, 0);
    g.add(line);
    var P = 10;
    var fGeo = new THREE.BufferGeometry();
    var fPos = new Float32Array(P * 3);
    fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
    var feathers = new THREE.Points(fGeo, new THREE.PointsMaterial({ color: B, size: 0.09, transparent: true, opacity: 0.6 }));
    g.add(feathers);
    return {
      group: g,
      update: function (t, dt, r) {
        var u = (t * (0.22 + r * 0.3)) % 1.3;                /* write, hold, rewrite */
        geo.setDrawRange(0, Math.floor(Math.min(1, u) * STEPS) + 1);
        for (var k = 0; k < P; k++) {
          var kk = ((t * 0.12 * (1 + r)) + k / P) % 1;
          var i = Math.floor(kk * STEPS);
          fPos[k * 3] = pts[i].x + Math.sin(t + k) * 0.1;
          fPos[k * 3 + 1] = pts[i].y + kk * 0.7;
          fPos[k * 3 + 2] = 0;
        }
        fGeo.attributes.position.needsUpdate = true;
      }
    };
  };

  /* M.Popova — floral rosette blossoms and breathes */
  builders.floral = function (A, B) {
    var g = new THREE.Group();
    var petals = new THREE.Group();
    var PN = 6;
    var petGeo = new THREE.CircleGeometry(0.52, 14);
    petGeo.scale(1, 0.45, 1);
    petGeo.translate(0.62, 0, 0);
    for (var i = 0; i < PN; i++) {
      var p = new THREE.Mesh(petGeo, mat(i % 2 ? A : B, 0.55));
      p.rotation.z = (i / PN) * TAU;
      petals.add(p);
    }
    g.add(petals);
    var core = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), mat(A));
    g.add(core);
    return {
      group: g,
      update: function (t, dt, r) {
        petals.rotation.z += dt * (0.15 + r * 0.5);
        var bloom = 1 + 0.1 * Math.sin(t * 0.9) + r * 0.28;
        petals.scale.setScalar(bloom);
        petals.children.forEach(function (p, i) {
          p.rotation.x = Math.sin(t * 0.7 + i) * (0.12 + r * 0.35);
        });
        core.scale.setScalar(1 + 0.12 * Math.max(0, Math.sin(t * 2.2)));
      }
    };
  };

  /* Power Law — heavy-tail curve draws itself, outliers spark */
  builders.powerlaw = function (A, B) {
    var g = new THREE.Group();
    var axes = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-1.4, 1.35, 0), new THREE.Vector3(-1.4, -1.05, 0),
        new THREE.Vector3(-1.4, -1.05, 0), new THREE.Vector3(1.55, -1.05, 0)
      ]), lineMat(A, 0.4));
    g.add(axes);
    var STEPS = 60, pts = [];
    for (var s = 0; s <= STEPS; s++) {
      var u = s / STEPS;
      var xv = 0.04 + u * 0.96;
      var yv = Math.pow(xv, -0.62) / Math.pow(0.04, -0.62);
      pts.push(new THREE.Vector3(-1.35 + u * 2.8, -1.0 + yv * 2.25, 0));
    }
    var cGeo = new THREE.BufferGeometry().setFromPoints(pts);
    var curve = new THREE.Line(cGeo, lineMat(A, 0.95));
    cGeo.setDrawRange(0, 0);
    g.add(curve);
    var oGeo = new THREE.BufferGeometry();
    var oPos = new Float32Array([ -0.9, 0.4, 0,  0.1, -0.55, 0,  1.1, -0.85, 0 ]);
    oGeo.setAttribute('position', new THREE.BufferAttribute(oPos, 3));
    var outliers = new THREE.Points(oGeo, new THREE.PointsMaterial({ color: B, size: 0.14, transparent: true, opacity: 0.9 }));
    g.add(outliers);
    return {
      group: g,
      update: function (t, dt, r) {
        var u = (t * (0.3 + r * 0.35)) % 1.45;
        cGeo.setDrawRange(0, Math.floor(Math.min(1, u) * STEPS) + 1);
        outliers.material.size = 0.1 + 0.07 * Math.abs(Math.sin(t * 2.6)) * (1 + r);
        outliers.material.opacity = 0.5 + 0.5 * Math.abs(Math.sin(t * 1.8));
      }
    };
  };

  /* Replicator Void — organism field grows and mutates */
  builders.organism = function (A, B) {
    var g = new THREE.Group();
    var N = 26;
    var im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85 }), N);
    var dummy = new THREE.Object3D();
    var cA = new THREE.Color(A), cB = new THREE.Color(B);
    var seeds = [];
    for (var i = 0; i < N; i++) {
      seeds.push({ a: (i * 2.4) % TAU, r: 0.3 + (i % 7) * 0.18, v: 0.2 + (i % 5) * 0.12, ph: i });
      im.setColorAt(i, i % 2 ? cA : cB);
    }
    g.add(im);
    return {
      group: g,
      update: function (t, dt, r) {
        for (var i = 0; i < N; i++) {
          var s = seeds[i];
          var mut = 1 + 0.3 * Math.sin(t * s.v * (1 + r) + s.ph);
          dummy.position.set(
            Math.cos(s.a + t * s.v * 0.5) * s.r * mut,
            Math.sin(s.a + t * s.v * 0.5) * s.r * mut * 0.85,
            Math.sin(t * s.v + s.ph) * 0.3);
          dummy.scale.setScalar(0.6 + 0.5 * Math.abs(Math.sin(t * s.v + s.ph)));
          dummy.updateMatrix();
          im.setMatrixAt(i, dummy.matrix);
        }
        im.instanceMatrix.needsUpdate = true;
        g.rotation.z += dt * 0.08;
      }
    };
  };

  /* ═════════════════════════════════════════════════════════════
     Mount: one scene per portal ring, rendered by rect + scissor
     ═════════════════════════════════════════════════════════════ */
  var items = [];
  rings.forEach(function (ring) {
    var card = ring.closest('.hub-card');
    var preset = card.getAttribute('data-preset');
    var build = builders[preset];
    if (!build) return;
    var A = cssColor(card, '--ct', '#fbbf24');
    var B = new THREE.Color(card.getAttribute('data-c2') || '#8b5cf6');
    var made = build(A, B);
    var scene = new THREE.Scene();
    scene.add(made.group);
    var cam = new THREE.PerspectiveCamera(38, 1, 0.1, 30);
    cam.position.z = 5.6;
    var svg = ring.querySelector('.pico');
    if (svg) svg.style.opacity = '0';            /* scene owns this icon now */
    items.push({ ring: ring, card: card, scene: scene, cam: cam, update: made.update, react: 0, svg: svg });
  });
  if (!items.length) return;

  var pointer = (window.ForestMotion && window.ForestMotion.pointer) || null;
  var clock = new THREE.Clock();

  /* adaptive quality: on machines that can't hold a usable frame rate
     (software WebGL, old iGPUs) hand the icons back to the SVGs */
  var fpsFrames = 0, fpsStart = 0, degraded = false;
  function degrade() {
    degraded = true;
    document.documentElement.classList.remove('fx-icons');
    items.forEach(function (it) { if (it.svg) it.svg.style.opacity = ''; });
    canvas.remove();
    renderer.dispose();
  }

  var still = window.ForestMotion && window.ForestMotion.still;

  function frame(now) {
    if (degraded) return;
    if (!still) requestAnimationFrame(frame);
    if (document.hidden) { clock.getDelta(); return; }
    var dt = Math.min(clock.getDelta(), 0.25);
    var t = still ? 2.2 : clock.elapsedTime;

    if (!fpsStart) fpsStart = now;
    fpsFrames++;
    if (now - fpsStart > 3000) {
      var fps = fpsFrames / ((now - fpsStart) / 1000);
      if (fps < 14) { degrade(); return; }
      fpsStart = now; fpsFrames = 0;            /* keep watching */
    }
    var W = window.innerWidth, H = window.innerHeight;

    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setScissorTest(true);

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var r = it.ring.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H || r.right < 0 || r.left > W || r.width < 2) continue;

      /* proximity + hover reactivity, dt-smoothed */
      var target = 0;
      if (pointer && pointer.active) {
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var d = Math.hypot(pointer.x - cx, pointer.y - cy);
        var range = r.width * 2.2;
        target = Math.max(0, 1 - d / range);
        target *= target;
      }
      if (it.card.matches(':hover')) target = Math.max(target, 1);
      var k = 1 - Math.pow(0.02, dt);            /* ~fast, frame-rate independent */
      it.react += (target - it.react) * k;

      it.update(t, dt, it.react);

      /* CSS pixels — WebGLRenderer applies its pixelRatio internally */
      var x = r.left | 0,
          y = (H - r.bottom) | 0,
          w = r.width | 0,
          h = r.height | 0;
      renderer.setViewport(x, y, w, h);
      renderer.setScissor(x, y, w, h);
      renderer.render(it.scene, it.cam);
    }
  }

  /* if the context dies, hand back to the SVG icons gracefully */
  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    document.documentElement.classList.remove('fx-icons');
    canvas.style.display = 'none';
    items.forEach(function (it) { if (it.svg) it.svg.style.opacity = ''; });
  });

  frame();
})();
