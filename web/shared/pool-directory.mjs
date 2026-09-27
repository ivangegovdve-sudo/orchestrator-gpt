import { getOrderedPools } from './project-catalog.mjs';

/**
 * Reorders existing pool links from the catalog rank. The HTML remains a
 * complete no-script fallback, but a rank change never requires editing its
 * DOM order when JavaScript is available.
 */
export function reorderPoolLinks(root = document) {
  const orderedPools = getOrderedPools();
  const containers = [...root.querySelectorAll('[data-pool-directory], [data-pool-navigation], nav[aria-label="All pools"]')];
  for (const container of containers) {
    const links = [...container.querySelectorAll('[data-pool-link], a[href^="/web/pools/"]')];
    const byId = new Map(links.map((link) => [link.dataset.poolLink || link.getAttribute('href')?.split('/')[3], link]));
    if (byId.size !== orderedPools.length || orderedPools.some(({ id }) => !byId.has(id))) {
      throw new Error('SD Forest pool directory contract: rendered links do not cover exactly the seven catalog pools');
    }
    for (const pool of orderedPools) container.append(byId.get(pool.id));
  }
  return orderedPools.map(({ id }) => id);
}

if (typeof document !== 'undefined') reorderPoolLinks();
