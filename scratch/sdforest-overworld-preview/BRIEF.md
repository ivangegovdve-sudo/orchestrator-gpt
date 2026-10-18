# SD Forest front-door rebuild brief

## North star

Make SD Forest feel like a living, navigable collection: a quiet nocturnal overworld that resolves into an honest editorial catalogue. The entry should feel discovered, not decorated.

## Journey

1. Before the first signal: dark veil, deliberate Enter gate, minimal orientation.
2. Enter the forest: Three.js/WebGPU terrain, exponential fog, colored bioluminescent project markers, and a luminous dark portal arch for row `00`.
3. Follow the light: scroll drives a camera flight through the selected portal while the marker field gathers and the portal preview identifies the doorway.
4. Resolve into the catalogue: ordinary HTML rows, ordered from Chloé row `00` through the public project paths.

## Visual contract

- No clay or blob placeholders.
- Terrain is a real mesh with PBR maps, authored relief, and real CC0 rock instances.
- The portal is a dark opening with a luminous arch/halo, not an opaque sphere.
- The catalogue is editorial and text-first: one clear row, explicit state, honest route boundary.
- Mobile keeps the same journey but moves the portal preview above the hero controls and removes nonessential engine status copy.
- Reduced motion hides the canvas and presents an authored text-first field guide with a direct catalogue link; the full catalogue remains reachable below.

## Signature move

The selected marker gathers toward the portal as the scroll flight advances; the camera crosses the arch and the experience resolves into the ordered list rather than ending on a hero graphic.

## Evidence target

Use real Chrome screenshots at 1440x900 and 390x844 for gate, arrival, mid-flight, pass-through, and catalogue states, plus a reduced-motion screenshot. Compare those captures with the saved Overworld and Aengel evidence in `D:\output`.
