/** Style reminder: Atlas Observatory keeps weather semantics deterministic and independently verifiable. */
import { describe, expect, it } from "vitest";
import { ALGERIAN_CITIES } from "@/data/cities";
import { buildShareText, getUpcomingHourIndexes, getWeatherCondition, windDirectionArabic } from "@/lib/weather";

describe("weather language", () => {
  it("maps official WMO thunderstorm codes to Arabic weather language", () => expect(getWeatherCondition(95).label).toBe("عواصف رعدية"));
  it("maps degrees to an Arabic compass direction", () => expect(windDirectionArabic(90)).toBe("شرق"));
  it("starts the hourly rail from the next available hour instead of midnight", () => {
    expect(getUpcomingHourIndexes(["2026-08-16T00:00", "2026-08-16T11:00", "2026-08-16T12:00", "2026-08-16T13:00"], "2026-08-16T10:45", 2)).toEqual([1, 2]);
  });
  it("contains the requested 58 unique wilayas and slugs", () => {
    expect(ALGERIAN_CITIES).toHaveLength(58);
    expect(new Set(ALGERIAN_CITIES.map((city) => city.code)).size).toBe(58);
    expect(new Set(ALGERIAN_CITIES.map((city) => city.slug)).size).toBe(58);
    expect(ALGERIAN_CITIES.every((city) => city.name && city.region && Number.isFinite(city.latitude) && Number.isFinite(city.longitude))).toBe(true);
  });
  it("creates a share statement with the city and current temperature", () => {
    const text = buildShareText({ city: { slug: "algiers", name: "الجزائر العاصمة", region: "الساحل", latitude: 0, longitude: 0 }, updatedAt: "2026-08-16T09:00", current: { temperature: 30.4, apparentTemperature: 31, humidity: 50, weatherCode: 0, windSpeed: 12, windDirection: 90, precipitation: 0, cloudCover: 4, isDay: true }, hourly: [], daily: [], marine: null });
    expect(text).toContain("الجزائر العاصمة"); expect(text).toContain("30°");
  });
});
