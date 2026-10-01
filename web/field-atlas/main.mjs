import { initAtlas } from './atlas.mjs';

const html = document.documentElement;
const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const toggle = document.querySelector('[data-motion-toggle]');
let manualPause = false;
try { manualPause = localStorage.getItem('sdforest-atlas-motion') === 'paused'; } catch { /* Storage is optional. */ }

function applyMotion() {
  const paused = manualPause || systemMotion.matches;
  html.classList.toggle('motion-off', paused);
  toggle.setAttribute('aria-pressed', String(paused));
  toggle.querySelector('[data-motion-label]').textContent = paused ? 'Motion paused' : 'Pause motion';
  toggle.hidden = systemMotion.matches;
  window.dispatchEvent(new CustomEvent('sdforest:motion', { detail: { paused } }));
  window.ScrollCraft?.instance?.layout();
}
applyMotion();
toggle.addEventListener('click', () => {
  manualPause = !manualPause;
  try { localStorage.setItem('sdforest-atlas-motion', manualPause ? 'paused' : 'running'); } catch { /* Storage is optional. */ }
  applyMotion();
});
systemMotion.addEventListener('change', applyMotion);

// The runtime is copied unchanged. New choreography lives only on this page.
if (window.ScrollCraft) {
  initAtlas();
  window.ScrollCraft.instance = window.ScrollCraft.mount(document.body);
}

const cover = document.querySelector('.cover');
let coverVisible = true;
let frame = 0;
let pointerX = 0;
let pointerY = 0;
function paintCover() {
  frame = 0;
  if (!coverVisible || html.classList.contains('motion-off')) return;
  const rect = cover.getBoundingClientRect();
  const progress = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)));
  cover.style.setProperty('--cover-turn', String(progress * -3));
  cover.style.setProperty('--pointer-x', String(pointerX));
  cover.style.setProperty('--pointer-y', String(pointerY));
}
function scheduleCover() { if (!frame && coverVisible) frame = requestAnimationFrame(paintCover); }
new IntersectionObserver(([entry]) => { coverVisible = entry.isIntersecting; scheduleCover(); }).observe(cover);
window.addEventListener('scroll', scheduleCover, { passive: true });
cover.addEventListener('pointermove', event => {
  if (!finePointer.matches || html.classList.contains('motion-off')) return;
  const rect = cover.getBoundingClientRect();
  pointerX = (event.clientX - rect.left) / rect.width - .5;
  pointerY = (event.clientY - rect.top) / rect.height - .5;
  scheduleCover();
}, { passive: true });
cover.addEventListener('pointerleave', () => { pointerX = pointerY = 0; scheduleCover(); });

const menu = document.querySelector('.mobile-menu');
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { menu.open = false; }));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
});
document.addEventListener('pointerdown', event => { if (menu.open && !menu.contains(event.target)) menu.open = false; });
scheduleCover();
