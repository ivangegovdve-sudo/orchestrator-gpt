const RUNTIME_MODULES = Object.freeze({
  motion: './forest-motion.js?v=20260729e',
  three: './forest-three.js?v=20260729e',
});
const BOOT_KEY = Symbol.for('sdforest.forestRuntimeBoot');

function setMarker(targetDocument, value) {
  if (targetDocument?.documentElement?.dataset) {
    targetDocument.documentElement.dataset.forestRuntimeBoot = value;
  }
}

export function createRuntimeBoot({
  targetDocument = globalThis.document,
  runtime,
  importer = (specifier) => import(specifier),
} = {}) {
  if (!targetDocument) return null;
  if (targetDocument[BOOT_KEY]) return targetDocument[BOOT_KEY];
  if (!RUNTIME_MODULES[runtime]) {
    throw new TypeError(`Unknown Forest runtime: ${String(runtime)}`);
  }

  let bootPromise = null;
  const bootOnce = () => {
    if (bootPromise) return bootPromise;
    setMarker(targetDocument, 'loading');
    bootPromise = Promise.resolve()
      .then(() => importer(RUNTIME_MODULES[runtime]))
      .then((module) => {
        setMarker(targetDocument, 'ready');
        return module;
      })
      .catch((error) => {
        setMarker(targetDocument, 'failed');
        console.error(`SDForest ${runtime} runtime failed to load.`, error);
        return null;
      });
    return bootPromise;
  };

  const controller = Object.freeze({
    runtime,
    bootOnce,
    whenBooted: () => bootPromise || Promise.resolve(null),
  });
  targetDocument[BOOT_KEY] = controller;

  if (targetDocument.prerendering) {
    setMarker(targetDocument, 'waiting');
    targetDocument.addEventListener('prerenderingchange', bootOnce, { once: true });
  } else {
    bootOnce();
  }
  return controller;
}

if (typeof document !== 'undefined') {
  const script = document.querySelector(
    'script[data-forest-runtime][src*="forest-runtime-boot.mjs"]',
  );
  if (script?.dataset.forestRuntime) {
    createRuntimeBoot({
      targetDocument: document,
      runtime: script.dataset.forestRuntime,
    });
  }
}
