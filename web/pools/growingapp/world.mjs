/* GrowingApp world: pencil lines draw in as each section arrives. Content is visible without this script. */
const sections = document.querySelectorAll('#pool-world [data-mark], #pool-world section, .pool-index > div');
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('marks-ready');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
  sections.forEach((el) => io.observe(el));
  // catalog rows arrive after the first paint
  new MutationObserver(() => document.querySelectorAll('.pool-index > div:not([data-seen])').forEach((el) => { el.dataset.seen = ''; io.observe(el); }))
    .observe(document.querySelector('[data-pool-projects]') || document.body, { childList: true, subtree: true });
}
