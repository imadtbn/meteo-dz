export type NasaDailyRecord = {
  date: string;
  temperature: number | null;
  maximum: number | null;
  minimum: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  humidity: number | null;
};
type PowerResponse = { properties?: { parameter?: Record<string, Record<string, number>> } };
export type NasaPoint = { latitude: number; longitude: number; slug: string };
const PARAMETERS = "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,WS10M,RH2M";
const CACHE_TTL = 6 * 60 * 60 * 1000;
function dateKey(date: Date): string { return date.toISOString().slice(0, 10).replaceAll("-", ""); }
function fromPowerValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > -900 ? value : null;
}
export function normalizeNasaPowerResponse(payload: PowerResponse): NasaDailyRecord[] {
  const parameters = payload?.properties?.parameter;
  if (!parameters) throw new Error("استجابة NASA POWER لا تحتوي على بيانات يومية.");
  const dates = Object.keys(parameters.T2M_MAX ?? {}).sort();
  if (!dates.length) throw new Error("لا توجد بيانات مناخية للفترة المختارة.");
  return dates.map((date) => ({
    date, temperature: fromPowerValue(parameters.T2M?.[date]),
    maximum: fromPowerValue(parameters.T2M_MAX?.[date]), minimum: fromPowerValue(parameters.T2M_MIN?.[date]),
    precipitation: fromPowerValue(parameters.PRECTOTCORR?.[date]), windSpeed: fromPowerValue(parameters.WS10M?.[date]),
    humidity: fromPowerValue(parameters.RH2M?.[date]),
  })).filter((record) => record.maximum !== null || record.minimum !== null || record.temperature !== null);
}
export async function fetchNasaPowerDaily(point: NasaPoint, days = 90, signal?: AbortSignal): Promise<NasaDailyRecord[]> {
  if (!Number.isFinite(point.latitude) || point.latitude < -90 || point.latitude > 90 ||
      !Number.isFinite(point.longitude) || point.longitude < -180 || point.longitude > 180) throw new Error("إحداثيات الموقع غير صالحة.");
  const safeDays = Math.min(365, Math.max(30, Math.round(days)));
  const end = new Date(Date.now() - 3 * 86400000);
  const start = new Date(end.getTime() - safeDays * 86400000);
  const coordinateKey = point.latitude.toFixed(4) + ":" + point.longitude.toFixed(4);
  const cacheKey = "atlas-nasa-power:" + coordinateKey + ":" + safeDays + ":" + dateKey(end);
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) ?? "null") as { savedAt: number; rows: NasaDailyRecord[] } | null;
    if (cached && Date.now() - cached.savedAt < CACHE_TTL && Array.isArray(cached.rows) && cached.rows.length) return cached.rows;
  } catch { /* Ignore unavailable storage. */ }
  const params = new URLSearchParams({
    parameters: PARAMETERS, community: "AG", longitude: String(point.longitude), latitude: String(point.latitude),
    start: dateKey(start), end: dateKey(end), format: "JSON",
  });
  const response = await fetch("https://power.larc.nasa.gov/api/temporal/daily/point?" + params, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("تعذر جلب بيانات NASA POWER (HTTP " + response.status + ").");
  const rows = normalizeNasaPowerResponse(await response.json() as PowerResponse);
  try { localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), rows })); } catch { /* Storage is optional. */ }
  return rows;
}
export function summarizeNasaRecords(rows: NasaDailyRecord[]) {
  const valid = (values: Array<number | null>) => values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const temperatures = valid(rows.map((row) => row.temperature));
  const rainfall = valid(rows.map((row) => row.precipitation));
  const maximums = valid(rows.map((row) => row.maximum));
  const minimums = valid(rows.map((row) => row.minimum));
  const winds = valid(rows.map((row) => row.windSpeed));
  return {
    averageTemperature: temperatures.length ? temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length : null,
    rainfallTotal: rainfall.length ? rainfall.reduce((sum, value) => sum + value, 0) : null,
    frostDays: minimums.filter((value) => value <= 0).length,
    hotDays: maximums.filter((value) => value >= 35).length,
    maximumWind: winds.length ? Math.max(...winds) : null,
  };
}
export function calculateAgricultureIndicators(rows: NasaDailyRecord[], baseTemperature = 10) {
  const validRows = rows.filter((row) => row.maximum !== null && row.minimum !== null);
  const growingDegreeDays = validRows.reduce((sum, row) => sum + Math.max(0, ((row.maximum as number) + (row.minimum as number)) / 2 - baseTemperature), 0);
  const rainfall = rows.reduce((sum, row) => sum + (row.precipitation ?? 0), 0);
  const frostDays = rows.filter((row) => row.minimum !== null && row.minimum <= 0).length;
  const heatDays = rows.filter((row) => row.maximum !== null && row.maximum >= 35).length;
  const rainyDays = rows.filter((row) => row.precipitation !== null && row.precipitation >= 5).length;
  return { growingDegreeDays, rainfall, frostDays, heatDays, rainyDays, days: rows.length };
}
