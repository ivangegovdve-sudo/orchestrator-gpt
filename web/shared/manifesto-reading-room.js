(() => {
  'use strict';

  const STORAGE_KEY = 'sdforest:manifesto:reading-position';
  const languageNavigation = document.querySelector('.lang');

  const clampRatio = (value) => Math.min(1, Math.max(0, value));
  const maxScroll = () =>
    Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);

  languageNavigation?.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || !languageNavigation.contains(link)) return;

    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin) return;

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        target: destination.pathname,
        ratio: clampRatio(window.scrollY / maxScroll()),
      }));
    } catch {
      // Navigation remains fully usable when session storage is unavailable.
    }
  });

  let saved;
  try {
    saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return;
  }

  if (!saved || saved.target !== window.location.pathname) return;

  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // The matched entry is best-effort state, never a navigation dependency.
  }

  const parsedRatio = Number(saved.ratio);
  if (!Number.isFinite(parsedRatio)) return;
  const ratio = clampRatio(parsedRatio);
  const fontsReady = document.fonts?.ready || Promise.resolve();

  Promise.resolve(fontsReady)
    .catch(() => undefined)
    .then(() => new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }))
    .then(() => {
      window.scrollTo({
        top: ratio * maxScroll(),
        left: 0,
        behavior: 'auto',
      });
    });
})();
