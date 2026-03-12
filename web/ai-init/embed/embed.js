(function () {
  "use strict";

  var moduleApi = window.AIInitGlossaryModule;
  if (!moduleApi || typeof moduleApi.createGlossarySearch !== "function") {
    return;
  }

  var searchApi = window.AIInitGlossary || moduleApi.createGlossarySearch(window.AI_INIT_GLOSSARY_DATA || []);

  var input = document.getElementById("embed-search-input");
  var clear = document.getElementById("embed-search-clear");
  var results = document.getElementById("embed-results");
  var status = document.getElementById("status");

  // 🛡️ SECURITY: Prevent XSS by sanitizing user-provided or external text before inserting via innerHTML
  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function render() {
    var query = String(input.value || "").trim();
    results.innerHTML = "";

    if (!query) {
      results.innerHTML = "<div class=\"empty\">Type to search abbreviations.</div>";
      return;
    }

    var matches = searchApi.search(query, 10);
    if (!matches.length) {
      results.innerHTML = "<div class=\"empty\">No matches found.</div>";
      return;
    }

    matches.forEach(function (entry) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "result";
      btn.innerHTML = "<b>" + escapeHtml(entry.abbr) + "</b> — " + escapeHtml(entry.expansion);
      btn.addEventListener("click", function () {
        searchApi.copyEntry(entry).then(function (ok) {
          status.textContent = ok ? "Copied: " + searchApi.formatCopy(entry) : "Clipboard copy failed";
        });
      });
      results.appendChild(btn);
    });
  }

  input.addEventListener("input", render);
  clear.addEventListener("click", function () {
    input.value = "";
    status.textContent = "";
    render();
    input.focus();
  });

  render();
})();
