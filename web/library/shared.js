// Shared utilities for Library hub pages
const API = '/api/library';

function getToken() { return sessionStorage.getItem('library_token') || ''; }
function setToken(t) { sessionStorage.setItem('library_token', t); }
function clearToken() { sessionStorage.removeItem('library_token'); }

function authHeaders() {
  const t = getToken();
  return t ? { 'Authorization': 'Bearer ' + t } : {};
}

async function apiGet(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API}/${path}${qs ? '?' + qs : ''}`;
  const r = await fetch(url, { headers: authHeaders() });
  if (r.status === 401 || r.status === 403) throw Object.assign(new Error('auth'), { status: r.status });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function apiPost(path, body = {}) {
  const r = await fetch(`${API}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (r.status === 401 || r.status === 403) throw Object.assign(new Error('auth'), { status: r.status });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function verifyPassword(pw) {
  const r = await fetch(`${API}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw }),
  });
  return r.ok;
}

// Render a search result card
function renderCard(result, source) {
  const scoreColor = result.score > 0.7 ? '#22c55e' : result.score > 0.4 ? '#0ea5e9' : '#a1a1aa';
  const safe = safeUrl(result.meta?.url);
  const urlHtml = safe
    ? `<a href="${safe}" class="card-link" target="_blank">↗ view</a>`
    : '';
  return `<div class="card">
    <div class="card-header">
      <span class="card-title">${escHtml(result.title)}</span>
      <span class="card-score" style="color:${scoreColor}">${(result.score * 100).toFixed(0)}%</span>
    </div>
    <p class="card-snippet">${escHtml(result.snippet)}</p>
    <div class="card-footer">
      <span class="card-source">${source}</span>
      ${urlHtml}
    </div>
  </div>`;
}

function safeUrl(u) {
  if (!u) return '';
  try {
    const parsed = new URL(u, window.location.origin);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch (e) {}
  return '';
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Show inline loading state
function setLoading(el, on) {
  el.style.opacity = on ? '0.5' : '1';
  el.style.pointerEvents = on ? 'none' : '';
}
