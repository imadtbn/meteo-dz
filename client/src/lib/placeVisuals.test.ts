import { describe, expect, it } from "vitest";
import { ALGERIAN_CITIES } from "@/data/cities";
import { ARAB_CAPITALS } from "@/data/arab-capitals";
import { countryCodeForArabName, flagForCountry, getCapitalScene, getWilayaScene } from "@/lib/placeVisuals";
import { parseReverseLocation } from "@/lib/reverseGeocode";

describe("illustrated place directories", () => {
  it("assigns a symbolic landscape to all 58 Algerian wilayas", () => {
    expect(ALGERIAN_CITIES).toHaveLength(58);
    const validScenes = new Set(["coast", "desert", "mountain", "highland", "river", "city"]);
    expect(ALGERIAN_CITIES.every((city) => validScenes.has(getWilayaScene(city.region, city.coastal)))).toBe(true);
    expect(getWilayaScene("الساحل الغربي", true)).toBe("coast");
    expect(getWilayaScene("الهضاب", false)).toBe("highland");
  });
  it("covers 22 Arab capitals with country flags and matching scenes", () => {
    expect(ARAB_CAPITALS).toHaveLength(22);
    for (const capital of ARAB_CAPITALS) {
      const code = countryCodeForArabName(capital.country);
      expect(code, capital.country).toMatch(/^[A-Z]{2}$/);
      expect(flagForCountry(code)).not.toBe("🌐");
      expect(getCapitalScene(capital.slug)).toMatch(/^(coast|desert|mountain|highland|river|city)$/);
    }
  });
  it("does not attempt to construct a flag from malformed country codes", () => {
    expect(flagForCountry("somewhere")).toBe("🌐");
    expect(flagForCountry(undefined)).toBe("🌐");
  });
});

describe("reverse geocoding responses", () => {
  it("extracts country, province and municipality when provided", () => {
    expect(parseReverseLocation({
      countryName: "الجزائر",
      principalSubdivision: "ولاية الجزائر",
      city: "باب الزوار",
      locality: "الجزائر",
    })).toEqual({
      country: "الجزائر",
      region: "ولاية الجزائر",
      municipality: "باب الزوار",
    });
  });
  it("shows missing levels as unknown rather than inventing names", () => {
    expect(parseReverseLocation({ countryName: "الجزائر" })).toEqual({
      country: "الجزائر",
      region: null,
      municipality: null,
    });
  });
});
