import { researchCatalog } from './researchCatalog.js';
import { catalogVerification } from './researchVerification.js';

export const RESEARCH_URL = null;
export const themes = ['All Themes', 'Friendship', 'Courage', 'Kindness', 'Family', 'Growing Up', 'Nature', 'Imagination', 'Difference', 'Community'];
export const ages = ['All', '3–5', '6–8', '9–12'];
export const countries = [['us', 'United States'], ['gb', 'United Kingdom'], ['ca', 'Canada'], ['au', 'Australia'], ['nz', 'New Zealand'], ['bg', 'Bulgaria'], ['fr', 'France'], ['de', 'Germany'], ['es', 'Spain'], ['it', 'Italy'], ['nl', 'Netherlands'], ['se', 'Sweden'], ['jp', 'Japan'], ['kr', 'South Korea'], ['in', 'India'], ['br', 'Brazil'], ['mx', 'Mexico'], ['za', 'South Africa']];
export const assetUrl = filename => `/web/kids-library-preview/assets/${filename}`;

const imdbUrls = {
  'pinocchio': 'https://www.imdb.com/title/tt0032910/',
  'lilo-and-stitch': 'https://www.imdb.com/title/tt0275847/',
  'inside-out': 'https://www.imdb.com/title/tt2096673/',
  'the-nightmare-before-christmas': 'https://www.imdb.com/title/tt0107688/',
  'spider-man-into-the-spider-verse': 'https://www.imdb.com/title/tt4633694/',
  'spider-man-across-the-spider-verse': 'https://www.imdb.com/title/tt9362722/',
  'wildwood': 'https://www.imdb.com/title/tt2056785/',
};

const ageFromAudience = audience => {
  if (!audience) return 'All';
  const match = audience.match(/(?:All Ages|Ages)\s*\/?\s*(\d+)\+|Ages\s*(\d+)\+/i);
  const minimum = Number(match?.[1] || match?.[2]);
  if (!minimum || minimum <= 5) return '3–5';
  if (minimum <= 8) return '6–8';
  return '9–12';
};

const themeRules = [
  ['Friendship', /\b(friend|friendship|companion|befriend|bond|together|alliance)\b/i],
  ['Courage', /\b(courage|brave|danger|defeat|escape|rescue|surviv|war|threat|journey|confront|curse|adventure)\b/i],
  ['Kindness', /\b(kind|empathy|love|care|healing|humanity|compassion|mutual|generosity)\b/i],
  ['Family', /\b(family|sister|brother|mother|father|parent|daughter|son|orphan|siblings|home)\b/i],
  ['Growing Up', /\b(child|girl|boy|teen|young|elderly|aging|adult|growing|maturity)\b/i],
  ['Nature', /\b(forest|ocean|sea|river|island|animal|earth|environment|biome|wild|water|mountain|valley|farm|bird|cat|bear|mouse|wolf)\b/i],
  ['Imagination', /\b(magic|magical|fantasy|spirit|myth|dream|underworld|enchanted|surreal|folklore|wizard|witch|goblin)\b/i],
  ['Difference', /\b(different|outcast|prejudice|outsider|alien|misunderstood|acceptance|identity|unusual|social|authoritarian|status)\b/i],
  ['Community', /\b(community|society|town|village|city|group|people|collective|neighborhood)\b/i],
];

const deriveThemes = record => {
  const source = [record.title, record.chapter].join(' ');
  const derived = themeRules.filter(([, pattern]) => pattern.test(source)).map(([theme]) => theme);
  return derived.length ? derived : ['Imagination'];
};

const sampleOverrides = {
  totoro: {
    title: 'My Neighbor Totoro', studio: 'Studio Ghibli', directors: 'Hayao Miyazaki', runtime: 86,
    age: '6–8', ageReason: 'a gentle pace, with worry about an ill parent.', value: 'Wonder, patience, and sisters caring for each other.', content: 'A parent is ill; one child briefly goes missing.',
    characters: 'Satsuki Mei Totoro', themes: ['Family', 'Nature', 'Imagination', 'Growing Up', 'Kindness'], chapter: 'Studio Ghibli', country: 'Japan',
    characterImage: assetUrl('kids-library-totoro-turned-away.png'),
    imageDescription: 'Satsuki, Mei, and Totoro look away from the viewer across a green Japanese valley.', artworkStatus: 'sample',
  },
  'iron-giant': {
    title: 'The Iron Giant', studio: 'Warner Bros. Feature Animation', directors: 'Brad Bird', runtime: 86,
    age: '6–8', ageReason: 'gunfire and a sacrifice scene benefit from watching together.', value: 'Choosing kindness when fear tells everyone to attack.', content: 'Gun violence, military threat, peril, and an apparent self-sacrifice. The ending is hopeful.',
    characters: 'Hogarth Dean Annie Iron Giant', themes: ['Friendship', 'Courage', 'Kindness', 'Difference', 'Community'], chapter: 'Classical & Contemporary American Canon', country: 'United States',
    characterImage: assetUrl('kids-library-iron-giant-turned-away.png'),
    imageDescription: 'The Iron Giant and Hogarth look away from the viewer across a wooded river valley.', artworkStatus: 'sample',
  },
  'ernest-celestine': {
    title: 'Ernest & Celestine', studio: 'Les Armateurs · La Parti · Mélusine', directors: 'Benjamin Renner, Vincent Patar & Stéphane Aubier', runtime: 80,
    age: '6–8', ageReason: 'chases and unfair rules are easier to talk through together.', value: 'An unlikely friendship, and the courage to question prejudice.', content: 'Chases, threats, a courtroom fire, and prejudice between the bears and mice.',
    characters: 'Ernest Celestine', themes: ['Friendship', 'Courage', 'Kindness', 'Difference', 'Community'], chapter: 'European / Franco-Belgian / Irish animation', country: 'France, Belgium & Luxembourg',
    characterImage: assetUrl('kids-library-ernest-celestine-turned-away.png'),
    imageDescription: 'Ernest and Celestine look away from the viewer across a pastel European town.', artworkStatus: 'sample',
  },
};

const buildMovie = record => {
  const override = sampleOverrides[record.id] || {};
  const verification = catalogVerification[record.id] || {
    status: 'FLAGGED', canonicalTitle: record.title, year: null, directors: [], studioOrProducer: null,
    sourceUrls: [], unverifiedFields: ['title', 'year', 'directors', 'studio_or_producer'], note: 'No Iris verification record found.',
  };
  const verifiedTitle = verification.canonicalTitle || record.title;
  const verifiedDirectors = Array.isArray(verification.directors) ? verification.directors.join(', ') : verification.directors;
  const verifiedStudio = Array.isArray(verification.studioOrProducer) ? verification.studioOrProducer.join(' · ') : verification.studioOrProducer;
  const age = override.age || 'All';
  const audienceProfile = override.audienceProfile || 'Not verified in the Iris source pass';
  const characterImage = override.characterImage || assetUrl(`kids-library-${record.id}-turned-away.png`);
  const imdbUrl = imdbUrls[record.id] || verification.sourceUrls.find(url => /imdb\.com\/title\//i.test(url)) || null;
  return {
    ...record,
    ...override,
    title: verifiedTitle,
    year: verification.year,
    directors: verifiedDirectors || 'Not verified in the Iris source pass',
    studio: verifiedStudio || 'Not verified in the Iris source pass',
    runtime: override.runtime || null,
    age,
    ageReason: override.ageReason || 'Age guidance was not verified in the Iris source pass; review current parent guidance before choosing.',
    value: override.value || 'Synopsis not verified in the Iris source pass.',
    content: override.content || 'Parent content note not verified in the Iris source pass; review a current source before relying on it.',
    characters: override.characters || record.title,
    themes: override.themes || deriveThemes({ ...record, title: verifiedTitle }),
    country: override.country || 'See the cited source',
    audienceProfile,
    visualStyle: null,
    premise: null,
    characterImage,
    imdbUrl,
    artworkSource: 'SD Forest original illustration',
    image: characterImage,
    imageDescription: override.imageDescription || `Original painterly turned-away artwork for ${verifiedTitle}; the characters face away from the viewer in a wide open landscape.`,
    artworkStatus: override.artworkStatus || 'generated',
    source: 'Iris catalog verification',
    sourceUrls: verification.sourceUrls,
    verificationStatus: verification.status,
    verifiedFields: verification.status === 'FLAGGED' ? ['existence', 'title', ...(verification.year != null ? ['year'] : []), ...(verification.directors?.length ? ['directors'] : [])] : ['existence', 'title', ...(verification.year != null ? ['year'] : []), 'directors', ...(verifiedStudio ? ['studio_or_producer'] : [])],
    unverifiedFields: ['premise', 'visualStyle', 'audienceProfile', 'age', 'content note', ...verification.unverifiedFields],
    verificationNote: verification.note,
  };
};

export const movies = researchCatalog.map(buildMovie);

const normalize = text => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
export function filterMovies({ query = '', age = 'All', theme = 'All Themes' }) {
  return movies.filter(movie => (!query.trim() || normalize([movie.title, movie.year, movie.studio, movie.directors, movie.characters, movie.country, movie.chapter, movie.value, movie.premise, movie.visualStyle, movie.audienceProfile, ...movie.themes].join(' ')).includes(normalize(query.trim()))) && (age === 'All' || movie.age === age) && (theme === 'All Themes' || movie.themes.includes(theme)));
}

// JustWatch localizes its public search path in some markets.
const searchRoutes = {
  gb: ['uk', 'search'], fr: ['fr', 'recherche'], de: ['de', 'Suche'],
  es: ['es', 'buscar'], br: ['br', 'busca'], mx: ['mx', 'buscar'],
};
export const availabilityUrl = (movie, country) => {
  const [market, path] = searchRoutes[country] || [country, 'search'];
  return `https://www.justwatch.com/${market}/${path}?q=${encodeURIComponent(movie.title)}`;
};
