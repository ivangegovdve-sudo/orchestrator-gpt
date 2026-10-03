import { LIVE_API_BASE } from './live-source.js';
const host = document.querySelector('[data-council-status]');
if (host) {
  const load = async () => {
    host.replaceChildren();
    const note = document.createElement('p'); note.textContent = 'Checking council status…'; host.append(note);
    try {
      const response = await fetch(`${LIVE_API_BASE}/council-status`, { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error('Unavailable');
      const state = await response.json();
      note.textContent = state.status === 'unconfigured' ? 'Jev endpoint has not been identified and configured. Seats are unknown.' : `Live status: ${String(state.status)} · ${state.observedAt || 'observation time unknown'}`;
      const list = document.createElement('ul');
      for (const seat of Array.isArray(state.seats) ? state.seats : []) {
        const item = document.createElement('li'); item.textContent = `${seat.role}: ${seat.model || 'unknown'} (${seat.id})`; list.append(item);
      }
      host.append(list);
      if (state.endpoint) { const source = document.createElement('p'); source.textContent = `Status source: ${state.endpoint}`; host.append(source); }
    } catch { note.textContent = 'Council status unavailable. Seats remain unknown until the real endpoint answers.'; }
  };
  document.querySelector('[data-refresh-council]')?.addEventListener('click', load);
  load();
}
