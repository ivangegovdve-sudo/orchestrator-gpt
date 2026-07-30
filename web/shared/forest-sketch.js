/* SDForest — the sketch layer.

   Every marked SVG path gets a hand-drawn twin: the original geometry is
   resampled and nudged sideways with seeded noise, then drawn twice with
   slightly different seeds so it reads as a pencil gone over the line a
   second time. At rest the twin is what you see. Touch a host — hover it,
   or scroll it into view — and the twin cross-fades out while the exact
   geometric original fades in. Click and the geometry crystallises hard
   for a beat, a ripple running out from the pointer, before relaxing.

   Contract with the markup:
     [data-sketch]                  a host <svg> to process
     [data-sketch-trigger="sel"]    element whose hover/click drives it
                                    (defaults to the host — needed because
                                    the title crown is pointer-events:none)
     .sketch-src                    a path inside the host to twin
     [data-sketch-amp="1.8"]        per-host jitter amplitude, user units

   Degrades by doing nothing: with no JS, or under prefers-reduced-motion,
   the untouched geometric original is what renders. The stylesheet only
   hides it once this script has set html[data-sketch-ready].

   Seeded throughout, so a given host looks identical on every load — the
   wobble is a drawing, not a random mess that changes under you. */

(() => {
  "use strict";

  if (window.__forestSketch) return;

  const root = document.documentElement;
  const reduceMedia = matchMedia("(prefers-reduced-motion: reduce)");
  const coarseMedia = matchMedia("(pointer: coarse)");
  const SVG_NS = "http://www.w3.org/2000/svg";

  /* Same generator the Three.js layer uses, kept local so this file stays
     a plain script with no imports. */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* getPointAtLength walks every subpath of a `d` as one continuous run,
     so sampling straight through a multi-subpath trunk would draw joining
     strokes between the pieces. Split first, sample each piece alone.
     Absolute M only — every path on this page is authored that way, and a
     relative `m` would need its own pen-position bookkeeping. */
  function splitSubpaths(d) {
    if (/m/.test(d)) return [d]; // relative move: leave it whole
    return d.split(/(?=M)/).map((s) => s.trim()).filter(Boolean);
  }

  const measurer = document.createElementNS(SVG_NS, "svg");
  measurer.setAttribute("width", "0");
  measurer.setAttribute("height", "0");
  measurer.setAttribute("aria-hidden", "true");
  Object.assign(measurer.style, {
    position: "absolute", left: "-9999px", top: "0", overflow: "hidden",
  });
  const probe = document.createElementNS(SVG_NS, "path");
  measurer.appendChild(probe);

  /* Resample one subpath and push each sample sideways along the local
     normal. Jitter tapers to nothing at both ends (sin envelope) so
     branch joints and closed shapes keep meeting where they should. */
  function wobbleSubpath(d, rng, amp, step) {
    probe.setAttribute("d", d);
    let len = 0;
    try { len = probe.getTotalLength(); } catch (error) { return d; }
    if (!(len > 0)) return d;

    const n = Math.max(2, Math.min(180, Math.round(len / step)));
    const points = [];
    for (let i = 0; i <= n; i += 1) {
      const at = (i / n) * len;
      const p = probe.getPointAtLength(at);
      const back = probe.getPointAtLength(Math.max(0, at - 1.2));
      const fwd = probe.getPointAtLength(Math.min(len, at + 1.2));
      const dx = fwd.x - back.x;
      const dy = fwd.y - back.y;
      const m = Math.sqrt(dx * dx + dy * dy) || 1;
      const taper = Math.sin((i / n) * Math.PI) ** 0.55;
      const push = (rng() - 0.5) * 2 * amp * taper;
      points.push([p.x + (-dy / m) * push, p.y + (dx / m) * push]);
    }

    // Midpoint-quadratic smoothing: a drawn curve, not a jagged polyline.
    const f = (v) => v.toFixed(1);
    let out = `M${f(points[0][0])} ${f(points[0][1])}`;
    for (let i = 1; i < points.length - 1; i += 1) {
      const [x, y] = points[i];
      const [nx, ny] = points[i + 1];
      out += `Q${f(x)} ${f(y)} ${f((x + nx) / 2)} ${f((y + ny) / 2)}`;
    }
    const last = points[points.length - 1];
    out += `L${f(last[0])} ${f(last[1])}`;
    return out;
  }

  function wobble(d, seed, amp, step) {
    const rng = mulberry32(seed);
    return splitSubpaths(d).map((sub) => wobbleSubpath(sub, rng, amp, step)).join(" ");
  }

  /* ------------------------------------------------------------------ *
   * Host wiring
   * ------------------------------------------------------------------ */
  const hosts = [];

  function buildHost(svg, index) {
    // A host with no .sketch-src is legitimate: the title crown carries
    // the state for its added leaf layer while its own trunk, canopy and
    // branches stay exactly as drawn (Ivan — the crown does not change).
    const sources = [...svg.querySelectorAll(".sketch-src")];

    const amp = Number.parseFloat(svg.dataset.sketchAmp) || 1.8;
    const step = Number.parseFloat(svg.dataset.sketchStep) || 13;

    const twin = document.createElementNS(SVG_NS, "g");
    twin.setAttribute("class", "sketch-twin");
    twin.setAttribute("aria-hidden", "true");

    let seed = 7919 + index * 104729;
    sources.forEach((source) => {
      const d = source.getAttribute("d");
      if (!d) return;
      // Two passes, different seeds: the second is the lighter "gone over
      // it again" stroke that sells the pencil.
      for (let pass = 0; pass < 2; pass += 1) {
        seed += 2654435761;
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", wobble(d, seed, amp * (pass ? 1.35 : 1), step));
        path.setAttribute(
          "class",
          `sketch-stroke${pass ? " sketch-stroke--ghost" : ""} ${source.dataset.sketchClass || ""}`.trim(),
        );
        // Carry the source's own weight/colour role across.
        if (source.dataset.sketchWidth) path.style.strokeWidth = source.dataset.sketchWidth;
        twin.appendChild(path);
      }
    });
    if (twin.childNodes.length) {
      svg.appendChild(twin); // last child: the sketch sits on top
      // Dash lengths for the one-shot draw-on. Measured after insertion,
      // so the paths are laid out and getTotalLength is meaningful.
      [...twin.children].forEach((path) => {
        let len = 0;
        try { len = path.getTotalLength(); } catch (error) { len = 0; }
        if (len > 0) path.style.setProperty("--sketch-len", len.toFixed(1));
      });
    }

    const trigger = svg.dataset.sketchTrigger
      ? document.querySelector(svg.dataset.sketchTrigger)
      : svg;

    return { svg, twin, trigger, drawn: false };
  }

  /* ------------------------------------------------------------------ *
   * State: sketch at rest, geometric when touched.
   * ------------------------------------------------------------------ */
  function setGeo(host, on) {
    host.svg.classList.toggle("is-geo", on);
  }

  function crystallise(host, event) {
    host.svg.classList.add("is-crystal");
    setGeo(host, true);

    // Ripple from the pointer, in the host's own user units.
    if (event && typeof host.svg.getScreenCTM === "function") {
      const ctm = host.svg.getScreenCTM();
      if (ctm) {
        let point = null;
        try {
          point = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
        } catch (error) { point = null; }
        if (point) {
          const ring = document.createElementNS(SVG_NS, "circle");
          ring.setAttribute("class", "sketch-ripple");
          ring.setAttribute("cx", point.x.toFixed(1));
          ring.setAttribute("cy", point.y.toFixed(1));
          ring.setAttribute("r", "1");
          ring.addEventListener("animationend", () => ring.remove(), { once: true });
          host.svg.appendChild(ring);
        }
      }
    }

    clearTimeout(host.crystalTimer);
    host.crystalTimer = setTimeout(() => {
      host.svg.classList.remove("is-crystal");
      // Relax back to the drawing unless the pointer is still resting here.
      if (!host.hovering) setGeo(host, false);
    }, 760);
  }

  function wire(host) {
    const { trigger } = host;
    if (!trigger) return;

    // Coarse pointers never hover: there, scrolling into view is the
    // "touched" signal and a tap still crystallises.
    if (!coarseMedia.matches) {
      trigger.addEventListener("pointerenter", () => {
        host.hovering = true;
        setGeo(host, true);
      });
      trigger.addEventListener("pointerleave", () => {
        host.hovering = false;
        if (!host.svg.classList.contains("is-crystal")) setGeo(host, false);
      });
    }
    trigger.addEventListener("pointerdown", (event) => crystallise(host, event), { passive: true });
  }

  /* One-shot draw-on when a host first scrolls into view, plus — for
     coarse pointers — the geometric settle that hover would otherwise
     provide. Never a loop: the stroke is drawn once and left alone. */
  function observe() {
    if (!("IntersectionObserver" in window)) {
      hosts.forEach((host) => host.svg.classList.add("has-drawn"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const host = hosts.find((h) => h.svg === entry.target);
        if (!host || host.drawn) return;
        host.drawn = true;
        host.svg.classList.add("has-drawn");
        io.unobserve(entry.target);
        /* data-sketch-settle="view": for hosts nobody can realistically
           hover — the taproot behind the panels, the rules — being seen
           IS the interaction. Let the draw-on finish, then settle to the
           geometric form. */
        if (host.svg.dataset.sketchSettle === "view") {
          clearTimeout(host.settleTimer);
          host.settleTimer = setTimeout(() => setGeo(host, true), 1700);
        }
      });
      /* threshold MUST stay 0. The taproot is ~10800px tall in an ~800px
         viewport, so its intersectionRatio tops out around 0.075 — any
         fractional threshold can never fire for it and the rail would
         never draw on at all. "Any part visible" is the only ratio that
         is meaningful for targets taller than the screen. */
    }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });
    hosts.forEach((host) => io.observe(host.svg));
  }

  function boot() {
    if (reduceMedia.matches) return; // crisp original is the reduced state

    document.body.appendChild(measurer);
    [...document.querySelectorAll("[data-sketch]")].forEach((svg, index) => {
      const host = buildHost(svg, index);
      if (host) hosts.push(host);
    });
    measurer.remove();

    if (!hosts.length) return;
    hosts.forEach(wire);
    root.dataset.sketchReady = "1";
    observe();
  }

  window.__forestSketch = {
    get hosts() { return hosts; },
    /* Test hooks: drive the states without needing real pointer events or
       composited frames. */
    geo(on) { hosts.forEach((host) => setGeo(host, on !== false)); },
    crystal() { hosts.forEach((host) => crystallise(host, null)); },
    draw() { hosts.forEach((host) => host.svg.classList.add("has-drawn")); },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
