/** Style reminder: the Arab capitals directory uses the Atlas Observatory's source-aware, location-first cards. */
export type ArabCapital = {
  slug: string;
  country: string;
  capital: string;
  englishName: string;
  latitude: number;
  longitude: number;
};

export const ARAB_CAPITALS: ArabCapital[] = [
  { slug: "algiers", country: "الجزائر", capital: "الجزائر العاصمة", englishName: "Algiers", latitude: 36.7538, longitude: 3.0588 },
  { slug: "manama", country: "البحرين", capital: "المنامة", englishName: "Manama", latitude: 26.2235, longitude: 50.5876 },
  { slug: "moroni", country: "جزر القمر", capital: "موروني", englishName: "Moroni", latitude: -11.7172, longitude: 43.2473 },
  { slug: "djibouti", country: "جيبوتي", capital: "مدينة جيبوتي", englishName: "Djibouti", latitude: 11.5721, longitude: 43.1456 },
  { slug: "cairo", country: "مصر", capital: "القاهرة", englishName: "Cairo", latitude: 30.0444, longitude: 31.2357 },
  { slug: "baghdad", country: "العراق", capital: "بغداد", englishName: "Baghdad", latitude: 33.3152, longitude: 44.3661 },
  { slug: "amman", country: "الأردن", capital: "عمّان", englishName: "Amman", latitude: 31.9539, longitude: 35.9106 },
  { slug: "kuwait-city", country: "الكويت", capital: "مدينة الكويت", englishName: "Kuwait City", latitude: 29.3759, longitude: 47.9774 },
  { slug: "beirut", country: "لبنان", capital: "بيروت", englishName: "Beirut", latitude: 33.8938, longitude: 35.5018 },
  { slug: "tripoli", country: "ليبيا", capital: "طرابلس", englishName: "Tripoli", latitude: 32.8872, longitude: 13.1913 },
  { slug: "nouakchott", country: "موريتانيا", capital: "نواكشوط", englishName: "Nouakchott", latitude: 18.0735, longitude: -15.9582 },
  { slug: "rabat", country: "المغرب", capital: "الرباط", englishName: "Rabat", latitude: 34.0209, longitude: -6.8416 },
  { slug: "muscat", country: "عُمان", capital: "مسقط", englishName: "Muscat", latitude: 23.5880, longitude: 58.3829 },
  { slug: "ramallah", country: "فلسطين", capital: "رام الله (مرجع جغرافي)", englishName: "Ramallah", latitude: 31.9038, longitude: 35.2034 },
  { slug: "doha", country: "قطر", capital: "الدوحة", englishName: "Doha", latitude: 25.2854, longitude: 51.5310 },
  { slug: "riyadh", country: "السعودية", capital: "الرياض", englishName: "Riyadh", latitude: 24.7136, longitude: 46.6753 },
  { slug: "mogadishu", country: "الصومال", capital: "مقديشو", englishName: "Mogadishu", latitude: 2.0469, longitude: 45.3182 },
  { slug: "khartoum", country: "السودان", capital: "الخرطوم", englishName: "Khartoum", latitude: 15.5007, longitude: 32.5599 },
  { slug: "damascus", country: "سوريا", capital: "دمشق", englishName: "Damascus", latitude: 33.5138, longitude: 36.2765 },
  { slug: "tunis", country: "تونس", capital: "تونس", englishName: "Tunis", latitude: 36.8065, longitude: 10.1815 },
  { slug: "abu-dhabi", country: "الإمارات العربية المتحدة", capital: "أبوظبي", englishName: "Abu Dhabi", latitude: 24.4539, longitude: 54.3773 },
  { slug: "sanaa", country: "اليمن", capital: "صنعاء", englishName: "Sana'a", latitude: 15.3694, longitude: 44.1910 },
];
