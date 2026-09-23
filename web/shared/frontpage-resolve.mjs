// Terminal-sequence clock. It never grows, replaces, or moves the supplied tree.
import { createAmbient } from './frontpage-ambient.mjs';
import { createWorkbench } from './frontpage-workbench.mjs';
const root = document.documentElement;
const stage = document.querySelector('[data-resolve-stage]');
const directory = document.querySelector('[data-pool-directory]');
const status = document.querySelector('#workbench-status');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const frame = new URLSearchParams(location.search).get('frame');
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => { const p = clamp(value); return p * p * (3 - 2 * p); };
const parts = [...document.querySelectorAll('[data-arrival]:not([data-pool-link])')];
const timings = { field:[.05,.6], title:[.18,.95], brand:[.3,.9], portfolio:[3.65,4.2], history:[3.85,4.4] };
const feedback = document.querySelector('button[aria-label="Send feedback"]');
if (feedback) document.querySelector('.resolve-history').append(feedback);
let selected = null;
let current = 5;
let scrub = !reduced.matches && !frame && !location.hash && scrollY === 0;
const ambient = createAmbient(stage);
const motionButton = document.querySelector('.resolve-motion-toggle');
const compact = matchMedia('(max-width:800px)');
let frameId = 0;
let dirtyScroll = false;
let elapsed = 0;
let lastStamp = null;
let lastPaint = -Infinity;
const idleSampleMs = 900;
let onScreen = true;
let paused = false;
let running = false;
let strength = .65;
let runway = innerHeight * 1.25;
let inlineStrength = root.style.getPropertyValue('--ambient-strength');
let interactionDirty = false;
const workbench = createWorkbench(stage, invalidateWorkbench, () => elapsed);

function invalidateWorkbench() {
  interactionDirty = true;
  syncMotion();
}
function canInteract() {
  return current >= 4.4 && !reduced.matches && !paused && !document.hidden;
}

function measureSettings() {
  runway = parseFloat(getComputedStyle(stage.parentElement).paddingBottom) || innerHeight * 1.25;
  const configured = Number.parseFloat(getComputedStyle(root).getPropertyValue('--ambient-strength'));
  strength = Number.isFinite(configured) ? clamp(configured) : .65;
  ambient.compact(compact.matches);
  workbench.resize();
}
function canBreathe() {
  return current >= 4.4 && !reduced.matches && !paused && !document.hidden && onScreen && strength > 0;
}
function syncMotion() {
  const wasRunning = running;
  running = canBreathe();
  if (running && !wasRunning) lastPaint = -Infinity;
  ambient.phase(running ? 'running' : reduced.matches || strength === 0 ? 'still' : paused ? 'paused' : 'waiting');
  if (motionButton.disabled !== reduced.matches) motionButton.disabled = reduced.matches;
  const label = reduced.matches ? 'Motion off' : paused ? 'Resume motion' : 'Pause motion';
  if (motionButton.textContent !== label) motionButton.textContent = label;
  if (reduced.matches || strength === 0) ambient.render(0,0);
  if (!canInteract()) {
    workbench.render(elapsed,0,false);
    interactionDirty = false;
  }
  const interacting = canInteract() && (interactionDirty || workbench.busy());
  if (!running && !interacting) lastStamp = null;
  if (document.hidden || (!running && !dirtyScroll && !interacting)) {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
  } else if (!frameId) frameId = requestAnimationFrame(tick);
}
function tick(stamp) {
  frameId = 0;
  if (dirtyScroll) {
    dirtyScroll = false;
    // The scroll track can change independently of viewport size. Read only on
    // a dirty scrub, never in the ambient-only path.
    runway = parseFloat(getComputedStyle(stage.parentElement).paddingBottom) || innerHeight * 1.25;
    seek(-1 + scrollY / runway * 6);
    ambient.reveal(current);
    syncMotion();
  }
  const interacting = canInteract() && (interactionDirty || workbench.busy());
  if (running || interacting) {
    // Hold time while paused/offscreen; a delayed frame cannot produce a gust jump.
    if (lastStamp !== null) elapsed += Math.min((stamp - lastStamp) / 1000,.8);
    lastStamp = stamp;
    // Nine-second wind and <1.3px/sec motes need only ~1.1 visual samples/sec:
    // even the nearest mote advances <1.2px. Input and scrub still run at frame rate.
    if (running && stamp - lastPaint >= idleSampleMs) {
      ambient.render(elapsed,strength);
      workbench.render(elapsed,strength,true);
      interactionDirty = false;
      lastPaint = stamp;
    } else if (interacting) {
      workbench.render(elapsed,running ? strength : 0,true);
      interactionDirty = false;
    }
    if (!frameId) frameId = requestAnimationFrame(tick);
  } else {
    syncMotion();
  }
}
function sample(seconds) {
  seek(seconds);
  ambient.reveal(current);
  syncMotion();
}

function expose(element, progress) {
  element.style.opacity = String(progress);
  element.style.visibility = progress === 0 ? 'hidden' : 'visible';
  element.inert = progress < 1;
}
function closeSelection() {
  selected?.classList.remove('is-selected');
  selected?.removeAttribute('aria-describedby');
  selected?.removeAttribute('data-armed');
  selected = null;
  status.textContent = '';
  workbench.select(null);
}
function seek(seconds) {
  if (!Number.isFinite(seconds)) return;
  current = Math.min(5, Math.max(-1, seconds));
  const world = 1 - ease(current + 1);
  document.querySelector('.resolve-world').style.opacity = String(world);
  const light = 1 - world;
  document.querySelector('.resolve-tree').style.filter = `drop-shadow(0 0 ${30 * light}px rgb(34 197 94 / ${.08 * light}))`;
  for (const element of parts) {
    const [start,end] = timings[element.dataset.arrival];
    const p = ease((current - start) / (end - start));
    expose(element,p);
  }
  [...directory.querySelectorAll('[data-pool-link]')].forEach((element,index) => {
    const start = .8 + index * .32;
    const p = ease((current - start) / .72);
    const style = getComputedStyle(element);
    const x = parseFloat(style.getPropertyValue('--arrival-x')) || 0;
    const y = parseFloat(style.getPropertyValue('--arrival-y')) || 0;
    const turn = parseFloat(style.getPropertyValue('--arrival-turn')) || 0;
    const scale = parseFloat(style.getPropertyValue('--arrival-scale')) || 1;
    const blur = parseFloat(style.getPropertyValue('--arrival-blur')) || 0;
    expose(element,p);
    element.style.transform = `translate(${x * (1-p)}px,${y * (1-p)}px) rotate(${turn * (1-p)}deg) scale(${scale + (1-scale)*p})`;
    element.style.filter = `blur(${blur * (1-p)}px)`;
    if (element.dataset.poolLink === 'design-gallery') element.style.clipPath = p === 1 ? 'none' : `inset(0 ${100 * (1-p)}% 0 0)`;
  });
  const utilities = ease((current - 3.85) / .55);
  root.style.setProperty('--resolve-utilities',utilities);
  root.style.setProperty('--resolve-utilities-visibility',utilities === 1 ? 'visible' : 'hidden');
  root.style.setProperty('--resolve-cue',world);
  root.style.setProperty('--resolve-cue-visibility',world > 0 ? 'visible' : 'hidden');
  root.dataset.resolveState = current >= 4.4 ? 'opened' : current < 0 ? 'dissolving' : 'resolving';
  if (current < 4.4) closeSelection();
}
function onScroll() {
  if (scrub) dirtyScroll = true;
  syncMotion();
}
function openStatic() {
  scrub = false;
  root.dataset.resolveMotion = 'static';
  sample(5);
}
root.dataset.resolveMotion = scrub ? 'scrub' : 'static';
measureSettings();
motionButton.hidden = false;
sample(reduced.matches ? 5 : frame === 'resolve' ? 0 : frame === 'hinge' ? -.5 : scrub ? -1 : 5);
window.sdforestResolve = Object.freeze({ seek:sample, open:openStatic, get time() { return current; } });
addEventListener('scroll',onScroll,{passive:true});
addEventListener('resize',() => { measureSettings(); onScroll(); });
addEventListener('pageshow',event => { if (event.persisted || (!frame && scrollY > 0)) openStatic(); });
reduced.addEventListener('change',event => { if (event.matches) openStatic(); else syncMotion(); });
document.addEventListener('visibilitychange',syncMotion);
new IntersectionObserver(entries => {
  onScreen = entries[0].isIntersecting;
  syncMotion();
}).observe(document.querySelector('.resolve-tree'));
motionButton.addEventListener('click',() => { paused = !paused; syncMotion(); });
new MutationObserver(() => {
  const next = root.style.getPropertyValue('--ambient-strength');
  if (next === inlineStrength) return;
  inlineStrength = next;
  measureSettings();
  syncMotion();
}).observe(root,{attributes:true,attributeFilter:['style']});
document.querySelectorAll('a[href="#atlas"]').forEach(link => link.addEventListener('click',() => {
  openStatic();
  directory.querySelector('a').focus({preventScroll:true});
}));
directory.addEventListener('click',event => {
  const link = event.target.closest('[data-pool-link]');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  // A physical double-click is one selection gesture, never a shortcut into a pool.
  if (event.detail > 1) return;
  if (selected === link) { location.assign(link.href); return; }
  closeSelection();
  selected = link;
  selected.classList.add('is-selected');
  selected.dataset.armed = 'true';
  selected.setAttribute('aria-describedby','workbench-status');
  status.textContent = `${link.querySelector('.portal-name').textContent} selected. Press again to open; Escape cancels.`;
  workbench.select(link);
});
directory.addEventListener('keydown',event => { if (event.key === 'Enter' && event.repeat) event.preventDefault(); });
document.addEventListener('keydown',event => { if (event.key === 'Escape') { const prior = selected; closeSelection(); prior?.focus(); } });
document.addEventListener('click',event => { if (!event.target.closest('.resolve-directory')) closeSelection(); });
// A separate directory module may reorder the native anchors; arrival order follows it.
new MutationObserver(() => sample(current)).observe(directory,{childList:true});
