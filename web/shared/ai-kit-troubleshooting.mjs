/**
 * The AI-d kit curated troubleshooting entries: schema and renderer.
 *
 * WHAT THIS IS NOT
 * ---------------
 * The 108-entry record on the troubleshooting page is static HTML published from
 * `TROUBLESHOOTING.md`, and this file does not touch it. That record stays readable
 * with JavaScript off, which is also the fallback story for this section: if
 * `entries.json` cannot be read, the reader loses the curated entries and still has
 * the whole record below them. So this section never needs to invent content to fill
 * a gap.
 *
 * THE SHAPE IS FIXED
 * ------------------
 * Trinity writes entries against this schema in parallel with this file existing, so
 * the field names are not ours to rename: id, problem, symptom, cause, fix,
 * isWorkaround, and optional appliesTo. A change to any of those names is a message to
 * her before it is a commit. `entries.json` is a bare JSON array of those rows, which
 * is the shape she shipped; an object wrapping them under `entries` is also accepted.
 *
 * `isWorkaround` is rendered, not hidden. A workaround that is presented as a fix is
 * how a reader stops looking for the cause.
 *
 * MARKDOWN SUBSET
 * ---------------
 * Verbatim error text belongs in the symptom, in a code block, so the text fields
 * accept exactly three things: fenced ``` blocks, `inline code`, and blank-line
 * paragraph breaks. Everything else is escaped and shown literally. The subset is
 * this small on purpose — escaping first and then re-introducing three known
 * constructs cannot produce markup the data author did not ask for, whereas a general
 * markdown parser on a public page is an injection surface with a changelog.
 */

const REQUIRED_TEXT_FIELDS = Object.freeze(['problem', 'symptom', 'cause', 'fix']);

function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function escapeHtml(value) {
  return asText(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Escape everything, then re-introduce the three constructs we allow. Doing it in
 * this order means a `<script>` in the data is inert before any rule runs.
 */
export function renderRichText(value) {
  const text = typeof value === 'string' ? value : '';
  const fences = [];
  // Pull fenced blocks out first so their contents are never treated as prose.
  const withoutFences = text.replace(/```[a-z0-9]*\n?([\s\S]*?)```/gi, (_match, body) => {
    fences.push(body.replace(/\n$/, ''));
    return `\u0000FENCE${fences.length - 1}\u0000`;
  });

  const paragraphs = withoutFences
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const fence = /^\u0000FENCE(\d+)\u0000$/.exec(chunk);
      if (fence) return `<pre class="entry-code"><code>${escapeHtml(fences[Number(fence[1])])}</code></pre>`;
      const escaped = escapeHtml(chunk)
        .replaceAll('\n', '<br>')
        .replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
      // A paragraph can still contain a fence placeholder if the author put a block
      // mid-paragraph without a blank line; splice those in rather than printing the marker.
      return `<p>${escaped.replace(/\u0000FENCE(\d+)\u0000/g, (_m, index) => `</p><pre class="entry-code"><code>${escapeHtml(fences[Number(index)])}</code></pre><p>`)}</p>`;
    });
  return paragraphs.join('').replaceAll('<p></p>', '');
}

/** Every way one entry can be wrong, as a list of sentences. */
export function entryProblems(entry, index = 0) {
  const at = `entries[${index}]`;
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [`${at} is not an object`];
  const label = asText(entry.id) ? `entries[${index}] (${asText(entry.id)})` : at;
  const problems = [];

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(asText(entry.id))) {
    problems.push(`${label}: id must be a kebab-case slug`);
  }
  for (const field of REQUIRED_TEXT_FIELDS) {
    if (!asText(entry[field])) problems.push(`${label}: ${field} is required and must be a non-empty string`);
  }
  // Not optional and not defaulted. An entry whose author never decided whether it is
  // a real fix or a workaround is an entry that reads as a fix by omission.
  if (typeof entry.isWorkaround !== 'boolean') {
    problems.push(`${label}: isWorkaround is required and must be true or false`);
  }
  if (entry.appliesTo !== undefined && !asText(entry.appliesTo)) {
    problems.push(`${label}: appliesTo must be a non-empty string when present`);
  }
  return problems;
}

/**
 * The rows in a parsed `entries.json`, accepting the canonical bare array or an object
 * wrapping it under `entries`. Returns null — not an empty array — when the payload is
 * neither, so "unreadable" never collapses into "no entries".
 */
export function entryRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray(payload.entries)) return payload.entries;
  return null;
}

export function entryDocumentProblems(payload) {
  const rows = entryRows(payload);
  if (rows === null) return ['entries.json must be a JSON array of entry rows'];

  const problems = [];
  const seen = new Set();
  rows.forEach((entry, index) => {
    problems.push(...entryProblems(entry, index));
    const id = asText(entry?.id);
    if (!id) return;
    if (seen.has(id)) problems.push(`entries[${index}]: duplicate id ${id}`);
    seen.add(id);
  });
  return problems;
}

function field(name, label, value) {
  return [
    `<section class="troubleshooting-field" data-field="${name}">`,
    `<h4>${escapeHtml(label)}</h4>`,
    renderRichText(value),
    '</section>',
  ].join('');
}

export function renderEntry(entry, index = 0) {
  const problems = entryProblems(entry, index);
  // A malformed entry is shown as malformed. Rendering the fields it happens to have
  // would produce something that reads like advice and is missing the part that matters.
  if (problems.length > 0) {
    const list = problems.map((problem) => `<li>${escapeHtml(problem)}</li>`).join('');
    return [
      '<article class="troubleshooting-entry entry-invalid">',
      '<h3>Unusable entry record</h3>',
      '<p>This entry does not match the schema, so it is shown as broken rather than rendered as guidance.</p>',
      `<ul class="entry-problems">${list}</ul>`,
      '</article>',
    ].join('');
  }
  const badge = entry.isWorkaround
    ? '<p class="entry-badge entry-badge-workaround">WORKAROUND — this relieves the symptom without fixing the cause.</p>'
    : '<p class="entry-badge entry-badge-fix">FIX — this addresses the cause.</p>';
  const appliesTo = asText(entry.appliesTo)
    ? `<p class="entry-applies-to"><strong>Applies to:</strong> ${escapeHtml(entry.appliesTo)}</p>`
    : '';
  return [
    `<article class="troubleshooting-entry" id="entry-${escapeHtml(entry.id)}">`,
    `<h3>${escapeHtml(entry.problem)}</h3>`,
    badge,
    field('symptom', 'Symptom', entry.symptom),
    field('cause', 'Cause', entry.cause),
    field('fix', 'Fix', entry.fix),
    appliesTo,
    '</article>',
  ].join('');
}

export function renderEntriesInto(root, payload) {
  const entries = entryRows(payload);
  if (entries === null) throw new Error('entries_payload_not_an_array');
  if (!root) return entries;

  const status = root.querySelector('[data-entries-status]');
  if (status) {
    const invalid = entries.filter((entry, index) => entryProblems(entry, index).length > 0).length;
    const workarounds = entries.filter((entry) => entry?.isWorkaround === true).length;
    status.textContent = `${entries.length} curated entr${entries.length === 1 ? 'y' : 'ies'} from entries.json · ${workarounds} marked as workarounds · ${invalid} broken record(s).`;
  }

  const list = root.querySelector('[data-entries-list]');
  if (list) {
    list.innerHTML = entries.length
      ? entries.map((entry, index) => renderEntry(entry, index)).join('')
      : '<p class="offer-empty">No curated entries yet. The full record below is unaffected.</p>';
  }
  return entries;
}

export async function fetchEntries(url, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') throw new Error('entries_fetch_unavailable');
  const response = await fetchImpl(url, { headers: { accept: 'application/json' }, cache: 'no-cache' });
  if (!response.ok) throw new Error(`entries_http_${response.status}`);
  return response.json();
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-entries-app]');
  if (root) {
    const source = root.getAttribute('data-entries-src') || 'entries.json';
    fetchEntries(source)
      .then((payload) => renderEntriesInto(root, payload))
      .catch((error) => {
        const status = root.querySelector('[data-entries-status]');
        if (status) status.textContent = `entries.json could not be read (${error.message}). The full record below is unaffected.`;
        const list = root.querySelector('[data-entries-list]');
        if (list) list.innerHTML = '<p class="offer-empty">Not loaded — the curated entries file could not be read. Read the full record below.</p>';
        console.warn('AI-d kit troubleshooting entries could not be rendered', error);
      });
  }
}
