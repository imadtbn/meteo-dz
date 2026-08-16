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

  it("does not fabricate official alerts when the official feed is unavailable", async () => {
    const result = await weatherRouter.officialAlerts({ input: { latitude: 36.75, longitude: 3.05 } });
    expect(result.alerts).toEqual([]);
    expect(result.status).toBe("source_only");
    expect(result.sourceUrl).toContain("wmo.int");
  });
});
