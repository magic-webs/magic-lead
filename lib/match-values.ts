/**
 * Parse the comma-separated match-values input into a clean list.
 *
 * The server de-duplicates and trims too; this exists so the form can show
 * the user exactly what will be saved before they submit.
 */
export function parseMatchValues(text: string): string[] {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const raw of text.split(",")) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(value);
  }

  return values;
}
