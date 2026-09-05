# Avatar Playground Design

**Status:** Proposed 2026-09-05 (open brief; decisions made by the author and
argued here, for Ivan to accept or reject in the PR)

## What this page is for

The brief describes `/web/avatar-playground/` as "a title and a back link".
That is what a no-JavaScript fetch returns. Loaded in a browser, the route
serves a React/Vite bundle: the six-library "audition bench" built on
2026-07-23 (Three.js dot cloud, CSS/SVG rings, Lottie, a Rive-style face, a
GSAP orb with satellites, an Anime.js dot matrix).

That page answers a question that has since been closed. The identity of
Chloé's avatar is the dot cloud; it is not up for audition. Five of the six
engines on the live page are exactly the alternative shapes the identity rule
forbids. The bundle is also committed build output of a private repository,
so nothing about it can be edited in this repo, and it has no voice.

So the page is replaced, not extended. The new page is **the behaviour lab
for Chloé's real avatar**: the verbatim `ChloeAvatar.js` from the public
`chloe-avatar` repository, driven from a surface where every behaviour it
can express is one click away.

**Who opens it and what they leave knowing**

1. **Ivan, or Chloé herself, tuning her temperament.** `TUNING.md` in the
   avatar repo describes a loop, "watch, name the feeling, patch, apply with
   `setTuning`, persist the winning values", that has no surface today. The
   playground is that surface: sliders edit the live rule set, and a patch
   panel shows the diff from the defaults as JSON, ready to persist.
2. **Fleet developers deciding what to send.** The avatar has seven states,
   nine expressions, six symbols and an audio channel. Someone wiring a
   directive needs to see what `thinking` at intensity 0.9 looks like next to
   `listening`, and what a `?` costs in attention. The page shows each one
   and prints the call that produces it.
3. **Visitors who meet Chloé elsewhere on the site.** They leave able to read
   the cloud: teal is listening, firing along the web is thinking, a spreading
   warm cloud is speaking.

## Goals

- Embed the real avatar, unmodified, so what is tuned here is what ships.
- Expose the four behaviours the brief names, honestly labelled by whether
  the engine already implements them:
  - amplitude from real audio: implemented (`setAudioLevel`).
  - colour from prosody or emotion: partly. States and expressions carry
    palettes; there is no prosody input. The page drives colour through
    state, expression and per-state palette tuning, and says so.
  - thinking as activation travelling along the proximity lines:
    implemented. Fires cascade only to dots inside the line threshold and
    coincident fires light the connecting line.
  - symbol formation: implemented (`? ✓ … ! ☺ ♡`).
- Let a visitor hear Chloé's voice through each engine that can serve it,
  and watch the cloud react, without the page holding any key and without
  opening a live session.
- Render every state: loading, unsupported browser, no WebGL, context lost,
  audio blocked, microphone refused, provider unreachable or unable to serve
  her voice.

## Non-goals

- No alternative avatar shapes, engines or libraries. The cloud is the
  identity.
- No live full-duplex voice (Hume EVI). Minutes are metered and were burned
  once by accident; a public page must not be able to open a session.
- No provider names on the page. `api/voice.js` already scrubs engine ids
  from everything the browser sees, because two of them identify whose voice
  was cloned. This page keeps that line.
- No change to any existing route, and no new HTML documents (the navigation
  contract test counts them).

## Decisions

### Replace the bundle

`web/avatar-playground/assets/` (1.1 MB of hashed Vite output) is deleted.
The bench survives in git history and in the private `avatar-playground`
repository. The route keeps its URL, its inventory entry, its head block and
its `data-forest-page="avatar"` theme, so every route contract test still
passes.

### Reuse the real engine, pinned

`ChloeAvatar.js` and `shaders/chloe-shaders.js` are copied verbatim from
`ivangegovdve-sudo/chloe-avatar` at `491eefa0` (v1.1.0, 2026-07-13) into
`web/avatar-playground/vendor/chloe-avatar/`, with a `SOURCE.md` naming the
commit. Verbatim matters: the local working copy is byte-identical to the
public master apart from line endings, and a fork here would silently drift
from what the fleet serves.

### Reuse the site's Three.js

The site already vendors Three.js r180 as an ES module for its ambient
scenes. `ChloeAvatar.js` expects a global `THREE` (it was written against the
r128 UMD build). A four-line module, `three-global.mjs`, imports the shared
copy, exposes it on `window`, and disables `ColorManagement` so hex colours
are stored raw, as r128 did. Without that, every palette renders darker than
the fleet build. No second copy of Three.js is added.

### One WebGL canvas, click to run

`body` declares `data-forest-scene-owner="route"`, the same opt-out Open
Dashboard uses, so the shared runtime does not spawn its ambient WebGL
scene. The stage starts as a static SVG poster with a "Start the cloud"
button. Only the click constructs the renderer. "Stop" destroys it and
returns the poster.

### Voice through the existing proxy, never a substitute

`api/voice.js` already proxies the narration service same-origin, caps
previews at 500 characters, forwards a visitor-supplied key per request and
stores nothing. It gains one public field, `chloe: true`, on the two engines
that are clones of Chloé's voice. The page offers only engines with that
flag. If neither is available, the page says Chloé's voice cannot be served
and offers nothing in its place.

The proxy's status payload reports `substituted` when the upstream fell back
to a different engine. The Voice Playground plays it and notes the change;
this page refuses to play it. A substituted clip is not Chloé.

Guard rails against metered spend: previews are capped at 200 characters
here, each one is an explicit click, the self-hosted engine is selected by
default, and the metered one is labelled as such.

### Audio drivers that are not her voice

A separate "Drive the cloud with sound" group feeds amplitude without any
voice: a synthetic syllable envelope (no permissions), the microphone, or a
local audio file decoded in the browser and never uploaded. The group is
labelled as amplitude input only. This is what makes the page useful when
the visitor has no key.

### Parameters

Global: quality (50 / 80 / 120 dots), cloud scale, glow, dot size, seed.
Per state, editing the state currently shown: speed, noise amplitude, noise
frequency, noise evolution, radius, orbit, jitter, dart rate, dwell,
cohesion, line threshold, line opacity, fire rate (thinking), breathe
amplitude and period, two palette colours. Every slider calls `setTuning`,
and the patch panel prints only the keys that differ from the defaults.

## Every state renders

| Condition | What the visitor sees |
|---|---|
| Scripts still loading | Poster with "Loading the avatar engine" and a static dot sketch |
| Browser lacks ES modules, `ResizeObserver` or `matchMedia` | Poster explains the page needs a current browser; controls stay visible |
| No WebGL context | Poster explains WebGL is unavailable and that nothing else on the page needs it |
| Engine failed to load or threw | Poster names which piece failed (Three.js, shaders, engine) |
| WebGL context lost | Poster reports it, with Restart |
| Tab hidden | Renderer keeps its context; the browser pauses `requestAnimationFrame` |
| Reduced motion preferred | Status chip says motion is reduced; engine slows itself ×0.25 |
| AudioContext suspended by autoplay policy | Inline notice with "Enable sound" |
| Microphone refused, absent or insecure origin | Inline notice naming the reason |
| Voice catalogue unreachable | Voice panel says the service could not be reached |
| No engine can serve her voice | Voice panel says so; no fallback |
| Key missing, rejected, quota out, service down, timeout | Explained inline, no fallback offer |
| Upstream substituted another voice | Clip is not played; notice says why |

## Testing

- Existing contract tests under `scratch/tests` (route inventory, instant
  navigation, page titles, forest-three runtime) pass unchanged.
- Loaded in a real browser: poster, start, each state, each symbol,
  synthetic envelope, mic denial path, voice panel with the proxy
  unreachable and with an engine unavailable, WebGL-disabled path, mobile
  viewport.
