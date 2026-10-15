import type { AlgerianCity } from "@/data/cities";

export type GlobalPlace = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
};

/** Normalize common Arabic spelling variants and Latin diacritics before matching. */
export const normalizePlaceSearch = (text: string): string => text
  .normalize("NFKD")
  .toLocaleLowerCase("en")
  .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
  .replace(/[أإآٱ]/g, "ا")
  .replace(/ى/g, "ي")
  .replace(/ة/g, "ه")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .replace(/\s+/g, " ");

export function findLocalCities(cities: AlgerianCity[], query: string, limit = 6): AlgerianCity[] {
  const cleaned = normalizePlaceSearch(query);
  if (!cleaned) return [];
  return cities
    .filter((city) =>
      normalizePlaceSearch(city.name + " " + city.region + " " + city.code + " " + city.slug)
        .includes(cleaned))
    .slice(0, limit);
}

/** Never allow malformed remote coordinates to produce an invalid weather URL. */
export function parseGlobalPlaces(payload: unknown, limit = 7): GlobalPlace[] {
  if (!payload || typeof payload !== "object" || !("results" in payload)) return [];
  const results = (payload as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  return results
    .filter((place): place is GlobalPlace =>
      place != null &&
      typeof place.id === "number" &&
      typeof place.name === "string" && place.name.trim().length > 0 &&
      typeof place.latitude === "number" && Number.isFinite(place.latitude) &&
      Math.abs(place.latitude) <= 90 &&
      typeof place.longitude === "number" && Number.isFinite(place.longitude) &&
      Math.abs(place.longitude) <= 180)
    .slice(0, limit);
}

export const globalWeatherLink = (place: Pick<GlobalPlace, "latitude" | "longitude" | "name">): string =>
  "/global-weather?lat=" + place.latitude +
  "&lon=" + place.longitude +
  "&name=" + encodeURIComponent(place.name);
