export const FOREST_ROUTES = Object.freeze([
  {
    id: 'forest-hub',
    label: 'Forest HUB',
    path: '/',
    connectionIds: ['morning-news', 'kids-corner', 'library', 'power-law'],
  },
  {
    id: 'morning-news',
    label: 'Morning News',
    path: '/web/morning-news/',
    trailId: 'signals',
    connectionIds: ['forest-hub', 'library', 'calendar'],
  },
  {
    id: 'library',
    label: 'Library & Platforms',
    path: '/web/library/',
    aliasPaths: ['/web/library/glossary/', '/web/library/platform/'],
    trailId: 'signals',
    connectionIds: ['forest-hub', 'morning-news', 'open-overview', 'council'],
  },
  {
    id: 'open-overview',
    label: 'Open Overview',
    path: '/web/open-overview/',
    aliasPaths: ['/web/open-overview/github/', '/web/open-overview/openrouter/'],
    trailId: 'signals',
    connectionIds: ['library', 'council', 'ai-research', 'power-law'],
  },
  {
    id: 'council',
    label: 'Councils',
    path: '/web/council/',
    trailId: 'signals',
    connectionIds: ['ai-research', 'library', 'open-overview'],
  },
  {
    id: 'ai-research',
    label: 'AI Research',
    path: '/web/ai-research/',
    trailId: 'machine',
    connectionIds: ['council', 'ai-conversation', 'artificial-self', 'avatar-playground'],
  },
  {
    id: 'ai-conversation',
    label: 'AI Conversation',
    path: '/web/c2c-dolphin/',
    trailId: 'machine',
    connectionIds: ['ai-research', 'artificial-self', 'council'],
  },
  {
    id: 'artificial-self',
    label: 'Artificial Self',
    path: '/web/c2c-self/',
    trailId: 'machine',
    connectionIds: ['ai-research', 'ai-conversation', 'poetry'],
  },
  {
    id: 'avatar-playground',
    label: 'Avatar Playground',
    path: '/web/avatar-playground/',
    trailId: 'machine',
    connectionIds: ['ai-research', 'vfx-portfolio', 'replicator-void'],
  },
  {
    id: 'life-in-time',
    label: 'Life in Time',
    path: '/web/life-in-time/',
    trailId: 'living',
    connectionIds: ['calendar', 'womens-health', 'power-law'],
  },
  {
    id: 'womens-health',
    label: 'Women’s Health OS',
    path: '/web/womens-health-os/',
    trailId: 'living',
    connectionIds: ['life-in-time', 'hyper-trophy', 'library'],
  },
  {
    id: 'hyper-trophy',
    label: 'Hyper Trophy OS',
    path: '/web/hypertrophyos/',
    trailId: 'living',
    connectionIds: ['womens-health', 'life-in-time', 'power-law'],
  },
  {
    id: 'calendar',
    label: 'Calendar Generator',
    path: '/web/calendar/',
    trailId: 'living',
    connectionIds: ['life-in-time', 'morning-news', 'kids-corner'],
  },
  {
    id: 'kids-corner',
    label: 'Kids Corner',
    path: '/web/kids/',
    trailId: 'wonder',
    connectionIds: ['math-mania', 'kids-movies', 'math-forest', 'forest-hub'],
  },
  {
    id: 'math-mania',
    label: 'Math Mania',
    path: '/web/math-mania/',
    trailId: 'wonder',
    connectionIds: ['kids-corner', 'kids-movies', 'power-law'],
  },
  {
    id: 'kids-movies',
    label: 'Kids Movie Library',
    path: '/web/kids-movie-library/',
    trailId: 'wonder',
    connectionIds: ['kids-corner', 'math-mania', 'manifesto'],
  },
  {
    id: 'math-forest',
    label: 'Math Forest',
    path: '/web/math-forest/',
    trailId: 'wonder',
    connectionIds: ['kids-corner', 'math-mania', 'mendeleev'],
  },
  {
    id: 'mendeleev',
    label: 'Mendeleev BG',
    path: '/web/mendeleev-bg/',
    trailId: 'wonder',
    connectionIds: ['math-forest', 'power-law', 'library'],
  },
  {
    id: 'vfx-portfolio',
    label: 'VFX Portfolio',
    path: '/web/vfx-portfolio/',
    trailId: 'story',
    connectionIds: ['avatar-playground', 'poetry', 'manifesto'],
  },
  {
    id: 'manifesto',
    label: 'Manifesto for a Newborn',
    path: '/web/manifesto-newborn/',
    aliasPaths: [
      '/web/manifesto-newborn/bg/',
      '/web/manifesto-newborn/de/',
      '/web/manifesto-newborn/es/',
      '/web/manifesto-newborn/fr/',
      '/web/manifesto-newborn/it/',
      '/web/manifesto-newborn/mk/',
      '/web/manifesto-newborn/pt/',
      '/web/manifesto-newborn/ru/',
      '/web/manifesto-newborn/zh/',
    ],
    trailId: 'story',
    connectionIds: ['poetry', 'kids-movies', 'life-in-time'],
  },
  {
    id: 'poetry',
    label: 'M.Popova Poetry',
    path: '/web/m-popova/',
    trailId: 'story',
    connectionIds: ['manifesto', 'artificial-self', 'vfx-portfolio'],
  },
  {
    id: 'power-law',
    label: 'Power Law Odyssey',
    path: '/web/power-law-odyssey/',
    trailId: 'wild',
    connectionIds: ['life-in-time', 'mendeleev', 'replicator-void', 'forest-hub'],
  },
  {
    id: 'replicator-void',
    label: 'Replicator Void',
    path: '/web/replicator-void/',
    trailId: 'wild',
    connectionIds: ['power-law', 'avatar-playground', 'mendeleev'],
  },
]);

export const FOREST_TRAILS = Object.freeze([
  {
    id: 'signals',
    label: 'Signals & Systems',
    description: 'Briefings, references, ecosystem evidence, and public deliberation.',
    accent: '#60ecc1',
  },
  {
    id: 'machine',
    label: 'Machine Grove',
    description: 'Conversations, artificial selves, and expressive interfaces.',
    accent: '#a282ff',
  },
  {
    id: 'living',
    label: 'Living Systems',
    description: 'Time, health, training, and the rhythms that organize a life.',
    accent: '#ff7fb0',
  },
  {
    id: 'wonder',
    label: 'Wonder Path',
    description: 'Playful mathematics, films, and the structure of matter.',
    accent: '#ffd15a',
  },
  {
    id: 'story',
    label: 'Story Path',
    description: 'Animation, poetry, and words written toward the future.',
    accent: '#eedcb8',
  },
  {
    id: 'wild',
    label: 'Wild Lab',
    description: 'Heavy tails, artificial life, and experiments at the edge.',
    accent: '#51ebff',
  },
]);

export function normalizeForestPath(pathname) {
  const parsed = new URL(pathname || '/', 'https://forest.invalid');
  let normalized = parsed.pathname.replace(/\/index\.html$/i, '/');
  normalized = normalized.replace(/\/{2,}/g, '/');
  if (normalized !== '/' && !normalized.endsWith('/')) normalized += '/';
  return normalized;
}

export function getForestTrailContext(pathname) {
  const normalizedPath = normalizeForestPath(pathname);
  const current = FOREST_ROUTES.find((route) => (
    route.path === normalizedPath || route.aliasPaths?.includes(normalizedPath)
  ));
  if (!current) return null;

  const trail = FOREST_TRAILS.find(({ id }) => id === current.trailId);
  const next = (current.connectionIds || [])
    .map((connectionId) => FOREST_ROUTES.find(({ id }) => id === connectionId))
    .filter(Boolean);

  return { current, trail, next };
}

export function mountForestTrails({
  document: targetDocument = globalThis.document,
  pathname = globalThis.location?.pathname,
} = {}) {
  if (!targetDocument?.body) return null;

  ensureForestTrailsStyles(targetDocument);

  const existingNavigation = targetDocument.getElementById('forest-trails');
  if (existingNavigation) return existingNavigation;

  const context = getForestTrailContext(pathname);
  if (!context) return null;

  const navigation = targetDocument.createElement('nav');
  navigation.id = 'forest-trails';
  navigation.className = 'forest-trails';
  navigation.setAttribute('aria-label', 'Forest Trails');

  navigation.append(createTrailNetwork(targetDocument, context.next.length));

  const current = targetDocument.createElement('span');
  current.className = 'forest-trails__current';
  current.setAttribute('aria-current', 'page');
  current.textContent = context.current.label;
  navigation.append(current);

  const nextList = targetDocument.createElement('ul');
  nextList.className = 'forest-trails__next';
  nextList.dataset.forestTrailsNext = '';
  for (const nextRoute of context.next) {
    const item = targetDocument.createElement('li');
    const link = targetDocument.createElement('a');
    link.href = nextRoute.path;
    link.textContent = nextRoute.label;
    item.append(link);
    nextList.append(item);
  }
  navigation.append(nextList);

  const mapButton = targetDocument.createElement('button');
  mapButton.className = 'forest-trails__map-button';
  mapButton.type = 'button';
  mapButton.setAttribute('aria-controls', 'forest-trails-map');
  mapButton.setAttribute('aria-expanded', 'false');
  mapButton.setAttribute('aria-haspopup', 'dialog');
  mapButton.setAttribute('aria-label', 'Open full route map');
  mapButton.textContent = 'Route map';
  navigation.append(mapButton);

  const mapDialog = targetDocument.createElement('dialog');
  mapDialog.id = 'forest-trails-map';
  mapDialog.className = 'forest-trails__drawer';

  const mapHeader = targetDocument.createElement('header');
  mapHeader.className = 'forest-trails__drawer-header';
  const mapHeading = targetDocument.createElement('h2');
  mapHeading.id = 'forest-trails-map-title';
  mapHeading.textContent = 'Forest Trails';
  const mapIntroduction = targetDocument.createElement('p');
  mapIntroduction.textContent =
    'Follow a nearby route or open the whole forest. Every trail crosses another.';
  const closeButton = targetDocument.createElement('button');
  closeButton.className = 'forest-trails__close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close route map');
  closeButton.textContent = 'Close';
  mapHeader.append(mapHeading, mapIntroduction, closeButton);
  mapDialog.setAttribute('aria-labelledby', mapHeading.id);
  mapDialog.append(mapHeader);

  const mapBody = targetDocument.createElement('div');
  mapBody.className = 'forest-trails__map';

  const homeRoute = FOREST_ROUTES.find(({ id }) => id === 'forest-hub');
  const homeElement = createRouteElement(targetDocument, homeRoute, context.current);
  homeElement.classList.add('forest-trails__home');
  mapBody.append(homeElement);

  for (const forestTrail of FOREST_TRAILS) {
    const section = targetDocument.createElement('section');
    section.className = 'forest-trails__trail';
    section.style.setProperty('--forest-trail-accent', forestTrail.accent);

    const heading = targetDocument.createElement('h3');
    heading.textContent = forestTrail.label;
    const description = targetDocument.createElement('p');
    description.className = 'forest-trails__trail-description';
    description.textContent = forestTrail.description;
    const routeList = targetDocument.createElement('ul');
    routeList.className = 'forest-trails__route-list';

    for (const route of FOREST_ROUTES.filter(({ trailId }) => trailId === forestTrail.id)) {
      const item = targetDocument.createElement('li');
      item.append(createRouteElement(targetDocument, route, context.current));
      routeList.append(item);
    }

    section.append(heading, description, routeList);
    mapBody.append(section);
  }

  mapDialog.append(mapBody);
  navigation.append(mapDialog);

  const setClosedState = () => {
    mapButton.setAttribute('aria-expanded', 'false');
    mapButton.focus({ preventScroll: true });
  };

  mapButton.addEventListener('click', () => {
    mapButton.setAttribute('aria-expanded', 'true');
    if (typeof mapDialog.showModal === 'function') {
      mapDialog.showModal();
    } else {
      mapDialog.setAttribute('open', '');
    }
    closeButton.focus({ preventScroll: true });
  });

  closeButton.addEventListener('click', () => {
    if (typeof mapDialog.close === 'function') {
      mapDialog.close();
    } else {
      mapDialog.removeAttribute('open');
      setClosedState();
    }
  });
  mapDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    mapDialog.close();
    setClosedState();
  });
  mapDialog.addEventListener('close', setClosedState);

  targetDocument.body.append(navigation);
  return navigation;
}

function ensureForestTrailsStyles(targetDocument) {
  if (targetDocument.querySelector('link[data-forest-trails-styles]')) return;
  const stylesheet = targetDocument.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./forest-trails.css', import.meta.url).href;
  stylesheet.dataset.forestTrailsStyles = '';
  targetDocument.head.append(stylesheet);
}

function createTrailNetwork(targetDocument, destinationCount) {
  const namespace = 'http://www.w3.org/2000/svg';
  const network = targetDocument.createElementNS(namespace, 'svg');
  network.classList.add('forest-trails__network');
  network.setAttribute('viewBox', '0 0 180 28');
  network.setAttribute('preserveAspectRatio', 'none');
  network.setAttribute('aria-hidden', 'true');
  network.setAttribute('focusable', 'false');

  const origin = targetDocument.createElementNS(namespace, 'circle');
  origin.classList.add('forest-trails__node', 'forest-trails__node--current');
  origin.setAttribute('cx', '9');
  origin.setAttribute('cy', '14');
  origin.setAttribute('r', '3');
  network.append(origin);

  for (let index = 0; index < destinationCount; index += 1) {
    const targetY = destinationCount === 1
      ? 14
      : 5 + (index * 18) / (destinationCount - 1);
    const edge = targetDocument.createElementNS(namespace, 'path');
    edge.classList.add('forest-trails__edge');
    edge.style.setProperty('--forest-edge-index', index);
    edge.setAttribute('d', `M 9 14 C 58 14, 112 ${targetY}, 171 ${targetY}`);

    const node = targetDocument.createElementNS(namespace, 'circle');
    node.classList.add('forest-trails__node');
    node.style.setProperty('--forest-node-index', index);
    node.setAttribute('cx', '171');
    node.setAttribute('cy', String(targetY));
    node.setAttribute('r', '2.2');
    network.append(edge, node);
  }

  return network;
}

function createRouteElement(targetDocument, route, currentRoute) {
  const isCurrent = route.id === currentRoute.id;
  const element = targetDocument.createElement(isCurrent ? 'span' : 'a');
  element.className = 'forest-trails__route';
  element.dataset.forestRoute = route.path;
  element.textContent = route.label;
  if (isCurrent) {
    element.setAttribute('aria-current', 'page');
  } else {
    element.href = route.path;
  }
  return element;
}

function autoMountForestTrails() {
  mountForestTrails();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMountForestTrails, { once: true });
  } else {
    queueMicrotask(autoMountForestTrails);
  }
}
