# Rooted tree — editable art preview, BUTCHER

2026-09-24. Ivan approved the bounded layer/ground proposal after accepting the
new tree. This receipt delivers the **assembled preview before integration**.
No product HTML/CSS/JS is changed by this preview commit. Do not merge PR #627.

## What Ivan can now edit

- Nine registered tree selections: structural trunk/roots; front left/right
  foliage/branch groups; upper crown; upper left/right; lower left/right; and
  remaining inner detail. Every part keeps the 1254x1254 canvas and zero offsets.
- Four registered ground selections: central root bed, left bank, right bank
  and connecting earth. Ground canvas 1672x941.
- Two PSDs, two OpenRaster files, transparent PNGs, native SVG stacks and
  editable SVG mask paths. Export/reproduction scripts and tests are included.

The tree master is unchanged. Its SHA256 is
`348419cb028dbf456b2691bd1576004f0bfc43d6ed12034169f189697090cfc2`.
Masks select existing visible pixels; they do not invent hidden branches or
complete a three-dimensional rig. Fine twigs cross some masks and the selection
boundaries remain artist-editable. Moving pieces far apart exposes transparent
gaps. Highlights stay in the painted groups, not a separate lighting pass.

The ground plate is newly generated through the built-in image editor, matching
the approved tree rather than the older photoreal turf. The exact prompt is
[preserved here](frontpage-rooted-preview/ground-prompt.txt). The tree master and
the earlier Drive originals are not regenerated or overwritten.

## Rendered proposal

[Desktop](frontpage-rooted-preview/desktop.png) ·
[Portrait phone](frontpage-rooted-preview/mobile.png) ·
[Landscape phone](frontpage-rooted-preview/landscape.png) ·
[Tree selections](frontpage-rooted-preview/tree-selections.png)

Desktop roots now continue into the illustrated ledge behind My Story. The old
synthetic grass/blurred turf is omitted from the preview; its paint-server defs
are retained so the existing vine colours do not disappear. Pool controls and
copy are not modified. Mobile still transitions into the existing directory
bark below the tree: this remains a visible style boundary to review, not a
claim of a complete mobile redesign.

The local preview holds everything still and pins the surrounding bark. It is
not a runtime motion fix. The next integration needs to anchor the central bed
to the tree, implement the agreed shallow viewpoint response and re-run motion,
capture/cancellation, reduced-motion, mobile/fold and frame-cost checks. The
outer tree video contract remains untouched. No true 3D orbit is promised.

## Drive hand-off

In the [existing animation folder](https://drive.google.com/drive/folders/1PDKIbmCwhNBTkWMtrKLkjvtyB0YRYYSH):

- [Complete editable package](https://drive.google.com/file/d/1wFg_qxElmUjsNCPEkQcVdvHeLBr_MJ53/view)
  — 32,388,568 bytes; SHA256
  `a74a46e02bf50f71603356e7ea1acae90ae61575bf1bc96a55fd31740e78bd96`.
- [Tree PSD](https://drive.google.com/file/d/1TyYILIZNN248gaUnEremQpYk32ZDa3lO/view)
  — 5,240,394 bytes, nine named layers.
- [Ground PSD](https://drive.google.com/file/d/1UfTYjs1v4zj-JDvscszTXqogfaPNYKhA/view)
  — 2,803,137 bytes, four named layers.

The 13 PNG selections are also uploaded individually with the prefix
`rooted-20260924-`. All 16 objects' sizes and destination parent were read back.
Existing files/sharing were preserved. The package includes the original tree
master, generated ground master, exact prompt, PNG/SVG layers, PSD/ORA stacks,
preview images and scripts. Nothing depends on access to BUTCHER's drive.

## Evidence and limitations

| Check | Result |
|---|---|
| Export regression suite | **5/5**; failures were observed before exports existed |
| Tree and ground reassembly | Within 1/255 alpha and 2/255 premultiplied-colour export rounding |
| Layer registration | All tree parts 1254x1254; fixed root pixel belongs only to structural layer |
| PSD re-open | Named layers and layer pixels round-trip byte-for-byte |
| Browser preview | 1920x1080, 390x844, 780x390; seven portals and unchanged tree boxes; no uncaught page errors |
| Site source contracts | **191/192**, sole pre-existing Windows CRLF hash failure, `ai-kit-offers.test.js:38` |
| Product diff | Documentation/screenshots only; no routes, catalogue, controls or narrative changes |

The preview used the existing Playwright/Brave lane because the standalone
Browser plugin is unavailable. It is a static visual inspection, not evidence
that the future motion works. [Measured boxes](frontpage-rooted-preview/measurements.json).
PSD format handling uses [ag-psd imageData and layer documentation](https://github.com/Agamnentzar/ag-psd/blob/master/README_PSD.md).
Photoshop/After Effects themselves were not available for an application-level
import test. Export dependencies live outside the site; package.json is unchanged.

The branch was fetched/rebased on main's newer fleet digest before committing
this receipt. Front-page code is unchanged from the prior tree correction.
The final remote SHA is recorded in the PR comment after push. No new formal
review, merge, production deployment or migration is part of this preview.
