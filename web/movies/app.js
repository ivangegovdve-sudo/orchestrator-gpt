const API_BASE_KEY = "kidsMoviesApiBase";
const DEVICE_ID_KEY = "kidsMoviesDeviceId";

const state = {
  apiBase: "",
  deviceId: "",
  filters: {
    search: "",
    ageBand: "",
    watched: "all",
    sort: "title",
    order: "asc",
    tags: new Set(),
  },
  facets: {
    age_bands: [],
    tags: [],
  },
  movies: [],
};

const els = {
  apiBaseInput: document.getElementById("apiBaseInput"),
  saveApiBaseBtn: document.getElementById("saveApiBaseBtn"),
  searchInput: document.getElementById("searchInput"),
  ageBandFilter: document.getElementById("ageBandFilter"),
  watchedFilter: document.getElementById("watchedFilter"),
  sortFilter: document.getElementById("sortFilter"),
  orderFilter: document.getElementById("orderFilter"),
  tagsContainer: document.getElementById("tagsContainer"),
  statusText: document.getElementById("statusText"),
  movieList: document.getElementById("movieList"),
  emptyState: document.getElementById("emptyState"),
  addMovieForm: document.getElementById("addMovieForm"),
  addTitle: document.getElementById("addTitle"),
  addYear: document.getElementById("addYear"),
  addImdb: document.getElementById("addImdb"),
  addAgeBand: document.getElementById("addAgeBand"),
  addTags: document.getElementById("addTags"),
  addNotes: document.getElementById("addNotes"),
  addWatched: document.getElementById("addWatched"),
  bulkAddForm: document.getElementById("bulkAddForm"),
  bulkLines: document.getElementById("bulkLines"),
  bulkAgeBand: document.getElementById("bulkAgeBand"),
  bulkTags: document.getElementById("bulkTags"),
  movieCardTemplate: document.getElementById("movieCardTemplate"),
};

function inferDefaultApiBase() {
  if (window.location.port === "8000") {
    return window.location.origin;
  }
  return "http://127.0.0.1:8000";
}

function readApiBase() {
  const stored = localStorage.getItem(API_BASE_KEY);
  return (stored || inferDefaultApiBase()).replace(/\/+$/, "");
}

function getOrCreateDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }
  const id = window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

function setStatus(message, isError = false) {
  els.statusText.textContent = message;
  els.statusText.classList.toggle("error-text", isError);
}

function parseTags(csv) {
  return (csv || "")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function toNullableInt(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableFloat(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildUrl(path, queryParams) {
  const base = state.apiBase ? state.apiBase.replace(/\/+$/, "") : "";
  const url = new URL(`${base}${path}`, window.location.origin);
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function apiFetch(path, options = {}, queryParams) {
  const url = buildUrl(path, queryParams);
  const config = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };

  if (options.body !== undefined) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const payload = await response.json();
      if (payload?.detail) {
        message = typeof payload.detail === "string" ? payload.detail : JSON.stringify(payload.detail);
      }
    } catch (_ignored) {
      // Keep default message when JSON parse fails.
    }
    throw new Error(message);
  }

  return response.json();
}

function renderAgeBandOptions() {
  const current = state.filters.ageBand;
  const ageBands = state.facets.age_bands || [];
  els.ageBandFilter.innerHTML = '<option value="">All</option>';
  for (const ageBand of ageBands) {
    const opt = document.createElement("option");
    opt.value = ageBand;
    opt.textContent = ageBand;
    els.ageBandFilter.appendChild(opt);
  }
  els.ageBandFilter.value = current;
}

function renderTagChips() {
  els.tagsContainer.innerHTML = "";

  if (!state.facets.tags.length) {
    const empty = document.createElement("span");
    empty.className = "hint";
    empty.textContent = "No tags yet";
    els.tagsContainer.appendChild(empty);
    return;
  }

  for (const tag of state.facets.tags) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "tag-chip";
    chip.textContent = tag;
    chip.classList.toggle("active", state.filters.tags.has(tag));

    chip.addEventListener("click", () => {
      if (state.filters.tags.has(tag)) {
        state.filters.tags.delete(tag);
      } else {
        state.filters.tags.add(tag);
      }
      renderTagChips();
      loadMovies();
    });

    els.tagsContainer.appendChild(chip);
  }
}

function createStarButton(movie, value) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "star-btn";
  btn.textContent = "★";
  btn.classList.toggle("active", (movie.my_rating || 0) >= value);
  btn.title = `Rate ${value} out of 5`;
  btn.addEventListener("click", async () => {
    try {
      await apiFetch(
        `/api/movies/${movie.id}/ratings`,
        {
          method: "POST",
          body: {
            device_id: state.deviceId,
            rating: value,
          },
        },
      );
      setStatus(`Saved rating ${value}/5 for ${movie.title}.`);
      await loadMovies();
    } catch (error) {
      setStatus(`Could not save rating: ${error.message}`, true);
    }
  });
  return btn;
}

function renderMovieCard(movie) {
  const fragment = els.movieCardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".movie-card");
  const titleEl = fragment.querySelector(".movie-title");
  const metaEl = fragment.querySelector(".movie-meta");
  const tagsEl = fragment.querySelector(".movie-tags");
  const statsEl = fragment.querySelector(".movie-stats");
  const toggleBtn = fragment.querySelector(".watch-toggle");
  const ratingStars = fragment.querySelector(".rating-stars");
  const imdbInput = fragment.querySelector(".imdb-input");
  const saveImdbBtn = fragment.querySelector(".save-imdb-btn");

  card.classList.toggle("is-watched", !!movie.watched);

  const year = movie.year ? ` (${movie.year})` : "";
  titleEl.textContent = `${movie.title}${year}`;

  const ageBand = movie.age_band || "Family";
  metaEl.textContent = `Age band: ${ageBand} · ${movie.watched ? "Watched" : "Unwatched"}`;

  tagsEl.innerHTML = "";
  if (movie.tags?.length) {
    movie.tags.forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "movie-tag";
      chip.textContent = tag;
      tagsEl.appendChild(chip);
    });
  }

  const imdbText = movie.imdb_score === null || movie.imdb_score === undefined
    ? "IMDb: n/a"
    : `IMDb: ${Number(movie.imdb_score).toFixed(1)}`;
  const avgRatingText = movie.rating_count
    ? `Avg rating: ${Number(movie.avg_rating).toFixed(2)} (${movie.rating_count})`
    : "Avg rating: n/a";

  statsEl.innerHTML = `<span>${imdbText}</span><span>${avgRatingText}</span>`;

  toggleBtn.textContent = movie.watched ? "Mark unwatched" : "Mark watched";
  toggleBtn.className = movie.watched ? "watch-toggle secondary" : "watch-toggle";
  toggleBtn.addEventListener("click", async () => {
    try {
      await apiFetch(
        `/api/movies/${movie.id}/watched`,
        {
          method: "PUT",
          body: { watched: !movie.watched },
        },
        { device_id: state.deviceId },
      );
      setStatus(`${movie.title} updated.`);
      await loadMovies();
    } catch (error) {
      setStatus(`Could not update watched status: ${error.message}`, true);
    }
  });

  imdbInput.value = movie.imdb_score ?? "";
  saveImdbBtn.addEventListener("click", async () => {
    try {
      await apiFetch(
        `/api/movies/${movie.id}`,
        {
          method: "PATCH",
          body: { imdb_score: toNullableFloat(imdbInput.value) },
        },
        { device_id: state.deviceId },
      );
      setStatus(`IMDb score updated for ${movie.title}.`);
      await loadMovies();
    } catch (error) {
      setStatus(`Could not save IMDb score: ${error.message}`, true);
    }
  });

  ratingStars.innerHTML = "";
  for (let value = 1; value <= 5; value += 1) {
    ratingStars.appendChild(createStarButton(movie, value));
  }

  if (movie.notes) {
    const notes = document.createElement("p");
    notes.className = "movie-meta";
    notes.textContent = movie.notes;
    card.querySelector(".movie-main").appendChild(notes);
  }

  return fragment;
}

function renderMovies() {
  els.movieList.innerHTML = "";

  if (!state.movies.length) {
    els.emptyState.classList.remove("hidden");
    return;
  }

  els.emptyState.classList.add("hidden");
  const listFragment = document.createDocumentFragment();
  state.movies.forEach((movie) => listFragment.appendChild(renderMovieCard(movie)));
  els.movieList.appendChild(listFragment);
}

async function loadMovies() {
  const query = {
    search: state.filters.search,
    age_band: state.filters.ageBand,
    watched: state.filters.watched,
    sort: state.filters.sort,
    order: state.filters.order,
    device_id: state.deviceId,
  };

  const tags = Array.from(state.filters.tags.values());
  if (tags.length) {
    query.tags = tags.join(",");
    query.tags_mode = "any";
  }

  try {
    setStatus("Loading movies...");
    const payload = await apiFetch("/api/movies", {}, query);
    state.movies = payload.items || [];
    state.facets = payload.facets || { age_bands: [], tags: [] };
    renderAgeBandOptions();
    renderTagChips();
    renderMovies();
    setStatus(`Loaded ${payload.total} movies.`);
  } catch (error) {
    setStatus(`Failed to load movies: ${error.message}`, true);
    els.movieList.innerHTML = "";
    els.emptyState.classList.remove("hidden");
  }
}

function wireFilterHandlers() {
  let searchDebounce = null;

  els.searchInput.addEventListener("input", () => {
    window.clearTimeout(searchDebounce);
    searchDebounce = window.setTimeout(() => {
      state.filters.search = els.searchInput.value.trim();
      loadMovies();
    }, 220);
  });

  els.ageBandFilter.addEventListener("change", () => {
    state.filters.ageBand = els.ageBandFilter.value;
    loadMovies();
  });

  els.watchedFilter.addEventListener("change", () => {
    state.filters.watched = els.watchedFilter.value;
    loadMovies();
  });

  els.sortFilter.addEventListener("change", () => {
    state.filters.sort = els.sortFilter.value;
    if (state.filters.sort === "title") {
      state.filters.order = "asc";
      els.orderFilter.value = "asc";
    }
    loadMovies();
  });

  els.orderFilter.addEventListener("change", () => {
    state.filters.order = els.orderFilter.value;
    loadMovies();
  });
}

function wireApiBaseHandlers() {
  els.apiBaseInput.value = state.apiBase;
  els.saveApiBaseBtn.addEventListener("click", async () => {
    const next = (els.apiBaseInput.value || "").trim().replace(/\/+$/, "");
    if (!next) {
      setStatus("API URL cannot be empty.", true);
      return;
    }
    state.apiBase = next;
    localStorage.setItem(API_BASE_KEY, next);
    setStatus(`API URL saved: ${next}`);
    await loadMovies();
  });
}

function wireAddMovieForm() {
  els.addMovieForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      title: els.addTitle.value.trim(),
      year: toNullableInt(els.addYear.value),
      imdb_score: toNullableFloat(els.addImdb.value),
      age_band: els.addAgeBand.value || "Family",
      watched: !!els.addWatched.checked,
      notes: els.addNotes.value.trim() || null,
      tags: parseTags(els.addTags.value),
    };

    if (!payload.title) {
      setStatus("Title is required.", true);
      return;
    }

    try {
      await apiFetch("/api/movies", { method: "POST", body: payload }, { device_id: state.deviceId });
      setStatus(`Added: ${payload.title}`);
      els.addMovieForm.reset();
      els.addAgeBand.value = "Family";
      await loadMovies();
    } catch (error) {
      setStatus(`Could not add movie: ${error.message}`, true);
    }
  });
}

function wireBulkImportForm() {
  els.bulkAddForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const lines = els.bulkLines.value;
    if (!lines.trim()) {
      setStatus("Bulk add is empty.", true);
      return;
    }

    const payload = {
      lines,
      default_age_band: els.bulkAgeBand.value || "Family",
      default_tags: parseTags(els.bulkTags.value),
    };

    try {
      const result = await apiFetch("/api/movies/import", { method: "POST", body: payload });
      setStatus(
        `Bulk import complete. Processed ${result.processed}, created ${result.created}, updated ${result.updated}.`,
      );
      els.bulkLines.value = "";
      await loadMovies();
    } catch (error) {
      setStatus(`Bulk import failed: ${error.message}`, true);
    }
  });
}

async function init() {
  state.apiBase = readApiBase();
  state.deviceId = getOrCreateDeviceId();

  wireApiBaseHandlers();
  wireFilterHandlers();
  wireAddMovieForm();
  wireBulkImportForm();

  await loadMovies();
}

init();
