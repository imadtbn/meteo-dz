export const FAVORITES_STORAGE_KEY = "atlas-favorite-cities-v1";
const CITY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_FAVORITES = 58;

export function normalizeFavoriteSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string" || !CITY_SLUG_PATTERN.test(item)) continue;
    unique.add(item);
    if (unique.size >= MAX_FAVORITES) break;
  }
  return [...unique];
}

export function parseFavoriteSlugs(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return normalizeFavoriteSlugs(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function toggleFavoriteSlug(current: string[], slug: string): string[] {
  if (!CITY_SLUG_PATTERN.test(slug)) return normalizeFavoriteSlugs(current);
  const normalized = normalizeFavoriteSlugs(current);
  return normalized.includes(slug)
    ? normalized.filter((item) => item !== slug)
    : normalizeFavoriteSlugs([...normalized, slug]);
}
