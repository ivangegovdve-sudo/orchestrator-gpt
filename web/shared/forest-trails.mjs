import { FOREST_TRAIL_ROUTE_IDS, ROUTE_INVENTORY } from './route-inventory.mjs?v=20260729e';

export { ROUTE_INVENTORY } from './route-inventory.mjs?v=20260729e';

const inventoryById = new Map(ROUTE_INVENTORY.map((route) => [route.id, route]));
const routeFromInventory = (id) => {
  const route = inventoryById.get(id);
  return {
    ...route,
    path: route.href,
  };
};

export const FOREST_ROUTES = Object.freeze([
  {
    id: 'forest-hub',
    label: 'Forest HUB',
    path: '/',
    connectionIds: ['morning-news', 'kids', 'library', 'power-law-odyssey'],
  },
  ...FOREST_TRAIL_ROUTE_IDS.map(routeFromInventory),
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
  const lastSegment = normalized.split('/').pop() || '';
  const isFileRoute = /\.[a-z0-9]+$/i.test(lastSegment);
  if (normalized !== '/' && !normalized.endsWith('/') && !isFileRoute) normalized += '/';
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
  const isAtHub = context.current.id === 'forest-hub';
  navigation.dataset.atHub = String(isAtHub);
  let requestCollisionCheck = () => {};

  navigation.append(createTrailNetwork(targetDocument, context.next.length));

  if (!isAtHub) {
    const homeLink = targetDocument.createElement('a');
    homeLink.className = 'forest-trails__home-link';
    homeLink.href = '/';
    homeLink.setAttribute('aria-label', 'Back to Forest HUB');
    homeLink.textContent = '\u2190 HUB';
    navigation.append(homeLink);
  }

  const current = targetDocument.createElement('span');
  current.className = 'forest-trails__current';
  current.setAttribute('aria-current', 'page');
  current.textContent = context.current.label;
  navigation.append(current);

  const nextList = targetDocument.createElement('ul');
  nextList.id = 'forest-trails-next';
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

  const collapseButton = targetDocument.createElement('button');
  collapseButton.className = 'forest-trails__collapse';
  collapseButton.type = 'button';
  collapseButton.setAttribute('aria-controls', nextList.id);
  navigation.append(collapseButton);

  const clearance = targetDocument.createElement('div');
  clearance.className = 'forest-trails__clearance';
  clearance.setAttribute('aria-hidden', 'true');
  const preservesImmersiveScrollExtent = (
    context.current.id === 'power-law'
    || context.current.id === 'replicator-void'
  );
  clearance.hidden = preservesImmersiveScrollExtent;

  const fallbackBackdrop = targetDocument.createElement('div');
  fallbackBackdrop.className = 'forest-trails__fallback-backdrop';
  fallbackBackdrop.hidden = true;
  fallbackBackdrop.setAttribute('aria-hidden', 'true');

  const mapDialog = targetDocument.createElement('dialog');
  mapDialog.id = 'forest-trails-map';
  mapDialog.className = 'forest-trails__drawer';
  mapDialog.setAttribute('role', 'dialog');
  mapDialog.setAttribute('aria-modal', 'true');

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

  const compactQuery = targetDocument.defaultView?.matchMedia?.('(max-width: 680px)');
  let userSelectedCollapseState = false;
  let desiredCollapsedState = Boolean(
    compactQuery?.matches || preservesImmersiveScrollExtent,
  );
  const setCollapsed = (collapsed) => {
    navigation.dataset.collapsed = String(collapsed);
    clearance.dataset.collapsed = String(collapsed);
    nextList.hidden = collapsed;
    collapseButton.setAttribute('aria-expanded', String(!collapsed));
    collapseButton.setAttribute(
      'aria-label',
      collapsed ? 'Expand Forest Trails' : 'Minimize Forest Trails',
    );
    collapseButton.textContent = collapsed ? '+' : '−';
    requestCollisionCheck();
  };
  const applyDesiredCollapsedState = () => {
    const collisionLocked = (
      navigation.dataset.collisionLocked === 'true'
      || navigation.dataset.collisionConstrained === 'true'
    );
    setCollapsed(collisionLocked || desiredCollapsedState);
  };
  applyDesiredCollapsedState();

  collapseButton.addEventListener('click', () => {
    userSelectedCollapseState = true;
    desiredCollapsedState = !desiredCollapsedState;
    applyDesiredCollapsedState();
  });
  compactQuery?.addEventListener?.('change', (event) => {
    if (!userSelectedCollapseState) {
      desiredCollapsedState = event.matches || preservesImmersiveScrollExtent;
    }
    applyDesiredCollapsedState();
  });

  const canUseNativeDialog = (
    typeof mapDialog.showModal === 'function'
    && typeof mapDialog.close === 'function'
  );
  mapDialog.dataset.forestDialogMode = canUseNativeDialog ? 'native' : 'fallback';
  let inertRecords = [];
  let restoreFocusTo = mapButton;

  const focusableElements = () => [...mapDialog.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), '
      + 'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((element) => (
    !element.hidden
    && element.getAttribute('aria-hidden') !== 'true'
    && element.getClientRects().length > 0
  ));

  const setFallbackInert = (isInert) => {
    if (canUseNativeDialog) return;
    if (isInert) {
      inertRecords = [...targetDocument.body.children]
        .filter((element) => element !== mapDialog && element !== fallbackBackdrop)
        .map((element) => ({ element, inert: Boolean(element.inert) }));
      for (const record of inertRecords) record.element.inert = true;
      return;
    }
    for (const record of inertRecords) record.element.inert = record.inert;
    inertRecords = [];
  };

  const onFallbackKeydown = (event) => {
    if (!mapDialog.hasAttribute('open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMap();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = focusableElements();
    if (!focusable.length) {
      event.preventDefault();
      mapDialog.focus({ preventScroll: true });
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && targetDocument.activeElement === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && targetDocument.activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  };

  const onFallbackFocus = (event) => {
    if (
      mapDialog.hasAttribute('open')
      && !mapDialog.contains(event.target)
    ) {
      event.stopPropagation();
      (focusableElements()[0] || mapDialog).focus({ preventScroll: true });
    }
  };

  const setClosedState = () => {
    mapButton.setAttribute('aria-expanded', 'false');
    fallbackBackdrop.hidden = true;
    setFallbackInert(false);
    targetDocument.removeEventListener('keydown', onFallbackKeydown, true);
    targetDocument.removeEventListener('focusin', onFallbackFocus, true);
    if (restoreFocusTo?.isConnected) restoreFocusTo.focus({ preventScroll: true });
  };

  function closeMap() {
    if (!mapDialog.hasAttribute('open')) return;
    if (canUseNativeDialog) {
      mapDialog.close();
      setClosedState();
    } else {
      mapDialog.removeAttribute('open');
      setClosedState();
    }
  }

  mapButton.addEventListener('click', () => {
    restoreFocusTo = targetDocument.activeElement || mapButton;
    mapButton.setAttribute('aria-expanded', 'true');
    if (canUseNativeDialog) {
      mapDialog.showModal();
    } else {
      fallbackBackdrop.hidden = false;
      setFallbackInert(true);
      mapDialog.setAttribute('open', '');
      targetDocument.addEventListener('keydown', onFallbackKeydown, true);
      targetDocument.addEventListener('focusin', onFallbackFocus, true);
    }
    closeButton.focus({ preventScroll: true });
  });

  closeButton.addEventListener('click', closeMap);
  fallbackBackdrop.addEventListener('click', closeMap);
  mapDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeMap();
  });
  mapDialog.addEventListener('close', setClosedState);

  targetDocument.body.append(clearance, navigation, fallbackBackdrop, mapDialog);
  requestCollisionCheck = installCollisionAvoidance({
    targetDocument,
    navigation,
    excludedElements: [clearance, fallbackBackdrop, mapDialog],
    compactNavigation: () => setCollapsed(true),
    restoreNavigation: applyDesiredCollapsedState,
    getDesiredCollapsedState: () => desiredCollapsedState,
    collapseButton,
  });
  requestCollisionCheck();
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

function installCollisionAvoidance({
  targetDocument,
  navigation,
  excludedElements,
  compactNavigation,
  restoreNavigation,
  getDesiredCollapsedState,
  collapseButton,
}) {
  const targetWindow = targetDocument.defaultView;
  if (!targetWindow) return () => {};

  const collisionGap = 8;
  const constrainedGap = 5;
  const safeTopInset = 5;
  let queued = false;
  const excluded = new Set([navigation, ...excludedElements]);
  let collisionCandidates = [];
  let regularCompactHeight = null;

  const measure = () => {
    queued = false;
    if (!navigation.isConnected) return;

    const currentLift = Number.parseFloat(
      navigation.style.getPropertyValue('--forest-trails-lift'),
    ) || 0;
    const railRect = navigation.getBoundingClientRect();
    const baseRect = {
      top: railRect.top + currentLift,
      right: railRect.right,
      bottom: railRect.bottom + currentLift,
      left: railRect.left,
    };
    const viewportHeight = targetWindow.innerHeight;
    const calculateRequiredLift = (gap, testedRect = baseRect) => {
      let requiredLift = 0;
      for (const element of collisionCandidates) {
        if (!element.isConnected) continue;
        const rect = element.getBoundingClientRect();
        if (
          rect.width < 1
          || rect.height < 1
          || rect.bottom <= testedRect.top
          || rect.top >= viewportHeight
          || rect.right <= testedRect.left
          || rect.left >= testedRect.right
        ) continue;

        const coversViewport = (
          rect.top <= 0
          && rect.bottom >= viewportHeight
          && rect.left <= 0
          && rect.right >= targetWindow.innerWidth
        );
        if (coversViewport) continue;

        requiredLift = Math.max(
          requiredLift,
          testedRect.bottom - rect.top + gap,
        );
      }
      return Math.max(0, Math.ceil(requiredLift));
    };

    const normalRequiredLift = calculateRequiredLift(collisionGap);
    const isConstrained = navigation.dataset.collisionConstrained === 'true';
    const isLocked = navigation.dataset.collisionLocked === 'true';
    const maximumVisibleLift = Math.max(
      0,
      Math.floor(baseRect.top - safeTopInset),
    );

    if (isLocked && !isConstrained) {
      regularCompactHeight = railRect.height;
      navigation.dataset.collisionConstrained = 'true';
      navigation.style.setProperty(
        '--forest-trails-lift',
        `${Math.min(normalRequiredLift, maximumVisibleLift)}px`,
      );
      navigation.dataset.collisionCleared = String(maximumVisibleLift > 0);
      schedule();
      return;
    }

    if (!isLocked && !isConstrained && normalRequiredLift > maximumVisibleLift) {
      navigation.dataset.collisionLocked = 'true';
      collapseButton.disabled = true;
      collapseButton.setAttribute(
        'aria-label',
        'Forest Trails stays compact while page controls are open',
      );
      compactNavigation();
      navigation.style.setProperty(
        '--forest-trails-lift',
        `${maximumVisibleLift}px`,
      );
      navigation.dataset.collisionCleared = String(maximumVisibleLift > 0);
      schedule();
      return;
    }

    if (isConstrained && regularCompactHeight !== null) {
      const desiredCollapsed = getDesiredCollapsedState();
      const compactViewport = targetWindow.matchMedia('(max-width: 680px)').matches;
      const restoredWidth = desiredCollapsed
        ? Math.min(
          compactViewport ? 360 : 430,
          targetWindow.innerWidth - (compactViewport ? 16 : 24),
        )
        : (
          compactViewport
            ? targetWindow.innerWidth - 16
            : Math.min(920, targetWindow.innerWidth - 24)
        );
      const restoredHeight = (
        !desiredCollapsed && compactViewport
          ? (regularCompactHeight * 2) - 12
          : regularCompactHeight
      );
      const restoredRect = {
        top: baseRect.bottom - restoredHeight,
        right: (targetWindow.innerWidth + restoredWidth) / 2,
        bottom: baseRect.bottom,
        left: (targetWindow.innerWidth - restoredWidth) / 2,
      };
      const restoredRequiredLift = calculateRequiredLift(
        collisionGap,
        restoredRect,
      );
      const maximumNormalLift = Math.max(
        0,
        Math.floor(restoredRect.top - safeTopInset),
      );
      if (restoredRequiredLift <= maximumNormalLift) {
        navigation.style.setProperty(
          '--forest-trails-lift',
          `${restoredRequiredLift}px`,
        );
        delete navigation.dataset.collisionConstrained;
        delete navigation.dataset.collisionLocked;
        collapseButton.disabled = false;
        restoreNavigation();
        navigation.dataset.collisionCleared = String(restoredRequiredLift > 0);
        regularCompactHeight = null;
        schedule();
        return;
      }
    }

    const requiredLift = isConstrained
      ? calculateRequiredLift(constrainedGap)
      : normalRequiredLift;
    const lift = Math.min(requiredLift, maximumVisibleLift);
    const nextValue = `${lift}px`;
    if (navigation.style.getPropertyValue('--forest-trails-lift') !== nextValue) {
      navigation.style.setProperty('--forest-trails-lift', nextValue);
    }
    navigation.dataset.collisionCleared = String(lift > 0);
    navigation.dataset.collisionBlocked = String(requiredLift > maximumVisibleLift);
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    targetWindow.requestAnimationFrame(measure);
  };

  const refreshCandidates = () => {
    collisionCandidates = [...targetDocument.body.querySelectorAll('*')].filter((element) => {
      if (
        excluded.has(element)
        || element.closest('#forest-trails, #forest-trails-map')
        || element.closest('.forest-trails__fallback-backdrop')
      ) return false;

      const style = targetWindow.getComputedStyle(element);
      if (style.position !== 'fixed' && style.position !== 'sticky') return false;
      return (
        style.pointerEvents !== 'none'
        || element.matches('a, button, input, select, textarea, [tabindex]')
        || Boolean(element.querySelector('a, button, input, select, textarea, [tabindex]'))
      );
    });
    schedule();
  };

  let refreshQueued = false;
  const scheduleRefresh = () => {
    if (refreshQueued) return;
    refreshQueued = true;
    targetWindow.requestAnimationFrame(() => {
      refreshQueued = false;
      refreshCandidates();
    });
  };

  targetWindow.addEventListener('resize', scheduleRefresh, { passive: true });
  targetWindow.addEventListener('scroll', schedule, { passive: true });
  targetWindow.visualViewport?.addEventListener('resize', scheduleRefresh, { passive: true });

  if ('MutationObserver' in targetWindow) {
    const mutationObserver = new targetWindow.MutationObserver(scheduleRefresh);
    mutationObserver.observe(targetDocument.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'hidden', 'open', 'style'],
    });
  }

  if ('ResizeObserver' in targetWindow) {
    const resizeObserver = new targetWindow.ResizeObserver(schedule);
    resizeObserver.observe(targetDocument.body);
    resizeObserver.observe(navigation);
  }

  refreshCandidates();
  targetWindow.addEventListener('load', scheduleRefresh, { once: true });
  targetWindow.setTimeout(scheduleRefresh, 250);
  return schedule;
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
