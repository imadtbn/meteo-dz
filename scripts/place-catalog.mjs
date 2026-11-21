/**
 * One canonical geographic catalog for static pages, sitemap and client routes.
 * Route identity includes the directory, so identical slugs in different page types do not collide.
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
  const byRoute = new Map();
  const add = (record, kind, displayName, routePrefix, country, englishName) => {
    if (!record.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug)) {
      throw new Error("Invalid geographic slug: " + String(record.slug));
    }
    if (!validCoordinates(record)) throw new Error("Invalid coordinates for " + record.slug);
    const canonicalPath = routePrefix + "/" + record.slug;
    const override = COORDINATE_OVERRIDES[record.slug];
    const normalized = {
      slug: record.slug,
      legacySlug: record.legacySlug || "",
      legacySlugs: record.legacySlugs || (record.legacySlug ? [record.legacySlug] : []),
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
      canonicalPath,
      categories: [kind],
      wilayaId: record.wilayaId || "",
      wilayaSlug: record.wilayaSlug || "",
      postCode: record.postCode || "",
      locations: record.locations || [],
      aliases: record.aliases || [],
      englishAliases: record.englishAliases || [],
    };
    const existing = byRoute.get(canonicalPath);
    if (existing) {
      if (existing.kind !== kind) throw new Error("Canonical route collision: " + canonicalPath);
      if (kind === "commune") {
        throw new Error("Duplicate commune route must be grouped before place catalog: " + canonicalPath);
      }
      existing.categories.push(kind);
      existing.image ||= normalized.image;
      existing.englishName ||= normalized.englishName;
      existing.continent ||= normalized.continent;
      existing.countryCode ||= normalized.countryCode;
      return;
    }
    byRoute.set(canonicalPath, normalized);
  };

  for (const city of algerianCities) {
    add(city, "wilaya", city.name, "wilayas", "الجزائر", city.name_en);
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

  return [...byRoute.values()];
}

export function catalogDiagnostics(catalog = buildPlaceCatalog()) {
  const routes = catalog.map((place) => place.canonicalPath);
  const missingImages = catalog.filter((place) => !place.image).map((place) => place.slug);
  return {
    total: catalog.length,
    duplicateRoutes: routes.length - new Set(routes).size,
    missingImages,
    invalidCoordinates: catalog.filter((place) => !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)).map((place) => place.slug),
  };
}
