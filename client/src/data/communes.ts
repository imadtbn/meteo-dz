import { ALGERIAN_CITIES, type AlgerianCity } from "@/data/cities";

type RawCommune = {
  id: string;
  post_code?: string;
  name: string;
  wilaya_id: string;
  ar_name?: string;
  longitude: string;
  latitude: string;
};

export type AlgerianCommune = AlgerianCity & {
  id: string;
  postCode: string;
  wilayaId: string;
  wilayaName: string;
  wilayaSlug: string;
  administrativeLevel: "commune";
};

const inAlgeria = (latitude: number, longitude: number) =>
  Number.isFinite(latitude) && Number.isFinite(longitude)
  && latitude >= 18 && latitude <= 38
  && longitude >= -9 && longitude <= 12;

let communesPromise: Promise<AlgerianCommune[]> | null = null;

function normalizeCommune(source: RawCommune): AlgerianCommune {
  const first = Number(source.longitude);
  const second = Number(source.latitude);
  const normalOrder = inAlgeria(first, second);
  const swappedOrder = inAlgeria(second, first);
  if (normalOrder === swappedOrder) {
    throw new Error("إحداثيات البلدية غير صالحة أو ملتبسة: " + source.id);
  }

  const latitude = normalOrder ? first : second;
  const longitude = normalOrder ? second : first;
  const wilayaId = String(source.wilaya_id).padStart(2, "0");
  const wilaya = ALGERIAN_CITIES.find((item) => String(item.code).padStart(2, "0") === wilayaId);
  if (!wilaya) throw new Error("الولاية غير موجودة للبلدية: " + source.id);

  const latinName = String(source.name || "").trim();
  const arabicName = String(source.ar_name || "").trim();
  const slug = (latinName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "commune") + "-" + source.id;
  return {
    code: String(source.id),
    slug,
    name: arabicName || latinName,
    name_fr: latinName,
    name_en: latinName,
    region: wilaya.name,
    latitude,
    longitude,
    countryCode: "DZ",
    countryPhone: "+213",
    id: String(source.id),
    postCode: String(source.post_code || ""),
    wilayaId,
    wilayaName: wilaya.name,
    wilayaSlug: wilaya.slug,
    administrativeLevel: "commune",
    municipality: arabicName || latinName,
    administrativeArea: wilaya.name,
    country: "الجزائر",
    timezone: "Africa/Algiers",
    coastal: false,
  };
}

/**
 * Load the commune matrix on demand so the 1,708-row catalog does not inflate
 * the initial weather application bundle. The same cached promise is shared
 * by search, wilaya directories, commune routes and favorites.
 */
export function loadAlgerianCommunes(): Promise<AlgerianCommune[]> {
  if (!communesPromise) {
    communesPromise = fetch(import.meta.env.BASE_URL + "data/communes.json")
      .then((response) => {
        if (!response.ok) throw new Error("تعذر تحميل دليل البلديات.");
        return response.json() as Promise<RawCommune[]>;
      })
      .then((records) => {
        if (!Array.isArray(records)) throw new Error("ملف البلديات غير صالح.");
        const normalized = records.map(normalizeCommune);
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
