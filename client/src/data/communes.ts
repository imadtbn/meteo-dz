import type { AlgerianCity } from "@/data/cities";

type PublicCommuneLocation = {
  id: string;
  postCode: string;
  displayName: string;
  arabicName: string;
  englishName: string;
  latitude: number;
  longitude: number;
};

type PublicCommune = {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  name_fr: string;
  english_aliases: string[];
  post_code: string;
  wilaya_id: string;
  wilaya_name: string;
  wilaya_slug: string;
  latitude: number;
  longitude: number;
  locations: PublicCommuneLocation[];
};

export type AlgerianCommuneLocation = PublicCommuneLocation;

export type AlgerianCommune = AlgerianCity & {
  id: string;
  postCode: string;
  wilayaId: string;
  wilayaName: string;
  wilayaSlug: string;
  administrativeLevel: "commune";
  aliases: string[];
  englishAliases: string[];
  locations: Array<AlgerianCommuneLocation & { timezone: string }>;
};

let communesPromise: Promise<AlgerianCommune[]> | null = null;

/** Load canonical commune pages, retaining each source coordinate as a separate weather location. */
export function loadAlgerianCommunes(): Promise<AlgerianCommune[]> {
  if (!communesPromise) {
    communesPromise = fetch(import.meta.env.BASE_URL + "data/communes.json")
      .then((response) => {
        if (!response.ok) throw new Error("تعذر تحميل دليل البلديات.");
        return response.json() as Promise<PublicCommune[]>;
      })
      .then((records) => {
        if (!Array.isArray(records)) throw new Error("ملف البلديات غير صالح.");
        const normalized = records.map((source): AlgerianCommune => {
          const locations = (source.locations?.length ? source.locations : [{
            id: source.id,
            postCode: source.post_code,
            displayName: source.name,
            arabicName: source.name,
            englishName: source.name_fr,
            latitude: source.latitude,
            longitude: source.longitude,
          }]).map((location) => ({
            ...location,
            timezone: "Africa/Algiers",
          }));
          return {
            code: source.id,
            slug: source.slug,
            name: source.name,
            name_fr: source.name_fr,
            name_en: source.name_fr,
            region: source.wilaya_name,
            latitude: locations[0].latitude,
            longitude: locations[0].longitude,
            id: source.id,
            postCode: source.post_code,
            wilayaId: source.wilaya_id,
            wilayaName: source.wilaya_name,
            wilayaSlug: source.wilaya_slug,
            administrativeLevel: "commune",
            municipality: source.name,
            administrativeArea: source.wilaya_name,
            country: "الجزائر",
            timezone: "Africa/Algiers",
            coastal: false,
            aliases: source.aliases || [],
            englishAliases: source.english_aliases || [],
            locations,
          };
        });
        if (normalized.some((item) => item.locations.some((location) =>
          !Number.isFinite(location.latitude) || location.latitude < 18 || location.latitude > 38
          || !Number.isFinite(location.longitude) || location.longitude < -9 || location.longitude > 12
        ))) throw new Error("توجد إحداثيات بلديات خارج النطاق الجغرافي للجزائر.");
        const ids = normalized.flatMap((item) => item.locations.map((location) => location.id));
        if (new Set(ids).size !== ids.length) throw new Error("توجد معرفات بلديات مكررة في المصدر.");
        if (new Set(normalized.map((item) => item.slug)).size !== normalized.length) {
          throw new Error("توجد روابط بلديات مكررة بعد تجميع السجلات.");
        }
        return normalized;
      })
      .catch((error) => {
        communesPromise = null;
        throw error;
      });
  }
  return communesPromise;
}
