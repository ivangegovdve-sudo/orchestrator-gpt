(function (root, factory) {
  "use strict";

  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  }

  if (root) {
    root.AIInitGlossaryModule = factory();
    if (Array.isArray(root.AI_INIT_GLOSSARY_DATA)) {
      root.AIInitGlossary = root.AIInitGlossaryModule.createGlossarySearch(root.AI_INIT_GLOSSARY_DATA);
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function asText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function asList(value) {
    return Array.isArray(value) ? value.map(asText).filter(Boolean) : [];
  }

  function norm(value) {
    return asText(value).toLowerCase();
  }

  function titleCase(value) {
    const text = asText(value)
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");
    if (!text) {
      return "General";
    }
    return text.replace(/(^|\s)([a-z])/g, function (_, space, letter) {
      return space + letter.toUpperCase();
    });
  }

  function slug(value) {
    return norm(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "entry";
  }

  function pickSubcategory(entry) {
    if (entry.tags.length > 0) {
      return titleCase(entry.tags[0]);
    }
    if (entry.related.length > 0) {
      return "Related";
    }
    if (entry.incoming.length > 0) {
      return "Incoming";
    }
    return "General";
  }

  function normalizeEntry(raw, index) {
    const abbr = asText(raw && raw.abbr) || "Entry " + (index + 1);
    const expansion = asText(raw && raw.expansion) || "(No expansion provided)";
    const desc = asText(raw && raw.desc) || "No description available.";
    const category = asText(raw && raw.category) || "Uncategorized";
    const tags = asList(raw && raw.tags);
    const related = asList(raw && raw.related);
    const incoming = asList(raw && raw.incoming);
    const subcategory = pickSubcategory({ tags: tags, related: related, incoming: incoming });

    const searchable = [abbr, expansion, desc, category, subcategory, tags.join(" "), related.join(" "), incoming.join(" ")]
      .join(" ")
      .toLowerCase();

    return {
      id: slug(abbr) + "-" + (index + 1),
      abbr: abbr,
      expansion: expansion,
      desc: desc,
      category: category,
      subcategory: subcategory,
      tags: tags,
      related: related,
      incoming: incoming,
      searchable: searchable,
      abbrNorm: norm(abbr),
      expansionNorm: norm(expansion),
      descNorm: norm(desc),
    };
  }

  function compareByAbbr(a, b) {
    return a.abbr.localeCompare(b.abbr, undefined, { sensitivity: "base" });
  }

  function rankEntry(entry, query, tokens) {
    if (!tokens.every(function (token) { return entry.searchable.indexOf(token) !== -1; })) {
      return -1;
    }

    let score = 0;

    if (entry.abbrNorm === query) {
      score += 500;
    } else if (entry.abbrNorm.indexOf(query) === 0) {
      score += 340;
    } else if (entry.abbrNorm.indexOf(query) !== -1) {
      score += 260;
    }

    if (entry.expansionNorm.indexOf(query) === 0) {
      score += 180;
    } else if (entry.expansionNorm.indexOf(query) !== -1) {
      score += 120;
    }

    if (entry.descNorm.indexOf(query) !== -1) {
      score += 70;
    }

    tokens.forEach(function (token) {
      if (entry.abbrNorm === token) {
        score += 140;
      } else if (entry.abbrNorm.indexOf(token) === 0) {
        score += 90;
      } else if (entry.abbrNorm.indexOf(token) !== -1) {
        score += 50;
      }

      if (entry.expansionNorm.indexOf(token) !== -1) {
        score += 28;
      }

      if (entry.descNorm.indexOf(token) !== -1) {
        score += 14;
      }
    });

    return score;
  }

  function buildHierarchy(entries) {
    const map = new Map();

    entries.forEach(function (entry) {
      if (!map.has(entry.category)) {
        map.set(entry.category, new Map());
      }

      const subMap = map.get(entry.category);
      if (!subMap.has(entry.subcategory)) {
        subMap.set(entry.subcategory, []);
      }
      subMap.get(entry.subcategory).push(entry);
    });

    return Array.from(map.entries())
      .sort(function (a, b) {
        return a[0].localeCompare(b[0], undefined, { sensitivity: "base" });
      })
      .map(function (pair) {
        const name = pair[0];
        const subMap = pair[1];
        const subcategories = Array.from(subMap.entries())
          .sort(function (a, b) {
            return a[0].localeCompare(b[0], undefined, { sensitivity: "base" });
          })
          .map(function (subPair) {
            const subName = subPair[0];
            const subEntries = subPair[1].slice().sort(compareByAbbr);
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
          name: name,
          count: count,
          subcategories: subcategories,
        };
      });
  }

  function formatCopy(entry) {
    return entry.abbr + " — " + entry.expansion;
  }

  async function copyText(text) {
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function" && typeof isSecureContext !== "undefined" && isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_error) {
      }
    }

    if (typeof document === "undefined") {
      return false;
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
    } catch (_error) {
      ok = false;
    }

    document.body.removeChild(area);
    return ok;
  }

  function createGlossarySearch(rawData) {
    const source = Array.isArray(rawData) ? rawData : [];
    const entries = source.map(normalizeEntry).sort(compareByAbbr);

    function search(query, limit) {
      const clean = norm(query);
      if (!clean) {
        return [];
      }

      const cap = Number.isFinite(limit) ? Math.max(1, limit) : 12;
      const tokens = clean.split(/\s+/).filter(Boolean);

      return entries
        .map(function (entry) {
          return {
            entry: entry,
            score: rankEntry(entry, clean, tokens),
          };
        })
        .filter(function (item) {
          return item.score >= 0;
        })
        .sort(function (a, b) {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          return compareByAbbr(a.entry, b.entry);
        })
        .slice(0, cap)
        .map(function (item) {
          return item.entry;
        });
    }

    function hierarchy() {
      return buildHierarchy(entries);
    }

    async function copyEntry(entry) {
      return copyText(formatCopy(entry));
    }

    return {
      entries: entries,
      search: search,
      hierarchy: hierarchy,
      formatCopy: formatCopy,
      copyEntry: copyEntry,
    };
  }

  return {
    createGlossarySearch: createGlossarySearch,
    normalizeEntry: normalizeEntry,
    rankEntry: rankEntry,
  };
});
