/** Style reminder: server weather data is source-aware, explicit about freshness, and never invents official alerts. */
import { z } from "zod";

const geocodingSchema = z.object({
  id: z.number(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  country: z.string().optional(),
  admin1: z.string().optional(),
  timezone: z.string().optional(),
});

export const weatherRouter = {
  forecast: async ({ input }: { input: { latitude: number; longitude: number } }) => {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(input.latitude));
    url.searchParams.set("longitude", String(input.longitude));
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m");
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code");
    url.searchParams.set("forecast_days", "5");
    url.searchParams.set("timezone", "auto");
    const response = await fetch(url);
    if (!response.ok) throw new Error("تعذر جلب قراءة الموقع.");
    return response.json();
  },
  searchLocations: async ({ input }: { input: { query: string } }) => {
    const query = input.query.trim();
    if (query.length < 2) return [];
    const aliases: Record<string, string> = { "دبي": "Dubai", "أبوظبي": "Abu Dhabi", "الدوحة": "Doha", "الرياض": "Riyadh", "القاهرة": "Cairo", "الجزائر": "Algiers", "وهران": "Oran", "تونس": "Tunis", "الرباط": "Rabat", "بيروت": "Beirut", "بغداد": "Baghdad", "مسقط": "Muscat" };
    const lookup = aliases[query] ?? query;
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", lookup);
    url.searchParams.set("count", "8");
    url.searchParams.set("language", "ar");
    url.searchParams.set("format", "json");
    const response = await fetch(url);
    if (!response.ok) throw new Error("تعذر البحث الجغرافي حالياً.");
    const payload = (await response.json()) as { results?: unknown[] };
    return (payload.results ?? []).flatMap((item) => {
      const parsed = geocodingSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
  },
  news: async () => {
    const source = "https://www.noaa.gov/rss.xml";
    try {
      const response = await fetch(source, { headers: { Accept: "application/rss+xml, application/xml, text/xml" } });
      if (!response.ok) throw new Error("RSS unavailable");
      const xml = await response.text();
      const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g)).slice(0, 6).map((match) => {
        const block = match[1] ?? "";
        const read = (tag: string) => block.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`))?.[1]?.trim() ?? "";
        return { title: read("title"), link: read("link"), publishedAt: read("pubDate"), source: "NOAA" };
      }).filter((item) => item.title && item.link);
      return { source, items };
    } catch {
      return { source, items: [] };
    }
  },
  officialAlerts: async ({ input }: { input: { latitude: number; longitude: number; slug?: string } }) => {
    const sourceUrl = "https://www.meteo.dz/";
    const fallback = {
      status: "source_only" as const,
      alerts: [],
      source: "الديوان الوطني للأرصاد الجوية الجزائرية (ONM)",
      sourceUrl,
      location: { latitude: input.latitude, longitude: input.longitude },
      message: "لم نتمكن من قراءة قائمة اليقظة الرسمية الآن. راجع صفحة ONM قبل القرارات الحساسة.",
    };
    try {
      const response = await fetch(sourceUrl, { headers: { Accept: "text/html" } });
      if (!response.ok) return fallback;
      const html = await response.text();
      const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
      const markerIndex = text.toLowerCase().indexOf("vigilance infos");
      const vigilanceText = markerIndex >= 0 ? text.slice(markerIndex, markerIndex + 1800) : "";
      const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const normalizedVigilanceText = normalize(vigilanceText);
      const slug = input.slug ? normalize(input.slug) : "";
      const isListed = Boolean(slug && normalizedVigilanceText.includes(slug));
      return {
        status: "official_source" as const,
        alerts: isListed ? [{ title: "يقظة رسمية منشورة للولاية", severity: "official", message: "توجد الولاية ضمن قائمة اليقظة المنشورة من ONM. افتح المصدر الرسمي لمعرفة اللون والظاهرة ومدة الصلاحية." }] : [],
        source: "الديوان الوطني للأرصاد الجوية الجزائرية (ONM)",
        sourceUrl,
        location: { latitude: input.latitude, longitude: input.longitude },
        message: isListed ? "تم العثور على الولاية ضمن قائمة اليقظة الرسمية. التفاصيل واللون الزمني في صفحة ONM." : "لا تظهر الولاية ضمن قائمة اليقظة المختصرة التي أمكن قراءتها الآن من المصدر الرسمي.",
      };
    } catch {
      return fallback;
    }
  },
};

export const weatherInput = {
  forecast: z.object({ latitude: z.number(), longitude: z.number() }),
  searchLocations: z.object({ query: z.string().min(2).max(80) }),
  officialAlerts: z.object({ latitude: z.number(), longitude: z.number(), slug: z.string().optional() }),
};
