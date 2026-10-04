// Option A: retain the supplied art and stable windows. Only finish the controls,
// the tree's ground contact and the manually promoted project symbols.
const stage = document.querySelector('[data-resolve-stage]');
const root = document.documentElement;
const SVG = 'http://www.w3.org/2000/svg';
const machine = document.createElementNS(SVG, 'svg');
machine.classList.add('forest-machine');
machine.setAttribute('viewBox', '0 0 680 100');
machine.setAttribute('aria-hidden', 'true');
machine.innerHTML = `<defs>
  <linearGradient id="aged-steel" x2="0" y2="1"><stop stop-color="#9b9575"/><stop offset=".4" stop-color="#454c43"/><stop offset="1" stop-color="#242f2c"/></linearGradient>
  <pattern id="steel-wear" width="19" height="13" patternUnits="userSpaceOnUse"><path d="M2 3h5m6 6h3M5 11h2" stroke="#adb187" stroke-opacity=".25"/></pattern>
  </defs><g class="machine-rail"><path d="M12 81H256L310 63h60l54 18h244" fill="none" stroke="#171f1d" stroke-width="13"/>
  <path d="M12 77H255l55-18h60l55 18h243" fill="none" stroke="url(#aged-steel)" stroke-width="7"/>
  <path d="M45 74h142m291 0h148" stroke="#8c9668" stroke-width="2" stroke-dasharray="9 5"/>
  <g fill="#343d34" stroke="#8d8a65"><rect x="60" y="66" width="96" height="23" rx="5"/><rect x="513" y="66" width="96" height="23" rx="5"/></g>
  <path d="M68 78h80m373 0h80" stroke="#a8a18a" stroke-width="2" stroke-dasharray="2 12"/>
  <g fill="#6e8351"><path d="M60 67q12-12 26-4q14-6 23 3q23-8 40 1v4H60z"/><path d="M520 65q8-10 21-4q12-6 18 2q23-6 41 3v5h-80z"/></g></g>
  <g class="machine-gear" transform="translate(209 76)"><path d="M-5-25h10l2 8l7 3l7-4l7 7l-4 7l3 7l8 2v10l-8 2l-3 7l4 7l-7 7l-7-4l-7 3l-2 8h-10l-2-8l-7-3l-7 4l-7-7l4-7l-3-7l-8-2V5l8-2l3-7l-4-7l7-7l7 4l7-3z" fill="url(#aged-steel)" stroke="#a69d79"/><circle r="14" fill="#1f2b28" stroke="#6d7960"/><path d="M-11 0h22M0-11v22" stroke="#90916f" stroke-width="5"/><circle r="4" fill="#3c453b"/></g>
  <g class="machine-piston" fill="url(#aged-steel)" stroke="#9b9675"><path d="M432 85V54h28v31z"/><path d="M445 54V38h4v16"/><rect x="430" y="36" width="34" height="8" rx="3"/></g>
  <path d="M25 88q36-8 56 1t51-1m340 0q26-8 51 0t52-1" fill="none" stroke="#526841" stroke-width="3"/>
  <rect x="50" y="59" width="580" height="31" fill="url(#steel-wear)" opacity=".45"/>`;
stage.querySelector('.resolve-scene').append(machine);
const support = document.querySelector('[data-support-control]');
if (support) stage.append(support);

const promoted = [
  ['health', 'Gym Scholar', 'Movement, with evidence.', 'https://gymscholar.lovable.app', '✚'],
  ['growingapp', 'Forest Math', 'A little mathematical play.', '/web/math-mania/', '∑'],
  ['ai-d-kit', 'The Drop', 'The morning briefing.', '/web/morning-news/', '◒'],
  ['ai-d-kit', 'Explore Repos', 'Find a useful repository.', '/web/explore/', '⌕'],
  ['ai-d-kit', 'Open Dashboard MCP', 'Look inside the model landscape.', '/web/open-dashboard/', '◈'],
];
for (const [pool, name, teaser, href, symbol] of promoted) {
  const group = stage.querySelector(`[data-pool-link="${pool}"]`);
  const link = document.createElement('a');
  link.className = 'forest-project-dot';
  link.dataset.promotedPool = pool;
  link.href = href;
  link.setAttribute('aria-label', `${name}: ${teaser}`);
  link.setAttribute('aria-expanded', 'false');
  link.innerHTML = `<span aria-hidden="true">${symbol}</span><span class="project-dot-caption">${name}<small>${teaser}</small></span>`;
  // A first touch exposes the same name/teaser that desktop hover and keyboard
  // focus expose. A second touch follows the native project link.
  let touched = false;
  link.addEventListener('pointerdown', event => { touched = event.pointerType === 'touch'; });
  link.addEventListener('click', event => {
    const disclose = touched && event.detail !== 0 && !link.hasAttribute('data-disclosed');
    touched = false;
    if (!disclose) return;
    event.preventDefault();
    closeProjectCaptions();
    link.setAttribute('data-disclosed', '');
    link.setAttribute('aria-expanded', 'true');
  });
  group.after(link);
}
function closeProjectCaptions() {
  for (const link of stage.querySelectorAll('.forest-project-dot[data-disclosed]')) {
    link.removeAttribute('data-disclosed');
    link.setAttribute('aria-expanded', 'false');
  }
}
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('.forest-project-dot')) closeProjectCaptions();
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeProjectCaptions(); });
// Position the symbols from each stable window; there is no scenery-dependent hunt.
function placeDots() {
  const nav = stage.querySelector('[data-pool-directory]');
  for (const pool of ['health', 'growingapp', 'ai-d-kit']) {
    const window = nav.querySelector(`[data-pool-link="${pool}"]`);
    const dots = [...nav.querySelectorAll(`[data-promoted-pool="${pool}"]`)];
    dots.forEach((dot, index) => {
      dot.style.left = `${window.offsetLeft + window.offsetWidth * (.36 + index * .15)}px`;
      dot.style.top = `${window.offsetTop + window.offsetHeight * .91}px`;
      const center = nav.getBoundingClientRect().left + parseFloat(dot.style.left) + dot.offsetWidth / 2;
      if (center < 108) dot.dataset.captionEdge = 'left';
      else if (center > innerWidth - 108) dot.dataset.captionEdge = 'right';
      else delete dot.dataset.captionEdge;
    });
  }
}
new ResizeObserver(placeDots).observe(stage.querySelector('[data-pool-directory]'));
document.fonts.ready.then(placeDots);
placeDots();
root.dataset.forestFinished = 'true';
