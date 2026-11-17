/** Arab-capital data is sourced from the canonical repository-level JSON dataset. */
import arabCapitalData from "../../../data/arab-capitals.json";

export type ArabCapital = {
  slug: string;
  country: string;
  capital: string;
  englishName: string;
  latitude: number;
  longitude: number;
  countryCode?: string;
  countryPhone?: string;
  countryImages?: string;
};

export const ARAB_CAPITALS = arabCapitalData as ArabCapital[];
