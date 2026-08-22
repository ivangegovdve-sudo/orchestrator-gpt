import { mergeMovieRecords, resolveMovieState } from "./movie-model.mjs";

const STORAGE_KEY = "forestKidsMoviesState";

function importedMovie(title, year, watched = false, tags = []) {
  return {
    title,
    year,
    platform: "Availability pending",
    imdb: null,
    runtime: "Runtime pending",
    age: "Family",
    bgAudio: "Unspecified",
    category: "Family picks",
    tags,
    note: watched
      ? "Previously watched with the family."
      : "Added from the family movie list.",
    initialWatched: watched,
  };
}

const curatedMovies = [
  {
    title: "Spirited Away",
    year: 2001,
    platform: "Netflix",
    imdb: 8.6,
    runtime: "125 min",
    age: "10+",
    bgAudio: "No",
    category: "Giving to others",
    tags: ["ghibli", "empathy", "identity", "boundaries", "symbolic"],
    note: "Identity, work, greed, and empathy without turning kindness into self-erasure.",
  },
  {
    title: "Spider-Man: Into the Spider-Verse",
    year: 2018,
    platform: "Netflix + HBO Max",
    imdb: 8.4,
    runtime: "117 min",
    age: "8-11",
    bgAudio: "Unspecified",
    category: "Mixed philosophical picks",
    tags: ["identity", "responsibility", "stylized", "action", "empathy"],
    note: "Identity as responsibility, with many kinds of fear and courage held together.",
  },
  {
    title: "Klaus",
    year: 2019,
    platform: "Netflix",
    imdb: 8.2,
    runtime: "97 min",
    age: "7+",
    bgAudio: "No",
    category: "Giving to others",
    tags: ["kindness", "community", "painterly", "holiday", "generosity"],
    note: "Kindness as choice, not mood; one good act can start a chain reaction.",
  },
  {
    title: "My Neighbor Totoro",
    year: 1988,
    platform: "Netflix",
    imdb: 8.1,
    runtime: "86 min",
    age: "All",
    bgAudio: "No",
    category: "Sibling collaboration",
    tags: ["ghibli", "siblings", "gentle", "comfort", "imagination"],
    note: "Sibling tenderness and emotional realism during uncertainty.",
  },
  {
    title: "Kiki's Delivery Service",
    year: 1989,
    platform: "Netflix",
    imdb: 7.8,
    runtime: "103 min",
    age: "7+",
    bgAudio: "No",
    category: "Mixed philosophical picks",
    tags: ["ghibli", "self-worth", "work", "confidence", "independence"],
    note: "Losing confidence does not mean losing value.",
  },
  {
    title: "The Mitchells vs. The Machines",
    year: 2021,
    platform: "Netflix",
    imdb: 7.6,
    runtime: "114 min",
    age: "7+",
    bgAudio: "No",
    category: "Sibling collaboration",
    tags: ["family", "sibling", "stylized", "robots", "repair"],
    note: "Family repair through better language, less control, and more listening.",
  },
  {
    title: "KPop Demon Hunters",
    year: 2025,
    platform: "Netflix",
    imdb: 7.5,
    runtime: "Unspecified",
    age: "10+",
    bgAudio: "No",
    category: "Humility and perspective",
    tags: ["fame", "teamwork", "duty", "monsters", "pop"],
    note: "Talent and celebrity matter less than character under pressure.",
  },
  {
    title: "Teenage Mutant Ninja Turtles: Mutant Mayhem",
    year: 2023,
    platform: "HBO Max",
    imdb: 7.2,
    runtime: "100 min",
    age: "9+",
    bgAudio: "Unspecified",
    category: "Sibling collaboration",
    tags: ["brothers", "teamwork", "sketchy", "action", "acceptance"],
    note: "Rivalry becomes teamwork when shared goals require shared respect.",
  },
  {
    title: "The Sea Beast",
    year: 2022,
    platform: "Netflix",
    imdb: 7.0,
    runtime: "115 min",
    age: "7+",
    bgAudio: "No",
    category: "Humility and perspective",
    tags: ["monsters", "myths", "truth", "adventure", "empathy"],
    note: "Inherited stories can turn victims into monsters; courage can mean telling truth.",
  },
  {
    title: "Mary and The Witch's Flower",
    year: 2017,
    platform: "Netflix",
    imdb: 6.8,
    runtime: "103 min",
    age: "7+",
    bgAudio: "No",
    category: "Mixed philosophical picks",
    tags: ["magic", "integrity", "fantasy", "consequences", "ghibli-like"],
    note: "Small lies often begin as bids for belonging, then grow teeth.",
  },
  {
    title: "The Magician's Elephant",
    year: 2023,
    platform: "Netflix",
    imdb: 6.6,
    runtime: "99 min",
    age: "7+",
    bgAudio: "No",
    category: "Giving to others",
    tags: ["hope", "storybook", "persistence", "helping", "fantasy"],
    note: "Hope works best with ethics: do not use others as tools.",
  },
  {
    title: "My Father's Dragon",
    year: 2022,
    platform: "Netflix",
    imdb: 6.5,
    runtime: "99 min",
    age: "7+",
    bgAudio: "No",
    category: "Giving to others",
    tags: ["bravery", "fear", "helping", "gentle", "prestige-animation"],
    note: "Helping others can be real compassion and also a way to process fear.",
  },
  {
    title: "The Addams Family",
    year: 2019,
    platform: "Netflix",
    imdb: 5.9,
    runtime: "87 min",
    age: "7+",
    bgAudio: "No",
    category: "Humility and perspective",
    tags: ["spooky", "belonging", "family", "humility", "comedy"],
    note: "Being different need not become feeling superior.",
  },
  {
    title: "The SpongeBob Movie: Sponge on the Run",
    year: 2020,
    platform: "Netflix",
    imdb: 5.9,
    runtime: "95 min",
    age: "7+",
    bgAudio: "Yes",
    category: "Mixed philosophical picks",
    tags: ["friendship", "loyalty", "bulgarian-audio", "silly", "accessible"],
    note: "Light friendship ethics with verified Bulgarian audio in the report.",
  },
  {
    title: "The Addams Family 2",
    year: 2021,
    platform: "Netflix",
    imdb: 5.4,
    runtime: "93 min",
    age: "7+",
    bgAudio: "No",
    category: "Sibling collaboration",
    tags: ["spooky", "siblings", "road-trip", "family", "communication"],
    note: "Closeness needs updates as kids grow and change.",
  },
  {
    title: "Song of the Sea",
    year: 2014,
    platform: "Netflix",
    imdb: 8.0,
    runtime: "93 min",
    age: "7+",
    bgAudio: "No",
    category: "Sibling collaboration",
    tags: ["folklore", "siblings", "grief", "gentle", "painterly", "Ireland"],
    note: "Tenderness between siblings through folklore: grief is best shared, not hidden.",
  },
  {
    title: "Kubo and the Two Strings",
    year: 2016,
    platform: "Netflix",
    imdb: 7.8,
    runtime: "101 min",
    age: "8+",
    bgAudio: "No",
    category: "Mixed philosophical picks",
    tags: ["stop-motion", "grief", "family", "memory", "bravery", "Laika"],
    note: "Memory and love survive loss; stories are how we carry the people we lose.",
  },
  {
    title: "Nausicaä of the Valley of the Wind",
    year: 1984,
    platform: "Netflix",
    imdb: 8.1,
    runtime: "117 min",
    age: "9+",
    bgAudio: "No",
    category: "Humility and perspective",
    tags: ["ghibli", "empathy", "environment", "war", "peace", "leadership"],
    note: "The enemy is rarely the real enemy; true courage is making peace with fear.",
  },
  {
    title: "The Secret World of Arrietty",
    year: 2010,
    platform: "Netflix",
    imdb: 7.5,
    runtime: "94 min",
    age: "7+",
    bgAudio: "No",
    category: "Giving to others",
    tags: ["ghibli", "perspective", "kindness", "small-big", "gentle"],
    note: "Perspective: what is small to one world is enormous to another. Kindness costs nothing.",
  },
  {
    title: "Ernest & Celestine",
    year: 2012,
    platform: "Netflix",
    imdb: 8.0,
    runtime: "80 min",
    age: "6+",
    bgAudio: "No",
    category: "Giving to others",
    tags: ["friendship", "outsiders", "watercolor", "acceptance", "French"],
    note: "A bear and a mouse become friends despite every rule saying they should not.",
  },
  {
    title: "Moana",
    year: 2016,
    platform: "Disney+",
    imdb: 7.6,
    runtime: "107 min",
    age: "6+",
    bgAudio: "Yes",
    category: "Giving to others",
    tags: ["identity", "courage", "Polynesian", "mythology", "leadership"],
    note: "Chooses the path that helps her people over what her family expects — without losing who she is.",
  },
  {
    title: "Encanto",
    year: 2021,
    platform: "Disney+",
    imdb: 7.2,
    runtime: "99 min",
    age: "6+",
    bgAudio: "Yes",
    category: "Sibling collaboration",
    tags: ["family", "identity", "gifts", "Colombia", "acceptance"],
    note: "Seeing family members as full people, not just as their most useful trait — and what that costs when you stop.",
  },
  {
    title: "How to Train Your Dragon",
    year: 2010,
    platform: "Netflix",
    imdb: 8.2,
    runtime: "98 min",
    age: "8+",
    bgAudio: "Unspecified",
    category: "Humility and perspective",
    tags: ["empathy", "outsider", "friendship", "Vikings", "disability"],
    note: "Becoming trustworthy to the thing everyone else fears. Changes an entire culture by listening instead of fighting.",
  },
  {
    title: "Paddington",
    year: 2014,
    platform: "Netflix",
    imdb: 7.8,
    runtime: "95 min",
    age: "6+",
    bgAudio: "No",
    category: "Giving to others",
    tags: ["kindness", "empathy", "outsider", "London", "British"],
    note: "Consistent kindness even when mistreated — a small bear who turns strangers into neighbours.",
  },
];

const importedMovies = [
  importedMovie("Abominable", 2019, false, ["animated", "adventure", "cgi"]),
  importedMovie("Luca", 2021, true, ["animated", "cgi", "emotional"]),
  importedMovie("Ron's Gone Wrong", 2021, false, ["animated", "robots"]),
  importedMovie("The Bad Guys", 2022, true, ["animated", "comedy", "adventure"]),
  importedMovie("Rio", 2011, true, ["animated", "music", "adventure"]),
  importedMovie("Next Gen", 2018, true, ["animated", "robots"]),
  importedMovie("Legend of the Guardians: The Owls of Ga'Hoole", 2010, true, ["animated", "adventure", "fantasy"]),
  importedMovie("Tangled", 2010, true, ["animated", "fairy-tale", "music"]),
  importedMovie("The Lego Movie", 2014, true, ["animated", "comedy", "creativity"]),
  importedMovie("Meet the Robinsons", 2007, false, ["animated", "family", "future"]),
  importedMovie("Spirit: Stallion of the Cimarron", 2002, false, ["animated", "adventure"]),
  importedMovie("Mary and Max", 2009, false, ["animated", "stop-motion", "emotional"]),
  importedMovie("The Croods", 2013, true, ["animated", "family", "adventure"]),
  importedMovie("The Tale of Despereaux", 2008, false, ["animated", "storybook"]),
  importedMovie("The Good Dinosaur", 2015, true, ["animated", "family"]),
  importedMovie("Rango", 2011, true, ["animated", "western", "comedy"]),
  importedMovie("Puss in Boots", 2011, true, ["animated", "adventure", "comedy"]),
  importedMovie("Flushed Away", 2006, false, ["animated", "comedy"]),
  importedMovie("The Great Mouse Detective", 1986, false, ["animated", "mystery"]),
  importedMovie("Big Hero 6", 2014, true, ["animated", "teamwork", "superhero"]),
  importedMovie("Dragon Hunters: Chasseurs de dragons", 2008, false, ["animated", "fantasy", "adventure"]),
  importedMovie("Surf's Up", 2007, true, ["animated", "sports", "comedy"]),
  importedMovie("Epic", 2013, false, ["animated", "fantasy", "adventure"]),
  importedMovie("Turning Red", 2022, false, ["animated", "family", "identity"]),
  importedMovie("The Iron Giant", 1999, true, ["animated", "emotional", "friendship"]),
  importedMovie("Megamind", 2010, false, ["animated", "comedy", "superhero"]),
  importedMovie("Dinosaur", 2000, false, ["animated", "adventure"]),
  importedMovie("Migration", 2023, true, ["animated", "family", "adventure"]),
  importedMovie("The Road to El Dorado", 2000, true, ["animated", "adventure", "comedy"]),
  importedMovie("Atlantis: The Lost Empire", 2001, false, ["animated", "adventure"]),
  importedMovie("The Emperor's New Groove", 2000, false, ["animated", "comedy"]),
  importedMovie("Hercules", 1997, false, ["animated", "mythology", "music"]),
  importedMovie("Lion King", 1994, true, ["animated", "family", "music"]),
  importedMovie("The Return of Jafar", 1994, true, ["animated", "adventure"]),
  importedMovie("The Princess and the Frog", 2009, false, ["animated", "music", "fairy-tale"]),
  importedMovie("The Hunchback of Notre Dame", 1996, false, ["animated", "music"]),
  importedMovie("Pinocchio", 1940, false, ["animated", "classic"]),
  importedMovie("Peter Pan", 1991, true, ["animated", "classic", "adventure"]),
  importedMovie("Robin Hood", 1973, true, ["animated", "classic", "adventure"]),
  importedMovie("The Sword in the Stone", 1963, true, ["animated", "classic", "fantasy"]),
  importedMovie("Nimona", 2023, true, ["animated", "identity", "adventure"]),
  importedMovie("Robots", 2005, true, ["animated", "comedy", "robots"]),
  importedMovie("Wolfwalkers", 2020, true, ["animated", "folklore", "siblings"]),
  importedMovie("The Monkey King", 2023, true, ["animated", "folklore", "adventure"]),
  importedMovie("Orion and the Dark", 2024, true, ["animated", "fear", "friendship"]),
  importedMovie("In Your Dreams", 2025, true, ["animated", "siblings", "dreams"]),
  importedMovie("Jumanji", 1995, true, ["adventure", "family"]),
  importedMovie("The Mask", 1994, true, ["comedy", "fantasy"]),
  importedMovie("Pay It Forward", 2000, true, ["kindness", "generosity"]),
  importedMovie("The NeverEnding Story", 1984, true, ["fantasy", "classic"]),
];

const importedWatchHistory = [
  { title: "Klaus", year: 2019, initialWatched: true, stateOnly: true },
  { title: "Song of the Sea", year: 2014, initialWatched: true, stateOnly: true },
  { title: "Kubo and the Two Strings", year: 2016, initialWatched: true, stateOnly: true },
  { title: "Wolfwalkers", initialWatched: true, stateOnly: true },
  { title: "Big Hero 6", initialWatched: true, stateOnly: true },
  { title: "The Monkey King", initialWatched: true, stateOnly: true },
  { title: "Orion and the Dark", initialWatched: true, stateOnly: true },
  { title: "In Your Dreams", initialWatched: true, stateOnly: true },
  { title: "Jumanji", initialWatched: true, stateOnly: true },
  { title: "The Mask", initialWatched: true, stateOnly: true },
  { title: "Pay It Forward", initialWatched: true, stateOnly: true },
  { title: "The NeverEnding Story", initialWatched: true, stateOnly: true },
];

const movies = mergeMovieRecords([...curatedMovies, ...importedMovies, ...importedWatchHistory]);

const els = {
  search: document.querySelector("#searchInput"),
  category: document.querySelector("#categoryFilter"),
  status: document.querySelector("#statusFilter"),
  sort: document.querySelector("#sortFilter"),
  bgAudio: document.querySelector("#bgAudioFilter"),
  tags: document.querySelector("#tagsContainer"),
  count: document.querySelector("#resultsCount"),
  list: document.querySelector("#resultsList"),
  empty: document.querySelector("#emptyState"),
  movieTotal: document.querySelector("#movieTotal"),
  watchedTotal: document.querySelector("#watchedTotal"),
};

let saved = readSavedState();
let selectedTags = new Set();
let searchDebounceTimer = null;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function readSavedState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch (_error) {
    return {};
  }
}

function writeSavedState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}

function movieKey(movie) {
  return `${movie.title}-${movie.year}`;
}

function getMovieState(movie) {
  return resolveMovieState(movie, saved[movieKey(movie)]);
}

function setMovieState(movie, next) {
  saved[movieKey(movie)] = { ...getMovieState(movie), ...next };
  writeSavedState();
  render();
}

function allTags() {
  return [...new Set(movies.flatMap((movie) => movie.tags))].sort();
}

function renderOptions() {
  const categories = [...new Set(movies.map((movie) => movie.category))].sort();
  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    els.category.appendChild(option);
  }

  for (const tag of allTags()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tag-chip";
    button.textContent = tag;
    button.addEventListener("click", () => {
      if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
      } else {
        selectedTags.add(tag);
      }
      button.classList.toggle("active", selectedTags.has(tag));
      render();
    });
    els.tags.appendChild(button);
  }
}

function filteredMovies() {
  const query = els.search.value.trim().toLowerCase();
  let result = movies.filter((movie) => {
    const state = getMovieState(movie);
    const haystack = `${movie.title} ${movie.platform} ${movie.category} ${movie.tags.join(" ")} ${movie.note}`.toLowerCase();
    const statusOk =
      els.status.value === "all" ||
      (els.status.value === "watched" && state.watched) ||
      (els.status.value === "unwatched" && !state.watched);
    const bgOk = els.bgAudio.value === "all" || movie.bgAudio === els.bgAudio.value;
    const categoryOk = !els.category.value || movie.category === els.category.value;
    const tagOk = !selectedTags.size || [...selectedTags].every((tag) => movie.tags.includes(tag));
    return (!query || haystack.includes(query)) && statusOk && bgOk && categoryOk && tagOk;
  });

  result = result.sort((a, b) => {
    switch (els.sort.value) {
      case "year_desc":
        return b.year - a.year;
      case "imdb_desc":
        return (b.imdb ?? -Infinity) - (a.imdb ?? -Infinity);
      case "platform_az":
        return a.platform.localeCompare(b.platform) || a.title.localeCompare(b.title);
      case "title_az":
      default:
        return a.title.localeCompare(b.title);
    }
  });

  return result;
}

function createMovieCard(movie) {
  const state = getMovieState(movie);
  const article = document.createElement("article");
  article.className = "movie-card";
  article.classList.toggle("watched", state.watched);

  const stars = Array.from({ length: 5 }, (_, index) => {
    const value = index + 1;
    const active = state.rating >= value ? " active" : "";
    return `<button type="button" class="star-btn${active}" data-rating="${value}" aria-label="Rate ${value} out of 5">★</button>`;
  }).join("");

  article.innerHTML = `
    <div class="movie-head">
      <div>
        <h2>${movie.title}</h2>
        <p>${movie.year ?? "Year pending"} · ${movie.runtime} · ${movie.imdb === null ? "IMDb pending" : `IMDb ${movie.imdb.toFixed(1)}`}</p>
      </div>
      <button type="button" class="watch-btn">${state.watched ? "Watched" : "Mark watched"}</button>
    </div>
    <div class="movie-meta">
      <span>${movie.platform}</span>
      <span>${movie.age}</span>
      <span>BG audio: ${movie.bgAudio}</span>
      <span>${movie.category}</span>
    </div>
    <p class="movie-note">${movie.note}</p>
    <div class="tag-list">${movie.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
    <div class="rating-row">
      <span>Family rating</span>
      <span class="stars">${stars}</span>
    </div>
  `;

  article.querySelector(".watch-btn").addEventListener("click", () => {
    setMovieState(movie, { watched: !state.watched });
  });

  article.querySelectorAll(".star-btn").forEach((button) => {
    button.addEventListener("click", () => {
      setMovieState(movie, { rating: Number(button.dataset.rating) });
    });
  });

  return article;
}

function render() {
  const result = filteredMovies();
  els.movieTotal.textContent = String(movies.length);
  els.watchedTotal.textContent = String(movies.filter((movie) => getMovieState(movie).watched).length);
  els.count.textContent = `${result.length} recommendation${result.length === 1 ? "" : "s"}`;
  els.list.innerHTML = "";
  els.empty.classList.toggle("hidden", result.length > 0);

  for (const movie of result) {
    els.list.appendChild(createMovieCard(movie));
  }

  document.querySelectorAll("#resultsList .movie-card").forEach((card, index) => {
    if (reducedMotion.matches) {
      card.style.removeProperty("--movie-stagger-step");
      return;
    }
    card.style.setProperty("--movie-stagger-step", String(Math.min(index, 10)));
  });
}

function wire() {
  els.search.addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(render, 120);
  });

  [els.category, els.status, els.sort, els.bgAudio].forEach((el) => {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });
  reducedMotion.addEventListener("change", render);
}

renderOptions();
wire();
render();
