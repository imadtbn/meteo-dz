import { describe, expect, it } from "vitest";
import { ALGERIAN_CITIES } from "@/data/cities";
import { filterWilayas, findLocalCities, globalWeatherLink, normalizePlaceSearch, parseGlobalPlaces } from "@/lib/citySearch";

describe("homepage city search", () => {
  it("normalizes common Arabic spellings and Latin accents", () => {
    expect(normalizePlaceSearch("  إِيلِيزي  ")).toBe("ايليزي");
    expect(normalizePlaceSearch("Béjaïa")).toBe("bejaia");
  });

  it("finds local wilayas without waiting for an API", () => {
    expect(findLocalCities(ALGERIAN_CITIES, "وهران").some((city) => city.slug === "oran")).toBe(true);
    expect(findLocalCities(ALGERIAN_CITIES, "16").some((city) => city.slug === "algiers")).toBe(true);
    expect(findLocalCities(ALGERIAN_CITIES, "أدرار")[0]?.slug).toBe("adrar");
    expect(findLocalCities(ALGERIAN_CITIES, "", 8)).toEqual([]);
  });

  it("returns all 58 wilayas for an empty homepage directory query", () => {
    expect(filterWilayas(ALGERIAN_CITIES, "")).toHaveLength(58);
    expect(filterWilayas(ALGERIAN_CITIES, "    ")).toHaveLength(58);
  });

  it("filters illustrated card results by Arabic spelling, region, or code", () => {
    expect(filterWilayas(ALGERIAN_CITIES, "وهران").map((city) => city.slug)).toContain("oran");
    expect(filterWilayas(ALGERIAN_CITIES, "البليده").some((city) => city.slug === "blida")).toBe(true);
    expect(filterWilayas(ALGERIAN_CITIES, "أوراس").some((city) => city.slug === "batna")).toBe(true);
    expect(filterWilayas(ALGERIAN_CITIES, "31").map((city) => city.slug)).toContain("oran");
    expect(filterWilayas(ALGERIAN_CITIES, "مدينه غير موجوده")).toHaveLength(0);
  });

  it("limits results to a phone-friendly selection", () => {
    expect(findLocalCities(ALGERIAN_CITIES, "ال", 5).length).toBeLessThanOrEqual(5);
  });

  it("ignores invalid remote coordinates and accepts valid worldwide results", () => {
    const places = parseGlobalPlaces({
      results: [
        { id: 1, name: "Tokyo", latitude: 35.6762, longitude: 139.6503, country: "Japan" },
        { id: 2, name: "Invalid", latitude: 123, longitude: 2 },
        { id: 3, name: "Bad", latitude: NaN, longitude: 4 },
        { id: 4, name: "", latitude: 3, longitude: 3 },
      ],
    });
    expect(places).toHaveLength(1);
    expect(places[0].name).toBe("Tokyo");
    expect(parseGlobalPlaces({ results: null })).toEqual([]);
  });

  it("generates a route with encoded global city name", () => {
    expect(globalWeatherLink({ name: "نيويورك", latitude: 40.7, longitude: -74 }))
      .toBe("/global-weather?lat=40.7&lon=-74&name=%D9%86%D9%8A%D9%88%D9%8A%D9%88%D8%B1%D9%83");
  });
});
