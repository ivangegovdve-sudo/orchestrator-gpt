const MISSING_METADATA = new Set(["", "—", "Unspecified", "Availability pending", "Runtime pending"]);

export function normalizeMovieTitle(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/&/g, "and")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function normalizeImdbId(value) {
  const candidate = String(value || "").trim().toLocaleLowerCase();
  return /^tt\d+$/.test(candidate) ? candidate : null;
}

function uniqueValues(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = String(value).trim().toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeMovie(movie) {
  return {
    title: String(movie.title || "Untitled movie").trim(),
    aliases: uniqueValues(Array.isArray(movie.aliases) ? movie.aliases : []),
    year: Number.isInteger(movie.year) ? movie.year : null,
    imdbId: normalizeImdbId(movie.imdbId ?? movie.imdb_id),
    platform: movie.platform || "Availability pending",
    imdb: Number.isFinite(movie.imdb) ? movie.imdb : null,
    runtime: movie.runtime || "Runtime pending",
    age: movie.age || "Family",
    bgAudio: movie.bgAudio || "Unspecified",
    category: movie.category || "Family picks",
    tags: uniqueValues(Array.isArray(movie.tags) ? movie.tags : []),
    note: movie.note || "No notes yet.",
    initialWatched: Boolean(movie.initialWatched),
    stateOnly: Boolean(movie.stateOnly),
  };
}

function preferKnown(current, incoming) {
  return MISSING_METADATA.has(String(current ?? "")) && !MISSING_METADATA.has(String(incoming ?? ""))
    ? incoming
    : current;
}

function normalizedNames(movie) {
  return new Set(
    [movie.title, ...movie.aliases]
      .map(normalizeMovieTitle)
      .filter(Boolean),
  );
}

function namesOverlap(left, right) {
  const rightNames = normalizedNames(right);
  return [...normalizedNames(left)].some((name) => rightNames.has(name));
}

function findCandidateIndexes(cards, incoming) {
  if (incoming.imdbId) {
    const imdbMatches = cards
      .map((movie, index) => ({ movie, index }))
      .filter(({ movie }) => movie.imdbId === incoming.imdbId)
      .map(({ index }) => index);
    if (imdbMatches.length) return imdbMatches;
  }

  const titleMatches = cards
    .map((movie, index) => ({ movie, index }))
    .filter(({ movie }) => {
      if (movie.imdbId && incoming.imdbId && movie.imdbId !== incoming.imdbId) return false;
      if (!namesOverlap(movie, incoming)) return false;
      return movie.year === null || incoming.year === null || movie.year === incoming.year;
    });

  if (incoming.year !== null) {
    const exactYear = titleMatches.filter(({ movie }) => movie.year === incoming.year);
    if (exactYear.length) return exactYear.map(({ index }) => index);
  }

  return titleMatches.map(({ index }) => index);
}

function mergeMovie(current, incoming) {
  return {
    ...current,
    title: current.title === "Untitled movie" ? incoming.title : current.title,
    aliases: uniqueValues([...current.aliases, ...incoming.aliases]),
    year: current.year ?? incoming.year,
    imdbId: current.imdbId ?? incoming.imdbId,
    platform: preferKnown(current.platform, incoming.platform),
    imdb: current.imdb ?? incoming.imdb,
    runtime: preferKnown(current.runtime, incoming.runtime),
    age: preferKnown(current.age, incoming.age),
    bgAudio: preferKnown(current.bgAudio, incoming.bgAudio),
    category: preferKnown(current.category, incoming.category),
    tags: uniqueValues([...current.tags, ...incoming.tags]),
    note: preferKnown(current.note, incoming.note),
    initialWatched: current.initialWatched || incoming.initialWatched,
    stateOnly: false,
  };
}

export function mergeMovieRecords(records) {
  const normalized = records.map(normalizeMovie);
  const cards = [];

  for (const incoming of normalized.filter((movie) => !movie.stateOnly)) {
    const candidateIndexes = findCandidateIndexes(cards, incoming);
    if (candidateIndexes.length === 1) {
      const index = candidateIndexes[0];
      cards[index] = mergeMovie(cards[index], incoming);
    } else {
      cards.push(incoming);
    }
  }

  for (const state of normalized.filter((movie) => movie.stateOnly)) {
    const candidateIndexes = findCandidateIndexes(cards, state);
    if (candidateIndexes.length !== 1) continue;
    const index = candidateIndexes[0];
    cards[index] = mergeMovie(cards[index], state);
  }

  return cards.map(({ stateOnly: _stateOnly, ...movie }) => movie);
}

export function resolveMovieState(movie, persisted) {
  const initialState = { watched: Boolean(movie.initialWatched), rating: 0 };
  if (!persisted || typeof persisted !== "object") return initialState;
  return {
    watched: typeof persisted.watched === "boolean" ? persisted.watched : initialState.watched,
    rating: Number.isInteger(persisted.rating) ? persisted.rating : initialState.rating,
  };
}
