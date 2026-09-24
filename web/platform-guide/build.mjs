import fs from 'fs/promises';
import path from 'path';

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

async function build() {
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
    let entries = [];
    try {
      const data = await fs.readFile(path.join('web/platform-guide/data', `${sec.id}.json`), 'utf-8');
      entries = JSON.parse(data);
    } catch (e) {
      // Create empty if missing
      await fs.writeFile(path.join('web/platform-guide/data', `${sec.id}.json`), '[]');
    }

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

    const getStatus = (entry) => {
      if (entry.expiry && new Date(entry.expiry) < now) return 'is-expired';
      const days = (now - new Date(entry.last_verified)) / (1000 * 60 * 60 * 24);
      if (days > 90) return 'is-stale';
      return 'active';
    };

    const renderCard = (entry) => {
      const status = getStatus(entry);
      const staleBadge = status === 'is-stale' ? '<span class="badge">Stale</span>' : '';
      const expBadge = status === 'is-expired' ? '<span class="badge">Expired</span>' : '';
      const classes = `card entry-card ${status}`;

      return `
        <div class="${classes}" data-name="${entry.name.toLowerCase()}" data-date="${entry.last_verified}">
          ${staleBadge}${expBadge}
          <div class="card-title"><a href="${entry.url}" target="_blank">${entry.name}</a></div>
          <div class="note">${entry.note}</div>
          <div class="field"><div class="label">Good At</div><div>${entry.good}</div></div>
          <div class="field bad-at"><div class="label">Bad At</div><div>${entry.bad}</div></div>
          <div class="field"><div class="label">Pricing & Hosting</div><div>${entry.price}</div></div>
          <div class="meta">
            <span>Verified: ${entry.last_verified}</span>
            ${entry.expiry ? `<span>Expires: ${entry.expiry}</span>` : ''}
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
      let statusStr = '';
      if (status === 'is-stale') statusStr = ' <span style="color:var(--stale)">(Stale)</span>';
      if (status === 'is-expired') statusStr = ' <span style="color:var(--danger)">(Expired)</span>';

      return `
        <tr class="entry-row" data-name="${entry.name.toLowerCase()}" data-date="${entry.last_verified}">
          <td><a href="${entry.url}" style="color:white;font-weight:bold;">${entry.name}</a>${statusStr}</td>
          <td class="td-good">${entry.good}</td>
          <td class="td-bad">${entry.bad}</td>
          <td>${entry.price}</td>
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
      <p style="color: var(--text-secondary); margin-bottom: 2rem;">Submissions require a personal note and the "bad at" field. It will queue for review as pending.</p>
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
      <div id="submit-success" style="display:none; color: #6bd484; margin-top: 1rem; font-weight: bold;">
        Submission queued for review (visible pending state).
      </div>
    </section>
  </div>

  <script>
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
        if (sort !== 'default') {
          const grid = sec.querySelector('.grid');
          const tbody = sec.querySelector('tbody');

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
        document.getElementById('submit-success').style.display = 'block';
        this.reset();
        setTimeout(() => document.getElementById('submit-success').style.display = 'none', 3000);
      }
    });
  </script>
</body>
</html>
`;

  await fs.writeFile('web/platform-guide/index.html', html);
  console.log('Build complete.');
}

build();
