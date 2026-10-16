export const STORAGE_KEY = 'steady-steps-check-ins-v1';

const EMPTY_CHECK_INS = Object.freeze({});

export function parseCheckIns(rawValue, metrics) {
  if (!rawValue) return {};

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const validEntries = [];
    for (const [week, entry] of Object.entries(parsed)) {
      const weekNumber = Number(week);
      const hasCanonicalWeek =
        Number.isInteger(weekNumber) &&
        String(weekNumber) === week &&
        weekNumber >= 1 &&
        weekNumber <= 4;
      const hasObjectEntry = entry && typeof entry === 'object' && !Array.isArray(entry);
      if (!hasCanonicalWeek || !hasObjectEntry) continue;

      if (metrics) {
        const candidateValues = entry.values ?? entry;
        const result = validateCheckIn(candidateValues, metrics);
        if (!result.isValid) continue;
        validEntries.push([week, { values: result.values }]);
      } else {
        validEntries.push([week, entry]);
      }
    }

    return Object.fromEntries(validEntries);
  } catch {
    return {};
  }
}

export function loadCheckIns(storage, metrics) {
  if (!storage) return { ...EMPTY_CHECK_INS };

  try {
    return parseCheckIns(storage.getItem(STORAGE_KEY), metrics);
  } catch {
    return {};
  }
}

export function storeCheckIns(storage, checkIns) {
  if (!storage) return false;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(checkIns));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredCheckIns(storage) {
  if (!storage) return false;

  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function validateCheckIn(values, metrics) {
  const errors = {};
  const normalized = {};

  for (const metric of metrics) {
    const rawValue = values[metric.id];
    if (rawValue === '' || rawValue === null || rawValue === undefined) {
      errors[metric.id] = 'Choose or enter a value.';
      continue;
    }

    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) {
      errors[metric.id] = 'Enter a number.';
      continue;
    }

    if (metric.integer && !Number.isInteger(numericValue)) {
      errors[metric.id] = 'Enter a whole number.';
      continue;
    }

    if (numericValue < metric.min || numericValue > metric.max) {
      errors[metric.id] = `Use a value from ${metric.min} to ${metric.max}.`;
      continue;
    }

    normalized[metric.id] = numericValue;
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    values: normalized,
  };
}

export function describeCheckIns(checkIns) {
  const recordedWeeks = Object.keys(checkIns)
    .map(Number)
    .filter((week) => week >= 1 && week <= 4)
    .sort((a, b) => a - b);

  if (recordedWeeks.length === 0) {
    return 'No weeks recorded yet. Week 1 can be your baseline; unrecorded weeks will not be treated as zero.';
  }

  if (recordedWeeks.length === 1) {
    return `Week ${recordedWeeks[0]} is recorded. Add another week when ready to compare your own observations.`;
  }

  return `${recordedWeeks.length} weeks are recorded. Compare the raw values without treating a short trend as proof of cause or a diagnosis.`;
}
