import { PROJECT_CATALOG } from './project-catalog.mjs';
import { projectReadiness } from './pool-page.mjs';

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

export function renderProjectContext(project) {
  if (!project?.projectPage) return '';
  const readiness = projectReadiness(project);
  const update = project.lastMeaningfullyUpdated || 'awaiting verified date';
  return `<section class="project-context" data-project-context data-project-id="${escape(project.id)}" aria-labelledby="project-context-title">
    <p class="project-context-kicker">From the SD Forest catalog</p>
    <h1 id="project-context-title">${escape(project.publicName)}</h1>
    <dl>
      <div><dt>What problem it addresses</dt><dd>${escape(project.projectPage.problem)}</dd></div>
      <div><dt>What state it is in</dt><dd>Status: ${escape(project.status || 'awaiting reconciliation')}; Readiness: ${escape(readiness.state)} — ${escape(readiness.reason)}; Last meaningful update: ${escape(update)}.</dd></div>
      <div><dt>What comes next</dt><dd>${escape(project.projectPage.nextOrStopped)}</dd></div>
    </dl>
  </section>`;
}

function mountProjectContexts() {
  document.querySelectorAll('[data-project-context-root]').forEach((root) => {
    const projectId = root.dataset.projectId;
    const project = PROJECT_CATALOG.find(({ id }) => id === projectId);
    if (project) root.innerHTML = renderProjectContext(project);
  });
}

if (typeof document !== 'undefined') mountProjectContexts();
