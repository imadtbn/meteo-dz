/** Style reminder: Atlas Observatory keeps weather semantics deterministic and independently verifiable. */
import { describe, expect, it, vi } from "vitest";
import { ALGERIAN_CITIES } from "@/data/cities";
import { buildShareText, fetchGlobalWeather, getUpcomingHourIndexes, getWeatherCondition, parseAlgerianWeatherTime, windDirectionArabic } from "@/lib/weather";

describe("weather language", () => {
  it("interprets Open-Meteo Algeria timestamps independently of viewer timezone", () => {
    expect(parseAlgerianWeatherTime("2026-08-16T09:00").toISOString()).toBe("2026-08-16T08:00:00.000Z");
    expect(parseAlgerianWeatherTime("2026-08-16").toISOString()).toBe("2026-08-16T11:00:00.000Z");
  });
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

describe("shared global weather client", () => {
  const validResponse = {
    timezone: "Africa/Algiers",
    current: {
      temperature_2m: 27,
      apparent_temperature: 28,
      relative_humidity_2m: 42,
      weather_code: 1,
      wind_speed_10m: 14,
    },
    daily: {
      time: ["2026-11-08", "2026-11-09"],
      weather_code: [1, 3],
      temperature_2m_max: [28, 25],
      temperature_2m_min: [17, 16],
      precipitation_probability_max: [5, 30],
    },
  };

  it("uses the shared Open-Meteo endpoint with validated coordinates and a five-day request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validResponse,
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      await expect(fetchGlobalWeather(36.75, 3.05)).resolves.toEqual(validResponse);
      const requestUrl = new URL(fetchMock.mock.calls[0][0] as string);
      expect(requestUrl.hostname).toBe("api.open-meteo.com");
      expect(requestUrl.pathname).toBe("/v1/forecast");
      expect(requestUrl.searchParams.get("latitude")).toBe("36.75");
      expect(requestUrl.searchParams.get("longitude")).toBe("3.05");
      expect(requestUrl.searchParams.get("forecast_days")).toBe("5");
      expect(requestUrl.searchParams.get("timezone")).toBe("auto");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects invalid coordinates before making a network request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    try {
      await expect(fetchGlobalWeather(91, 3)).rejects.toThrow("خط العرض");
      await expect(fetchGlobalWeather(36, 181)).rejects.toThrow("خط الطول");
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects incomplete provider payloads instead of rendering partial forecast data", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...validResponse, daily: { ...validResponse.daily, temperature_2m_min: [] } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      await expect(fetchGlobalWeather(36.75, 3.05)).rejects.toThrow("غير مكتملة");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
