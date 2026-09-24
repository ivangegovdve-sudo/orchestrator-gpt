# Reference-derived sunset assets — 2026-09-24

Approved scope: replace the low-detail tree, restore the Drive reference palette,
and correct environmental depth. Pool artwork and interactions remain unchanged.

## Provenance and fidelity boundary

Style/subject source: Ivan's `file_000000005eb0820aa4e2e0f763d9b4e1.png`,
1672 × 941, Google Drive file `1nFwktxfSRPMO6Mj16j4tCjwW9ApVYpz-`, in
`sdforest tree animation / Make pulse images`.

These three assets were produced with the built-in image-generation editor.
They are **generative extractions/reconstructions, not lossless original pixels**.
In particular, the tree's added leaf/bark detail is generated. It is not a newly
discovered high-resolution original. The original Qwen layers remain untouched
in `../sdforest-resolve/` and available for comparison.

| File | Canvas | Transparency | Use |
|---|---|---|---|
| tree.webp | 1254 × 1254 | genuine alpha, including branch gaps | fixed focal subject |
| valley.webp | 1672 × 941 | opaque | far landscape/background |
| mist.webp | 1672 × 941 | genuine alpha | independent middle-distance mist |

WebP encoding: quality 94, alpha quality 100, no resizing, cropping or colour
adjustment after generation. PNG masters are supplied separately in Drive.
The bark, contact ground and pool art are existing assets, not regenerated here.

## Generation prompts (built-in editor)

### Tree

Use case: background-extraction. Asset: transparent central tree for SD Forest website. Edit target: the attached original landscape. Extract ONLY the small complete mature tree standing on the ledge in the left quarter (NOT the huge cropped framing trunk at the left edge). Preserve this tree's distinctive irregular branching, asymmetric crown silhouette, slate/sage green leaf clusters, delicate drawn outlines, textured muted brown bark, and warm pale-gold sunset rim lighting. Remove every other scene element including distant woods visible between branches; those gaps must be truly transparent. No sky, no landscape, no ledge, no opaque backdrop, no checkerboard painted in. Keep the entire tree including its flared trunk base. Enlarge it carefully as a crisp hand-drawn asset while faithfully preserving the illustration's style; no photoreal bark, no plastic 3D foliage, no neon glow. Center isolated whole tree, almost square canvas with only a small transparent margin; actual alpha channel. This is a faithful reference-derived cutout, not a new tree design. Output high resolution suitable for rendering at 630px tall on a 2x display.

### Valley

Use case: precise-object-edit. Asset: SD Forest distant background plane, 16:9 wide landscape. Edit target: attached original artwork. Preserve the exact illustrated style, delicate linework, matte painted texture, peach/apricot sunset sky, pale gold light, slate blue distant ridges, sage-blue forests, pale cloud banks and winding water. Remove ONLY the foreground elements: the huge framing tree trunk and overhead canopy on the left, the small complete mature tree in the left quarter, and the close-up ground ledge, rocks and leaves. Inpaint those areas with the existing distant valley landscape and sky. This is a clean far-background plate to sit BEHIND an independently composited central tree and existing side controls. Keep the horizon and sunset reading in the upper/middle distance; atmosphere light and airy, not dark night. No central tree, no large foreground trees, no framing vines, no close-up objects, no buildings, no people, no UI, no text. Preserve the beautiful softly illuminated palette; no saturated neon and no photorealistic or 3D materials. Output high-resolution 16:9 full-frame background.

### Mist

Use case: background-extraction. Asset: single transparent mist depth plane for the attached illustrated sunset valley. Extract/reconstruct ONLY two or three sparse horizontal banks of the pale cream/lilac valley mist from the middle-lower half of this reference; nothing else. Keep the same delicate matte hand-painted and finely outlined animation-background style, soft apricot light on top edges and muted cool lavender-grey shadow. Large transparent empty upper half. Mist bands gently separated across lower half of a wide 16:9 canvas. True transparent alpha background everywhere else, no mountains, no trees, no trunks, no ground, no sky, no text, no checkerboard. This is an airy, restrained foreground fog layer that will be overlaid at low opacity over the original landscape, NOT a dramatic cloudscape and not photorealistic smoke. Preserve the light palette rather than dark blue night fog.

## Animation integration

- The outer `.resolve-tree` box and its SVG viewBox stay unchanged. The square
  image is contained inside it, bottom aligned; it is not stretched to the box.
- The tree and contact ground receive no viewpoint transform.
- One normalized viewpoint drives far / mist / near translations at horizontal
  limits 2 / 6 / 10 CSS px, vertical limits 1 / 3 / 5 px. Mist also receives the
  existing wind field, at only 0.6px times gust strength.
- Motion uses the existing pausable rAF; no new timer or clock. Reduced motion
  releases any drag and restores zero viewpoint translation.
- Pointer dragging starts only outside interactive controls. Touch remains
  browser-owned so vertical scrolling can cancel the gesture.

The PNG masters and WebPs are different encodings of the same generated images,
not independently regenerated variants. Preserve alpha when importing the tree
and mist into animation software. Do not composite their transparent areas black.
