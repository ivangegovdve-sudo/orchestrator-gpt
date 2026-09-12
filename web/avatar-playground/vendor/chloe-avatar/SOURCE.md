# Vendored: chloe-avatar (verbatim)

Source: https://github.com/ivangegovdve-sudo/chloe-avatar (branch `master`)
Commit: `491eefa0186a1b8be0f81e6b859eca168177bdeb` (v1.1.0, 2026-07-13)

Files copied byte-for-byte, only line endings normalised:

- `ChloeAvatar.js`  ← `ChloeAvatar.js`
- `chloe-shaders.js` ← `shaders/chloe-shaders.js`

Do not edit these here. The playground must tune the same engine the fleet
serves; a local fork would drift silently. To update, copy the two files again
and bump the commit above.

The engine expects a global `THREE` (it was written against the r128 UMD
build). `../../three-global.mjs` provides it from the site's shared Three.js
r180 module and disables colour management so hex palettes render as they did
on r128.
