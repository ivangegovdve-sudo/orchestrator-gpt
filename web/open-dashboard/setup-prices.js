import { readProviderCatalogue } from './live-source.js';
import { formatPriceCondition } from './price-condition.js';
const host = document.querySelector('[data-setup-live-prices]');
if (host) {
  const load = async () => {
    host.textContent = 'Reading current provider prices…';
    const results = await Promise.allSettled(['openrouter', 'crazyrouter'].map(provider => readProviderCatalogue(provider)));
    host.replaceChildren();
    results.forEach((result, index) => {
      const provider = ['openrouter', 'crazyrouter'][index];
      const section = document.createElement('section');
      const title = document.createElement('h3'); title.textContent = provider; section.append(title);
      const model = result.status === 'fulfilled' ? result.value.models.find(row => row.id === (index ? 'gpt-5-nano' : 'openai/gpt-5-nano')) : null;
      const text = document.createElement('p');
      text.textContent = model?.pricePoints?.length ? `${model.id}: ${model.pricePoints.map(point => `$${point.amount} / ${point.unit} · ${formatPriceCondition(point.condition)} · read ${point.source.readAt}`).join('; ')}` : 'Current price unavailable; unknown.';
      section.append(text); host.append(section);
    });
  };
  document.querySelector('[data-refresh-setup-prices]')?.addEventListener('click', load);
  load();
}
