import { PROJECT_CATALOG } from './project-catalog.mjs';

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/**
 * Storage boundary: source.readAll() supplies a synchronous or asynchronous array
 * of JSON-safe project records. No persistence backend or editing workflow is
 * selected here. Reads are fresh; callers receive detached immutable values.
 */
export function createCatalogReader(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source) || typeof source.readAll !== 'function') {
    throw new TypeError('Catalog source must be an object with a readAll method.');
  }

  async function readRecords() {
    const records = await source.readAll();
    if (!Array.isArray(records)) {
      throw new TypeError('Catalog source readAll must return an array of project records.');
    }
    return deepFreeze(JSON.parse(JSON.stringify(records)));
  }

  return Object.freeze({
    async list() { return readRecords(); },
    async get(id) {
      const records = await readRecords();
      return records.find((record) => record.id === id) ?? null;
    },
  });
}

export const moduleCatalogReader = createCatalogReader({ readAll: () => PROJECT_CATALOG });
