/**
 * One canonical geographic catalog for static pages, sitemap and client routes.
 * Source precedence is intentional: Algerian wilayas, their communes, then Arab capitals and world capitals.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import algerianCities from "../data/cities.json" with { type: "json" };
import arabCapitals from "../data/arab-capitals.json" with { type: "json" };
import worldCapitals from "../data/world-capitals.json" with { type: "json" };
import { buildCommuneCatalog } from "./commune-catalog.mjs";

const IMAGE_ROOT = path.resolve("images");
const IMAGE_PREFIX = "images/";
const COORDINATE_OVERRIDES = {
  // The Arab-capitals dataset is the selected reference for Bahrain's capital.
  manama: { latitude: 26.2235, longitude: 50.5876 },
};

function imageFor(record) {
  const filename = path.basename(record.countryImages || "");
  return filename && existsSync(path.join(IMAGE_ROOT, filename)) ? IMAGE_PREFIX + filename : null;
}

function validCoordinates(record) {
  return Number.isFinite(record.latitude) && record.latitude >= -90 && record.latitude <= 90
    && Number.isFinite(record.longitude) && record.longitude >= -180 && record.longitude <= 180;
}

export function buildPlaceCatalog() {
  const bySlug = new Map();
  const add = (record, kind, displayName, routePrefix, country, englishName) => {
    if (!record.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug)) {
      throw new Error("Invalid geographic slug: " + String(record.slug));
    }
    if (!validCoordinates(record)) throw new Error("Invalid coordinates for " + record.slug);
    const override = COORDINATE_OVERRIDES[record.slug];
    const normalized = {
      slug: record.slug,
      kind,
      displayName,
      englishName: englishName || record.englishName || record.name_en || "",
      country: country || record.country || "الجزائر",
      countryCode: record.countryCode || (kind === "wilaya" ? "DZ" : ""),
      region: record.region || "",
      continent: record.continent || (kind === "wilaya" ? "africa" : ""),
      latitude: override?.latitude ?? record.latitude,
      longitude: override?.longitude ?? record.longitude,
      image: imageFor(record),
      canonicalPath: routePrefix + "/" + record.slug,
      categories: [kind],
      wilayaId: record.wilayaId || "",
      wilayaSlug: record.wilayaSlug || "",
      postCode: record.postCode || "",
    };
    const existing = bySlug.get(record.slug);
    if (existing) {
      if (existing.countryCode && normalized.countryCode && existing.countryCode !== normalized.countryCode) {
        throw new Error("Slug collision across countries: " + record.slug);
      }
      existing.categories.push(kind);
      existing.image ||= normalized.image;
      existing.englishName ||= normalized.englishName;
      existing.continent ||= normalized.continent;
      existing.countryCode ||= normalized.countryCode;
      return;
    }
    bySlug.set(record.slug, normalized);
  };

  for (const city of algerianCities) {
    add(city, "wilaya", city.name, "weather", "الجزائر", city.name_en);
  }
  for (const commune of buildCommuneCatalog()) {
    add(commune, "commune", commune.displayName, "communes", "الجزائر", commune.englishName);
  }
  for (const capital of arabCapitals) {
    add(capital, "arab-capital", capital.capital, "arab-capitals", capital.country, capital.englishName);
  }
  for (const capital of worldCapitals) {
    add(capital, "world-capital", capital.capital, "world-capitals", capital.country, capital.englishName);
  }

  return [...bySlug.values()];
}

export function catalogDiagnostics(catalog = buildPlaceCatalog()) {
  const slugs = catalog.map((place) => place.slug);
  const missingImages = catalog.filter((place) => !place.image).map((place) => place.slug);
  return {
    total: catalog.length,
    duplicateSlugs: slugs.length - new Set(slugs).size,
    missingImages,
    invalidCoordinates: catalog.filter((place) => !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)).map((place) => place.slug),
  };
}
