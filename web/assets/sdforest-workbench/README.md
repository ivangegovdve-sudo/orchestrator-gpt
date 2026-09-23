# Grafted Workbench artwork

## Approved embedded environment — 2026-09-23

The [corrected embedded mock](../../../docs/frontpage-proof/embedded-approved.png)
supersedes the detached framing shown in the older workbench render. Four original
generated layers extend the existing controls, with no baked-in text or new tree:

| Deployed asset | Dimensions | Bytes | Purpose |
|---|---|---:|---|
| bark.webp | 1672×941 | 357,072 | Continuous moss/bark side frames and lower root ledge |
| woodland.webp | 1672×941 | 77,884 | Distant indigo valley, behind the protected tree |
| mist.webp | 1672×941 | 241,550 | Sparse translucent air, 0.12 base opacity |
| ground.webp | 768×117 | 44,266 | Moss/soil contact patch at the fixed trunk base |

Total added deployable artwork: **720,772 bytes**. The old horizon remains in git
for discoverability but is no longer requested by this homepage. No CodePen asset,
code or composition is used. Existing controls, region crops, fonts and all six
warm-world/tree layers are unchanged. The mock is documentation, not a shipped
replacement tree. Original transparent PNGs were inspected before compression;
the ground canvas was cropped to x39/y354/w2092/h318 before resizing. WebP quality
88, alpha quality 100, effort 6. Desktop bark brightness/saturation is 0.72/0.8;
compact/mobile backing is darker for readable native text.

| Original PNG | SHA-256 |
|---|---|
| Bark | `2f79e6d1c32397b884bf4040ddb84aad2949ebb4228746e5e18fc92c12fff2f5` |
| Woodland | `1056d217874aa2e0a2c8aaa04f12ea8b343357efe7be5e2bc988de97ae2f38d6` |
| Mist | `52aee74f26ec653e1c7621a52be002dfbe31c6ba8b17340fba7de76be6c24b5e` |
| Ground | `df2fd10b464fbd6ededf26717d0a312d6d93d6e14537995e4c0daf8ed167cb92` |

## Earlier mechanical artwork — retained unchanged

Original generated control artwork, approved direction 2, BUTCHER, 2026-09-23.
The source target is [the approved revision](../../../docs/frontpage-proof/workbench-approved.png).
No CodePen code, scene, composition or asset was copied. The tree and all six
`sdforest-resolve` assets remain untouched. These images contain no pool names:
the canonical existing names remain accessible HTML text.

The seven mechanisms were generated independently from that target: an intact
ECG window; a first-aid flag with **white cross on green** and purple lever;
seed/sapling/tree tiles; opposing compartment pins; small exhibit shutters;
connected neurons; and a fading-to-bright, open-ended signal rail. The eighth
image is an original low-contrast distant indigo horizon, not a foreground scene.

Delivery: 21 WebP files, **631,486 bytes total**. Seven base controls plus the
horizon total 515 KB; 13 small mechanical/illuminated regions avoid animating
full-size clipped textures. Main controls are 1100×458; three lower controls
1100×275; horizon 1672×941. WebP quality 87, effort 6; region derivatives quality
90. Regions are mechanical crops, not redrawn artwork. Their normalized bounds
are exported once as `artworkParts` from `frontpage-workbench.mjs`.

Original PNGs were retained outside the checkout on BUTCHER. The deployable
WebPs are committed here; neither rendering nor builds depend on those local
original paths. Before resizing, lower controls were cropped to these rectangles:

| Original | Crop x,y,width,height |
|---|---|
| TinkerBox 1983×793 | 0,148,1983,496 |
| Design Gallery 2172×724 | 0,90,2172,543 |
| My Story 2181×721 | 0,88,2181,545 |

Other originals retained their full canvas. Original PNG SHA-256 provenance:

| Asset | SHA-256 |
|---|---|
| Health | `472f59ddf8800cb656e4780ba9b6cd2ce721938dbe1acecd5d979c456cc00ac0` |
| AI-d kit | `b35ad5b133e4c74ed9516d4780e0bf8871ca783ba71a5db835bb4cc7b7149423` |
| GrowingApp | `64c8049325e2840799519705f69d8fff9eab600b3ed79708b55e486d4d474149` |
| TinkerBox | `42c22c7f27afccb9182750232912a157873b9a7becfe83f1a35cd82ac3e4b80d` |
| Artificial Self | `419bb00ef3935c4e5161b241f1f16dee17c17a4ffaa13c89e5530361f5983c8d` |
| Design Gallery | `63a1d203e66feb0255254286f9d29cf66d5d302677482204bb34f3c4d359074b` |
| My Story | `de209b43b7796f21369c15f4eb9dc352c4336e9abdbfe3b844f4522ba50eab48` |
| Horizon | `0eba1746debf58b7fa06aca4c577e9f35a3fcfda2212c1a20b5daf80d80b22a2` |
