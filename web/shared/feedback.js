/* Visitor feedback is intentionally standalone: no storage, cookies, scroll
   listeners, or site stylesheet dependency. Replace this before launch. */
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/PLACEHOLDER';

(() => {
  'use strict';
  if (window.__sdforestFeedback) return;
  window.__sdforestFeedback = true;

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const color = 'var(--accent, var(--forest-amber, #4f46e5))';
  const ink = 'var(--text-primary, var(--forest-ink, #f3f4f6))';
  const surface = 'var(--surface, var(--forest-surface, #0f0f15))';
  const line = 'var(--border, var(--forest-line, rgba(255,255,255,.18)))';
  const font = 'var(--font, var(--forest-sans, system-ui, sans-serif))';
  const transition = reduced ? 'none !important' : 'opacity 150ms ease, transform 150ms ease';
  let opener = null;
  let backdrop = null;
  let timer = null;

  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', 'Send feedback');
  button.textContent = 'Feedback';
  button.style.cssText = `position:fixed;right:18px;bottom:18px;z-index:2147483646;border:1px solid ${line};border-radius:999px;background:${surface};color:${ink};font:600 13px/1 ${font};letter-spacing:.02em;padding:12px 16px;box-shadow:0 10px 30px rgba(0,0,0,.28);cursor:pointer`;

  function close() {
    if (!backdrop) return;
    clearTimeout(timer);
    backdrop.remove();
    backdrop = null;
    (opener || button).focus();
  }

  function open() {
    opener = document.activeElement;
    backdrop = document.createElement('div');
    backdrop.dataset.feedbackBackdrop = '';
    backdrop.style.cssText = `position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.58);transition:${transition}`;
    const dialog = document.createElement('section');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Site feedback');
    dialog.style.cssText = `width:min(100%,460px);border:1px solid ${line};border-radius:14px;background:${surface};color:${ink};font-family:${font};padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.45);transition:${transition}`;
    dialog.innerHTML = `<form><label for="sdforest-feedback-message" style="display:block;font-weight:650;line-height:1.35">What's wrong, missing, or could be better?</label><textarea id="sdforest-feedback-message" required rows="6" style="display:block;box-sizing:border-box;width:100%;margin-top:12px;border:1px solid ${line};border-radius:8px;background:rgba(0,0,0,.14);color:${ink};font:inherit;padding:10px;resize:vertical"></textarea><p data-feedback-status aria-live="polite" style="min-height:1.25em;margin:10px 0 0;font-size:13px"></p><div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px"><button type="button" data-feedback-close style="border:0;background:transparent;color:${ink};font:inherit;padding:9px;cursor:pointer">Cancel</button><button type="submit" style="border:0;border-radius:8px;background:${color};color:#fff;font:650 14px/1 ${font};padding:11px 15px;cursor:pointer">Submit</button></div></form>`;
    backdrop.append(dialog);
    document.body.append(backdrop);
    const form = dialog.querySelector('form');
    const textarea = dialog.querySelector('textarea');
    const status = dialog.querySelector('[data-feedback-status]');
    dialog.querySelector('[data-feedback-close]').addEventListener('click', close);
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close(); });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = textarea.value.trim();
      if (!message) return textarea.focus();
      try {
        const response = await fetch(FORMSPREE_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ message, url: window.location.href }) });
        if (!response.ok) throw new Error('feedback request failed');
        status.textContent = 'Thanks — noted.';
        timer = window.setTimeout(close, 2000);
      } catch {
        status.textContent = "Couldn't send — try again later.";
      }
    });
    textarea.focus();
  }

  button.addEventListener('click', open);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  (document.body || document.documentElement).append(button);
})();
