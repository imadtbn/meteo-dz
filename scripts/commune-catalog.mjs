/**
 * Build canonical commune pages from the official source matrix.
 * A page identity is strictly the normalized commune name + wilaya name.
 * Repeated source rows share one page and retain independent weather coordinates.
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
  const sourceRecords = [];

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

    const nameSlug = slugify(latinName) || slugify(arabicName);
    if (!nameSlug) throw new Error("Commune has no usable name for URL: " + id);
    sourceRecords.push({
      id,
      nameSlug,
      oldBaseSlug: nameSlug,
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

  // Reconstruct the previously published slug scheme so every old URL can redirect.
  const globalNameCounts = new Map();
  const wilayaNameCounts = new Map();
  for (const record of sourceRecords) {
    globalNameCounts.set(record.nameSlug, (globalNameCounts.get(record.nameSlug) || 0) + 1);
    const key = record.nameSlug + "|" + record.wilayaId;
    wilayaNameCounts.set(key, (wilayaNameCounts.get(key) || 0) + 1);
  }
  const oldUsed = new Set([
    ...wilayas.map((item) => item.slug),
    ...arabCapitals.map((item) => item.slug),
    ...worldCapitals.map((item) => item.slug),
  ]);
  for (const record of sourceRecords) {
    let candidate = globalNameCounts.get(record.nameSlug) === 1
      ? record.nameSlug
      : record.nameSlug + "-" + record.wilayaSlug;
    if (wilayaNameCounts.get(record.nameSlug + "|" + record.wilayaId) > 1) {
      candidate += "-" + (record.postCode || "postal");
    }
    if (oldUsed.has(candidate)) candidate += "-commune";
    let oldSlug = candidate;
    let suffix = 0;
    while (oldUsed.has(oldSlug)) oldSlug = candidate + "-" + alphaSuffix(suffix++);
    oldUsed.add(oldSlug);
    record.oldSlug = oldSlug;
    record.idLegacySlug = record.nameSlug + "-" + record.id;
  }

  const groups = new Map();
  for (const record of sourceRecords) {
    const slug = record.nameSlug + "-" + record.wilayaSlug;
    const key = record.wilayaId + "|" + slug;
    const existing = groups.get(key);
    const location = {
      id: record.id,
      postCode: record.postCode,
      displayName: record.displayName,
      arabicName: record.arabicName,
      englishName: record.englishName,
      latitude: record.latitude,
      longitude: record.longitude,
    };
    if (existing) {
      existing.locations.push(location);
      if (record.arabicName && !existing.aliases.includes(record.arabicName)) existing.aliases.push(record.arabicName);
      if (record.englishName && !existing.englishAliases.includes(record.englishName)) existing.englishAliases.push(record.englishName);
      existing.legacySlugs.push(record.oldSlug, record.idLegacySlug);
      continue;
    }
    groups.set(key, {
      ...record,
      slug,
      locations: [location],
      aliases: record.arabicName ? [record.arabicName] : [],
      englishAliases: record.englishName ? [record.englishName] : [],
      legacySlugs: [record.oldSlug, record.idLegacySlug],
    });
  }

  const records = [...groups.values()];
  const routePaths = new Set();
  for (const record of records) {
    if (/\d/.test(record.slug)) throw new Error("Numeric suffix is forbidden in commune slug: " + record.slug);
    if (routePaths.has(record.slug)) throw new Error("Duplicate commune route: " + record.slug);
    routePaths.add(record.slug);
    record.canonicalPath = "communes/" + record.slug;
    record.legacySlug = record.legacySlugs.find((slug) => slug !== record.slug) || "";
    record.legacySlugs = [...new Set(record.legacySlugs)].filter((slug) => slug && slug !== record.slug);
    delete record.nameSlug;
    delete record.oldBaseSlug;
    delete record.oldSlug;
    delete record.idLegacySlug;
  }

  const canonicalSlugs = new Set(records.map((record) => record.slug));
  const legacyOwners = new Map();
  for (const record of records) {
    for (const alias of record.legacySlugs) {
      if (canonicalSlugs.has(alias)) throw new Error("Legacy alias collides with a canonical commune route: " + alias);
      const owner = legacyOwners.get(alias);
      if (owner && owner !== record.slug) throw new Error("Legacy alias is assigned to multiple commune pages: " + alias);
      legacyOwners.set(alias, record.slug);
    }
  }

  return records;
}

export function communeDiagnostics(records = buildCommuneCatalog()) {
  const sourceCount = records.reduce((sum, item) => sum + item.locations.length, 0);
  return {
    total: records.length,
    sourceRecords: sourceCount,
    groupedRecords: sourceCount - records.length,
    uniqueIds: new Set(records.flatMap((item) => item.locations.map((location) => location.id))).size,
    uniqueSlugs: new Set(records.map((item) => item.slug)).size,
    numericSlugs: records.filter((item) => /\d/.test(item.slug)).map((item) => item.slug),
    multiLocationPages: records.filter((item) => item.locations.length > 1).map((item) => ({ slug: item.slug, locations: item.locations.length })),
    wilayas: new Set(records.map((item) => item.wilayaId)).size,
  };
}
