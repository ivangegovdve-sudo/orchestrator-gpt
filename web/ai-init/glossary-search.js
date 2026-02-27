(function (global) {
  "use strict";

  const rawData = Array.isArray(global.AI_INIT_GLOSSARY_DATA) ? global.AI_INIT_GLOSSARY_DATA : [];

  function toText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function toList(value) {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map(toText).filter(Boolean);
  }

  function normalize(value) {
    return toText(value).toLowerCase();
  }

  function slugify(value) {
    const clean = normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return clean || "entry";
  }

  function labelize(value) {
    const text = toText(value);
    if (!text) {
      return "General";
    }
    return text
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/(^|\s)([a-z])/g, function (_, space, letter) {
        return space + letter.toUpperCase();
      });
  }

  function pickSubcategory(entry) {
    if (entry.tags.length > 0) {
      return labelize(entry.tags[0]);
    }
    if (entry.related.length > 0) {
      return "Related Concepts";
    }
    if (entry.incoming.length > 0) {
      return "Incoming Links";
    }
    return "General";
  }

  function normalizeEntry(raw, index) {
    const abbr = toText(raw && raw.abbr) || "Entry " + (index + 1);
    const expansion = toText(raw && raw.expansion) || "(No expansion provided)";
    const desc = toText(raw && raw.desc) || "No description available.";
    const category = toText(raw && raw.category) || "Uncategorized";
    const tags = toList(raw && raw.tags);
    const related = toList(raw && raw.related);
    const incoming = toList(raw && raw.incoming);
    const subcategory = pickSubcategory({ tags: tags, related: related, incoming: incoming });

    const searchBlob = normalize([
      abbr,
      expansion,
      desc,
      category,
      subcategory,
      tags.join(" "),
      related.join(" "),
      incoming.join(" "),
    ].join(" "));

    return {
      id: slugify(abbr) + "-" + (index + 1),
      abbr: abbr,
      expansion: expansion,
      desc: desc,
      category: category,
      subcategory: subcategory,
      tags: tags,
      related: related,
      incoming: incoming,
      abbrNorm: normalize(abbr),
      expansionNorm: normalize(expansion),
      descNorm: normalize(desc),
      searchBlob: searchBlob,
    };
  }

  const entries = rawData.map(normalizeEntry).sort(function (a, b) {
    return a.abbr.localeCompare(b.abbr, undefined, { sensitivity: "base" });
  });

  function buildHierarchy(source) {
    const list = Array.isArray(source) ? source : entries;
    const categoryMap = new Map();

    list.forEach(function (entry) {
      if (!categoryMap.has(entry.category)) {
        categoryMap.set(entry.category, new Map());
      }
      const subMap = categoryMap.get(entry.category);
      if (!subMap.has(entry.subcategory)) {
        subMap.set(entry.subcategory, []);
      }
      subMap.get(entry.subcategory).push(entry);
    });

    return Array.from(categoryMap.entries())
      .sort(function (a, b) {
        return a[0].localeCompare(b[0], undefined, { sensitivity: "base" });
      })
      .map(function (pair) {
        const categoryName = pair[0];
        const subMap = pair[1];
        const subcategories = Array.from(subMap.entries())
          .sort(function (a, b) {
            return a[0].localeCompare(b[0], undefined, { sensitivity: "base" });
          })
          .map(function (subPair) {
            const subName = subPair[0];
            const subEntries = subPair[1].slice().sort(function (a, b) {
              return a.abbr.localeCompare(b.abbr, undefined, { sensitivity: "base" });
            });
            return {
              name: subName,
              count: subEntries.length,
              entries: subEntries,
            };
          });

        const count = subcategories.reduce(function (sum, sub) {
          return sum + sub.count;
        }, 0);

        return {
          name: categoryName,
          count: count,
          subcategories: subcategories,
        };
      });
  }

  function scoreEntry(entry, query, tokens) {
    if (!tokens.every(function (token) { return entry.searchBlob.includes(token); })) {
      return -1;
    }

    let score = 0;

    if (entry.abbrNorm === query) {
      score += 350;
    } else if (entry.abbrNorm.startsWith(query)) {
      score += 240;
    } else if (entry.abbrNorm.includes(query)) {
      score += 190;
    }

    if (entry.expansionNorm.startsWith(query)) {
      score += 150;
    } else if (entry.expansionNorm.includes(query)) {
      score += 110;
    }

    if (entry.descNorm.includes(query)) {
      score += 45;
    }

    tokens.forEach(function (token) {
      if (entry.abbrNorm === token) {
        score += 120;
      } else if (entry.abbrNorm.startsWith(token)) {
        score += 70;
      }
      if (entry.expansionNorm.includes(token)) {
        score += 35;
      }
      if (entry.descNorm.includes(token)) {
        score += 20;
      }
    });

    return score;
  }

  function search(query, limit) {
    const cleanQuery = normalize(query);
    if (!cleanQuery) {
      return [];
    }

    const max = Number.isFinite(limit) ? Math.max(1, limit) : 60;
    const tokens = cleanQuery.split(/\s+/).filter(Boolean);

    return entries
      .map(function (entry) {
        return {
          entry: entry,
          score: scoreEntry(entry, cleanQuery, tokens),
        };
      })
      .filter(function (item) {
        return item.score >= 0;
      })
      .sort(function (a, b) {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.entry.abbr.localeCompare(b.entry.abbr, undefined, { sensitivity: "base" });
      })
      .slice(0, max)
      .map(function (item) {
        return item.entry;
      });
  }

  function formatEntry(entry) {
    const lines = [
      entry.abbr + " - " + entry.expansion,
      "Category: " + entry.category + " > " + entry.subcategory,
      "Description: " + entry.desc,
    ];

    if (entry.tags.length > 0) {
      lines.push("Tags: " + entry.tags.join(", "));
    }

    return lines.join("\n");
  }

  async function copyText(text) {
    if (global.navigator && global.navigator.clipboard && global.isSecureContext) {
      try {
        await global.navigator.clipboard.writeText(text);
        return true;
      } catch (_) {
      }
    }

    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "readonly");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.left = "-1000px";
    document.body.appendChild(area);
    area.focus();
    area.select();

    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (_) {
      ok = false;
    }

    document.body.removeChild(area);
    return ok;
  }

  function copyEntry(entry) {
    return copyText(formatEntry(entry));
  }

  function resolveElement(input) {
    if (!input) {
      return null;
    }
    if (typeof input === "string") {
      return document.querySelector(input);
    }
    return input;
  }

  function createBasicResultCard(entry) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ai-init-result-card";
    button.style.width = "100%";
    button.style.textAlign = "left";
    button.style.padding = "10px";
    button.style.border = "1px solid rgba(122, 162, 255, 0.25)";
    button.style.borderRadius = "10px";
    button.style.background = "rgba(8, 13, 24, 0.92)";
    button.style.color = "#f5f7ff";
    button.style.cursor = "pointer";
    button.innerHTML = "<strong>" + escapeHtml(entry.abbr) + "</strong> - " + escapeHtml(entry.expansion) + "<br><small style=\"color:#97a6c9\">" + escapeHtml(entry.category + " > " + entry.subcategory) + "</small>";
    return button;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function mountSearch(options) {
    const config = options || {};
    const input = resolveElement(config.input);
    const resultsContainer = resolveElement(config.resultsContainer || config.results);

    if (!input || !resultsContainer) {
      throw new Error("mountSearch requires both input and resultsContainer.");
    }

    const limit = Number.isFinite(config.limit) ? config.limit : 40;
    const emptyText = toText(config.emptyText) || "Type to search the glossary.";
    const noResultsText = toText(config.noResultsText) || "No matches found.";
    const renderCard = typeof config.renderCard === "function" ? config.renderCard : createBasicResultCard;
    const onCopy = typeof config.onCopy === "function" ? config.onCopy : function () {};

    function render() {
      const query = toText(input.value);
      resultsContainer.innerHTML = "";

      if (!query) {
        const empty = document.createElement("div");
        empty.textContent = emptyText;
        empty.style.color = "#97a6c9";
        empty.style.fontSize = "0.92rem";
        resultsContainer.appendChild(empty);
        return;
      }

      const matches = search(query, limit);
      if (matches.length === 0) {
        const none = document.createElement("div");
        none.textContent = noResultsText;
        none.style.color = "#97a6c9";
        none.style.fontSize = "0.92rem";
        resultsContainer.appendChild(none);
        return;
      }

      matches.forEach(function (entry) {
        const card = renderCard(entry);
        card.addEventListener("click", function () {
          copyEntry(entry).then(function (ok) {
            onCopy(entry, ok);
          });
        });
        resultsContainer.appendChild(card);
      });
    }

    input.addEventListener("input", render);
    render();

    return {
      render: render,
      destroy: function () {
        input.removeEventListener("input", render);
      },
    };
  }

  global.AIInitGlossary = {
    entries: entries,
    buildHierarchy: buildHierarchy,
    search: search,
    formatEntry: formatEntry,
    copyEntry: copyEntry,
    mountSearch: mountSearch,
    escapeHtml: escapeHtml,
  };
})(window);
