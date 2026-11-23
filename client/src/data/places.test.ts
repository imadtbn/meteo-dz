import { describe, expect, it } from "vitest";
import arabCapitals from "../../../data/arab-capitals.json";
import worldCapitals from "../../../data/world-capitals.json";
import { getPlaceWeatherTarget } from "@/data/places";

describe("independent capital directory routes", () => {
  it("resolves every Arabic capital from its own directory route", () => {
    for (const capital of arabCapitals) {
      expect(getPlaceWeatherTarget("arab-capitals", capital.slug)).toEqual({
        slug: capital.slug,
        displayName: capital.capital,
        country: capital.country,
        englishName: capital.englishName,
        latitude: capital.latitude,
        longitude: capital.longitude,
      });
    }
  });

  it("resolves every world capital from its own directory route", () => {
    for (const capital of worldCapitals) {
      expect(getPlaceWeatherTarget("world-capitals", capital.slug)).toEqual({
        slug: capital.slug,
        displayName: capital.capital,
        country: capital.country,
        englishName: capital.englishName,
        latitude: capital.latitude,
        longitude: capital.longitude,
      });
    }
  });

  it("keeps overlapping slugs valid in each directory namespace", () => {
    expect(getPlaceWeatherTarget("arab-capitals", "algiers")?.country).toBe("الجزائر");
    expect(getPlaceWeatherTarget("world-capitals", "algiers")?.country).toBe("الجزائر");

    for (const slug of ["cairo", "tunis", "rabat", "tripoli", "riyadh", "baghdad", "doha"]) {
      expect(getPlaceWeatherTarget("arab-capitals", slug)).not.toBeNull();
      expect(getPlaceWeatherTarget("world-capitals", slug)).not.toBeNull();
    }
  });

  it("returns null for unknown slugs and missing route parameters", () => {
    expect(getPlaceWeatherTarget("arab-capitals")).toBeNull();
    expect(getPlaceWeatherTarget("world-capitals", "not-a-capital")).toBeNull();
  });
});
