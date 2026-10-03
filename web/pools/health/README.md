# Health cell entrance

The cell is procedural three.js r180, adapted from the render pass at
`540cb1cb28d0bccfe9aebd4755e66b43869ad7ec` on PR #679. Only the cell and
vendored post-processing addons were brought across; the Health clinic remains
the catalog-backed, vertical page from main. This keeps its readiness and
evidence disclosures, reading tabs, reachable development entries and keyboard
navigation.

The upper-front quarter is cut away. The rendering includes a lipid-bilayer
rim, double nuclear envelope with pores and chromatin, nucleolus, mitochondrial
inner folds, curved Golgi stacks, rough ER with ribosomes, vesicles, lysosomes,
peroxisomes and a centriole pair. These are a stylized scene, without labels.
Organelles drift, ER breathes, Golgi vesicles bud and ribosomes stream while
the page is visible. Scroll advances the camera into the cutaway after the
introductory text clears. Reduced motion renders a fixed time sample and uses
no camera movement or extended scroll runway.

The desktop and phone JPGs in `web/assets/pools/health/cell-still-*.jpg` are
screenshots of that same procedural canvas at its reduced-motion time sample.
They provide the no-JavaScript, unavailable-WebGL and lost-context fallback.
No generated media or paid inference was used.

The entrance has its own scoped timing in `cell.js` and styles in `cell.css`;
it does not edit the scroll-craft engine or replace the shared pool presenter.
`?cell=lite` disables optional post-processing for software renderers. Quality
adapts down if frames are slow. Real phone GPU performance still needs device
verification.
