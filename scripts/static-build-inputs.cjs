const STATIC_COPY_FILES = Object.freeze([
  'index.html',
  'resume.json',
]);

const STATIC_COPY_DIRECTORIES = Object.freeze([
  'web',
  'calendar',
  'movies',
  'frontend',
  'public',
  'config',
]);

const STATIC_DATA_COPIES = Object.freeze({
  directories: Object.freeze([
    'presets',
  ]),
  files: Object.freeze([
    'sd_inventory_curated.json',
  ]),
});

module.exports = Object.freeze({
  STATIC_COPY_FILES,
  STATIC_COPY_DIRECTORIES,
  STATIC_DATA_COPIES,
});
