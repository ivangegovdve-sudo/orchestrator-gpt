import {
  POOL_CATALOG,
  getPoolProjects,
  getProjectRank,
  getProjectTier,
} from './project-catalog.mjs';
import { reorderPoolLinks } from './pool-directory.mjs';

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

/**
 * Readiness is a presentation projection, not a second lifecycle vocabulary.
 * Only explicit implementation/evidence work can say In progress; all other
 * unverified records fail closed to UNKNOWN rather than looking finished.
 */
export function projectReadiness(project) {
  const readiness = project?.readiness || {};
  const evidenceLevel = project?.evidenceLevel;
  const evidenceReview = evidenceLevel && typeof evidenceLevel === 'object'
    ? evidenceLevel.review : project?.evidence?.review;
  const restricted = project?.visibility?.access === 'internal' || project?.visibility?.access === 'private'
    || project?.visibility?.navigation === 'unlisted';
  const explicitProgress = project?.status === 'In development'
    || ['coming-soon', 'repair-needed'].includes(readiness.presentation)
    || evidenceLevel === 'rederivation-required' || evidenceReview === 'rederivation-required';
  if (explicitProgress) {
    return {
      state: 'In progress',
      reason: evidenceLevel === 'rederivation-required' || evidenceReview === 'rederivation-required'
        ? 'Research rederivation remains required.'
        : readiness.reason || 'Implementation work remains.',
    };
  }
  if (readiness.entryEnabled === true && readiness.review === 'verified'
    && evidenceReview === 'verified' && !restricted) {
    return { state: 'Shipped', reason: 'Entry, readiness and evidence reviews are verified.' };
  }
  return { state: 'UNKNOWN', reason: 'Completion evidence is not verified.' };
}

export function renderProject(project, { heading = 'h3', designed = false } = {}) {
  if (project.visibility?.publicSurface === 'excluded') return '';
  const poolName = project.poolContext || project.pools?.[0] || project.pool;
  const poolRank = Number.isInteger(project.poolRank) ? project.poolRank : getProjectRank(project, poolName);
  const poolTier = project.poolTier || getProjectTier(project, poolName);
  const { restricted, comingSoon, enabled, update } = projectPresentation(project);
  const readiness = projectReadiness(project);
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
    if (!enabled && designed) return `<li>Not open yet</li>`;
    if (!enabled) return `<li>Existing ${external ? 'external implementation' : 'page'}: <span>${escape(destination)}</span> (entry unavailable pending review)</li>`;
    // Designed pools name the destination for a reader; the raw route stays in the href.
    if (designed) {
      const label = companion?.name || (external ? `Visit ${new URL(destination).host}` : 'Open page');
      const named = companion ? '' : `<span class="pool-sr">: ${escape(project.publicName)}</span>`;
      return `<li><a href="${escape(destination)}"${external ? ' rel="noopener"' : ''}>${escape(label)}${external ? '' : named}${external ? '<span class="pool-sr"> (external site)</span>' : ''}</a>${companion?.presentationNote ? ` <span>${escape(companion.presentationNote)}</span>` : ''}</li>`;
    }
    return `<li><a href="${escape(destination)}"${external ? ' target="_blank" rel="noopener"' : ''}>${escape(companion?.name || destination)}${external ? ' — External; opens in a new tab' : ' — Open existing page'}</a>${companion?.presentationNote ? ` <span>${escape(companion.presentationNote)}</span>` : ''}</li>`;
  }).join('');
  const metrics = (project.metrics || []).map(({ name, value, unit }) => `${name}: ${value}${unit ? ` ${unit}` : ''}`).join('; ');
  return `<article class="pool-project pool-project--${escape(poolTier)}" data-project-id="${escape(project.id)}" data-pool-tier="${escape(poolTier)}" data-pool-rank="${poolRank ?? 'unranked'}"${enabled ? '' : ' aria-disabled="true"'}>
    <${heading}>${escape(project.publicName)}</${heading}>
    <p class="pool-status">Status: ${escape(status)}${comingSoon && !designed ? ' — Coming Soon' : ''}</p>
    ${routes ? `<ul class="pool-bindings">${routes}</ul>` : ''}
    ${designed ? '<details class="pool-record"><summary>Catalog record</summary>' : ''}<div class="pool-fieldnotes">
    <p class="pool-tier">Tier: ${escape(poolTier === 'featured' ? `Featured · rank ${poolRank}` : poolTier === 'ranked' ? `Ranked · rank ${poolRank}` : 'Unranked')}</p>
    <p class="pool-readiness" data-readiness-state="${escape(readiness.state)}">Readiness: ${escape(readiness.state)} — ${escape(readiness.reason)}</p>
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
    ${!routes && !restricted ? '<p>This pool listing is the catalog entry; no separate implementation is bound for public entry.</p>' : ''}
    </div>${designed ? '</details>' : ''}
  </article>`;
}

export function renderPoolContext(pool) {
  if (pool.pageMode !== 'narrative-first') return '';
  return `<p>${escape(pool.narrative.intent)}</p><p>${escape(pool.narrative.availability)}</p>
    ${(pool.relatedLinks || []).map((link) => `<p><a href="${escape(link.route)}">${escape(link.publicName)}</a> — ${escape(link.attribution)}.</p>`).join('')}`;
}

/**
 * Render the pool's first screen from the shared catalog: what the pool is and
 * where to walk in. Static shells keep only a generic no-script fallback; this
 * is the runtime source of truth for the pool name, lifecycle state and summary.
 * The catalog accounting lives in renderPoolLedger, beside the project listing
 * it describes, so the threshold introduces a place rather than a report.
 */
export function renderPoolOverview(poolId) {
  const pool = POOL_CATALOG.find(({ id }) => id === poolId);
  if (!pool) return '';
  const projects = getPoolProjects(pool.publicName);
  const guide = pool.visitorGuide;
  return `<p class="pool-state" data-pool-state="${escape(pool.state)}">${escape(pool.state)} pool</p>
    <p class="pool-name">Catalog: <span>${escape(pool.publicName)}</span></p>
    <p class="pool-summary">${escape(pool.summary)}</p>
    <section class="pool-guide" data-pool-guide data-pool-purpose="${escape(guide.purpose)}">
      <div class="pool-guide-block pool-guide-block--purpose"><h3 class="pool-guide-label">What this pool is for</h3><p>${escape(guide.purpose)}</p></div>
      <div class="pool-guide-block pool-guide-block--why"><h3 class="pool-guide-label">Why it exists</h3><p>${escape(guide.why)}</p></div>
      <div class="pool-guide-block pool-guide-block--start"><h3>Start here</h3>
      <ol class="pool-start-here">${[...guide.startHere].sort((left, right) => {
        const leftProject = projects.find(({ id }) => id === left.projectId);
        const rightProject = projects.find(({ id }) => id === right.projectId);
        const leftRank = leftProject?.poolRank ?? -1;
        const rightRank = rightProject?.poolRank ?? -1;
        return rightRank - leftRank;
      }).map(({ projectId, reason }) => {
        const project = projects.find(({ id }) => id === projectId);
        return `<li class="pool-door"><a href="#${escape(projectId)}">${escape(project?.publicName || projectId)}</a><span class="pool-door-sep"> — </span><span class="pool-door-reason">${escape(reason)}</span></li>`;
      }).join('')}</ol></div>
    </section>`;
}

/**
 * The catalog's own accounting for a pool: the lifecycle split and readiness
 * counts. It heads the project listing it summarises.
 */
export function renderPoolLedger(poolId) {
  const pool = POOL_CATALOG.find(({ id }) => id === poolId);
  if (!pool) return '';
  const projects = getPoolProjects(pool.publicName);
  const readinessCounts = projects.reduce((counts, project) => {
    counts[projectReadiness(project).state] += 1;
    return counts;
  }, { Shipped: 0, 'In progress': 0, UNKNOWN: 0 });
  const currentProjects = projects.filter((project) =>
    ['Live', 'Research', 'Experimental'].includes(project.status)
    && project.visibility?.publicSurface !== 'excluded'
    && project.visibility?.access !== 'internal'
    && project.visibility?.navigation !== 'unlisted');
  const formingProjects = projects.filter((project) => !currentProjects.includes(project));
  const renderReality = (label, realityProjects) => `<section class="pool-reality" data-pool-reality="${label === 'What is real here' ? 'current' : 'forming'}">
      <h4>${label}</h4>
      <ul>${realityProjects.map((project) => `<li data-pool-reality-project="${escape(project.id)}"><strong>${escape(project.publicName)}</strong> — ${escape(project.status || 'status unresolved')}${project.visibility?.access === 'internal' ? '; internal' : ''}${project.visibility?.navigation === 'unlisted' ? '; unlisted' : ''}</li>`).join('') || '<li>None cataloged yet.</li>'}</ul>
    </section>`;
  return `<section class="pool-ledger" data-pool-ledger aria-label="Catalog reality for ${escape(pool.publicName)}">
      <p class="pool-reality-note">Catalog reality is shown below. Live is a lifecycle label, not a completion claim.</p>
      <div class="pool-reality-grid">
        ${renderReality('What is real here', currentProjects)}
        ${renderReality('Still forming', formingProjects)}
      </div>
      <p class="pool-catalog-count">Catalog: ${projects.length} project${projects.length === 1 ? '' : 's'} assigned to this pool.</p>
      <p class="pool-readiness-summary" data-readiness-summary="Shipped:${readinessCounts.Shipped};In progress:${readinessCounts['In progress']};UNKNOWN:${readinessCounts.UNKNOWN}">Readiness: Shipped: ${readinessCounts.Shipped} · In progress: ${readinessCounts['In progress']} · UNKNOWN: ${readinessCounts.UNKNOWN}</p>
    </section>`;
}

export function renderPoolProjects(poolId) {
  const pool = POOL_CATALOG.find(({ id }) => id === poolId);
  if (!pool) return '';
  return renderProjectGroups(getPoolProjects(pool.publicName));
}

const TIER_GROUPS = [
  ['featured', 'Featured entries'],
  ['ranked', 'Ranked entries'],
  ['unranked', 'Unranked entries'],
];

/**
 * Designed pools list every catalog project once, in rank order, as a compact
 * index beneath the authored showcase. Tier and readiness stay in each
 * project's "Catalog record" disclosure rather than on the card face.
 */
export function renderProjectIndex(projects) {
  return `<div class="pool-index">${projects
    .filter((project) => project.visibility?.publicSurface !== 'excluded')
    .map((project) => `<div id="${escape(project.id)}" data-pool-project="${escape(project.id)}" data-pool-tier="${escape(project.poolTier)}" data-pool-rank="${project.poolRank ?? 'unranked'}">${renderProject(project, { designed: true })}</div>`).join('\n')}</div>`;
}

export function renderProjectGroups(projects) {
  return TIER_GROUPS.map(([tier, label]) => {
    const entries = projects.filter((project) => project.poolTier === tier);
    if (entries.length === 0) return '';
    return `<section class="pool-project-group pool-project-group--${tier}" data-pool-tier-group="${tier}">
      <h3>${label}</h3>
      <div class="pool-project-list pool-project-list--${tier}">
        ${entries.map((project) => `<div id="${escape(project.id)}" data-pool-project="${escape(project.id)}" data-pool-tier="${tier}" data-pool-rank="${project.poolRank ?? 'unranked'}">${renderProject(project)}</div>`).join('\n')}
      </div>
    </section>`;
  }).join('\n');
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
  reorderPoolLinks(root.ownerDocument);
  // A designed pool authors its own threshold; the catalog fills only the index.
  const designed = root.dataset.poolLayout === 'designed';
  const overview = root.querySelector('[data-pool-overview-content]');
  if (overview && !designed) overview.innerHTML = renderPoolOverview(pool.id);
  const context = root.querySelector('[data-pool-context]');
  if (context) context.innerHTML = renderPoolContext(pool);
  const listing = root.querySelector('[data-pool-projects]');
  const projects = getPoolProjects(pool.publicName);
  const listingProjects = [];
  for (const project of projects) {
    const tabPanel = root.querySelector(`[data-health-project="${project.id}"]`);
    if (tabPanel) {
      tabPanel.querySelector('[data-project-details]').innerHTML = renderProject(project);
    } else {
      listingProjects.push(project);
    }
  }
  listing.innerHTML = designed
    ? renderProjectIndex(listingProjects)
      + `<details class="pool-ledger-disclosure"><summary>How this listing is kept</summary>${renderPoolLedger(pool.id)}</details>`
    : renderPoolLedger(pool.id) + renderProjectGroups(listingProjects);
  enhanceHealthTabs(root);
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('main[data-pool-id]');
  if (root) mountPoolPage(root);
}

