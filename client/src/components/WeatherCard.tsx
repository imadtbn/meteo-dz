/** Style reminder: Atlas Observatory weather cards privilege provenance, time, and a single clear next action. */
import { Clock3, CloudRain, Crosshair, Droplets, Share2, Wind } from "lucide-react";
import type { WeatherReading } from "@/lib/weather";
import { formatUpdatedAt, getWeatherCondition, windDirectionArabic } from "@/lib/weather";

type WeatherCardProps = { reading: WeatherReading; onShare: () => void; onLocate: () => void; locationLoading?: boolean };

export function WeatherCard({ reading, onShare, onLocate, locationLoading = false }: WeatherCardProps) {
  const condition = getWeatherCondition(reading.current.weatherCode);
  return <article className={`current-card tone-${condition.tone}`} aria-label={`الطقس الحالي في ${reading.city.name}`}>
    <div className="current-card__topline"><span className={reading.isStale ? "live-dot is-stale" : "live-dot"} /> {reading.isStale ? "قراءة محفوظة (غير مباشرة)" : "قراءة محدثة"} <span><Clock3 size={14} /> {formatUpdatedAt(reading.updatedAt, reading.city.timezone)}</span><button type="button" className="weather-location-button" onClick={onLocate} disabled={locationLoading}><Crosshair size={16} /> {locationLoading ? "جارٍ تحديد الموقع…" : "طقس موقعي"}</button></div>
    <div className="current-card__main">
      <div><p className="region-label">{reading.city.region}</p><h2>{reading.city.name}</h2><p className="condition-label">{condition.label}</p></div>
      <div className="condition-mark" aria-hidden="true">{condition.icon}</div>
      <div className="temperature">{Math.round(reading.current.temperature)}<sup>°</sup></div>
    </div>
    <div className="current-metrics">
      <span><Droplets size={17} /> رطوبة <b>{Math.round(reading.current.humidity)}%</b></span>
      <span><Wind size={17} /> رياح <b>{Math.round(reading.current.windSpeed)} كم/س</b></span>
      <span><CloudRain size={17} /> هطول <b>{reading.current.precipitation.toFixed(1)} مم</b></span>
    </div>
    <div className="current-card__footer"><span>اتجاه الرياح: <b>{windDirectionArabic(reading.current.windDirection)}</b></span><button onClick={onShare} className="share-inline" aria-label={`مشاركة بطاقة طقس ${reading.city.name}`}><Share2 size={17} /> مشاركة البطاقة</button></div>
  </article>;
}
