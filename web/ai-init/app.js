(function () {
  "use strict";

  const api = window.AIInitGlossary;
  if (!api) {
    return;
  }

  const input = document.getElementById("search-input");
  const clearButton = document.getElementById("clear-search");
  const resultsList = document.getElementById("results-list");
  const resultsStatus = document.getElementById("results-status");
  const entryCount = document.getElementById("entry-count");
  const library = document.getElementById("library");
  const toast = document.getElementById("copy-toast");

  const categories = api.buildHierarchy();
  entryCount.textContent = String(api.entries.length);

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () {
      toast.classList.remove("visible");
    }, 1400);
  }

  function createAccordion(title, count, levelClass) {
    const section = document.createElement("section");
    section.className = "accordion " + levelClass;

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "accordion-trigger";
    trigger.setAttribute("aria-expanded", "false");

    const name = document.createElement("span");
    name.className = "accordion-title";
    name.textContent = title;

    const right = document.createElement("span");
    right.style.display = "inline-flex";
    right.style.alignItems = "center";
    right.style.gap = "8px";

    const countEl = document.createElement("span");
    countEl.className = "accordion-count";
    countEl.textContent = String(count);

    const chevron = document.createElement("span");
    chevron.className = "accordion-chevron";
    chevron.textContent = ">";

    right.appendChild(countEl);
    right.appendChild(chevron);
    trigger.appendChild(name);
    trigger.appendChild(right);

    const panel = document.createElement("div");
    panel.className = "accordion-panel";

    const inner = document.createElement("div");
    inner.className = "accordion-inner";

    panel.appendChild(inner);
    section.appendChild(trigger);
    section.appendChild(panel);

    trigger.addEventListener("click", function () {
      const open = !section.classList.contains("open");
      section.classList.toggle("open", open);
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
    });

    return {
      root: section,
      inner: inner,
    };
  }

  function createEntryCard(entry, cardClass) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = cardClass;

    const title = document.createElement("div");
    title.className = "entry-title";

    const abbr = document.createElement("span");
    abbr.className = "entry-abbr";
    abbr.textContent = entry.abbr;

    const expansion = document.createElement("span");
    expansion.className = "entry-expansion";
    expansion.textContent = entry.expansion;

    title.appendChild(abbr);
    title.appendChild(expansion);

    const desc = document.createElement("p");
    desc.className = "entry-desc";
    desc.textContent = entry.desc;

    const meta = document.createElement("div");
    meta.className = "entry-meta";

    const categoryBadge = document.createElement("span");
    categoryBadge.className = "badge";
    categoryBadge.textContent = entry.category;
    meta.appendChild(categoryBadge);

    const subBadge = document.createElement("span");
    subBadge.className = "badge";
    subBadge.textContent = entry.subcategory;
    meta.appendChild(subBadge);

    button.appendChild(title);
    button.appendChild(desc);
    button.appendChild(meta);

    button.addEventListener("click", function () {
      api.copyEntry(entry).then(function (ok) {
        showToast(ok ? "Copied: " + entry.abbr : "Clipboard copy failed");
      });
    });

    return button;
  }

  function renderLibrary() {
    library.innerHTML = "";

    categories.forEach(function (category) {
      const categoryAcc = createAccordion(category.name, category.count, "category");

      category.subcategories.forEach(function (subcategory) {
        const subAcc = createAccordion(subcategory.name, subcategory.count, "subcategory");
        const grid = document.createElement("div");
        grid.className = "entry-grid";

        subcategory.entries.forEach(function (entry) {
          grid.appendChild(createEntryCard(entry, "entry-card"));
        });

        subAcc.inner.appendChild(grid);
        categoryAcc.inner.appendChild(subAcc.root);
      });

      library.appendChild(categoryAcc.root);
    });
  }

  function renderResults(query) {
    const clean = String(query || "").trim();
    resultsList.innerHTML = "";

    if (!clean) {
      resultsStatus.textContent = "Type in the search bar to start";
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Search by abbreviation, expansion, or description. Example: RAG, vector, rate-limit.";
      resultsList.appendChild(empty);
      return;
    }

    const matches = api.search(clean, 80);
    resultsStatus.textContent = matches.length + " matches";

    if (matches.length === 0) {
      const none = document.createElement("div");
      none.className = "empty-state";
      none.textContent = "No matches found for \"" + clean + "\".";
      resultsList.appendChild(none);
      return;
    }

    matches.forEach(function (entry) {
      resultsList.appendChild(createEntryCard(entry, "result-card"));
    });
  }

  input.addEventListener("input", function () {
    renderResults(input.value);
  });

  clearButton.addEventListener("click", function () {
    input.value = "";
    input.focus();
    renderResults("");
  });

  renderLibrary();
  renderResults("");
})();
