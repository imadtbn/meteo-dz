/** Style reminder: Atlas Observatory uses clear, location-first data cards with editorial restraint. */
import cityData from "./cities.json";

export type AlgerianCity = {
  code: string;
  slug: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  coastal?: boolean;
};

export const ALGERIAN_CITIES = cityData as AlgerianCity[];

export const getCityBySlug = (slug?: string) =>
  ALGERIAN_CITIES.find((city) => city.slug === slug) ?? ALGERIAN_CITIES[0];
