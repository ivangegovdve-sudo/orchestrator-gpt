// My Story: the small in-page gesture. Doodles and underlines draw themselves on
// once, as they come into view. Without JS, or with reduced motion, they are simply drawn.
const marks = [...document.querySelectorAll('[data-draw]')];
if (marks.length && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    }
  }, { threshold: 0.35 });
  marks.forEach((m) => io.observe(m));
} else marks.forEach((m) => m.classList.add('is-in'));
