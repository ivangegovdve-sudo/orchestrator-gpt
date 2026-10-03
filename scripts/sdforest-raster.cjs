// Chromium can retain different antialias samples for transformed shadows.
// Normalize that cache before freezing a reference or rendering its video. The
// output remains the restored live DOM; no reference image covers the page.
async function normalizeFinalRaster(page, sceneName = 'forestRender') {
  await page.evaluate(async name => {
    if (!window[name]) {
      const { createIntroScene } = await import('/web/shared/frontpage-intro-scene.mjs');
      window[name] = createIntroScene(document.querySelector('[data-resolve-stage]'));
    }
  }, sceneName);
  for (const progress of [.5, .99, 1]) {
    await page.evaluate(({ name, progress }) => window[name].render(progress), { name: sceneName, progress });
    // A screenshot forces an actual compositor sample. Discard these buffers;
    // only the restored finished page is written as the reference.
    await page.screenshot();
  }
}
function hashComposition(file) {
  const fs = require('node:fs'), crypto = require('node:crypto');
  let bytes = fs.readFileSync(file);
  // Git stores text with LF; Windows checkouts may use CRLF. A composition lock
  // should remain reproducible on either host without changing binary hashes.
  if (/\.(?:html|css|mjs|js)$/.test(file)) bytes = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
module.exports = { normalizeFinalRaster, hashComposition };
