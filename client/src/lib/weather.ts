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

export const formatHour = (iso: string) =>
  new Intl.DateTimeFormat("ar-DZ", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Algiers" }).format(new Date(iso));

export const formatDay = (iso: string) =>
  new Intl.DateTimeFormat("ar-DZ", { weekday: "long", day: "numeric", month: "short", timeZone: "Africa/Algiers" }).format(new Date(iso));

export const formatUpdatedAt = (iso: string) =>
  new Intl.DateTimeFormat("ar-DZ", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short", timeZone: "Africa/Algiers" }).format(new Date(iso));

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

export async function fetchWeather(city: AlgerianCity, signal?: AbortSignal): Promise<WeatherReading> {
  const cacheKey = `atlas-weather-${city.slug}`;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) ?? "null");
    if (cached && Date.now() - cached.savedAt < cacheDuration) return cached.value as WeatherReading;
  } catch {
    // Cache is only a speed enhancement; failures must never block fresh data.
  }

  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.search = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day,precipitation,cloud_cover",
    hourly: "temperature_2m,precipitation_probability,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
    timezone: "Africa/Algiers",
    forecast_days: "7",
  }).toString();

  const marineUrl = new URL("https://marine-api.open-meteo.com/v1/marine");
  marineUrl.search = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current: "wave_height,wave_direction,wave_period",
    timezone: "Africa/Algiers",
  }).toString();

  const [weatherResponse, marineResponse] = await Promise.all([
    fetch(weatherUrl, { signal }),
    city.coastal ? fetch(marineUrl, { signal }).catch(() => null) : Promise.resolve(null),
  ]);

  if (!weatherResponse.ok) throw new Error("تعذر الوصول إلى بيانات الطقس الآن.");
  const [weather, marine] = await Promise.all([weatherResponse.json(), marineResponse?.ok ? marineResponse.json() : null]);
  const reading = fromApi(city, weather, marine);
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), value: reading }));
  } catch {
    // Private browsing can deny storage; the live reading still renders.
  }
  return reading;
}

export const getAdvice = (reading: WeatherReading) => {
  const { temperature, windSpeed, weatherCode } = reading.current;
  if (weatherCode >= 95) return "عاصفة محتملة: تجنب المناطق المكشوفة وتابع النشرة الرسمية المحلية.";
  if (windSpeed >= 55) return "رياح قوية: ثبّت الأغراض الخارجية وخفّف الأنشطة في الأماكن المكشوفة.";
  if (temperature >= 38) return "حرارة مرتفعة: خطّط للتنقل خارج ساعات الذروة واحمل الماء.";
  if ([61, 63, 65, 80, 81, 82].includes(weatherCode)) return "هطول محتمل: راجع حالة الطريق وخذ احتياطاتك قبل التنقل.";
  return "الأحوال مستقرة نسبياً: راقب التحديثات قبل أي رحلة طويلة.";
};

export const buildShareText = (reading: WeatherReading) => {
  const condition = getWeatherCondition(reading.current.weatherCode).label;
  return `الطقس الآن في ${reading.city.name}: ${Math.round(reading.current.temperature)}°، ${condition}. آخر تحديث: ${formatUpdatedAt(reading.updatedAt)}. المصدر: الطقس الجزائري`;
};
