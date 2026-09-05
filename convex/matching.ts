/**
 * Payload field lookup and channel-routing rule evaluation.
 *
 * Plain helpers — no Convex functions live here, so this module is safe to
 * import from queries, mutations and actions alike.
 */

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
 * Read one field out of an arbitrary webhook payload, checking the top level
 * first and then the known nested containers.
 */
export function readPayloadField(payload: unknown, key: string): string | null {
  if (!isRecord(payload)) return null;

  const direct = toText(payload[key]);
  if (direct !== null) return direct;

  for (const container of NESTED_CONTAINERS) {
    const nested = payload[container];
    if (isRecord(nested)) {
      const value = toText(nested[key]);
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
