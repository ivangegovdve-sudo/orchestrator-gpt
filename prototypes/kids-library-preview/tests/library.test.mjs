import assert from 'node:assert/strict';
import test from 'node:test';
import { assetUrl, availabilityUrl, filterMovies, movies } from '../src/library.js';

test('availability links use the selected market and its localized search path', () => {
  const movie = movies.find(({ id }) => id === 'ernest-celestine');
  const routes = {
    us: 'us/search', gb: 'uk/search', fr: 'fr/recherche', de: 'de/Suche',
    es: 'es/buscar', br: 'br/busca', mx: 'mx/buscar', bg: 'bg/search',
  };
  for (const [country, route] of Object.entries(routes)) {
    assert.equal(availabilityUrl(movie, country), `https://www.justwatch.com/${route}?q=Ernest%20%26%20Celestine`);
  }
});

test('preview artwork resolves under the preview route', () => {
  assert.equal(assetUrl('trees.webp'), '/web/kids-library-preview/assets/trees.webp');
  assert.ok(movies.every(({ image }) => image.startsWith('/web/kids-library-preview/assets/')));
});

test('backfills every titled research entry with a stable card identity', () => {
  assert.equal(movies.length, 62);
  assert.equal(new Set(movies.map(({ id }) => id)).size, movies.length);
  assert.ok(movies.every(({ title, directors, source, sourceUrls, verificationStatus }) => title && directors && source === 'Iris catalog verification' && sourceUrls.length && ['VERIFIED', 'CORRECTED', 'FLAGGED'].includes(verificationStatus)));
  assert.equal(movies.some(({ id }) => id === 'the-king-and-the-mockingbird-le-roi-et-loiseau'), false);
  assert.equal(movies.find(({ id }) => id === 'jack-and-the-cuckoo-clock-heart').year, null);
  assert.ok(movies.every(({ premise, visualStyle }) => premise === null && visualStyle === null));
});

test('keeps every catalog title paired with generated turned-away art', () => {
  assert.equal(movies.filter(({ characterImage }) => characterImage?.endsWith('-turned-away.png')).length, 62);
  assert.equal(movies.filter(({ artworkStatus }) => artworkStatus === 'generated').length, 59);
  for (const id of ['totoro', 'iron-giant', 'ernest-celestine']) {
    const movie = movies.find(item => item.id === id);
    assert.ok(movie.characterImage.endsWith('-turned-away.png'));
    assert.equal(movie.artworkStatus, 'sample');
  }
  assert.equal(movies.filter(({ artworkStatus }) => artworkStatus === 'sample').length, 3);
  assert.equal(movies.filter(({ artworkStatus }) => artworkStatus === 'pending').length, 0);
  assert.ok(movies.every(({ artworkSource, posterImage }) => artworkSource === 'SD Forest original illustration' && posterImage === undefined));
});

test('regenerated entries open their IMDb poster and title page', () => {
  const ids = ['lilo-and-stitch', 'inside-out', 'the-nightmare-before-christmas', 'spider-man-into-the-spider-verse', 'spider-man-across-the-spider-verse', 'pinocchio', 'wildwood'];
  for (const id of ids) {
    const movie = movies.find(item => item.id === id);
    assert.ok(movie, `missing regenerated movie ${id}`);
    assert.match(movie.imdbUrl, /^https:\/\/www\.imdb\.com\/title\/tt\d+\/$/);
  }
});

test('search, age, and theme filters intersect without inventing results', () => {
  assert.deepEqual(filterMovies({ query: 'renner', age: '6–8', theme: 'Courage' }).map(({ id }) => id), ['ernest-celestine']);
  assert.deepEqual(filterMovies({ query: 'renner', age: '3–5', theme: 'Courage' }), []);
  assert.deepEqual(filterMovies({ query: 'celestine' }).map(({ id }) => id), ['ernest-celestine']);
});
