import { afterEach, describe, expect, it, vi } from "vitest";
import { ALGERIAN_CITIES } from "@/data/cities";
import { fetchWeather } from "@/lib/weather";

const city = ALGERIAN_CITIES.find((item) => !item.coastal)!;

function weatherPayload() {
  return {
    current: {
      time: "2026-10-15T12:00",
      temperature_2m: 25,
      apparent_temperature: 26,
      relative_humidity_2m: 55,
      weather_code: 1,
      wind_speed_10m: 14,
      wind_direction_10m: 90,
      precipitation: 0,
      cloud_cover: 30,
      is_day: 1,
    },
    hourly: {
      time: ["2026-10-15T12:00", "2026-10-15T13:00"],
      temperature_2m: [25, 26],
      weather_code: [1, 1],
      precipitation_probability: [0, 5],
      wind_speed_10m: [14, 16],
    },
    daily: {
      time: ["2026-10-15"],
      weather_code: [1],
      temperature_2m_max: [27],
      temperature_2m_min: [18],
      precipitation_probability_max: [5],
      wind_speed_10m_max: [22],
    },
  };
}

function setupStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  });
  vi.stubGlobal("navigator", { onLine: true });
  return store;
}

afterEach(() => vi.unstubAllGlobals());

describe("weather provider resilience", () => {
  it("tries the backup model when the main forecast endpoint fails", async () => {
    setupStorage();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, json: async () => weatherPayload() });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWeather(city);
    expect(result.current.temperature).toBe(25);
    expect(result.isStale).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain("/v1/gfs?");
  });

  it("returns clearly marked stored data if both providers are unreachable", async () => {
    const store = setupStorage();
    const saved = {
      city,
      updatedAt: "2026-10-15T09:00",
      current: { temperature: 22 },
      hourly: [],
      daily: [],
      marine: null,
    };
    store.set("atlas-weather-" + city.slug, JSON.stringify({
      savedAt: Date.now() - 45 * 60 * 1000,
      value: saved,
    }));
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWeather(city);
    expect(result.current.temperature).toBe(22);
    expect(result.isStale).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows a useful error if no recent reading is saved", async () => {
    setupStorage();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network error")));
    await expect(fetchWeather(city)).rejects.toThrow("تعذر الاتصال بمصدر الطقس");
  });

  it("uses a fresh cache but forces an actual network refresh when requested", async () => {
    const store = setupStorage();
    store.set("atlas-weather-" + city.slug, JSON.stringify({
      savedAt: Date.now(),
      value: { city, current: { temperature: 17 }, hourly: [], daily: [], marine: null },
    }));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => weatherPayload() });
    vi.stubGlobal("fetch", fetchMock);
    expect((await fetchWeather(city)).current.temperature).toBe(17);
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await fetchWeather(city, undefined, true)).current.temperature).toBe(25);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
