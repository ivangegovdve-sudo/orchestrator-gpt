# Pool entries

The six non-Health pools (GrowingApp, AI-d kit, TinkerBox, Design Gallery,
Artificial Self, My Story) each open with an exterior entry: a code-rendered
animation on a pinned stage, then a pool page designed as its own world.
Health is out of scope (branch `feat/sdm-61-health-world`); the front page is
untouched.

Ivan's rulings, as applied:

- Each pool is a **completely different designed world**: art style, palette,
  type, layout, navigation, density, interaction, animation language.
- Shared **invisible** infrastructure stays common: feedback, accessibility,
  catalog data, reduced-motion behaviour, the entry runtime.
- Entries are **consistent across pools** in one sense: one quality bar and one
  entry system (below). Subject, palette and motion language are each pool's own.
- Free path only: SVG/Canvas, no generated media, no paid APIs, no new
  libraries. Nothing invented: no fabricated numbers, evidence or quotes.

## The shared entry system

Files (all new, none shared with the front page or Health):

| File | Role |
|---|---|
| `web/shared/pool-entry/scrollcraft.js` | The scroll-craft engine, a verbatim copy of `.agents/skills/scroll-craft/engine/scrollcraft.js`. Pins the stage, publishes progress, cues the copy. Never edited. |
| `web/shared/pool-entry/pool-entry.mjs` | Runtime: clock, canvas sizing, pause when hidden/off-screen, portrait vs landscape, scroll progress, pointer drift, reduced-motion still, engine mount. |
| `web/shared/pool-entry/pool-entry.css` | Structure and accessibility floor: pinned stage, `.pool-sr`, focus ring, per-card Feedback button, disclosure arrows, reduced-motion kill switch. |
| `web/pools/<id>/entry.mjs` | The pool's scene: `{ id, duration, still, draw(s), setup?(s) }`. Draws only. |
| `web/pools/<id>/pool.css` | The pool's world: palette, type, composition, card styling. |

### Page contract

```
body.pool-page
  header > a[href="/"]  "Back to SD Forest"
  main[data-pool-id][data-pool-layout="designed"][data-pool-feedback]
    section.entry[data-pool-entry][data-sc-act="pin"][data-sc-span≈1.5]
      div[data-sc-stage]
        canvas[data-entry-canvas][aria-hidden]
        div.entry-copy[data-sc-cue]   h1, [data-pool-overview] lede
        p.entry-notice                the small redesign joke
        a.entry-go[href="#pool-world"]  the way in for people who will not scroll a pin
    div#pool-world                    the pool's authored content, then the catalog
  footer > nav[aria-label="All pools"]
```

### Timing discipline (every pool)

1. **Arrive**: 4 to 6.5 s from first paint (`scene.duration`). The `h1` and
   lede are in the DOM and visible from t = 0; the animation never gates content.
2. **Rest**: after arrival the scene holds a resolved, composed frame. It may
   breathe (small amplitude, period of 6 s or more) or repeat its signature
   gesture on a long cycle. It never sits dead and never strobes.
3. **Depart**: scroll progress `p` (0..1 across the pin, 1.4 to 1.8 viewport
   heights) drives the exit. The scene must visibly respond to `p`, and at
   `p = 1` the stage is exactly `--entry-ground`, so the pool page grows out of
   the same world with no hard cut. The copy fades out through the engine cue.
4. **Skip**: scrolling is never blocked and `Walk in` jumps past the pin.
5. The canvas pauses when the tab is hidden or the stage is off screen.

### Accessibility and motion

- `prefers-reduced-motion`: the runtime draws a **composed still** at
  `scene.still` seconds, un-pins the stage (plain scroll), and holds. Not a
  blank, not a frozen first frame.
- Canvas is `aria-hidden`; all meaning lives in the real `h1`, lede, notice and
  links. Focus ring is shared and visible.
- Cue contrast >= 4.5:1 for body copy on the composited frame, >= 3:1 for
  display type, measured at the worst frame by `shoot.mjs`.
- Mobile gets its own composition (`s.portrait`), not a scaled desktop frame.

### Feedback

`web/shared/feedback.js` is loaded on every pool page (floating button), and
`renderProject(..., { feedback: true })` adds a **Feedback** button to every
catalog card regardless of lifecycle. Cards open the same shared dialog and
send `project` along with the message. The Formspree endpoint is still the
known placeholder in `feedback.js`; it was not invented or changed.

### Quality bar

Pre-render sprites; no allocation in the hot loop; DPR-correct strokes; real
gradients and layered depth instead of flat clip-art; deterministic randomness
(`rng(seed)`); `?entry-t=` / `?entry-p=` freeze the clock for review.

## Concepts

Settled by Ivan: Artificial Self, My Story. **Proposed, pending Ivan**: the
other four.

