import { describe, expect, it } from "vitest";
import { calculateAgricultureIndicators, normalizeNasaPowerResponse, summarizeNasaRecords } from "./nasaPower";
describe("NASA POWER normalization", () => {
  it("normalizes daily values and drops NASA fill values", () => {
    const rows = normalizeNasaPowerResponse({ properties: { parameter: {
      T2M: { "20260101": 12.5 }, T2M_MAX: { "20260101": 18 }, T2M_MIN: { "20260101": 7 },
      PRECTOTCORR: { "20260101": -999 }, WS10M: { "20260101": 3 }, RH2M: { "20260101": 60 },
    } } });
    expect(rows).toHaveLength(1); expect(rows[0].temperature).toBe(12.5); expect(rows[0].precipitation).toBeNull();
  });
  it("calculates transparent climate and agricultural summaries", () => {
    const rows = normalizeNasaPowerResponse({ properties: { parameter: {
      T2M: { "20260101": 12, "20260102": 20 }, T2M_MAX: { "20260101": 18, "20260102": 38 },
      T2M_MIN: { "20260101": -2, "20260102": 12 }, PRECTOTCORR: { "20260101": 6, "20260102": 2 },
      WS10M: { "20260101": 2, "20260102": 5 }, RH2M: { "20260101": 60, "20260102": 40 },
    } } });
    expect(calculateAgricultureIndicators(rows, 10)).toMatchObject({ growingDegreeDays: 15, rainfall: 8, frostDays: 1, heatDays: 1, rainyDays: 1, days: 2 });
    expect(summarizeNasaRecords(rows)).toMatchObject({ frostDays: 1, hotDays: 1, rainfallTotal: 8 });
  });
  it("rejects payloads without parameter data", () => { expect(() => normalizeNasaPowerResponse({})).toThrow(); });
});
