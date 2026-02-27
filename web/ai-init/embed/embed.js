(function () {
  "use strict";

  const api = window.AIInitGlossary;
  if (!api) {
    return;
  }

  const input = document.getElementById("embed-search");
  const clearButton = document.getElementById("embed-clear");
  const status = document.getElementById("copy-status");

  api.mountSearch({
    input: input,
    resultsContainer: document.getElementById("embed-results"),
    limit: 40,
    emptyText: "Type to search abbreviations, terms, or descriptions.",
    noResultsText: "No glossary match found.",
    onCopy: function (entry, ok) {
      status.textContent = ok ? "Copied: " + entry.abbr : "Clipboard copy failed for " + entry.abbr;
    },
  });

  clearButton.addEventListener("click", function () {
    input.value = "";
    input.dispatchEvent(new Event("input"));
    input.focus();
    status.textContent = "";
  });
})();
