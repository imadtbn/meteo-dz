import { describe, expect, it } from "vitest";
import { normalizeFavoriteSlugs, parseFavoriteSlugs, toggleFavoriteSlug } from "@/lib/favorites";

describe("local city favorites", () => {
  it("parses valid unique slugs and ignores malformed values", () => {
    expect(parseFavoriteSlugs(JSON.stringify(["algiers", "oran", "algiers", 12, "../bad", ""])))
      .toEqual(["algiers", "oran"]);
  });

  it("recovers safely from empty or invalid storage", () => {
    expect(parseFavoriteSlugs(null)).toEqual([]);
    expect(parseFavoriteSlugs("not-json")).toEqual([]);
    expect(normalizeFavoriteSlugs({ slug: "algiers" })).toEqual([]);
  });

  it("adds and removes a city without creating duplicates", () => {
    expect(toggleFavoriteSlug(["algiers"], "oran")).toEqual(["algiers", "oran"]);
    expect(toggleFavoriteSlug(["algiers", "oran"], "algiers")).toEqual(["oran"]);
    expect(toggleFavoriteSlug(["algiers"], "algiers")).toEqual([]);
  });

  it("rejects invalid slugs", () => {
    expect(toggleFavoriteSlug(["algiers"], "../oran")).toEqual(["algiers"]);
  });
});
