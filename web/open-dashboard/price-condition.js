export function formatPriceCondition(condition) {
  if (!condition) return '';
  return ['kind', 'name', 'threshold', 'timezone', 'hours', 'rateClass'].filter(key => condition[key] !== undefined).map(key => `${key}: ${Array.isArray(condition[key]) ? condition[key].join(', ') : condition[key]}`).join(' · ');
}
