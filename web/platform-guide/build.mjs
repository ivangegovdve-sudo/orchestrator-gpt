import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const DATA_DIR = 'web/platform-guide/data';

const SECTIONS = [
  { id: 'harnesses', title: 'Harnesses' },
  { id: 'memory', title: 'Memory solutions and upgrades' },
  { id: 'skills', title: 'Skills and plugins' },
  { id: 'design', title: 'Design and graphics' },
  { id: 'animation', title: 'Animation' },
  { id: 'orchestration', title: 'Orchestration' },
  { id: 'autonomy', title: 'Agent autonomy' },
  { id: 'speech', title: 'Speech (TTS and STT)' }
];

/**
 * Read one section's entries. Only a MISSING file is treated as an empty
 * section (and created as `[]`). Any other read error, or JSON that does not
 * parse to an array, fails the build: overwriting the file with `[]` there
 * would destroy the existing source data.
 */
export async function readSectionEntries(dataDir, id) {
  const file = path.join(dataDir, `${id}.json`);
  let data;
  try {
    data = await fs.readFile(file, 'utf-8');
  } catch (e) {
    if (e && e.code === 'ENOENT') {
      await fs.writeFile(file, '[]', { flag: 'wx' });
      return [];
    }
    throw e;
  }
  let entries;
  try {
    entries = JSON.parse(data);
  } catch (e) {
    throw new Error(`${file}: invalid JSON (${e.message}); refusing to build over it`);
  }
  if (!Array.isArray(entries)) {
    throw new Error(`${file}: expected a JSON array of entries`);
  }
  return entries;
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape contributor-supplied text for HTML text and quoted attribute values. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** Only http(s) links are rendered; anything else (javascript:, data:, relative) becomes inert. */
export function safeUrl(value) {
  try {
    const u = new URL(String(value ?? ''));
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : '#';
  } catch {
    return '#';
  }
}

/**
 * Lifecycle of one entry at a given moment. A suggestion that is still pending, or that has no
 * valid verification date, is never shown as current. Expiry wins over staleness; more than 90
 * days since verification is stale. The browser runs this same function on load, so badges stay
 * correct between rebuilds.
 */
export function entryState(entry, now) {
  const verified = Date.parse(entry && entry.last_verified);
  if ((entry && entry.status === 'pending') || !Number.isFinite(verified)) return 'is-pending';
  const expiry = Date.parse(entry.expiry);
  if (Number.isFinite(expiry) && expiry < now) return 'is-expired';
  if ((now - verified) / 86400000 > 90) return 'is-stale';
  return 'active';
}

export async function build() {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Platform Guide</title>
  <style>
    :root {
      --bg-base: #0a0a0c;
      --bg-surface: #141417;
      --bg-elevated: #1e1e24;
      --text-primary: #e0e0e0;
      --text-secondary: #909096;
      --text-tertiary: #505056;
      --accent: #6b7bd4;
      --danger: #d46b6b;
      --danger-bg: rgba(212, 107, 107, 0.1);
      --stale: #c49a3f;
      --stale-bg: rgba(196, 154, 63, 0.1);
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
    }
    body {
      background: var(--bg-base);
      color: var(--text-primary);
      font-family: var(--font-sans);
      line-height: 1.6;
      margin: 0; padding: 0;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 4rem 2rem; }
    header { margin-bottom: 3rem; }
    h1 { font-size: 3rem; margin-bottom: 1rem; }
    .lede { font-size: 1.25rem; color: var(--text-secondary); max-width: 60ch; }

    .toolbar {
      display: flex; gap: 1rem; margin-bottom: 2rem; align-items: center;
      background: var(--bg-surface); padding: 1rem; border-radius: 8px;
    }
    .toolbar input, .toolbar select {
      background: var(--bg-elevated); color: white; border: 1px solid var(--text-tertiary);
      padding: 0.5rem 1rem; border-radius: 4px; font-family: var(--font-sans);
    }

    .nav-sections { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 4rem; }
    .nav-sections a {
      color: var(--text-secondary); text-decoration: none; padding: 0.5rem 1rem;
      background: var(--bg-surface); border-radius: 4px; font-size: 0.875rem;
    }
    .nav-sections a:hover { color: white; background: var(--bg-elevated); }

    .section-header {
      display: flex; justify-content: space-between; align-items: flex-end;
      margin: 4rem 0 2rem; border-bottom: 1px solid var(--bg-elevated); padding-bottom: 1rem;
    }
    h2 { font-size: 2rem; margin: 0; }

    .compare-toggle { display: none; }
    .compare-label {
      cursor: pointer; color: var(--accent); font-size: 0.875rem; user-select: none;
    }
    .compare-label::before { content: "⊟ View Comparison"; }
    input.compare-toggle:checked + .section-header .compare-label::before { content: "⊞ View Grid"; }

    .grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 2rem;
    }
    .comparison { display: none; overflow-x: auto; }

    input.compare-toggle:checked ~ .grid { display: none; }
    input.compare-toggle:checked ~ .comparison { display: block; }

    .card {
      background: var(--bg-surface); border-radius: 8px; padding: 1.5rem;
      border: 1px solid var(--bg-elevated); display: flex; flex-direction: column; gap: 1rem;
      position: relative;
    }
    .card.is-stale { border-color: var(--stale); background: var(--stale-bg); }
    .card.is-expired { opacity: 0.5; filter: grayscale(1); }

    .badge {
      position: absolute; top: -10px; right: 1rem; font-size: 0.75rem; font-weight: bold;
      padding: 0.25rem 0.5rem; border-radius: 4px; background: var(--bg-surface);
    }
    .card.is-stale .badge { color: var(--stale); border: 1px solid var(--stale); }
    .card.is-expired .badge { color: var(--danger); border: 1px solid var(--danger); }
    .card.is-pending { border-style: dashed; }
    .card.is-pending .badge { color: var(--text-secondary); border: 1px dashed var(--text-secondary); }
    [data-badge][hidden] { display: none; }

    .card-title a { color: white; text-decoration: none; font-size: 1.25rem; font-weight: bold; }
    .card-title a:hover { text-decoration: underline; }

    .note { font-style: italic; color: var(--text-secondary); border-left: 2px solid var(--accent); padding-left: 1rem; }

    .field { display: flex; flex-direction: column; gap: 0.25rem; }
    .label { font-size: 0.75rem; text-transform: uppercase; color: var(--text-tertiary); font-weight: bold; }

    .bad-at { background: var(--danger-bg); padding: 1rem; border-radius: 4px; border-left: 2px solid var(--danger); }
    .bad-at .label { color: var(--danger); }

    .meta { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-secondary); display: flex; justify-content: space-between; border-top: 1px solid var(--bg-elevated); padding-top: 1rem; margin-top: auto; }

    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; text-align: left; }
    th, td { padding: 1rem; border-bottom: 1px solid var(--bg-elevated); vertical-align: top; }
    th { background: var(--bg-surface); position: sticky; top: 0; }
    .td-bad { background: var(--danger-bg); width: 30%; }
    .td-good { width: 30%; }

    .submission-form {
      margin-top: 6rem; background: var(--bg-surface); padding: 2rem; border-radius: 8px;
      border: 1px dashed var(--bg-elevated);
    }
    .form-group { margin-bottom: 1.5rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: bold; }
    .form-group input, .form-group textarea, .form-group select {
      width: 100%; padding: 0.75rem; background: var(--bg-base); border: 1px solid var(--bg-elevated);
      color: white; border-radius: 4px; font-family: var(--font-sans); box-sizing: border-box;
    }
    .form-group textarea { min-height: 100px; resize: vertical; }
    button { background: var(--accent); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; font-weight: bold; }
    button:hover { filter: brightness(1.2); }

    .error-msg { color: var(--danger); font-size: 0.875rem; margin-top: 0.5rem; display: none; }
    .form-group.has-error .error-msg { display: block; }
    .form-group.has-error input, .form-group.has-error textarea { border-color: var(--danger); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Platform Guide</h1>
      <p class="lede">I need X, what should I actually use? A real opinion rather than a list. Adding one doesn't require a developer.</p>
    </header>

    <div class="toolbar" id="toolbar">
      <input type="text" id="search" placeholder="Search by name...">
      <select id="sort">
        <option value="default">Sort by: Default</option>
        <option value="recent">Sort by: Recently Verified</option>
        <option value="oldest">Sort by: Oldest Verified</option>
      </select>
    </div>

    <nav class="nav-sections">
`;
  html += SECTIONS.map(s => `<a href="#${s.id}">${s.title}</a>`).join('');
  html += `
    </nav>

    <div id="directory">
`;

  const now = new Date();

  for (const sec of SECTIONS) {
    const entries = await readSectionEntries(DATA_DIR, sec.id);

    if (entries.length === 0) continue;

    html += `
      <section id="${sec.id}" class="section-container">
        <input type="checkbox" id="compare-${sec.id}" class="compare-toggle">
        <div class="section-header">
          <h2>${sec.title}</h2>
          <label for="compare-${sec.id}" class="compare-label"></label>
        </div>

        <div class="grid">
    `;

    const getStatus = (entry) => entryState(entry, now.getTime());
    const dateAttrs = (entry) =>
      `data-verified="${escapeHtml(entry.last_verified)}" data-expiry="${escapeHtml(entry.expiry)}" data-pending="${entry.status === 'pending' ? '1' : ''}"`;
    const badges = (status) => [['is-stale', 'Stale'], ['is-expired', 'Expired'], ['is-pending', 'Unverified']]
      .map(([state, label]) => `<span class="badge" data-badge="${state}"${status === state ? '' : ' hidden'}>${label}</span>`).join('');

    const renderCard = (entry) => {
      const status = getStatus(entry);
      const classes = `card entry-card ${status}`;
      const verified = Number.isFinite(Date.parse(entry.last_verified)) ? escapeHtml(entry.last_verified) : 'not yet';

      return `
        <div class="${classes}" data-name="${escapeHtml(String(entry.name ?? '').toLowerCase())}" data-date="${escapeHtml(entry.last_verified)}" ${dateAttrs(entry)}>
          ${badges(status)}
           <div class="card-title"><a href="${escapeHtml(safeUrl(entry.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(entry.name)}</a></div>
          <div class="note">${escapeHtml(entry.note)}</div>
          <div class="field"><div class="label">Good At</div><div>${escapeHtml(entry.good)}</div></div>
          <div class="field bad-at"><div class="label">Bad At</div><div>${escapeHtml(entry.bad)}</div></div>
          <div class="field"><div class="label">Pricing & Hosting</div><div>${escapeHtml(entry.price)}</div></div>
          <div class="meta">
            <span>Verified: ${verified}</span>
            ${entry.expiry ? `<span>Expires: ${escapeHtml(entry.expiry)}</span>` : ''}
          </div>
        </div>
      `;
    };

    html += entries.map(renderCard).join('') + '</div>';

    // Comparison view
    html += `
        <div class="comparison">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th class="td-good">Good At</th>
                <th class="td-bad">Bad At</th>
                <th>Price Reality</th>
              </tr>
            </thead>
            <tbody>
    `;
    html += entries.map(entry => {
      const status = getStatus(entry);
      const label = { 'is-stale': '(Stale)', 'is-expired': '(Expired)', 'is-pending': '(Unverified)' }[status] || '';
      const statusStr = ` <span class="row-status" data-row-status>${label}</span>`;

      return `
         <tr class="entry-row ${status}" data-name="${escapeHtml(String(entry.name ?? '').toLowerCase())}" data-date="${escapeHtml(entry.last_verified)}" ${dateAttrs(entry)}>
           <td><a href="${escapeHtml(safeUrl(entry.url))}" rel="noopener noreferrer" style="color:white;font-weight:bold;">${escapeHtml(entry.name)}</a>${statusStr}</td>
          <td class="td-good">${escapeHtml(entry.good)}</td>
          <td class="td-bad">${escapeHtml(entry.bad)}</td>
          <td>${escapeHtml(entry.price)}</td>
        </tr>
      `;
    }).join('');

    html += `
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  html += `
    </div>

    <section class="submission-form" id="submit">
      <h2>Suggest an Entry</h2>
      <p style="color: var(--text-secondary); margin-bottom: 2rem;">Submissions require a personal note and the "bad at" field. This page is static and has no submission backend: nothing is sent or stored. Submitting produces a pending entry for you to copy into the matching file under <code>web/platform-guide/data/</code> in a pull request.</p>
      <form id="add-form">
        <div class="form-group">
          <label>Name</label>
          <input type="text" id="f-name" required>
        </div>
        <div class="form-group">
          <label>URL</label>
          <input type="url" id="f-url" required>
        </div>
        <div class="form-group">
          <label>Section</label>
          <select id="f-section">
`;
  html += SECTIONS.map(s => `<option value="${s.id}">${s.title}</option>`).join('');
  html += `
          </select>
        </div>
        <div class="form-group" id="group-note">
          <label>Personal Note (Why is it here?)</label>
          <textarea id="f-note" required></textarea>
          <div class="error-msg">A personal note is required.</div>
        </div>
        <div class="form-group">
          <label>What it is good at (Be specific)</label>
          <textarea id="f-good" required></textarea>
        </div>
        <div class="form-group" id="group-bad">
          <label>What it is bad at (Required)</label>
          <textarea id="f-bad" required></textarea>
          <div class="error-msg">You must specify what this tool is bad at. A tool with no downsides is an ad.</div>
        </div>
        <div class="form-group">
          <label>Price Reality</label>
          <input type="text" id="f-price" required>
        </div>
        <button type="submit">Submit for Review</button>
      </form>
      <div id="submit-result" role="status" style="display:none; margin-top: 1rem;">
        <p style="font-weight: bold;">Not submitted &mdash; nothing was sent or saved. Copy this pending entry into <code id="submit-target"></code> via a pull request:</p>
        <pre id="submit-json" style="white-space: pre-wrap; overflow-wrap: anywhere;"></pre>
      </div>
    </section>
  </div>

  <script>
    // Freshness is recomputed on every load with the same rules the build uses,
    // so an entry that expires or goes stale updates without a rebuild.
    const entryState = ${entryState.toString()};
    function refreshStatuses() {
      const now = Date.now();
      document.querySelectorAll('.entry-card, .entry-row').forEach((el) => {
        const state = entryState({ last_verified: el.dataset.verified, expiry: el.dataset.expiry, status: el.dataset.pending ? 'pending' : '' }, now);
        el.classList.remove('active', 'is-stale', 'is-expired', 'is-pending');
        el.classList.add(state);
        el.querySelectorAll('[data-badge]').forEach((b) => { b.hidden = b.dataset.badge !== state; });
        const rowStatus = el.querySelector('[data-row-status]');
        if (rowStatus) rowStatus.textContent = { 'is-stale': '(Stale)', 'is-expired': '(Expired)', 'is-pending': '(Unverified)' }[state] || '';
      });
    }
    refreshStatuses();

    // Interactivity: filtering and sorting
    const searchInput = document.getElementById('search');
    const sortSelect = document.getElementById('sort');

    function updateView() {
      const q = searchInput.value.toLowerCase();
      const sort = sortSelect.value;

      document.querySelectorAll('.section-container').forEach(sec => {
        const cards = Array.from(sec.querySelectorAll('.entry-card'));
        const rows = Array.from(sec.querySelectorAll('.entry-row'));

        let visibleCount = 0;

        cards.forEach((card, i) => {
          const row = rows[i];
          const name = card.dataset.name;
          const match = name.includes(q);
          card.style.display = match ? '' : 'none';
          row.style.display = match ? '' : 'none';
          if (match) visibleCount++;
        });

        sec.style.display = visibleCount > 0 ? 'block' : 'none';

        // Sorting
        const grid = sec.querySelector('.grid');
        const tbody = sec.querySelector('tbody');

        if (sort === 'default') {
          const cards = Array.from(sec.querySelectorAll('.entry-card'));
          const rows = Array.from(sec.querySelectorAll('.entry-row'));
          cards.forEach((card, i) => {
            grid.appendChild(card);
            tbody.appendChild(rows[i]);
          });
        } else {
          const cards = Array.from(sec.querySelectorAll('.entry-card'));
          const rows = Array.from(sec.querySelectorAll('.entry-row'));

          const sortedIndices = cards.map((c, i) => i).sort((a, b) => {
            const dateA = new Date(cards[a].dataset.date);
            const dateB = new Date(cards[b].dataset.date);
            return sort === 'recent' ? dateB - dateA : dateA - dateB;
          });

          sortedIndices.forEach(idx => {
            grid.appendChild(cards[idx]);
            tbody.appendChild(rows[idx]);
          });
        }
      });
    }

    searchInput.addEventListener('input', updateView);
    sortSelect.addEventListener('change', updateView);

    // Form submission
    document.getElementById('add-form').addEventListener('submit', function(e) {
      e.preventDefault();

      const bad = document.getElementById('f-bad').value.trim();
      const note = document.getElementById('f-note').value.trim();

      let hasError = false;
      if (!bad) { document.getElementById('group-bad').classList.add('has-error'); hasError = true; }
      else { document.getElementById('group-bad').classList.remove('has-error'); }

      if (!note) { document.getElementById('group-note').classList.add('has-error'); hasError = true; }
      else { document.getElementById('group-note').classList.remove('has-error'); }

      if (!hasError) {
        // No backend exists, so do not claim the entry was queued. Hand the
        // reader the pending entry instead, and keep the form filled in.
        const value = (id) => document.getElementById(id).value.trim();
        const pending = {
          name: value('f-name'),
          url: value('f-url'),
          note: note,
          good: value('f-good'),
          bad: bad,
          price: value('f-price'),
          status: 'pending'
        };
        document.getElementById('submit-target').textContent =
          'web/platform-guide/data/' + value('f-section') + '.json';
        document.getElementById('submit-json').textContent = JSON.stringify(pending, null, 2);
        document.getElementById('submit-result').style.display = 'block';
      }
    });
  </script>
</body>
</html>
`;

  await fs.writeFile('web/platform-guide/index.html', html);
  console.log('Build complete.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build();
}
