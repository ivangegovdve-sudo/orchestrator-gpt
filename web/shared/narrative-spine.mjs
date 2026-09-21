import { NARRATIVE_SPINE } from './project-catalog.mjs';

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

export function renderNarrativeSpine(activeId) {
  return `<nav class="narrative-spine" data-narrative-spine aria-label="Story surfaces">
    <p>Walk the story</p>
    <ul>${NARRATIVE_SPINE.map((entry) => entry.id === activeId
      ? `<li data-narrative-spine-current="${escape(entry.id)}"><a href="${escape(entry.route)}" aria-current="page">${escape(entry.publicName)}</a></li>`
      : `<li><a href="${escape(entry.route)}">${escape(entry.publicName)}</a></li>`).join('')}</ul>
  </nav>`;
}

function mountNarrativeSpines() {
  document.querySelectorAll('[data-narrative-spine-root]').forEach((root) => {
    root.innerHTML = renderNarrativeSpine(root.dataset.narrativeSpineId);
  });
}

if (typeof document !== 'undefined') mountNarrativeSpines();
