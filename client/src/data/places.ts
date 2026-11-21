import cities from "../../../data/cities.json";
import arabCapitals from "../../../data/arab-capitals.json";
import worldCapitals from "../../../data/world-capitals.json";

export type PlaceRouteKind = "arab-capitals" | "world-capitals";
export type PlaceWeatherTarget = {
  slug: string;
  displayName: string;
  country: string;
  englishName: string;
  latitude: number;
  longitude: number;
};

export function getPlaceWeatherTarget(kind: PlaceRouteKind, slug?: string): PlaceWeatherTarget | null {
  if (!slug) return null;
  if (kind === "arab-capitals") {
    const item = arabCapitals.find((place) => place.slug === slug);
    return item && item.slug !== "algiers" ? {
      slug: item.slug, displayName: item.capital, country: item.country,
      englishName: item.englishName, latitude: item.latitude, longitude: item.longitude,
    } : null;
  }
  const item = worldCapitals.find((place) => place.slug === slug);
  if (!item) return null;
  const arabDuplicate = arabCapitals.some((place) => place.slug === slug);
  const wilayaDuplicate = cities.some((place) => place.slug === slug);
  if (arabDuplicate || wilayaDuplicate) return null;
  return {
    slug: item.slug, displayName: item.capital, country: item.country,
    englishName: item.englishName, latitude: item.latitude, longitude: item.longitude,
  };
}

export function getCanonicalPlacePath(slug: string): string {
  if (cities.some((place) => place.slug === slug)) return "/wilayas/" + slug + "/";
  if (arabCapitals.some((place) => place.slug === slug)) return "/arab-capitals/" + slug + "/";
  if (worldCapitals.some((place) => place.slug === slug)) return "/world-capitals/" + slug + "/";
  return "/world-search/";
}
