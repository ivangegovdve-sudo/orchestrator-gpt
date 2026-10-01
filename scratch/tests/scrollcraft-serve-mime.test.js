const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const SERVE = path.join(__dirname, '../../.agents/skills/scroll-craft/scripts/serve.mjs');

// Start the real server on a temp root and resolve once it reports it is listening.
function startServer(root) {
  const port = 41000 + Math.floor(Math.random() * 2000);
  const child = spawn(process.execPath, [SERVE, '--root', root, '--port', String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('serve.mjs did not start')); }, 10000);
    child.stdout.on('data', (chunk) => {
      if (String(chunk).includes(`:${port}`)) { clearTimeout(timer); resolve({ child, base: `http://127.0.0.1:${port}` }); }
    });
    child.on('exit', (code) => { clearTimeout(timer); reject(new Error(`serve.mjs exited with ${code}`)); });
  });
}

test('serve.mjs sends ES modules as JavaScript so module pages can boot', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scrollcraft-serve-'));
  fs.writeFileSync(path.join(root, 'index.html'), '<!doctype html><title>x</title>');
  fs.writeFileSync(path.join(root, 'module.mjs'), 'export const ok = true;\n');
  fs.writeFileSync(path.join(root, 'classic.js'), 'window.ok = true;\n');

  const { child, base } = await startServer(root);
  t.after(() => child.kill());

  const type = async (file) => (await fetch(`${base}/${file}`)).headers.get('content-type');
  // Browsers refuse module scripts sent as application/octet-stream; that left
  // pool pages without cards and shoot.mjs waiting on html.sc-ready with no frames.
  assert.match(await type('module.mjs'), /^text\/javascript/);
  assert.match(await type('classic.js'), /^text\/javascript/);
  assert.match(await type('index.html'), /^text\/html/);
});
