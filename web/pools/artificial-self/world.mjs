/* Small page behaviours for the notebook: the opening line arrives token by token, entries settle in as they scroll into view. */
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const world = document.getElementById('pool-world');

function tokens() {
  const line = world?.querySelector('.pool-setup blockquote p');
  if (!line || reduced) return;
  const words = line.textContent.trim().split(/\s+/);
  line.textContent = '';
  words.forEach((word, i) => {
    const span = document.createElement('span');
    span.className = 'tok';
    span.style.setProperty('--i', i);
    span.textContent = word + (i < words.length - 1 ? ' ' : '');
    line.append(span);
  });
  line.classList.add('is-tokens');
}

function settle() {
  if (!world || reduced || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -12% 0px' });
  world.querySelectorAll('.pool-setup, .pool-boundary, .pool-experiments article, section[aria-labelledby="projects-title"]').forEach((el) => {
    el.classList.add('will-settle');
    io.observe(el);
  });
}
tokens();
settle();
