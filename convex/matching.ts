/**
 * Payload key normalisation, field lookup, and channel-routing rule
 * evaluation.
 *
 * Plain helpers — no Convex functions live here, so this module is safe to
 * import from queries, mutations, actions and the client alike.
 */

/** Maximum nesting we will walk when cleaning an incoming payload. */
const MAX_SANITIZE_DEPTH = 20;

/**
 * Normalise a payload key: collapse whitespace to underscores and drop
 * anything that is not a letter, digit or underscore.
 *
 *   "what_are_you_looking_for?" -> "what_are_you_looking_for"
 *   "Plan to Invest"            -> "Plan_to_Invest"
 *   "__v"                       -> "__v"
 *
 * Returns "" when nothing usable is left.
 */
export function normalizeKey(key: string): string {
  return key
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
}

/**
 * Recursively normalise every key in an incoming webhook payload, including
 * the ones nested inside `fieldData`. Facebook lead-gen question keys arrive
 * as the question text, so they routinely contain "?" and spaces.
 *
 * Values are left exactly as received — only keys are touched.
 */
export function sanitizePayloadKeys(value: unknown, depth = 0): unknown {
  if (depth > MAX_SANITIZE_DEPTH) return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayloadKeys(item, depth + 1));
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  const cleaned: Record<string, unknown> = {};

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const cleanKey = normalizeKey(key);
    if (!cleanKey) continue;

    // If two raw keys normalise to the same thing, keep the first so a
    // messy key cannot clobber an already-clean one.
    if (Object.prototype.hasOwnProperty.call(cleaned, cleanKey)) continue;

    cleaned[cleanKey] = sanitizePayloadKeys(nested, depth + 1);
  }

  return cleaned;
}

/**
 * Providers that nest the submitted answers rather than putting them at the
 * top level. Facebook lead-gen sends the form fields under `fieldData`,
 * alongside its own `_id` / `__v` / `client` plumbing.
 *
 * Keep this in sync with the same list in the leads table UI.
 */
export const NESTED_CONTAINERS = ["fieldData", "data", "fields"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "object") return null;
  return String(value);
}

/**
 * Look a key up in one object, falling back to a normalised comparison.
 *
 * Leads stored before keys were cleaned recursively still hold the raw
 * "what_are_you_looking_for?" form, and someone configuring a rule is likely
 * to paste the question straight from the form. Comparing normalised keys
 * makes both resolve to the same field.
 */
function readFrom(record: Record<string, unknown>, key: string): string | null {
  const direct = toText(record[key]);
  if (direct !== null) return direct;

  const wanted = normalizeKey(key);
  if (!wanted) return null;

  for (const [candidate, value] of Object.entries(record)) {
    if (candidate !== key && normalizeKey(candidate) === wanted) {
      const text = toText(value);
      if (text !== null) return text;
    }
  }

  return null;
}

/**
 * Read one field out of an arbitrary webhook payload, checking the top level
 * first and then the known nested containers.
 */
export function readPayloadField(payload: unknown, key: string): string | null {
  if (!isRecord(payload)) return null;

  const direct = readFrom(payload, key);
  if (direct !== null) return direct;

  for (const container of NESTED_CONTAINERS) {
    const nested = payload[container];
    if (isRecord(nested)) {
      const value = readFrom(nested, key);
      if (value !== null) return value;
    }
  }

  return null;
}

/**
 * Does this payload satisfy a channel workspace's rule?
 *
 * Values are compared exactly but case- and whitespace-insensitively, so
 * "channel partner" matches "Channel Partner". A rule with no field or no
 * values never matches, so a half-configured channel cannot swallow leads.
 */
export function matchesRule(
  payload: unknown,
  matchField: string | undefined,
  matchValues: string[] | undefined
): boolean {
  if (!matchField || !matchValues || matchValues.length === 0) {
    return false;
  }

  const actual = readPayloadField(payload, matchField);
  if (actual === null) return false;

  const normalized = actual.trim().toLowerCase();

  return matchValues.some(
    (candidate) => candidate.trim().toLowerCase() === normalized
  );
}
