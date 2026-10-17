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

test('search, age, and theme filters intersect without inventing results', () => {
  assert.deepEqual(filterMovies({ query: 'renner', age: '6–8', theme: 'Courage' }).map(({ id }) => id), ['ernest-celestine']);
  assert.deepEqual(filterMovies({ query: 'renner', age: '3–5', theme: 'Courage' }), []);
  assert.deepEqual(filterMovies({ query: 'celestine' }).map(({ id }) => id), ['ernest-celestine']);
});
