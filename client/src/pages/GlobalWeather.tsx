/** Style reminder: global weather pages keep the same Atlas reading hierarchy while clearly distinguishing forecast data from official warnings. */
import { useMemo } from "react";
import { ArrowRight, Droplets, Thermometer, Wind } from "lucide-react";
import { Link, useSearch } from "wouter";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { trpc } from "@/lib/trpc";
import { getWeatherCondition } from "@/lib/weather";

export default function GlobalWeatherPage() {
  const params = new URLSearchParams(useSearch());
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lon"));
  const name = params.get("name") || "الموقع المختار";
  const enabled = Number.isFinite(latitude) && Number.isFinite(longitude);
  const forecast = trpc.weather.forecast.useQuery({ latitude, longitude }, { enabled, staleTime: 10 * 60_000 });
  const data = forecast.data as any;
  const days = useMemo(() => data?.daily?.time?.map((date: string, index: number) => ({ date, max: data.daily.temperature_2m_max[index], min: data.daily.temperature_2m_min[index], rain: data.daily.precipitation_probability_max[index], code: data.daily.weather_code[index] })) ?? [], [data]);

  return <main dir="rtl"><PublicHeader /><section className="global-weather-hero"><Link href="/world-search" className="back-link"><ArrowRight size={16} /> العودة إلى البحث</Link><span className="eyebrow">قراءة عالمية · مصدر Open-Meteo</span><h1>الطقس في {name}</h1><p>{enabled ? `${latitude.toFixed(3)}°، ${longitude.toFixed(3)}° · المنطقة الزمنية: ${data?.timezone ?? "تُحدد تلقائياً"}` : "اختر موقعاً من محرك البحث العالمي."}</p></section><section className="directory-shell">{!enabled && <div className="empty-state">لم يتم تحديد إحداثيات صالحة.</div>}{enabled && forecast.isLoading && <div className="loading-card">جارٍ جلب القراءة العالمية…</div>}{enabled && forecast.error && <div className="error-card">تعذر جلب قراءة هذا الموقع حالياً. جرّب البحث مرة أخرى.</div>}{data?.current && <><div className="global-current"><div><span>الآن</span><strong>{Math.round(data.current.temperature_2m)}°</strong><b>{getWeatherCondition(data.current.weather_code).label}</b></div><div className="global-metrics"><span><Thermometer size={17} /> المحسوس {Math.round(data.current.apparent_temperature ?? data.current.temperature_2m)}°</span><span><Droplets size={17} /> الرطوبة {data.current.relative_humidity_2m}%</span><span><Wind size={17} /> الرياح {Math.round(data.current.wind_speed_10m)} كم/س</span></div></div><div className="section-intro section-intro--compact"><span>01 — الأيام القادمة</span><h2>توقع خمسة أيام</h2></div><div className="daily-list">{days.map((day: any) => <article className="day-row" key={day.date}><time>{new Date(day.date).toLocaleDateString("ar-DZ", { weekday: "long", day: "numeric", month: "short" })}</time><span>{getWeatherCondition(day.code).icon} {getWeatherCondition(day.code).label}</span><b>{Math.round(day.max)}° <i>{Math.round(day.min)}°</i></b><small>احتمال المطر {day.rain ?? 0}%</small></article>)}</div></>}</section><PublicFooter /></main>;
}
