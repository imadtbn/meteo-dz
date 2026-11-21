import { describe, expect, it } from "vitest";
import { buildCommuneCatalog, communeDiagnostics } from "./commune-catalog.mjs";

const slugify = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[’']/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

describe("canonical commune routes", () => {
  const catalog = buildCommuneCatalog();

  it("uses only commune and wilaya names in every canonical slug", () => {
    for (const commune of catalog) {
      const sourceName = commune.englishName || commune.arabicName;
      expect(commune.slug).toBe(slugify(sourceName) + "-" + commune.wilayaSlug);
      expect(commune.slug).not.toMatch(/\d/);
    }
  });

  it("groups repeated names in the same wilaya into one page", () => {
    expect(catalog.some((commune) => commune.locations.length > 1)).toBe(true);
    expect(new Set(catalog.map((commune) => commune.slug)).size).toBe(catalog.length);
  });

  it("retains every original source record and its independent coordinates", () => {
    const diagnostics = communeDiagnostics(catalog);
    expect(diagnostics.sourceRecords).toBe(1708);
    expect(diagnostics.uniqueIds).toBe(1708);
    expect(catalog.every((commune) => commune.locations.length >= 1)).toBe(true);
    expect(catalog.every((commune) => commune.locations.every((location) =>
      Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
    ))).toBe(true);
  });

  it("preserves legacy URL aliases without alias collisions", () => {
    const aliases = catalog.flatMap((commune) => commune.legacySlugs);
    expect(new Set(aliases).size).toBe(aliases.length);
    expect(aliases.some((slug) => /\d/.test(slug))).toBe(true);
  });
});
