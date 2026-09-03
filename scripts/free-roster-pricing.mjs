// The money predicate for the free-model roster, defined once because the generator and
// the independent validator have to answer the same question the same way. Two copies of
// a security-critical check are two checks that can drift apart.
//
// WHY THIS IS NOT `Number(value) !== 0`
// -------------------------------------
// That was the check until 2026-09-03, at all three sites that ask whether a model is
// free. `Number` is a coercion, not a parse, and it maps several values that carry no
// price at all onto zero. Measured with node:
//
//     Number(null)  === 0      Number("")   === 0
//     Number("   ") === 0      Number([])   === 0
//
// So a listing whose price the upstream API reports as null or as an empty string — which
// is exactly how an API says "unknown" — passed the zero-price test and was published to
// a roster whose entire purpose is to assert that the models on it are free. Publishing an
// unknown price as a confirmed zero is the failure mode this file exists to prevent.
//
// `undefined` was already safe, because `Number(undefined)` is `NaN`. That is why the hole
// survived review: a missing key behaves correctly, and only a key that is present and
// empty lies. The two are indistinguishable at a glance and opposite in effect.
//
// An unknown price is not a zero price. It is an unknown price, and it excludes the model
// from the roster with that stated as the reason rather than being silently dropped.

// Renders the offending value for a rejection reason, without ever interpolating an object
// into a string as "[object Object]".
const describe = (value) => {
  if (value === null) return "null";
  if (value === undefined) return "absent";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);
  return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
};

// A price is KNOWN only if it is a finite number, or a string that parses entirely as one.
// Everything else — null, "", whitespace, an array, a boolean, a non-numeric string — is
// unknown, and returns null to say so. Note that this is deliberately stricter than the
// language: `Number` would give an answer for most of these, and the answer would be zero.
export function parsePrice(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  // Number("") is 0, so the empty case has to be taken out before parsing, not after.
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

// Three outcomes, never two. Collapsing "unknown" into either "free" or "priced" is what
// went wrong: folded into free it publishes a model nobody has confirmed is free, and
// folded into priced it would silently drop a model without saying why.
export function priceVerdict(pricing) {
  const prompt = parsePrice(pricing?.prompt);
  const completion = parsePrice(pricing?.completion);

  const unknown = [];
  if (prompt === null) unknown.push(`prompt=${describe(pricing?.prompt)}`);
  if (completion === null) unknown.push(`completion=${describe(pricing?.completion)}`);
  if (unknown.length > 0) {
    return { state: "unknown", free: false, reason: `price not a number (${unknown.join(", ")})` };
  }

  if (prompt !== 0 || completion !== 0) {
    return {
      state: "priced",
      free: false,
      reason: `priced above zero (prompt=${prompt}, completion=${completion})`,
    };
  }

  return { state: "free", free: true, reason: "zero on prompt and completion" };
}
