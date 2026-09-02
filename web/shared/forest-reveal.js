(() => {
  'use strict';

  // Scroll-reveal engine for Forest subpages. Elements opt in with
  // [data-reveal]; groups opt in with [data-reveal-stagger] to give children
  // an incrementing --ri used by CSS as a transition delay. The hiding styles
  // only engage once body[data-reveal-ready] is set here, so a failed script
  // can never leave the page blank.

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('[data-reveal-stagger]').forEach((group) => {
    [...group.children].forEach((child, index) => {
      child.style.setProperty('--ri', index);
    });
  });

  const targets = [...document.querySelectorAll('[data-reveal]')];

  function reveal(element) {
    element.classList.add('is-revealed');
    element.dispatchEvent(new CustomEvent('forest:reveal'));
  }

  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    targets.forEach(reveal);
  } else {
    document.body.setAttribute('data-reveal-ready', '');
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal(entry.target);
        observer.unobserve(entry.target);
      }
    }, { threshold: .15, rootMargin: '0px 0px -36px' });
    targets.forEach((element) => observer.observe(element));
  }

  // Count-up for stat readouts: animates from zero to whatever the element
  // already says, so the displayed value is never invented, only approached.
  function countUp(element, duration = 950) {
    const raw = (element.textContent || '').trim();
    const target = parseFloat(raw.replace(/[^\d.\-]/g, ''));
    if (!Number.isFinite(target) || reduceMotion.matches) return;
    if (element.dataset.counting) return;
    element.dataset.counting = 'true';
    const decimals = (raw.split('.')[1] || '').length;
    const start = performance.now();
    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = (target * eased).toFixed(decimals);
      if (progress < 1) requestAnimationFrame(frame);
      else {
        element.textContent = raw;
        delete element.dataset.counting;
      }
    }
    requestAnimationFrame(frame);
  }

  window.forestReveal = {
    countUp,
    countUpAll(root, selector) {
      [...(root || document).querySelectorAll(selector || '[data-count]')].forEach((element) => countUp(element));
    },
  };
})();
