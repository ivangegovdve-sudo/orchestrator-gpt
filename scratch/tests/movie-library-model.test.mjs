import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mergeMovieRecords,
  resolveMovieState,
} from '../../web/kids-movie-library/movie-model.mjs';

test('a title-only watched-history row joins the one matching yearful family card', () => {
  const movies = mergeMovieRecords([
    {
      title: 'Big Hero 6',
      year: 2014,
      platform: 'Availability pending',
      tags: ['animated', 'superhero'],
    },
    {
      title: '  BIG HERO 6 ',
      initialWatched: true,
      stateOnly: true,
    },
  ]);

  assert.equal(movies.length, 1);
  assert.deepEqual(movies[0].tags, ['animated', 'superhero']);
  assert.equal(movies[0].year, 2014);
  assert.equal(movies[0].initialWatched, true);
});

test('an explicit alias reconciles a shortened imported title with its canonical card', () => {
  const movies = mergeMovieRecords([
    {
      title: 'Dragon Hunters: Chasseurs de dragons',
      aliases: ['Dragon Hunters'],
      year: 2008,
      runtime: '82 min',
      tags: ['fantasy'],
    },
    {
      title: 'Dragon Hunters',
      year: 2008,
      initialWatched: true,
      tags: ['adventure'],
    },
  ]);

  assert.equal(movies.length, 1);
  assert.equal(movies[0].title, 'Dragon Hunters: Chasseurs de dragons');
  assert.equal(movies[0].runtime, '82 min');
  assert.deepEqual(movies[0].tags, ['fantasy', 'adventure']);
  assert.equal(movies[0].initialWatched, true);
});

test('a stable IMDb id reconciles records even when their titles and years diverge', () => {
  const movies = mergeMovieRecords([
    {
      title: 'The Rich Canonical Title',
      year: 2014,
      imdbId: 'tt1234567',
      platform: 'Netflix',
    },
    {
      title: 'Imported Working Title',
      year: 2013,
      imdbId: 'TT1234567',
      initialWatched: true,
    },
  ]);

  assert.equal(movies.length, 1);
  assert.equal(movies[0].title, 'The Rich Canonical Title');
  assert.equal(movies[0].year, 2014);
  assert.equal(movies[0].platform, 'Netflix');
  assert.equal(movies[0].initialWatched, true);
});

test('ambiguous missing-year watch history does not alter either remake or create a third card', () => {
  const movies = mergeMovieRecords([
    { title: 'Pinocchio', year: 1940, initialWatched: false },
    { title: 'Pinocchio', year: 2022, initialWatched: false },
    { title: 'Pinocchio', initialWatched: true, stateOnly: true },
  ]);

  assert.deepEqual(
    movies.map(({ year, initialWatched }) => ({ year, initialWatched })),
    [
      { year: 1940, initialWatched: false },
      { year: 2022, initialWatched: false },
    ],
  );
});

test('persisted watch state overrides imported state in both directions', () => {
  assert.deepEqual(
    resolveMovieState(
      { initialWatched: true },
      { watched: false, rating: 4 },
    ),
    { watched: false, rating: 4 },
  );
  assert.deepEqual(
    resolveMovieState(
      { initialWatched: false },
      { watched: true, rating: 2 },
    ),
    { watched: true, rating: 2 },
  );
});
