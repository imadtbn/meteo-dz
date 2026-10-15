/** Style reminder: Atlas Observatory presents only sourced readings, time context, and calm decision-ready guidance. */
import type { AlgerianCity } from "@/data/cities";

export type WeatherCondition = {
  label: string;
  icon: string;
  tone: "sun" | "cloud" | "rain" | "storm" | "fog";
};

export type WeatherReading = {
  city: AlgerianCity;
  updatedAt: string;
  /** Only set when the provider failed and an older saved observation is shown. */
  isStale?: boolean;
  current: {
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    weatherCode: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    cloudCover: number;
    isDay: boolean;
  };
  hourly: Array<{ time: string; temperature: number; weatherCode: number; precipitationProbability: number; windSpeed: number }>;
  daily: Array<{ date: string; weatherCode: number; max: number; min: number; precipitationProbability: number; windSpeed: number }>;
  marine: { waveHeight: number | null; waveDirection: number | null; wavePeriod: number | null } | null;
};

const cacheDuration = 15 * 60 * 1000;
const maxStaleDuration = 6 * 60 * 60 * 1000;

export const getWeatherCondition = (code: number): WeatherCondition => {
  if (code === 0) return { label: "سماء صافية", icon: "☀", tone: "sun" };
  if ([1, 2].includes(code)) return { label: "صحو جزئي", icon: "⛅", tone: "sun" };
  if (code === 3) return { label: "غائم", icon: "☁", tone: "cloud" };
  if ([45, 48].includes(code)) return { label: "ضباب", icon: "〰", tone: "fog" };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: "رذاذ", icon: "☔", tone: "rain" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: "أمطار", icon: "☔", tone: "rain" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: "ثلوج", icon: "❄", tone: "cloud" };
  if ([95, 96, 99].includes(code)) return { label: "عواصف رعدية", icon: "ϟ", tone: "storm" };
  return { label: "حالة متغيرة", icon: "◌", tone: "cloud" };
};

export const windDirectionArabic = (degrees: number) => {
  const directions = ["شمال", "شمال شرقي", "شرق", "جنوب شرقي", "جنوب", "جنوب غربي", "غرب", "شمال غربي"];
  return directions[Math.round((degrees % 360) / 45) % 8];
};

// Open-Meteo returns local wall-clock timestamps for Africa/Algiers.
// Interpret them at UTC+01:00 to display correct hours in every visitor timezone.
export const parseAlgerianWeatherTime = (iso: string): Date => {
  if (/Z$|[+-]\d{2}:\d{2}$/.test(iso)) return new Date(iso);
  if (iso.includes("T")) return new Date(iso + "+01:00");
  return new Date(iso + "T12:00:00+01:00");
};

export const formatHour = (iso: string) =>
  new Intl.DateTimeFormat("ar-DZ", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Algiers" }).format(parseAlgerianWeatherTime(iso));

export const formatDay = (iso: string) =>
  new Intl.DateTimeFormat("ar-DZ", { weekday: "long", day: "numeric", month: "short", timeZone: "Africa/Algiers" }).format(parseAlgerianWeatherTime(iso));

export const formatUpdatedAt = (iso: string) =>
  new Intl.DateTimeFormat("ar-DZ", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short", timeZone: "Africa/Algiers" }).format(parseAlgerianWeatherTime(iso));

export const getUpcomingHourIndexes = (times: string[], currentTime: string, count = 12) => {
  const firstFutureIndex = times.findIndex((time) => time >= currentTime);
  const start = firstFutureIndex >= 0 ? firstFutureIndex : Math.max(0, times.length - count);
  return Array.from({ length: Math.min(count, times.length - start) }, (_, index) => start + index);
};

const fromApi = (city: AlgerianCity, weather: any, marine: any): WeatherReading => {
  const current = weather.current;
  return {
    city,
    updatedAt: current.time,
    current: {
      temperature: current.temperature_2m,
      apparentTemperature: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      weatherCode: current.weather_code,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      precipitation: current.precipitation,
      cloudCover: current.cloud_cover,
      isDay: Boolean(current.is_day),
    },
    hourly: getUpcomingHourIndexes(weather.hourly.time, current.time).map((index: number) => ({
      time: weather.hourly.time[index],
      temperature: weather.hourly.temperature_2m[index],
      weatherCode: weather.hourly.weather_code[index],
      precipitationProbability: weather.hourly.precipitation_probability[index],
      windSpeed: weather.hourly.wind_speed_10m[index],
    })),
    daily: weather.daily.time.map((date: string, index: number) => ({
      date,
      weatherCode: weather.daily.weather_code[index],
      max: weather.daily.temperature_2m_max[index],
      min: weather.daily.temperature_2m_min[index],
      precipitationProbability: weather.daily.precipitation_probability_max[index],
      windSpeed: weather.daily.wind_speed_10m_max[index],
    })),
    marine: marine?.current
      ? {
          waveHeight: marine.current.wave_height ?? null,
          waveDirection: marine.current.wave_direction ?? null,
          wavePeriod: marine.current.wave_period ?? null,
        }
      : null,
  };
};

type WeatherCache = { savedAt: number; value: WeatherReading };

function readCache(city: AlgerianCity): WeatherCache | null {
  try {
    const cached = JSON.parse(localStorage.getItem("atlas-weather-" + city.slug) ?? "null") as WeatherCache | null;
    if (!cached || !Number.isFinite(cached.savedAt) || cached.value?.city?.slug !== city.slug) return null;
    const age = Date.now() - cached.savedAt;
    if (age < 0 || age > maxStaleDuration || !Number.isFinite(cached.value.current?.temperature)) return null;
    return cached;
  } catch {
    return null;
  }
}

/** Bounded requests: protect mobile users from a permanently spinning loader. */
async function fetchJson(url: string, signal?: AbortSignal, timeoutMs = 9000): Promise<any> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (!data || data.error) throw new Error("استجابة غير صالحة من خدمة الطقس");
    return data;
  } catch (error) {
    if (timedOut && !signal?.aborted) throw new Error("انتهت مهلة الاتصال بخدمة الطقس.");
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

function validWeather(data: any): boolean {
  return Boolean(
    data?.current?.time &&
    Number.isFinite(data.current.temperature_2m) &&
    Number.isFinite(data.current.relative_humidity_2m) &&
    Array.isArray(data?.hourly?.time) &&
    Array.isArray(data?.hourly?.temperature_2m) &&
    Array.isArray(data?.daily?.time) &&
    Array.isArray(data?.daily?.temperature_2m_max),
  );
}

export async function fetchWeather(city: AlgerianCity, signal?: AbortSignal, forceRefresh = false): Promise<WeatherReading> {
  const cached = readCache(city);
  if (!forceRefresh && cached && Date.now() - cached.savedAt < cacheDuration) {
    return { ...cached.value, isStale: false };
  }

  const weatherParams = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day,precipitation,cloud_cover",
    hourly: "temperature_2m,precipitation_probability,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
    timezone: "Africa/Algiers",
    forecast_days: "7",
  });

  const marineParams = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current: "wave_height,wave_direction,wave_period",
    timezone: "Africa/Algiers",
  });

  // The global GFS model is a separate Open-Meteo API endpoint. If the main
  // forecast endpoint fails, try it before displaying a cached observation.
  const providers = [
    "https://api.open-meteo.com/v1/forecast",
    "https://api.open-meteo.com/v1/gfs",
  ];

  const marinePromise = city.coastal
    ? fetchJson("https://marine-api.open-meteo.com/v1/marine?" + marineParams, signal, 6500).catch(() => null)
    : Promise.resolve(null);

  try {
    let payload: any = null;
    let lastError: unknown;
    for (const provider of providers) {
      try {
        payload = await fetchJson(provider + "?" + weatherParams, signal);
        if (!validWeather(payload)) throw new Error("الاستجابة الجوية غير مكتملة");
        break;
      } catch (error) {
        if (signal?.aborted) throw error;
        lastError = error;
        payload = null;
      }
    }
    if (!payload) throw lastError ?? new Error("خدمة الطقس غير متاحة");

    // Marine readings are optional: their failure must not hide land forecasts.
    const marine = await marinePromise;
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const reading = { ...fromApi(city, payload, marine), isStale: false };
    try {
      localStorage.setItem("atlas-weather-" + city.slug, JSON.stringify({ savedAt: Date.now(), value: reading }));
    } catch {
      // Private mode or quota limits must never prevent live weather rendering.
    }
    return reading;
  } catch (error) {
    // Switching cities aborts the request: never display the previous city's data.
    if (signal?.aborted) throw error;
    if (cached) return { ...cached.value, isStale: true };

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw new Error("يبدو أنك غير متصل بالإنترنت. تحقق من الاتصال ثم أعد المحاولة.");
    }
    throw new Error("تعذر الاتصال بمصدر الطقس حاليًا. يمكنك إعادة المحاولة أو اختيار ولاية أخرى.");
  }
}

export const getAdvice = (reading: WeatherReading) => {
  if (reading.isStale) return "هذه بيانات محفوظة وليست تحديثًا مباشرًا. راجع النشرة الرسمية قبل اتخاذ قرار السفر أو الخروج.";
  const { temperature, windSpeed, weatherCode } = reading.current;
  if (weatherCode >= 95) return "عاصفة محتملة: تجنب المناطق المكشوفة وتابع النشرة الرسمية المحلية.";
  if (windSpeed >= 55) return "رياح قوية: ثبّت الأغراض الخارجية وخفّف الأنشطة في الأماكن المكشوفة.";
  if (temperature >= 38) return "حرارة مرتفعة: خطّط للتنقل خارج ساعات الذروة واحمل الماء.";
  if ([61, 63, 65, 80, 81, 82].includes(weatherCode)) return "هطول محتمل: راجع حالة الطريق وخذ احتياطاتك قبل التنقل.";
  return "الأحوال مستقرة نسبياً: راقب التحديثات قبل أي رحلة طويلة.";
};

export const buildShareText = (reading: WeatherReading) => {
  const condition = getWeatherCondition(reading.current.weatherCode).label;
  return `${reading.isStale ? "آخر قراءة محفوظة" : "الطقس الآن"} في ${reading.city.name}: ${Math.round(reading.current.temperature)}°، ${condition}. آخر تحديث: ${formatUpdatedAt(reading.updatedAt)}. المصدر: الطقس الجزائري`;
};
