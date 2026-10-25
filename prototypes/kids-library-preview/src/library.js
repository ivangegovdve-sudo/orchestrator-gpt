export const RESEARCH_URL = 'https://docs.google.com/document/d/1G4FN5wtDezSKEEbwGVFnaTn-ykpEKoeaQdeaAeokttM';
export const themes = ['All Themes', 'Friendship', 'Courage', 'Kindness', 'Family', 'Growing Up', 'Nature', 'Imagination', 'Difference', 'Community'];
export const ages = ['All', '3–5', '6–8', '9–12'];
export const countries = [['us', 'United States'], ['gb', 'United Kingdom'], ['ca', 'Canada'], ['au', 'Australia'], ['nz', 'New Zealand'], ['bg', 'Bulgaria'], ['fr', 'France'], ['de', 'Germany'], ['es', 'Spain'], ['it', 'Italy'], ['nl', 'Netherlands'], ['se', 'Sweden'], ['jp', 'Japan'], ['kr', 'South Korea'], ['in', 'India'], ['br', 'Brazil'], ['mx', 'Mexico'], ['za', 'South Africa']];
export const assetUrl = filename => `/web/kids-library-preview/assets/${filename}`;
export const movies = [
  { id: 'totoro', title: 'My Neighbor Totoro', year: 1988, studio: 'Studio Ghibli', directors: 'Hayao Miyazaki', runtime: 86,
    age: '6–8', ageReason: 'a gentle pace, with worry about an ill parent.', value: 'Wonder, patience, and sisters caring for each other.', content: 'A parent is ill; one child briefly goes missing.',
    characters: 'Satsuki Mei Totoro', themes: ['Family', 'Nature', 'Imagination', 'Growing Up', 'Kindness'], chapter: 'Studio Ghibli', country: 'Japan', image: assetUrl('totoro.webp'), imageDescription: 'Satsuki, Mei, and Totoro look across a green Japanese valley from beneath a tree.' },
  { id: 'iron-giant', title: 'The Iron Giant', year: 1999, studio: 'Warner Bros. Feature Animation', directors: 'Brad Bird', runtime: 86,
    age: '6–8', ageReason: 'gunfire and a sacrifice scene benefit from watching together.', value: 'Choosing kindness when fear tells everyone to attack.', content: 'Gun violence, military threat, peril, and an apparent self-sacrifice. The ending is hopeful.',
    characters: 'Hogarth Dean Annie Iron Giant', themes: ['Friendship', 'Courage', 'Kindness', 'Difference', 'Community'], chapter: 'Classical & Contemporary American Canon', country: 'United States', image: assetUrl('iron-giant.webp'), imageDescription: 'The Iron Giant and Hogarth sit together above a wooded valley and river at sunset.' },
  { id: 'ernest-celestine', title: 'Ernest & Celestine', year: 2012, studio: 'Les Armateurs · La Parti · Mélusine', directors: 'Benjamin Renner, Vincent Patar & Stéphane Aubier', runtime: 80,
    age: '6–8', ageReason: 'chases and unfair rules are easier to talk through together.', value: 'An unlikely friendship, and the courage to question prejudice.', content: 'Chases, threats, a courtroom fire, and prejudice between the bears and mice.',
    characters: 'Ernest Celestine', themes: ['Friendship', 'Courage', 'Kindness', 'Difference', 'Community'], chapter: 'European / Franco-Belgian / Irish animation', country: 'France, Belgium & Luxembourg', image: assetUrl('ernest-celestine.webp'), imageDescription: 'Ernest the bear and Celestine the mouse sit on a stone wall overlooking a pastel town.' },
];
const normalize = text => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
export function filterMovies({ query = '', age = 'All', theme = 'All Themes' }) {
  return movies.filter(movie => (!query.trim() || normalize([movie.title, movie.year, movie.studio, movie.directors, movie.characters, movie.country, movie.chapter, movie.value, ...movie.themes].join(' ')).includes(normalize(query.trim()))) && (age === 'All' || movie.age === age) && (theme === 'All Themes' || movie.themes.includes(theme)));
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
