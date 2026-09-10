/** Public media catalogue helpers. No alias matching or token-to-output conversions. */
export const MEDIA_KINDS = Object.freeze(["image", "video", "audio"]);
export const CATALOGUE_KINDS = Object.freeze([
  ...MEDIA_KINDS,
  "text",
  "other",
  "unknown",
]);
export const MEDIA_UNITS = Object.freeze({
  image: Object.freeze(["image", "megapixel"]),
  video: Object.freeze(["video_second", "video"]),
  audio: Object.freeze(["audio_second", "audio_minute"]),
});

const canonicalDecimal = /^(0|[1-9]\d*)(?:\.\d+)?$/;
const safeUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
};

/** Retain unknown prices as unknown, even if legacy token-price fields say zero. */
export function normalizeMediaCatalogue(snapshot) {
  const unique = new Map();
  for (const model of Array.isArray(snapshot?.models) ? snapshot.models : []) {
    if (
      !CATALOGUE_KINDS.includes(model.mediaKind) ||
      typeof model.id !== "string" ||
      !model.id ||
      typeof model.provider !== "string" ||
      !model.provider
    )
      continue;
    const key = JSON.stringify([model.provider, model.id]);
    // Ambiguous duplicate source identities must not become two plotted models.
    if (unique.has(key)) {
      unique.set(key, null);
      continue;
    }
    const pricePoints = (
      Array.isArray(model.pricePoints) ? model.pricePoints : []
    ).filter(
      (point) =>
        point &&
        typeof point.amount === "string" &&
        canonicalDecimal.test(point.amount) &&
        Number.isFinite(Number(point.amount)) &&
        !(Number(point.amount) === 0 && /[1-9]/.test(point.amount)) &&
        typeof point.unit === "string" &&
        safeUrl(point.source?.url) &&
        Object.hasOwn(point, "condition"),
    );
    unique.set(key, {
      ...model,
      key,
      id: model.id,
      displayName: model.displayName || model.id,
      outputModalities:
        Array.isArray(model.outputModalities) && model.outputModalities.length
          ? model.outputModalities
          : ["other", "unknown"].includes(model.mediaKind)
            ? []
            : [model.mediaKind],
      pricePoints,
      pricingState: pricePoints.length
        ? "published"
        : model.pricingState === "not_published"
          ? "not_published"
          : "unknown",
      pricingNote: model.pricingNote ?? null,
      sourceUrl: safeUrl(model.sourceUrl),
      fetchedAt: model.fetchedAt ?? snapshot.fetchedAt ?? null,
    });
  }
  return [...unique.values()].filter(Boolean);
}

/** A quoted zero token price never establishes that generating media is free. */
export function mediaPricingStatus(model) {
  const points = Array.isArray(model.pricePoints) ? model.pricePoints : [];
  if (
    points.some(
      (point) =>
        canonicalDecimal.test(String(point.amount)) && Number(point.amount) > 0,
    )
  )
    return "paid";
  const output = points.filter((point) =>
    MEDIA_UNITS[model.mediaKind]?.includes(point.unit),
  );
  return output.length &&
    output.every(
      (point) =>
        canonicalDecimal.test(String(point.amount)) &&
        Number(point.amount) === 0,
    )
    ? "zero_output_rate"
    : "unknown";
}

/** One mark per published native rate; the caller explicitly chooses one unit. */
export function mediaPriceSeries(
  models,
  { kind, unit, provider = "all" } = {},
) {
  if (!MEDIA_UNITS[kind]?.includes(unit)) return [];
  return models
    .filter(
      (model) =>
        model.mediaKind === kind &&
        (provider === "all" || model.provider === provider),
    )
    .flatMap((model) =>
      model.pricePoints
        .filter(
          (point) =>
            point.unit === unit &&
            canonicalDecimal.test(String(point.amount)) &&
            Number.isFinite(Number(point.amount)),
        )
        .map((point) => ({
          key: `${model.key ?? JSON.stringify([model.provider, model.id])}:${point.id}`,
          modelId: model.id,
          provider: model.provider,
          displayName: model.displayName,
          mediaKind: model.mediaKind,
          amount: point.amount,
          value: Number(point.amount),
          unit: point.unit,
          condition: point.condition,
          source: point.source,
          provenance: point.provenance,
          sourceNotes: model.sourceNotes ?? [],
          pricingNote: model.pricingNote ?? null,
        })),
    );
}
