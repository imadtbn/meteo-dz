import { afterEach, describe, expect, it, vi } from "vitest";
import { weatherRouter } from "./routers/weather";

describe("weather proxy", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps Arabic city aliases to a global geocoding result", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ results: [{ id: 1, name: "دبي", latitude: 25.07, longitude: 55.3, country: "الإمارات العربية المتحدة", admin1: "دبي", timezone: "Asia/Dubai" }] }), { status: 200 }));
    const results = await weatherRouter.searchLocations({ input: { query: "دبي" } });
    expect(results[0]).toMatchObject({ name: "دبي", latitude: 25.07, longitude: 55.3 });
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain("Dubai");
  });

  it("returns no results for an empty or too-short search", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const results = await weatherRouter.searchLocations({ input: { query: "د" } });
    expect(results).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("surfaces a clear error when forecast provider fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("upstream failure", { status: 503 }));
    await expect(weatherRouter.forecast({ input: { latitude: 36.75, longitude: 3.05 } })).rejects.toThrow("تعذر جلب قراءة الموقع");
  });

  it("returns an empty news state when RSS is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("unavailable", { status: 503 }));
    const result = await weatherRouter.news();
    expect(result.items).toEqual([]);
  });

  it("reads the official ONM vigilance list without inventing a severity", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>Vigilance infos : ORAN, SIDI-BEL-ABBES</html>", { status: 200 }));
    const result = await weatherRouter.officialAlerts({ input: { latitude: 35.7, longitude: -0.6, slug: "oran" } });
    expect(result.status).toBe("official_source");
    expect(result.alerts[0]).toMatchObject({ title: "يقظة رسمية منشورة للولاية", severity: "official" });
    expect(result.sourceUrl).toBe("https://www.meteo.dz/");
  });

  it("keeps an empty official alert state when the ONM source is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("unavailable", { status: 503 }));
    const result = await weatherRouter.officialAlerts({ input: { latitude: 36.75, longitude: 3.05, slug: "algiers" } });
    expect(result.alerts).toEqual([]);
    expect(result.status).toBe("source_only");
  });
});
