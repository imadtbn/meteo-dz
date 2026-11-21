import { useEffect, useMemo, useState } from "react";
import { fetchWeather, formatDay, getWeatherCondition } from "@/lib/weather";
import type { WeatherReading } from "@/lib/weather";
import type { AlgerianCommuneLocation } from "@/data/communes";

function SiteForecast({ location, index }: { location: AlgerianCommuneLocation & { timezone: string }; index: number }) {
  const [reading, setReading] = useState<WeatherReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const city = {
      code: location.id,
      slug: "commune-site-" + location.id,
      name: location.displayName || "موقع البلدية",
      region: "الجزائر",
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
      country: "الجزائر",
      administrativeLevel: "commune" as const,
    };
    fetchWeather(city, controller.signal).then(setReading).catch((reason) => {
      if (reason?.name !== "AbortError") setError(reason?.message || "تعذر تحميل توقعات هذا الموقع.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [location.id, location.latitude, location.longitude, location.timezone, location.displayName]);

  const condition = reading ? getWeatherCondition(reading.current.weatherCode) : null;
  return (
    <article className="commune-site-weather-card">
      <div className="commune-site-weather-card__heading">
        <span>الموقع الجغرافي {index + 1}</span>
        <strong>{location.displayName || "موقع إضافي"}</strong>
        {location.postCode && <small>الرمز البريدي: {location.postCode}</small>}
      </div>
      <p className="commune-site-weather-card__coordinates">
        {location.latitude.toFixed(4)}° ، {location.longitude.toFixed(4)}°
      </p>
      {loading && <p role="status">جارٍ تحميل توقعات هذا الموقع…</p>}
      {error && <p role="alert">{error}</p>}
      {reading && condition && (
        <>
          <div className="commune-site-weather-card__current">
            <span aria-hidden="true">{condition.icon}</span>
            <strong>{Math.round(reading.current.temperature)}°</strong>
            <span>{condition.label}</span>
          </div>
          <div className="commune-site-weather-card__metrics">
            <span>الرطوبة {reading.current.humidity}%</span>
            <span>الرياح {Math.round(reading.current.windSpeed)} كم/س</span>
          </div>
          <div className="commune-site-weather-card__days">
            {reading.daily.slice(0, 5).map((day) => (
              <div key={day.date}>
                <span>{formatDay(day.date, location.timezone)}</span>
                <b>{Math.round(day.max)}° / {Math.round(day.min)}°</b>
                <small>{Math.round(day.precipitationProbability)}% أمطار</small>
              </div>
            ))}
          </div>
        </>
      )}
    </article>
  );
}

export function CommuneLocationsWeather({
  locations,
  primaryLocationId,
}: {
  locations: Array<AlgerianCommuneLocation & { timezone: string }>;
  primaryLocationId: string;
}) {
  const additional = useMemo(
    () => locations.filter((location) => location.id !== primaryLocationId),
    [locations, primaryLocationId],
  );
  if (!additional.length) return null;

  return (
    <section className="dashboard-shell commune-sites-weather" aria-labelledby="commune-sites-title">
      <div className="section-intro">
        <span>مواقع البلدية</span>
        <h2 id="commune-sites-title">توقعات الطقس لكل موقع جغرافي</h2>
        <p>تُعرض بيانات كل موقع وفق إحداثياته الخاصة، ولا تُدمج القراءات بين المواقع.</p>
      </div>
      <div className="commune-sites-weather__grid">
        {additional.map((location, index) => (
          <SiteForecast key={location.id} location={location} index={index + 1} />
        ))}
      </div>
    </section>
  );
}
