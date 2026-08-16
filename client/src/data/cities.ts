/** Style reminder: Atlas Observatory uses clear, location-first data cards with editorial restraint. */
export type AlgerianCity = {
  slug: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  coastal?: boolean;
};

export const ALGERIAN_CITIES: AlgerianCity[] = [
  { slug: "algiers", name: "الجزائر العاصمة", region: "الساحل الأوسط", latitude: 36.7538, longitude: 3.0588, coastal: true },
  { slug: "oran", name: "وهران", region: "الساحل الغربي", latitude: 35.6969, longitude: -0.6331, coastal: true },
  { slug: "annaba", name: "عنابة", region: "الساحل الشرقي", latitude: 36.9, longitude: 7.7667, coastal: true },
  { slug: "constantine", name: "قسنطينة", region: "الشرق الداخلي", latitude: 36.365, longitude: 6.6147 },
  { slug: "setif", name: "سطيف", region: "الهضاب العليا", latitude: 36.1905, longitude: 5.4137 },
  { slug: "blida", name: "البليدة", region: "الأطلس البليدي", latitude: 36.4704, longitude: 2.8277 },
  { slug: "tamanrasset", name: "تمنراست", region: "الجنوب الكبير", latitude: 22.785, longitude: 5.5228 },
  { slug: "adrar", name: "أدرار", region: "الجنوب الغربي", latitude: 27.8743, longitude: -0.2939 },
  { slug: "ouargla", name: "ورقلة", region: "الجنوب الشرقي", latitude: 31.9539, longitude: 5.3245 },
];

export const getCityBySlug = (slug?: string) =>
  ALGERIAN_CITIES.find((city) => city.slug === slug) ?? ALGERIAN_CITIES[0];
