/**
 * Pure slug helpers — no DB, no framework — so they can be unit-tested and
 * reused. The DB-backed collision lookup stays in core/profiles/queries.ts;
 * only the string transform and the candidate-picking loop live here.
 *
 * ponytail: linear scan over taken slugs. Fine for the <10k-profile ceiling
 * noted in queries.ts.
 */

/** Strips diacritics, lowercases, keeps alphanum + hyphens, trims stray hyphens. */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Returns the first free slug given the set of already-taken slugs:
 * `base`, then `base-2`, `base-3`, ...
 */
export function nextAvailableSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}
