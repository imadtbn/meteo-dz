/**
 * Normalize the national commune matrix into stable, validated weather-page records.
 * The source contains mixed coordinate column order; the Algerian bounding box
 * is used to identify and correct swapped latitude/longitude values safely.
 */
import rawCommunes from "../data/communes.json" with { type: "json" };
import wilayas from "../data/cities.json" with { type: "json" };

const wilayaByCode = new Map(wilayas.map((wilaya) => [String(wilaya.code).padStart(2, "0"), wilaya]));
const inAlgeria = (latitude, longitude) =>
  Number.isFinite(latitude) && Number.isFinite(longitude)
  && latitude >= 18 && latitude <= 38
  && longitude >= -9 && longitude <= 12;

const slugify = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[’']/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

export function buildCommuneCatalog() {
  const ids = new Set();
  const slugs = new Set();
  const records = [];

  for (const source of rawCommunes) {
    const id = String(source.id ?? "").trim();
    if (!id || ids.has(id)) throw new Error("Missing or duplicate commune ID: " + id);
    ids.add(id);

    const wilayaId = String(source.wilaya_id ?? "").padStart(2, "0");
    const wilaya = wilayaByCode.get(wilayaId);
    if (!wilaya) throw new Error("Unknown wilaya " + wilayaId + " for commune " + id);

    const first = Number(source.longitude);
    const second = Number(source.latitude);
    const normalOrder = inAlgeria(first, second);
    const swappedOrder = inAlgeria(second, first);
    if (normalOrder === swappedOrder) {
      throw new Error("Ambiguous or invalid Algerian coordinates for commune " + id + ": " + first + ", " + second);
    }

    const latitude = normalOrder ? first : second;
    const longitude = normalOrder ? second : first;
    const latinName = String(source.name || "").trim();
    const arabicName = String(source.ar_name || "").trim();
    const displayName = arabicName || latinName;
    if (!displayName) throw new Error("Missing display name for commune " + id);

    const baseSlug = slugify(latinName) || "commune";
    const slug = baseSlug + "-" + id;
    if (slugs.has(slug)) throw new Error("Duplicate commune slug: " + slug);
    slugs.add(slug);

    records.push({
      id,
      slug,
      postCode: String(source.post_code || ""),
      displayName,
      arabicName,
      englishName: latinName,
      wilayaId,
      wilayaName: wilaya.name,
      wilayaSlug: wilaya.slug,
      country: "الجزائر",
      countryCode: "DZ",
      region: wilaya.name,
      latitude,
      longitude,
      kind: "commune",
      canonicalPath: "communes/" + slug,
    });
  }

  return records;
}

export function communeDiagnostics(records = buildCommuneCatalog()) {
  const mislabeledCoordinateRows = rawCommunes.filter((source) =>
    inAlgeria(Number(source.longitude), Number(source.latitude)),
  ).length;
  return {
    total: records.length,
    uniqueIds: new Set(records.map((item) => item.id)).size,
    uniqueSlugs: new Set(records.map((item) => item.slug)).size,
    missingArabicNames: records.filter((item) => !item.arabicName).map((item) => item.id),
    rowsWithSwappedFieldLabels: mislabeledCoordinateRows,
    rowsWithDeclaredCoordinateOrder: records.length - mislabeledCoordinateRows,
    wilayas: new Set(records.map((item) => item.wilayaId)).size,
  };
}
