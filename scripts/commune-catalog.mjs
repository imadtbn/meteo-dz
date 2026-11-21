/**
 * Normalize the national commune matrix into stable, human-readable weather routes.
 * Names are used directly when unique. Duplicate names are disambiguated by wilaya
 * and, only when needed, postal code; source IDs remain data identifiers, not URL suffixes.
 */
import rawCommunes from "../data/communes.json" with { type: "json" };
import wilayas from "../data/cities.json" with { type: "json" };
import arabCapitals from "../data/arab-capitals.json" with { type: "json" };
import worldCapitals from "../data/world-capitals.json" with { type: "json" };

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

const alphaSuffix = (index) => {
  let value = index + 1;
  let suffix = "";
  while (value > 0) {
    value -= 1;
    suffix = String.fromCharCode(97 + (value % 26)) + suffix;
    value = Math.floor(value / 26);
  }
  return suffix;
};

export function buildCommuneCatalog() {
  const ids = new Set();
  const records = [];
  const reservedSlugs = new Set([
    ...wilayas.map((item) => item.slug),
    ...arabCapitals.map((item) => item.slug),
    ...worldCapitals.map((item) => item.slug),
  ]);

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
    records.push({
      id,
      baseSlug,
      legacySlug: baseSlug + "-" + id,
      postCode: String(source.post_code || "").trim(),
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
    });
  }

  const baseCounts = new Map();
  const wilayaNameCounts = new Map();
  for (const record of records) {
    baseCounts.set(record.baseSlug, (baseCounts.get(record.baseSlug) || 0) + 1);
    const key = record.baseSlug + "|" + record.wilayaId;
    wilayaNameCounts.set(key, (wilayaNameCounts.get(key) || 0) + 1);
  }

  const usedSlugs = new Set(reservedSlugs);
  for (const record of records) {
    const sameNameCount = baseCounts.get(record.baseSlug);
    const sameWilayaCount = wilayaNameCounts.get(record.baseSlug + "|" + record.wilayaId);
    let candidate = sameNameCount === 1
      ? record.baseSlug
      : record.baseSlug + "-" + record.wilayaSlug;

    if (sameWilayaCount > 1) {
      candidate += "-" + (slugify(record.postCode) || "postal");
    }
    if (reservedSlugs.has(candidate)) candidate += "-commune";

    let slug = candidate;
    let suffix = 0;
    while (usedSlugs.has(slug)) {
      slug = candidate + "-" + alphaSuffix(suffix++);
    }
    usedSlugs.add(slug);

    record.slug = slug;
    record.canonicalPath = "communes/" + slug;
    record.legacyCanonicalPath = "communes/" + record.legacySlug;
    delete record.baseSlug;
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
    legacyAliases: records.filter((item) => item.slug !== item.legacySlug).length,
    missingArabicNames: records.filter((item) => !item.arabicName).map((item) => item.id),
    rowsWithSwappedFieldLabels: mislabeledCoordinateRows,
    rowsWithDeclaredCoordinateOrder: records.length - mislabeledCoordinateRows,
    wilayas: new Set(records.map((item) => item.wilayaId)).size,
  };
}
