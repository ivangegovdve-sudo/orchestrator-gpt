import { POOL_CATALOG, getPoolProjects } from './project-catalog.mjs';

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

// The settled Live lifecycle permits a public handoff even while generic review
// metadata is pending. A link does not certify completion or verified evidence.
export function projectPresentation(project) {
  const restricted = project.visibility?.access === 'internal' || project.visibility?.access === 'private'
    || project.visibility?.navigation === 'unlisted';
  const comingSoon = project.status === 'In development';
  const enabled = !comingSoon && !restricted
    && (project.status === 'Live' || project.readiness?.entryEnabled === true);
  const reviewedDate = /^\d{4}-\d{2}-\d{2}$/.test(project.lastMeaningfullyUpdated ?? '')
    && Number.isFinite(Date.parse(project.lastMeaningfullyUpdated))
    && new Date(project.lastMeaningfullyUpdated).toISOString().slice(0, 10) === project.lastMeaningfullyUpdated
    && project.updateProvenance?.source && project.updateProvenance.semanticReviewRequired === false;
  return { restricted, comingSoon, enabled, update: reviewedDate
    ? project.lastMeaningfullyUpdated : 'awaiting verified date' };
}

export function renderProject(project, { heading = 'h3' } = {}) {
  const { restricted, comingSoon, enabled, update } = projectPresentation(project);
  const status = project.status || 'awaiting reconciliation';
  const attribution = typeof project.attribution === 'string' ? project.attribution
    : project.attribution?.type === 'fork'
      ? `Fork of work by ${project.attribution.names.join(', ')}. ${project.attribution.changeDescription}` : '';
  const bindings = restricted ? [] : (project.routeBindings || []).filter((binding) =>
    (binding.type === 'external' && /^https:\/\//.test(binding.url))
    || (binding.type === 'local' && /^\/(?!\/)/.test(binding.route)));
  // A shared-pool-tab binding identifies this row, never a standalone service.
  // Explicit companions can expose multiple handoffs within one project. Other
  // owned paths may be compatibility shims and stay out of public navigation.
  const companions = (project.relationships || []).filter((relationship) => relationship.type === 'companion');
  const destinations = bindings.filter((binding) => binding.type === 'external'
    || binding === bindings.find((entry) => entry.type === 'local')
    || companions.some((companion) => companion.route === binding.route));
  const routes = destinations.map((binding) => {
    const external = binding.type === 'external';
    const destination = external ? binding.url : binding.route;
    const companion = !external && companions.find((entry) => entry.route === destination);
    if (!enabled) return `<li>Existing ${external ? 'external implementation' : 'page'}: <span>${escape(destination)}</span> (entry unavailable pending review)</li>`;
    return `<li><a href="${escape(destination)}"${external ? ' target="_blank" rel="noopener"' : ''}>${escape(companion?.name || destination)}${external ? ' — External; opens in a new tab' : ' — Open existing page'}</a>${companion?.presentationNote ? ` <span>${escape(companion.presentationNote)}</span>` : ''}</li>`;
  }).join('');
  const metrics = (project.metrics || []).map(({ name, value, unit }) => `${name}: ${value}${unit ? ` ${unit}` : ''}`).join('; ');
  return `<article class="pool-project" data-project-id="${escape(project.id)}"${enabled ? '' : ' aria-disabled="true"'}>
    <${heading}>${escape(project.publicName)}</${heading}>
    <p class="pool-status">Status: ${escape(status)}${comingSoon ? ' — Coming Soon' : ''}</p>
    <p class="pool-metrics">Metrics: ${escape(metrics || 'none published')}</p>
    <p class="pool-update">Last meaningful update: ${escape(update)}</p>
    ${restricted ? project.visibility.access === 'internal'
      ? '<p>Internal project; documentation is unpublished. No public entry.</p>'
      : '<p>Unlisted or private project. No public entry.</p>' : ''}
    ${enabled && project.readiness?.review !== 'verified' ? '<p>Existing project entry; readiness review remains pending.</p>' : ''}
    ${!enabled && !comingSoon && !restricted ? '<p>Entry awaiting review. A lifecycle label does not certify readiness.</p>' : ''}
    ${comingSoon ? '<p>Coming Soon — this project is still in development; entry is unavailable.</p>' : ''}
    ${attribution ? `<p class="pool-attribution">${escape(attribution)}</p>` : ''}
    ${project.displayDiscrepancy ? `<p class="pool-title-discrepancy">Observed deployed title: ${escape(project.displayDiscrepancy.deployedName)}. Catalog/archive label: ${escape(project.displayDiscrepancy.canonicalName)}.</p>` : ''}
    ${project.pools?.length > 1 ? `<p class="pool-membership">Shared pool member: ${escape(project.pools.join(' · '))}.</p>` : ''}
    ${typeof project.evidenceLevel === 'object' && project.evidenceLevel?.review !== 'verified' ? '<p class="pool-evidence">Evidence review remains pending.</p>' : ''}
    ${project.evidenceLevel === 'rederivation-required' ? '<p class="pool-evidence">Archive interpretations require rederivation. Existing C2C outcome claims are not verified findings.</p>' : ''}
    ${project.relationship?.type === 'self-mirror-control' ? `<p>${escape(project.relationship.description)}</p>` : ''}
    ${routes ? `<ul class="pool-bindings">${routes}</ul>` : !restricted ? '<p>This pool listing is the catalog entry; no separate implementation is bound for public entry.</p>' : ''}
  </article>`;
}

export function renderPoolContext(pool) {
  if (pool.pageMode !== 'narrative-first') return '';
  return `<p>${escape(pool.narrative.intent)}</p><p>${escape(pool.narrative.availability)}</p>
    ${(pool.relatedLinks || []).map((link) => `<p><a href="${escape(link.route)}">${escape(link.publicName)}</a> — ${escape(link.attribution)}.</p>`).join('')}`;
}

export function renderPoolProjects(poolId) {
  const pool = POOL_CATALOG.find(({ id }) => id === poolId);
  if (!pool) return '';
  return getPoolProjects(pool.publicName).map((project) =>
    `<div id="${escape(project.id)}" data-pool-project="${escape(project.id)}">${renderProject(project)}</div>`).join('\n');
}

export function enhanceHealthTabs(root, location = globalThis.location) {
  const tablist = root.querySelector('[data-health-tabs]');
  if (!tablist) return;
  const tabs = [...tablist.querySelectorAll('button')];
  const panels = tabs.map((tab) => root.querySelector(`#${tab.getAttribute('aria-controls')}`));
  const select = (index, focus = false) => {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (focus) tabs[index].focus();
  };
  const fromHash = () => {
    const index = panels.findIndex((panel) => `#${panel.id}` === location?.hash);
    if (index !== -1) select(index);
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', (event) => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      select(next, true);
    });
  });
  panels.forEach((panel, index) => {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabs[index].id);
    panel.tabIndex = 0;
  });
  tablist.hidden = false;
  select(0);
  fromHash();
  globalThis.addEventListener?.('hashchange', fromHash);
}

export function mountPoolPage(root) {
  const pool = POOL_CATALOG.find(({ id }) => id === root.dataset.poolId);
  if (!pool) return;
  const context = root.querySelector('[data-pool-context]');
  if (context) context.innerHTML = renderPoolContext(pool);
  const listing = root.querySelector('[data-pool-projects]');
  const fragment = root.ownerDocument.createDocumentFragment();
  for (const project of getPoolProjects(pool.publicName)) {
    const tabPanel = root.querySelector(`[data-health-project="${project.id}"]`);
    if (tabPanel) {
      tabPanel.querySelector('[data-project-details]').innerHTML = renderProject(project);
    } else {
      const row = root.ownerDocument.createElement('div');
      row.id = project.id;
      row.dataset.poolProject = project.id;
      row.innerHTML = renderProject(project);
      fragment.appendChild(row);
    }
  }
  listing.replaceChildren(fragment);
  enhanceHealthTabs(root);
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('main[data-pool-id]');
  if (root) mountPoolPage(root);
}
