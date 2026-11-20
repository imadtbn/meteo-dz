import type { AlgerianCity } from "@/data/cities";

type PublicCommune = {
  id: string;
  slug: string;
  name: string;
  name_fr: string;
  post_code: string;
  wilaya_id: string;
  wilaya_name: string;
  wilaya_slug: string;
  latitude: number;
  longitude: number;
};

export type AlgerianCommune = AlgerianCity & {
  id: string;
  postCode: string;
  wilayaId: string;
  wilayaName: string;
  wilayaSlug: string;
  administrativeLevel: "commune";
};

let communesPromise: Promise<AlgerianCommune[]> | null = null;

/**
 * Load the compact, normalized public catalog only when needed. The original
 * data/communes.json remains the single source; the public copy is generated
 * and checked by scripts/build-commune-public.mjs.
 */
export function loadAlgerianCommunes(): Promise<AlgerianCommune[]> {
  if (!communesPromise) {
    communesPromise = fetch(import.meta.env.BASE_URL + "data/communes.json")
      .then((response) => {
        if (!response.ok) throw new Error("تعذر تحميل دليل البلديات.");
        return response.json() as Promise<PublicCommune[]>;
      })
      .then((records) => {
        if (!Array.isArray(records)) throw new Error("ملف البلديات غير صالح.");
        const normalized = records.map((source): AlgerianCommune => ({
          code: source.id,
          slug: source.slug,
          name: source.name,
          name_fr: source.name_fr,
          name_en: source.name_fr,
          region: source.wilaya_name,
          latitude: Number(source.latitude),
          longitude: Number(source.longitude),
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
        }));
        if (normalized.some((item) =>
          !Number.isFinite(item.latitude) || item.latitude < 18 || item.latitude > 38
          || !Number.isFinite(item.longitude) || item.longitude < -9 || item.longitude > 12
        )) throw new Error("توجد إحداثيات بلديات خارج النطاق الجغرافي للجزائر.");
        if (new Set(normalized.map((item) => item.id)).size !== normalized.length) {
          throw new Error("توجد معرفات بلديات مكررة في المصدر.");
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
