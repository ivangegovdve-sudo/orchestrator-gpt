(function () {
  "use strict";

  var moduleApi = window.AIInitGlossaryModule;
  if (!moduleApi || typeof moduleApi.createGlossarySearch !== "function") {
    return;
  }

  var searchApi = window.AIInitGlossary || moduleApi.createGlossarySearch(window.AI_INIT_GLOSSARY_DATA || []);

  var state = {
    homeResults: [],
    homeActiveIndex: -1,
    toastTimer: null,
    view: "home",
  };

  var homeView = document.getElementById("home-view");
  var libraryView = document.getElementById("library-view");
  var homeInput = document.getElementById("home-search-input");
  var homeSearchButton = document.getElementById("home-search-button");
  var homeLibraryButton = document.getElementById("home-library-button");
  var homeResults = document.getElementById("home-results");
  var homeCount = document.getElementById("home-count");

  var libraryTree = document.getElementById("library-tree");
  var libraryInput = document.getElementById("library-search-input");
  var librarySearchButton = document.getElementById("library-search-button");
  var libraryHomeButton = document.getElementById("library-home-button");
  var libraryResults = document.getElementById("library-results");

  var toast = document.getElementById("copy-toast");

  var LIBRARY_CACHE = searchApi.hierarchy();

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        fn.apply(null, args);
      }, wait);
    };
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(function () {
      toast.classList.remove("visible");
    }, 1400);
  }

  function switchView(next) {
    state.view = next;
    if (next === "library") {
      homeView.classList.remove("active");
      libraryView.classList.add("active");
      libraryInput.focus();
    } else {
      libraryView.classList.remove("active");
      homeView.classList.add("active");
      homeInput.focus();
    }
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function copyEntry(entry) {
    searchApi.copyEntry(entry).then(function (ok) {
      showToast(ok ? "Copied: " + searchApi.formatCopy(entry) : "Clipboard copy failed");
    });
  }

  function createResultItem(entry, index, active) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "result-item" + (active ? " active" : "");
    btn.dataset.index = String(index);
    btn.innerHTML = "<div class=\"result-top\"><span class=\"result-abbr\">" +
      escapeHtml(entry.abbr) +
      "</span><span class=\"result-expansion\">" +
      escapeHtml(entry.expansion) +
      "</span></div><p class=\"result-desc\">" +
      escapeHtml(entry.desc) +
      "</p>";

    btn.addEventListener("click", function () {
      copyEntry(entry);
    });

    return btn;
  }

  function renderHomeResults(query) {
    var clean = String(query || "").trim();
    homeCount.textContent = searchApi.entries.length + " entries indexed";

    if (!clean) {
      state.homeResults = [];
      state.homeActiveIndex = -1;
      homeResults.hidden = true;
      homeResults.innerHTML = "";
      return;
    }

    state.homeResults = searchApi.search(clean, 10);
    state.homeActiveIndex = state.homeResults.length ? 0 : -1;

    homeResults.hidden = false;
    homeResults.innerHTML = "";

    if (!state.homeResults.length) {
      homeResults.innerHTML = "<div class=\"empty-state\">No matching abbreviations.</div>";
      return;
    }

    state.homeResults.forEach(function (entry, index) {
      homeResults.appendChild(createResultItem(entry, index, index === state.homeActiveIndex));
    });
  }

  function refreshHomeActiveItem() {
    var items = homeResults.querySelectorAll(".result-item");
    items.forEach(function (item, idx) {
      item.classList.toggle("active", idx === state.homeActiveIndex);
      if (idx === state.homeActiveIndex) {
        item.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function makeAccordion(name, count, typeClass) {
    var section = document.createElement("section");
    section.className = "accordion " + typeClass;

    var trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "accordion-trigger";
    trigger.setAttribute("aria-expanded", "false");

    var left = document.createElement("span");
    left.className = "accordion-name";
    left.textContent = name;

    var right = document.createElement("span");
    right.className = "accordion-count";
    right.innerHTML = String(count) + " <span class=\"accordion-chevron\">></span>";

    trigger.appendChild(left);
    trigger.appendChild(right);

    var panel = document.createElement("div");
    panel.className = "accordion-panel";

    var inner = document.createElement("div");
    inner.className = "accordion-inner";

    panel.appendChild(inner);
    section.appendChild(trigger);
    section.appendChild(panel);

    trigger.addEventListener("click", function () {
      var isOpen = section.classList.toggle("open");
      trigger.setAttribute("aria-expanded", String(isOpen));
    });

    return {
      root: section,
      inner: inner,
    };
  }

  function createEntryButton(entry) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "entry-item";
    btn.innerHTML = "<div class=\"entry-row\"><span class=\"abbr\">" +
      escapeHtml(entry.abbr) +
      "</span><span class=\"expansion\">" +
      escapeHtml(entry.expansion) +
      "</span></div><div class=\"desc\">" +
      escapeHtml(entry.desc) +
      "</div>";

    btn.addEventListener("click", function () {
      copyEntry(entry);
    });

    return btn;
  }

  function renderLibraryTree() {
    libraryTree.innerHTML = "";

    LIBRARY_CACHE.forEach(function (category) {
      var categoryAcc = makeAccordion(category.name, category.count, "category");

      category.subcategories.forEach(function (subcategory) {
        var subAcc = makeAccordion(subcategory.name, subcategory.count, "subcategory");
        var entryList = document.createElement("div");
        entryList.className = "entry-list";

        subcategory.entries.forEach(function (entry) {
          entryList.appendChild(createEntryButton(entry));
        });

        subAcc.inner.appendChild(entryList);
        categoryAcc.inner.appendChild(subAcc.root);
      });

      libraryTree.appendChild(categoryAcc.root);
    });
  }

  function renderLibraryResults(query) {
    var clean = String(query || "").trim();

    if (!clean) {
      libraryResults.hidden = true;
      libraryResults.innerHTML = "";
      return;
    }

    var matches = searchApi.search(clean, 10);
    libraryResults.hidden = false;
    libraryResults.innerHTML = "";

    if (!matches.length) {
      libraryResults.innerHTML = "<div class=\"empty-state\">No matching abbreviations.</div>";
      return;
    }

    matches.forEach(function (entry, index) {
      libraryResults.appendChild(createResultItem(entry, index, false));
    });
  }

  var debouncedHomeSearch = debounce(function (value) {
    renderHomeResults(value);
  }, 90);

  var debouncedLibrarySearch = debounce(function (value) {
    renderLibraryResults(value);
  }, 90);

  homeInput.addEventListener("input", function (event) {
    debouncedHomeSearch(event.target.value);
  });

  homeSearchButton.addEventListener("click", function () {
    renderHomeResults(homeInput.value);
    homeInput.focus();
  });

  homeLibraryButton.addEventListener("click", function () {
    switchView("library");
  });

  homeInput.addEventListener("keydown", function (event) {
    if (!state.homeResults.length) {
      if (event.key === "Escape") {
        homeResults.hidden = true;
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      state.homeActiveIndex = (state.homeActiveIndex + 1) % state.homeResults.length;
      refreshHomeActiveItem();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      state.homeActiveIndex = (state.homeActiveIndex - 1 + state.homeResults.length) % state.homeResults.length;
      refreshHomeActiveItem();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (state.homeActiveIndex >= 0 && state.homeActiveIndex < state.homeResults.length) {
        copyEntry(state.homeResults[state.homeActiveIndex]);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      homeResults.hidden = true;
      return;
    }
  });

  libraryInput.addEventListener("input", function (event) {
    debouncedLibrarySearch(event.target.value);
  });

  librarySearchButton.addEventListener("click", function () {
    renderLibraryResults(libraryInput.value);
    libraryInput.focus();
  });

  libraryHomeButton.addEventListener("click", function () {
    switchView("home");
  });

  renderLibraryTree();
  renderHomeResults("");
})();
