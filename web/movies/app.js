const API_BASE_KEY = "kidsMoviesApiBase";
const DEVICE_ID_KEY = "kidsMoviesDeviceId";

const state = {
  apiBase: "",
  deviceId: "",
  hasSearched: false,
  filters: {
    ageBand: "",
    status: "all",
    sortKey: "title_az",
    tags: new Set(),
  },
  movies: [],
  facets: {
    age_bands: [],
    tags: [],
  },
};

const els = {
  searchInput: document.getElementById("searchInput"),
  searchBtn: document.getElementById("searchBtn"),
  ageBandFilter: document.getElementById("ageBandFilter"),
  statusFilter: document.getElementById("statusFilter"),
  sortFilter: document.getElementById("sortFilter"),
  tagsContainer: document.getElementById("tagsContainer"),
  apiBaseInput: document.getElementById("apiBaseInput"),
  saveApiBaseBtn: document.getElementById("saveApiBaseBtn"),
  toast: document.getElementById("toast"),
  resultsMeta: document.getElementById("resultsMeta"),
  resultsCount: document.getElementById("resultsCount"),
  resultsList: document.getElementById("resultsList"),
  emptyState: document.getElementById("emptyState"),
  addSection: document.getElementById("addSection"),
  addMovieForm: document.getElementById("addMovieForm"),
  addTitle: document.getElementById("addTitle"),
  addYear: document.getElementById("addYear"),
  addAgeBand: document.getElementById("addAgeBand"),
  addTags: document.getElementById("addTags"),
  addNotes: document.getElementById("addNotes"),
  addWatched: document.getElementById("addWatched"),
  bulkAddForm: document.getElementById("bulkAddForm"),
  bulkLines: document.getElementById("bulkLines"),
  bulkAgeBand: document.getElementById("bulkAgeBand"),
  bulkTags: document.getElementById("bulkTags"),
  movieItemTemplate: document.getElementById("movieItemTemplate"),
};

function inferDefaultApiBase() {
  if (window.location.port === "8000") {
    return window.location.origin;
  }
  return "http://127.0.0.1:8000";
}

function readApiBase() {
  return (localStorage.getItem(API_BASE_KEY) || inferDefaultApiBase()).replace(/\/+$/, "");
}

function getOrCreateDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const value = window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(DEVICE_ID_KEY, value);
  return value;
}

function showToast(message, isError = false) {
  if (!message) {
    els.toast.classList.add("hidden");
    els.toast.textContent = "";
    els.toast.classList.remove("error");
    return;
  }

  els.toast.classList.remove("hidden");
  els.toast.textContent = message;
  els.toast.classList.toggle("error", isError);
}

function parseTags(input) {
  return (input || "")
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

function formatTimestamp(isoValue) {
  if (!isoValue) {
    return "never";
  }

  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return isoValue;
  }

  return date.toLocaleString();
}

function buildApiUrl(path, queryParams) {
  const base = state.apiBase || "";
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
  const response = await fetch(buildApiUrl(path, queryParams), {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const payload = await response.json();
      if (payload?.detail) {
        message = typeof payload.detail === "string" ? payload.detail : JSON.stringify(payload.detail);
      }
    } catch (_ignored) {
      // Keep default message.
    }
    throw new Error(message);
  }

  return response.json();
}

function sortToApiParams(sortKey) {
  switch (sortKey) {
    case "year_desc":
      return { sort: "year", order: "desc" };
    case "imdb_desc":
      return { sort: "imdb", order: "desc" };
    case "rating_desc":
      return { sort: "rating", order: "desc" };
    case "title_az":
    default:
      return { sort: "title", order: "asc" };
  }
}

function renderAgeBands() {
  const selected = state.filters.ageBand;
  els.ageBandFilter.innerHTML = '<option value="">All</option>';

  for (const ageBand of state.facets.age_bands || []) {
    const option = document.createElement("option");
    option.value = ageBand;
    option.textContent = ageBand;
    els.ageBandFilter.appendChild(option);
  }

  els.ageBandFilter.value = selected;
}

function renderTagChips() {
  els.tagsContainer.innerHTML = "";

  if (!(state.facets.tags || []).length) {
    const none = document.createElement("span");
    none.className = "subtle";
    none.textContent = "No tags yet";
    els.tagsContainer.appendChild(none);
    return;
  }

  for (const tag of state.facets.tags) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tag-chip";
    button.textContent = tag;
    button.classList.toggle("active", state.filters.tags.has(tag));

    button.addEventListener("click", () => {
      if (state.filters.tags.has(tag)) {
        state.filters.tags.delete(tag);
      } else {
        state.filters.tags.add(tag);
      }
      renderTagChips();
      if (state.hasSearched) {
        loadMovies();
      }
    });

    els.tagsContainer.appendChild(button);
  }
}

function createStarButton(movie, value) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "star-btn";
  button.textContent = "★";
  button.classList.toggle("active", (movie.my_rating || 0) >= value);
  button.title = `Rate ${value}/5`;

  button.addEventListener("click", async () => {
    try {
      await apiFetch(`/api/movies/${movie.id}/rate`, {
        method: "POST",
        body: {
          device_id: state.deviceId,
          rating: value,
        },
      });
      showToast(`Saved rating ${value}/5 for ${movie.title}.`);
      if (state.hasSearched) {
        await loadMovies();
      }
    } catch (error) {
      showToast(`Rating failed: ${error.message}`, true);
    }
  });

  return button;
}

function renderMovieItem(movie) {
  const fragment = els.movieItemTemplate.content.cloneNode(true);
  const root = fragment.querySelector(".movie-item");

  root.classList.toggle("watched", !!movie.watched);

  fragment.querySelector(".movie-title").textContent = movie.title || "-";
  fragment.querySelector(".movie-year").textContent = movie.year ?? "-";

  const statusText = fragment.querySelector(".movie-status");
  statusText.textContent = movie.watched ? "Watched" : "Unwatched";

  const watchBtn = fragment.querySelector(".watch-btn");
  watchBtn.textContent = movie.watched ? "Unwatch" : "Mark watched";
  watchBtn.addEventListener("click", async () => {
    try {
      await apiFetch(
        `/api/movies/${movie.id}`,
        {
          method: "PATCH",
          body: {
            watched: !movie.watched,
          },
        },
        { device_id: state.deviceId },
      );
      showToast(`${movie.title} updated.`);
      if (state.hasSearched) {
        await loadMovies();
      }
    } catch (error) {
      showToast(`Status update failed: ${error.message}`, true);
    }
  });

  fragment.querySelector(".movie-age").textContent = movie.age_band || "Family";
  fragment.querySelector(".movie-tags").textContent = (movie.tags || []).join(", ") || "-";

  const imdbScoreText = movie.imdb_score === null || movie.imdb_score === undefined
    ? "n/a"
    : Number(movie.imdb_score).toFixed(1);
  fragment.querySelector(".movie-imdb").textContent = imdbScoreText;

  const imdbMeta = fragment.querySelector(".movie-imdb-meta");
  imdbMeta.textContent = `last checked: ${formatTimestamp(movie.imdb_last_checked_at)}`;

  const imdbBtn = fragment.querySelector(".imdb-update-btn");
  imdbBtn.addEventListener("click", async () => {
    const prevLabel = imdbBtn.textContent;
    imdbBtn.textContent = "...";
    imdbBtn.disabled = true;

    try {
      const response = await apiFetch(
        `/api/movies/${movie.id}/imdb/update`,
        {
          method: "POST",
          body: { force: true },
        },
        { device_id: state.deviceId },
      );

      showToast(response.message, !response.ok);
      if (state.hasSearched) {
        await loadMovies();
      }
    } catch (error) {
      showToast(`IMDb update failed: ${error.message}`, true);
    } finally {
      imdbBtn.textContent = prevLabel;
      imdbBtn.disabled = false;
    }
  });

  const ratingSummary = fragment.querySelector(".movie-rating-summary");
  ratingSummary.textContent = movie.rating_count
    ? `${Number(movie.avg_rating).toFixed(2)} (${movie.rating_count})`
    : "n/a";

  const stars = fragment.querySelector(".movie-stars");
  for (let i = 1; i <= 5; i += 1) {
    stars.appendChild(createStarButton(movie, i));
  }

  fragment.querySelector(".movie-notes").textContent = movie.notes || "-";

  return fragment;
}

function renderMovies() {
  els.resultsList.innerHTML = "";

  if (!state.hasSearched) {
    els.resultsMeta.classList.add("hidden");
    els.resultsList.classList.add("hidden");
    els.emptyState.classList.add("hidden");
    els.addSection.classList.add("hidden");
    return;
  }

  els.resultsMeta.classList.remove("hidden");
  els.resultsList.classList.remove("hidden");
  els.addSection.classList.remove("hidden");

  els.resultsCount.textContent = `${state.movies.length} movies`;

  if (!state.movies.length) {
    els.emptyState.classList.remove("hidden");
    return;
  }

  els.emptyState.classList.add("hidden");
  const list = document.createDocumentFragment();
  state.movies.forEach((movie) => list.appendChild(renderMovieItem(movie)));
  els.resultsList.appendChild(list);
}

async function loadFacets() {
  try {
    const facets = await apiFetch("/api/movies/facets");
    state.facets = facets || { age_bands: [], tags: [] };
    renderAgeBands();
    renderTagChips();
  } catch (error) {
    showToast(`Could not load filters: ${error.message}`, true);
  }
}

async function loadMovies() {
  if (!state.hasSearched) {
    return;
  }

  const searchText = (els.searchInput.value || "").trim();
  const sortParams = sortToApiParams(state.filters.sortKey);

  const params = {
    search: searchText || undefined,
    age_band: state.filters.ageBand || undefined,
    status: state.filters.status,
    sort: sortParams.sort,
    order: sortParams.order,
    device_id: state.deviceId,
  };

  const selectedTags = Array.from(state.filters.tags.values());
  if (selectedTags.length) {
    params.tags = selectedTags.join(",");
    params.tags_mode = "any";
  }

  try {
    showToast("Loading results...");
    const response = await apiFetch("/api/movies", {}, params);
    state.movies = response.items || [];
    state.facets = response.facets || state.facets;
    renderAgeBands();
    renderTagChips();
    renderMovies();
    showToast("");
  } catch (error) {
    state.movies = [];
    renderMovies();
    showToast(`Failed to load movies: ${error.message}`, true);
  }
}

function wireSearch() {
  els.searchBtn.addEventListener("click", async () => {
    state.hasSearched = true;
    await loadMovies();
  });

  els.searchInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      state.hasSearched = true;
      await loadMovies();
    }
  });
}

function wireFilters() {
  els.ageBandFilter.addEventListener("change", () => {
    state.filters.ageBand = els.ageBandFilter.value;
    if (state.hasSearched) {
      loadMovies();
    }
  });

  els.statusFilter.addEventListener("change", () => {
    state.filters.status = els.statusFilter.value;
    if (state.hasSearched) {
      loadMovies();
    }
  });

  els.sortFilter.addEventListener("change", () => {
    state.filters.sortKey = els.sortFilter.value;
    if (state.hasSearched) {
      loadMovies();
    }
  });
}

function wireApiBaseControls() {
  els.apiBaseInput.value = state.apiBase;

  els.saveApiBaseBtn.addEventListener("click", async () => {
    const next = (els.apiBaseInput.value || "").trim().replace(/\/+$/, "");
    if (!next) {
      showToast("API base URL cannot be empty.", true);
      return;
    }

    state.apiBase = next;
    localStorage.setItem(API_BASE_KEY, next);
    showToast(`Saved API URL: ${next}`);

    await loadFacets();
    if (state.hasSearched) {
      await loadMovies();
    }
  });
}

function wireAddForms() {
  els.addMovieForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      title: (els.addTitle.value || "").trim(),
      year: toNullableInt(els.addYear.value),
      age_band: els.addAgeBand.value || "Family",
      tags: parseTags(els.addTags.value),
      notes: (els.addNotes.value || "").trim() || null,
      watched: !!els.addWatched.checked,
    };

    if (!payload.title) {
      showToast("Title is required.", true);
      return;
    }

    try {
      await apiFetch("/api/movies", { method: "POST", body: payload }, { device_id: state.deviceId });
      showToast(`Added: ${payload.title}`);
      els.addMovieForm.reset();
      els.addAgeBand.value = "Family";

      await loadFacets();
      if (state.hasSearched) {
        await loadMovies();
      }
    } catch (error) {
      showToast(`Add movie failed: ${error.message}`, true);
    }
  });

  els.bulkAddForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const lines = (els.bulkLines.value || "").trim();
    if (!lines) {
      showToast("Bulk input is empty.", true);
      return;
    }

    const payload = {
      lines,
      default_age_band: els.bulkAgeBand.value || "Family",
      default_tags: parseTags(els.bulkTags.value),
    };

    try {
      const result = await apiFetch("/api/movies/import", { method: "POST", body: payload });
      showToast(`Imported ${result.processed} lines (${result.created} created, ${result.updated} updated).`);
      els.bulkLines.value = "";

      await loadFacets();
      if (state.hasSearched) {
        await loadMovies();
      }
    } catch (error) {
      showToast(`Bulk import failed: ${error.message}`, true);
    }
  });
}

async function init() {
  state.apiBase = readApiBase();
  state.deviceId = getOrCreateDeviceId();

  wireSearch();
  wireFilters();
  wireApiBaseControls();
  wireAddForms();

  await loadFacets();
  renderMovies();
}

init();
