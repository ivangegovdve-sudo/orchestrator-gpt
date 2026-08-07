// The single ownership registry for deployable project directories.  Route
// presentations (Forest Trails, landing cards, and redirects) derive from it.
export const ROUTE_INVENTORY = Object.freeze([
  { id: 'avatar-playground', href: '/web/avatar-playground/', state: 'main-atlas', parent: 'ai-research', placement: 'Machine Grove', prefetch: true, prerender: false, label: 'Avatar Playground', trailId: 'machine', connectionIds: ['ai-research', 'vfx-portfolio', 'replicator-void'] },
  { id: 'c2c-dolphin', href: '/web/c2c-dolphin/', state: 'main-atlas', parent: 'ai-research', placement: 'Machine Grove', prefetch: true, prerender: false, label: 'AI Conversation', trailId: 'machine', connectionIds: ['ai-research', 'c2c-self', 'council'] },
  { id: 'c2c-self', href: '/web/c2c-self/', state: 'main-atlas', parent: 'ai-research', placement: 'Machine Grove', prefetch: true, prerender: false, label: 'Artificial Self', trailId: 'machine', connectionIds: ['ai-research', 'c2c-dolphin', 'm-popova'] },
  { id: 'council', href: '/web/council/', state: 'main-atlas', parent: 'forest-hub', placement: 'Signals & Systems', prefetch: true, prerender: false, label: 'Councils', trailId: 'signals', connectionIds: ['ai-research', 'library', 'open-overview'] },
  { id: 'hypertrophyos', href: '/web/hypertrophyos/', state: 'main-atlas', parent: 'forest-hub', placement: 'Living Systems', prefetch: true, prerender: false, label: 'Hyper Trophy OS', trailId: 'living', connectionIds: ['womens-health-os', 'life-in-time', 'power-law-odyssey'] },
  { id: 'kids', href: '/web/kids/', state: 'main-atlas', parent: 'forest-hub', placement: 'Wonder Path', prefetch: true, prerender: false, label: 'Kids Corner', trailId: 'wonder', connectionIds: ['math-mania', 'kids-movie-library', 'math-forest', 'forest-hub'] },
  { id: 'library', href: '/web/library/', state: 'main-atlas', parent: 'forest-hub', placement: 'Signals & Systems', prefetch: true, prerender: false, label: 'Library & Platforms', trailId: 'signals', aliasPaths: ['/web/library/glossary/', '/web/library/platform/', '/web/library/rag.html/', '/web/library/repos/', '/web/library/general/', '/web/library/chloe/', '/web/library/memory/'], connectionIds: ['forest-hub', 'morning-news', 'open-overview', 'council'] },
  { id: 'life-in-time', href: '/web/life-in-time/', state: 'main-atlas', parent: 'forest-hub', placement: 'Living Systems', prefetch: true, prerender: false, label: 'Life in Time', trailId: 'living', connectionIds: ['calendar', 'womens-health-os', 'power-law-odyssey'] },
  { id: 'manifesto-newborn', href: '/web/manifesto-newborn/', state: 'main-atlas', parent: 'forest-hub', placement: 'Story Path', prefetch: true, prerender: false, label: 'Manifesto for a Newborn', trailId: 'story', aliasPaths: ['/web/manifesto-newborn/bg/', '/web/manifesto-newborn/de/', '/web/manifesto-newborn/es/', '/web/manifesto-newborn/fr/', '/web/manifesto-newborn/it/', '/web/manifesto-newborn/mk/', '/web/manifesto-newborn/pt/', '/web/manifesto-newborn/ru/', '/web/manifesto-newborn/zh/'], connectionIds: ['m-popova', 'kids-movie-library', 'life-in-time'] },
  { id: 'mendeleev-bg', href: '/web/mendeleev-bg/', state: 'main-atlas', parent: 'forest-hub', placement: 'Wonder Path', prefetch: true, prerender: false, label: 'Mendeleev BG', trailId: 'wonder', connectionIds: ['math-forest', 'power-law-odyssey', 'library'] },
  { id: 'morning-news', href: '/web/morning-news/', state: 'main-atlas', parent: 'forest-hub', placement: 'Signals & Systems', prefetch: true, prerender: false, label: 'Morning News', trailId: 'signals', connectionIds: ['forest-hub', 'library', 'calendar'] },
  { id: 'm-popova', href: '/web/m-popova/', state: 'main-atlas', parent: 'forest-hub', placement: 'Story Path', prefetch: true, prerender: false, label: 'M.Popova Poetry', trailId: 'story', connectionIds: ['manifesto-newborn', 'c2c-self', 'vfx-portfolio'] },
  { id: 'open-overview', href: '/web/open-overview/', state: 'main-atlas', parent: 'forest-hub', placement: 'Signals & Systems', prefetch: true, prerender: false, label: 'Open Overview', trailId: 'signals', aliasPaths: ['/web/open-overview/github/', '/web/open-overview/openrouter/'], connectionIds: ['library', 'council', 'ai-research', 'power-law-odyssey'] },
  { id: 'power-law-odyssey', href: '/web/power-law-odyssey/', state: 'main-atlas', parent: 'forest-hub', placement: 'Wild Lab', prefetch: true, prerender: false, label: 'Power Law Odyssey', trailId: 'wild', connectionIds: ['life-in-time', 'mendeleev-bg', 'replicator-void', 'forest-hub'] },
  { id: 'replicator-void', href: '/web/replicator-void/', state: 'main-atlas', parent: 'forest-hub', placement: 'Wild Lab', prefetch: true, prerender: false, label: 'Replicator Void', trailId: 'wild', connectionIds: ['power-law-odyssey', 'avatar-playground', 'mendeleev-bg'] },
  { id: 'vfx-portfolio', href: '/web/vfx-portfolio/', state: 'main-atlas', parent: 'forest-hub', placement: 'Story Path', prefetch: true, prerender: false, label: 'VFX Portfolio', trailId: 'story', connectionIds: ['avatar-playground', 'm-popova', 'manifesto-newborn'] },
  { id: 'womens-health-os', href: '/web/womens-health-os/', state: 'main-atlas', parent: 'forest-hub', placement: 'Living Systems', prefetch: true, prerender: false, label: 'Women’s Health OS', trailId: 'living', connectionIds: ['life-in-time', 'hypertrophyos', 'library'] },
  { id: 'math-forest', href: '/web/math-forest/', state: 'greenhouse', parent: 'forest-hub', placement: 'Wonder Path', prefetch: false, prerender: false, label: 'Math Forest', trailId: 'wonder', connectionIds: ['kids', 'math-mania', 'mendeleev-bg'] },
  { id: 'ai-research', href: '/web/ai-research/', state: 'hub-trail', parent: 'forest-hub', placement: 'Machine Grove', prefetch: true, prerender: false, label: 'AI Research', trailId: 'machine', connectionIds: ['council', 'c2c-dolphin', 'c2c-self', 'avatar-playground'] },
  { id: 'calendar', href: '/web/calendar/', state: 'hub-trail', parent: 'forest-hub', placement: 'Living Systems', prefetch: true, prerender: false, label: 'Calendar Generator', trailId: 'living', connectionIds: ['life-in-time', 'morning-news', 'kids'] },
  { id: 'chloe-pwa', href: '/web/chloe-pwa/', state: 'hub-trail', parent: 'forest-hub', placement: 'Machine Grove', prefetch: false, prerender: false, label: 'Private client — token required', trailId: 'machine', connectionIds: ['ai-research', 'c2c-self', 'avatar-playground'] },
  { id: 'evolution', href: '/web/evolution/', state: 'hub-trail', parent: 'forest-hub', placement: 'Wild Lab', prefetch: false, prerender: false, label: 'Evolution', trailId: 'wild', connectionIds: ['replicator-void', 'power-law-odyssey', 'manifesto-newborn'] },
  // prerender stays false: the page is a thin shell that fetches a 225 KB
  // repos-data.json on load, so prerendering buys nothing and costs the payload.
  { id: 'explore', href: '/web/explore/', state: 'hub-trail', parent: 'forest-hub', placement: 'Signals & Systems', prefetch: true, prerender: false, label: 'Explore Repos', trailId: 'signals', connectionIds: ['library', 'open-overview', 'ai-research'] },
  { id: 'kids-movie-library', href: '/web/kids-movie-library/', state: 'hub-trail', parent: 'kids', placement: 'Wonder Path', prefetch: true, prerender: false, label: 'Kids Movie Library', trailId: 'wonder', connectionIds: ['kids', 'math-mania', 'manifesto-newborn'] },
  { id: 'math-mania', href: '/web/math-mania/', state: 'hub-trail', parent: 'kids', placement: 'Wonder Path', prefetch: true, prerender: false, label: 'Math Mania', trailId: 'wonder', connectionIds: ['kids', 'kids-movie-library', 'power-law-odyssey'] },
  { id: 'upload', href: '/web/upload/', state: 'hub-trail', parent: 'forest-hub', placement: 'Signals & Systems', prefetch: true, prerender: false, label: 'Knowledge Ingest', trailId: 'signals', connectionIds: ['library', 'ai-research', 'council'] },
  { id: 'ai-init', href: '/web/ai-init/', state: 'redirect', parent: 'library', placement: 'Library redirect', prefetch: false, prerender: false },
  { id: 'llm-db', href: '/web/llm-db/', state: 'redirect', parent: 'library', placement: 'Library redirect', prefetch: false, prerender: false },
  // No file backs this one any more — web/tinylm/index.html was a byte-identical
  // duplicate of web/council/tinylm/ and was removed; vercel.json now serves the
  // old bookmark as a permanent redirect into the council anchor.
  { id: 'tinylm', href: '/web/tinylm/', state: 'redirect', parent: 'council', placement: 'Council redirect', prefetch: false, prerender: false },
]);

export const FOREST_TRAIL_ROUTE_IDS = Object.freeze([
  'morning-news', 'upload', 'library', 'open-overview', 'explore', 'council', 'ai-research',
  'c2c-dolphin', 'c2c-self', 'avatar-playground', 'chloe-pwa', 'life-in-time',
  'womens-health-os', 'hypertrophyos', 'calendar', 'kids', 'math-mania',
  'kids-movie-library', 'math-forest', 'mendeleev-bg', 'vfx-portfolio',
  'manifesto-newborn', 'm-popova', 'power-law-odyssey', 'replicator-void', 'evolution',
]);
