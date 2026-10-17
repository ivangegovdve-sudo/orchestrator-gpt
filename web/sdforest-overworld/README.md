# SD Forest — two linked WebGL scenes

This is a clean-room, candidate prototype for the SD Forest front door. It does
not replace the existing landing surface. It deliberately uses original geometry,
procedural canvas textures, and original copy; no reference-site source, shader,
image, model, layout, or audio has been copied.

## The two scenes are separate

1. **Arrival / intro.** A dark, ground-level stone field opens into a portal.
   On hover or focus, chunks break from their resting formation, scatter, make an
   ellipse, and reveal a blue-violet window. The follow-up action crosses into the
   front door.
2. **Front door.** An embedded central shape sits inside a water moat. Six glowing
   pools are direct project sources: The Drop, Mendeleev, Rubik's Teacher, Open
   Dashboard, Artificial Self, and Poetry Space. Hover/focus selects a pool; its
   vertical signal and accessible detail identify the real local route.

The deliberate split prevents the portal effect from competing with navigation,
and prevents the project map from becoming an unskippable intro sequence.

## Evidence and technique extraction

The visual reference was studied from Ivan's supplied recording, not by copying
site implementation:

- Source: `C:\Users\ivang\Videos\Captures\Overworld Audio - Brave 2026-10-17 15-55-36.mp4`
- Measured file: 1920x1040 H.264, 207.659 seconds.
- Whole-recording and burst frame sheets: `D:\output\SDFOREST_REVERSE_FRAMES_2026-10-17\`.
- The switch is bounded by sampled frames: **t=100s is still the Overworld
  project landscape; t=104s is already the AENGEL loading grid.** This is a hard
  site switch around t=102–104s, not one continuous scene.

### Segment A — Overworld reference → SD Forest front door

The first segment uses a cold, misty, oblique terrain diorama. Large land and
water masses occupy the screen; selected project locations are deliberately tiny
until a local vertical signal makes one legible. The camera reads as a slow,
anchored glide/orbit rather than free-flight. The useful techniques are hierarchy
(terrain first, project second), restrained low-saturation geology, animated water
detail, a sparse edge-pinned UI, and a high-contrast selected-source plume.

**Original translation:** an irregular SD Forest island replaces the reference
terrain, a single procedural moat replaces its water system, and discrete pool
sources replace any geographic project markers. The prototype uses one small
time-based water shader and a sprite plume only for a selected local source.

### Segment B — AENGEL reference → SD Forest arrival intro

The later segment begins with the AENGEL loader, then frames a dark, low-angle
arch/ground composition. Rough stone, restrained green vegetation, and darkness
hold the frame while blue fragments reorganize into an elliptical ring. A
blue-violet interior builds only after the stone motion, ending in a bright
portal transition. The camera remains mostly locked, which makes the material
and motion carry the event.

**Original translation:** the prototype uses a deliberately simple low-poly
mossy arch and 28 original dodecahedral stone chunks. Its motion is staged:
resting field → outward scatter → elliptical assembly → procedural vortex. The
recording demonstrates visual choreography; the hover/focus trigger is Ivan's
specified interaction requirement, not a claim about the reference site's input
implementation.

### What was not treated as evidence

REA was available for passive visual analysis of Overworld and AENGEL identity
confirmation (`aengel.io`, with the historical lab at `lab.aengel.io`). A CodePen
search for the requested “Ghibli World” demo encountered CodePen's challenge
page, so no candidate was assumed to be the exact demo and no technique claim in
this plan depends on it. This avoids making an unsupported attribution or
reproducing unknown implementation.

## Production scene graph

```text
AppShell
├─ IntroScene (active before crossing the portal)
│  ├─ Dark-ground / low fog / sparse vegetation instances
│  ├─ Static weathered arch (GLB, three LODs)
│  ├─ StoneField (instanced chunks; start, scatter, ring target attributes)
│  ├─ Portal
│  │  ├─ rim fragments
│  │  ├─ depth-sorted vortex planes / noise mask
│  │  └─ local blue-violet light and restrained bloom layer
│  └─ semantic HTML arrival controls
└─ FrontDoorScene (active after crossing)
   ├─ IslandRoot
   │  ├─ embedded shape / hero formation
   │  ├─ terrain and wet-rock LOD instances
   │  └─ modest fog cards
   ├─ Moat
   │  ├─ one water material / normal detail
   │  └─ inner and outer shoreline masks
   ├─ SourcePools (one instanced base plus six interactive proxy meshes)
   │  └─ selected source: pooled light, plume, label anchor
   └─ semantic HTML project navigation and selected-source panel
```

Keep navigation and headings in DOM. Three.js owns atmosphere and picking, not
the only way to reach a project. Each visible pool has a matching keyboard-focusable
link and real local route.

## Motion and camera choreography

| Moment | Original behavior | Motion limit |
| --- | --- | --- |
| Intro idle | Stones breathe subtly in a dark field; portal is absent. | 0.15–0.3px-equivalent camera parallax only. |
| Hover/focus (0–0.55s) | Chunks detach and travel outward. | Stagger groups, do not simulate collision. |
| Assembly (0.55–1.45s) | Chunks settle into an elliptical rim; cold emissive seams rise. | Target positions are deterministic, so replay is stable. |
| Reveal (1.1–1.9s) | Vortex opacity, local light, and rim energy come up. | One local bloom pass at most; clamp white values. |
| Cross (button/click) | Brief blue-white mask carries the switch into the map. | 500–700ms; no camera whip. |
| Front idle | Oblique 35–42 degree view drifts slowly over island and moat. | Damped pointer parallax, never manual/free camera. |
| Pool hover/focus | One source gains a vertical signal, label, and small water response. | Color is source-specific; all other pools remain quiet. |
| Reduced motion | Open portal and select pool immediately. | No looping vortex, stone flight, or water animation. |

## Free/open asset shortlist and license boundary

These are production candidates, not assets embedded in this small procedural
prototype. Record the download date, upstream URL, chosen files, and SHA-256 in
the future asset manifest before a binary enters the repository.

| Asset / use | Source | License | Web treatment |
| --- | --- | --- | --- |
| Ultimate Nature Pack — ferns, ground cover, distant trees | [Quaternius](https://quaternius.com/packs/ultimatenature.html) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Pick only a few silhouettes; bake/merge by species and instance. |
| Rock 09 — hero wet stone / portal rim variation | [Poly Haven Rock 09](https://polyhaven.com/a/rock_09) | [CC0](https://polyhaven.com/license) | Decimate and bake a small/medium LOD pair; do not load the 23k-triangle original wholesale. |
| Pond HDRI — neutral ambient/reflection starting point | [Poly Haven Pond](https://polyhaven.com/a/pond) | [CC0](https://polyhaven.com/license) | Use a prefiltered 1K/2K lighting derivative only; never ship 16K by default. |
| Water implementation component | [Three.js Water documentation](https://threejs.org/docs/pages/Water.html) / [Three.js MIT license](https://github.com/mrdoob/three.js/blob/dev/LICENSE) | MIT software, not artwork | Prefer a single adapted, original material pass; retain license notice if source is incorporated. |
| Custom hero formation / portal stones | [Blender licensing](https://www.blender.org/about/license/) | Blender is GPL; creator-owned output is a separate original asset | Make original low-poly meshes and textures; verify every add-on/input asset independently. |

The useful Sketchfab low-poly-rock candidate found during discovery is **not
selected**: its listing is [CC BY](https://sketchfab.com/3d-models/low-poly-rocks-b38c8fd9e36a49ef80cc135acc9b0865), not CC0. It must not enter the build without an
explicit attribution decision.

## Asset and rendering pipeline

1. In Blender, make the embedded shape and portal chunk set from scratch; export
   GLB with named materials and LOD0/1/2 collections.
2. Download only the selected CC0 assets, preserve upstream license text and
   source URLs, then simplify/bake them into SD Forest-specific materials.
3. Use `gltf-transform`/Meshopt for geometry and KTX2/Basis for texture payloads.
   Transformations do not alter the upstream license obligations.
4. Build the front scene first with one real project source end to end, then add
   the other five sources. Add the intro only after that navigation slice is
   measured and accessible.

## Performance budget

These are implementation gates, not claims about the prototype's current
performance.

| Budget | Desktop target | Mobile / low-power target |
| --- | ---: | ---: |
| Visible triangles | <= 80k front, <= 35k intro | <= 35k front, <= 15k intro |
| Draw calls | <= 100 | <= 55 |
| Compressed scene assets | <= 9 MB | <= 5 MB |
| Initial texture residency | <= 48 MB | <= 24 MB |
| Frame pacing | 60 fps / 16.7ms | stable 30 fps / 33.3ms |
| Post-processing | 1 local bloom or none | none; emissive sprites/materials only |

Implementation rules: instance vegetation and unselected stones; use six tiny
interactive proxy meshes over a shared pool base; pause rendering when the tab
is hidden; cap device pixel ratio at 1.5 desktop and 1 mobile/reduced motion;
avoid real-time shadows on low power; make quality tier selection before loading
large textures.

## Prototype and verification hooks

- Open `web/sdforest-overworld/` from a static server.
- `window.__sdForest.snapshot()` exposes renderer state, active scene, selected
  source, and source count for browser tests.
- `scratch/tests/sdforest-overworld-page.test.js` drives desktop, mobile, and
  reduced-motion paths and writes screenshots to `D:\output`.
- The prototype currently uses its own procedural proxy art. Replace that art
  only through the licensed asset pipeline above; it is intentionally not a
  substitute for the final asset pass.
