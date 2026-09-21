/*
 * Cubeflow's shipped vision bundle is a static artifact.  This small shell
 * guard keeps its safety contract explicit at the integration boundary:
 * confidence failures are UNREAD, never a colour that can be sent to the
 * solver.  A visitor may correct the face manually, but cannot confirm a
 * guessed face.
 */
(function installUnreadGuard() {
  'use strict';

  const UNCERTAIN_RE = /\b(?:sticker|stickers)\s+(?:look|looks|still look|still looks)\s+uncertain\b/i;
  const FACE_SELECTOR = '[data-testid="capture-review"]';
  const CELL_SELECTOR = '[data-testid^="capture-sticker-"]';
  const CAMERA_START_TIMEOUT_MS = 6000;
  let cameraTimer = null;

  function setText(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
  }

  function markUnreadFace(card, message) {
    card.dataset.visionState = 'UNREAD';
    card.classList.add('capture-review-card--unread');

    const heading = card.querySelector('header p');
    if (heading && !/\bUNREAD\b/.test(heading.textContent || '')) {
      heading.textContent = `${heading.textContent} · UNREAD`;
    }

    const cells = [...card.querySelectorAll(CELL_SELECTOR)];
    cells.forEach((cell, index) => {
      const edited = cell.dataset.edited === 'true';
      const colour = cell.dataset.color || '';
      const label = edited && colour
        ? `Sticker ${index + 1}: ${colour}, edited`
        : `Sticker ${index + 1}: UNREAD`;
      cell.setAttribute('aria-label', label);
      if (!edited) {
        cell.dataset.visionState = 'UNREAD';
        cell.style.backgroundColor = 'transparent';
        setText(cell.querySelector('.alignment-color-code'), 'UNREAD');
      }
    });

    let status = card.querySelector('[data-testid="capture-unread-status"]');
    if (!status) {
      status = document.createElement('p');
      status.dataset.testid = 'capture-unread-status';
      status.className = 'capture-unread-status';
      status.setAttribute('role', 'alert');
      card.appendChild(status);
    }
    setText(status,
      'UNREAD — one or more stickers could not be read reliably. Retake the face or correct every sticker manually before continuing.');

    const confirm = card.querySelector('.capture-actions--confirm .primary-button')
      || document.querySelector('.capture-actions--confirm .primary-button');
    if (confirm) {
      const complete = cells.length === 9 && cells.every((cell) => cell.dataset.edited === 'true');
      confirm.disabled = !complete;
      confirm.setAttribute('aria-disabled', String(!complete));
      confirm.title = complete
        ? 'All stickers were corrected manually; this face is ready to confirm.'
        : 'This face is UNREAD. Correct every sticker manually before confirming.';
    }

    if (message && !/\bUNREAD\b/.test(message.textContent || '')) {
      message.textContent = 'UNREAD — camera confidence is too low to use this face safely.';
      message.classList.add('camera-message--error');
      message.setAttribute('role', 'alert');
    }
  }

  function reconcile() {
    const message = document.querySelector('[data-testid="camera-message"]');
    const card = document.querySelector(FACE_SELECTOR);
    if (message && card && UNCERTAIN_RE.test(message.textContent || '')) {
      markUnreadFace(card, message);
    }

    const stage = document.querySelector('.camera-stage');
    const starting = stage && stage.dataset.state === 'starting';
    if (!starting) {
      if (cameraTimer !== null) window.clearTimeout(cameraTimer);
      cameraTimer = null;
      return;
    }
    if (cameraTimer !== null) return;
    cameraTimer = window.setTimeout(() => {
      cameraTimer = null;
      const currentStage = document.querySelector('.camera-stage');
      if (!currentStage || currentStage.dataset.state !== 'starting') return;
      if (document.querySelector('[data-testid="camera-message"]')) return;
      const fallback = document.createElement('p');
      fallback.className = 'camera-message camera-message--error';
      fallback.dataset.testid = 'camera-message';
      fallback.setAttribute('role', 'alert');
      fallback.textContent =
        'Camera unavailable — permission or the device did not respond. Enter colors manually or use the practice lesson.';
      currentStage.insertAdjacentElement('afterend', fallback);
      const stateCopy = currentStage.querySelector('.camera-state-copy');
      if (stateCopy) {
        stateCopy.dataset.visible = 'true';
        stateCopy.textContent = 'Camera unavailable';
      }
    }, CAMERA_START_TIMEOUT_MS);
  }

  function install() {
    const observer = new MutationObserver(reconcile);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    reconcile();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
