/** Lightweight visual identifiers shared by the Algerian and Arab directories. */
export type LandscapeScene = "coast" | "desert" | "mountain" | "highland" | "river" | "city";

export function getWilayaScene(region: string, coastal = false): LandscapeScene {
  if (coastal || region.includes("الساحل")) return "coast";
  if (/الأوراس|القبائل|الأطلس/.test(region)) return "mountain";
  if (/الصحراء|الجنوب/.test(region)) return "desert";
  if (/الهضاب/.test(region)) return "highland";
  if (/وادي|داخلي|الشرق/.test(region)) return "river";
  return "city";
}

const coastalCapitals = new Set(["algiers", "manama", "moroni", "djibouti", "kuwait-city", "beirut", "tripoli", "nouakchott", "rabat", "muscat", "doha", "mogadishu", "tunis", "abu-dhabi"]);
const riverCapitals = new Set(["cairo", "baghdad", "khartoum"]);
const mountainCapitals = new Set(["amman", "ramallah", "sanaa", "damascus"]);

export function getCapitalScene(slug: string): LandscapeScene {
  if (coastalCapitals.has(slug)) return "coast";
  if (riverCapitals.has(slug)) return "river";
  if (mountainCapitals.has(slug)) return "mountain";
  return "desert";
}

const arabCountryCodes: Record<string, string> = {
  "الجزائر": "DZ", "البحرين": "BH", "جزر القمر": "KM", "جيبوتي": "DJ",
  "مصر": "EG", "العراق": "IQ", "الأردن": "JO", "الكويت": "KW",
  "لبنان": "LB", "ليبيا": "LY", "موريتانيا": "MR", "المغرب": "MA",
  "عُمان": "OM", "فلسطين": "PS", "قطر": "QA", "السعودية": "SA",
  "الصومال": "SO", "السودان": "SD", "سوريا": "SY", "تونس": "TN",
  "الإمارات العربية المتحدة": "AE", "اليمن": "YE",
};

export const countryCodeForArabName = (country: string): string | undefined => arabCountryCodes[country];

/** Unicode regional indicators, not external icon requests. */
export function flagForCountry(code?: string | null): string {
  const normalized = code?.trim().toUpperCase();
  if (!normalized || !/^[A-Z]{2}$/.test(normalized)) return "🌐";
  return normalized.split("").map((char) => String.fromCodePoint(127397 + char.charCodeAt(0))).join("");
}
