/** Style reminder: Atlas Observatory uses clear, location-first data cards with editorial restraint. */
import cityData from "../../../data/cities.json";

export type AlgerianCity = {
  code: string;
  slug: string;
  name: string;
  name_fr?: string;
  name_en?: string;
  phone_code?: string;
  administrative_era?: number;
  region: string;
  latitude: number;
  longitude: number;
  countryImages?: string;
  coastal?: boolean;
  municipality?: string;
  administrativeArea?: string;
  country?: string;
  timezone?: string;
  administrativeLevel?: "wilaya" | "commune";
  wilayaId?: string;
  wilayaName?: string;
  wilayaSlug?: string;
  postCode?: string;
};

export const ALGERIAN_CITIES = cityData as AlgerianCity[];

export const getCityBySlug = (slug?: string) =>
  ALGERIAN_CITIES.find((city) => city.slug === slug) ?? ALGERIAN_CITIES[0];
