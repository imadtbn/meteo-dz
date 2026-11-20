import rawCommunes from "../../../data/communes.json";
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

/**
 * The source matrix has two coordinate conventions. Normalize each row against
 * Algeria's geographic bounds instead of blindly swapping the entire dataset.
 */
export const ALGERIAN_COMMUNES: AlgerianCommune[] = (rawCommunes as RawCommune[]).map((source) => {
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
  return {
    code: String(source.id),
    slug: (latinName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "commune") + "-" + source.id,
    name: arabicName || latinName,
    name_fr: latinName,
    name_en: latinName,
    region: wilaya.name,
    latitude,
    longitude,
    phone_code: undefined,
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
});

export const getCommunesByWilaya = (wilayaCode: string) =>
  ALGERIAN_COMMUNES.filter((commune) => commune.wilayaId === String(wilayaCode).padStart(2, "0"));
