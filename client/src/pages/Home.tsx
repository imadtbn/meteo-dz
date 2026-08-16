/** Style reminder: Atlas Observatory structures a weather visit from immediate reading to local context, never decorative noise. */
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpLeft, Compass, Info, LocateFixed, MapPinned, RefreshCw, Waves } from "lucide-react";
import { Link } from "wouter";
import { AdSlot } from "@/components/AdSlot";
import { WeatherCard } from "@/components/WeatherCard";
const WeatherInsights = lazy(() => import("@/components/WeatherInsights").then((module) => ({ default: module.WeatherInsights })));
import { PublicFooter } from "@/components/PublicChrome";
import { ALGERIAN_CITIES, getCityBySlug, type AlgerianCity } from "@/data/cities";
import { fetchWeather, formatDay, formatHour, getAdvice, getWeatherCondition, type WeatherReading, windDirectionArabic } from "@/lib/weather";

const WeatherShareDialog = lazy(() => import("@/components/WeatherShareDialog"));

type HomeProps = { forcedCity?: AlgerianCity; detail?: boolean };

function useWeather(city: AlgerianCity) {
  const [reading, setReading] = useState<WeatherReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    fetchWeather(city, controller.signal).then(setReading).catch((reason) => {
      if (reason.name !== "AbortError") setError(reason.message ?? "تعذر تحميل البيانات.");
    }).finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [city.slug, refreshKey]);
  return { reading, loading, error, refresh: () => setRefreshKey((value) => value + 1) };
}

export default function Home({ forcedCity, detail = false }: HomeProps) {
  const initial = useMemo(() => forcedCity ?? getCityBySlug(new URLSearchParams(window.location.search).get("city") ?? undefined), [forcedCity]);
  const [city, setCity] = useState(initial);
  const { reading, loading, error, refresh } = useWeather(city);
  const [shareOpen, setShareOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [locationPrompt, setLocationPrompt] = useState(false);

  useEffect(() => {
    if (!forcedCity) return;
    setCity(forcedCity);
  }, [forcedCity]);

  useEffect(() => {
    if (!forcedCity && navigator.geolocation && !localStorage.getItem("atlas-location-asked")) setLocationPrompt(true);
  }, [forcedCity]);

  useEffect(() => {
    const place = city.name;
    document.title = detail ? `طقس ${place} اليوم | الطقس الجزائري` : "الطقس الجزائري | قراءة واضحة لكل مدينة";
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute("content", `حالة الطقس الحالية وتوقعات الأيام القادمة في ${place}، مع قراءة بحرية للسواحل ووقت تحديث واضح.`);
  }, [city.name, detail]);

  const visibleCities = useMemo(() => {
    const query = citySearch.trim().toLocaleLowerCase("ar");
    if (!query) return ALGERIAN_CITIES;
    return ALGERIAN_CITIES.filter((item) => `${item.name} ${item.region} ${item.code}`.toLocaleLowerCase("ar").includes(query));
  }, [citySearch]);

  const selectCity = (next: string) => {
    const found = getCityBySlug(next);
    setCity(found);
    if (!forcedCity) window.history.replaceState({}, "", `${import.meta.env.BASE_URL}?city=${found.slug}`);
  };

  const locate = () => {
    if (!navigator.geolocation) return;
    localStorage.setItem("atlas-location-asked", "1");
    setLocationPrompt(false);
    navigator.geolocation.getCurrentPosition((position) => {
      const nearest = [...ALGERIAN_CITIES].sort((a, b) => Math.hypot(a.latitude - position.coords.latitude, a.longitude - position.coords.longitude) - Math.hypot(b.latitude - position.coords.latitude, b.longitude - position.coords.longitude))[0];
      setCity(nearest);
    });
  };

  return <main dir="rtl">
    <header className="site-header"><Link href="/" className="brand"><img src="/manus-storage/atlas-mark_78817ed0.png" alt="رمز الطقس الجزائري" /><span>الطقس <b>العربي</b></span></Link><nav aria-label="التنقل الرئيسي"><a href="#now">الآن</a><a href="#outlook">التوقعات</a><Link href="/wilayas">الولايات</Link><Link href="/arab-capitals">العواصم</Link><Link href="/world-search">بحث عالمي</Link><Link href="/weather-map">الخريطة</Link><a href="#marine">البحر</a></nav><a className="header-source" href="https://open-meteo.com/" target="_blank" rel="noreferrer">مصدر البيانات <ArrowUpLeft size={15} /></a></header>

    <section className="hero-band">
      <img className="hero-art" src="/manus-storage/atlas-hero-weather_edadd9be.jpg" alt="خريطة مناخية تجريدية للجزائر والبحر المتوسط" loading="lazy" decoding="async" fetchPriority="low" />
      <div className="hero-content"><span className="eyebrow">مرصد محلي · وقت الجزائر</span><h1>{detail ? <>حالة {city.name}<br />بوضوح، قبل أن تتحرك.</> : <>الطقس الذي تحتاجه<br />قبل أن تتحرك.</>}</h1><p>قراءة مباشرة، ساعات قادمة، وتفاصيل ساحلية موثقة، بلا ادعاءات أو أرقام غير قابلة للتحقق.</p></div>
      <div className="city-command" aria-label="اختيار المدينة"><MapPinned size={20} /><select value={city.slug} onChange={(event) => selectCity(event.target.value)} aria-label="اختر مدينة"><option value="" disabled>اختر مدينة</option>{ALGERIAN_CITIES.map((item) => <option key={item.slug} value={item.slug}>{item.name} — {item.region}</option>)}</select><button onClick={() => setLocationPrompt(true)} className="icon-button dark" aria-label="تحديد أقرب مدينة"><LocateFixed size={20} /></button></div>{locationPrompt && <div className="location-consent" role="dialog" aria-label="السماح بتحديد الموقع"><b>اعرض طقس منطقتك تلقائياً؟</b><p>سنستخدم موقعك التقريبي لاختيار أقرب ولاية فقط، ولن نخزنه أو نرسله إلى طرف ثالث.</p><div><button onClick={locate}>السماح</button><button className="location-consent__later" onClick={() => { localStorage.setItem("atlas-location-asked", "1"); setLocationPrompt(false); }}>ليس الآن</button></div></div>}
    </section>

    <section className="dashboard-shell" id="now">
      <div className="section-intro"><span>01 — القراءة المحلية</span><h2>الآن في {city.name}</h2><button className="refresh-button" onClick={refresh} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""} /> تحديث القراءة</button></div>
      {loading && <div className="loading-card" aria-live="polite"><span className="loading-orb" />جارٍ جلب قراءة موثقة للطقس…</div>}
      {error && <div className="error-card" role="alert"><b>تعذر تحديث القراءة.</b><span>{error}</span><button onClick={refresh}>أعد المحاولة</button></div>}
      {reading && <div className="now-grid"><WeatherCard reading={reading} onShare={() => setShareOpen(true)} /><aside className="decision-panel"><span className="eyebrow"><Compass size={15} /> ملخص اليوم</span><h3>{getAdvice(reading)}</h3><div className="decision-points"><span>المحسوس <b>{Math.round(reading.current.apparentTemperature)}°</b></span><span>السحب <b>{Math.round(reading.current.cloudCover)}%</b></span><span>الرياح <b>{windDirectionArabic(reading.current.windDirection)}</b></span></div><small><Info size={14} /> إرشاد آلي مبني على القراءة الحالية، وليس تحذيراً رسمياً.</small></aside></div>}
    </section>

    {reading && <section className="dashboard-shell forecast-section" id="outlook"><div className="section-intro"><span>02 — الإيقاع القريب</span><h2>الساعات القادمة</h2><p>نموذج التنبؤ · Open-Meteo · توقيت الجزائر</p></div><div className="hourly-rail observation-rail">{reading.hourly.map((hour) => { const condition = getWeatherCondition(hour.weatherCode); return <article key={hour.time} className={`hour-card tone-${condition.tone}`}><time><i />{formatHour(hour.time)}</time><b className={`weather-glyph tone-${condition.tone}`}>{condition.icon}</b><strong>{Math.round(hour.temperature)}°</strong><span>{condition.label}</span><small>مطر {Math.round(hour.precipitationProbability)}%</small></article>; })}</div><div className="section-intro section-intro--compact"><span>03 — نظرة أسبوعية</span><h2>سبعة أيام قادمة</h2><p>أقصى وأدنى قراءة يومية</p></div><div className="daily-list">{reading.daily.map((day) => { const condition = getWeatherCondition(day.weatherCode); return <article key={day.date} className={`day-row tone-${condition.tone}`}><time>{formatDay(day.date)}</time><span className={`weather-glyph tone-${condition.tone}`}>{condition.icon}</span><span>{condition.label}</span><b>{Math.round(day.max)}° <i>{Math.round(day.min)}°</i></b><small>مطر {Math.round(day.precipitationProbability)}% · رياح {Math.round(day.windSpeed)} كم/س</small></article>; })}</div><AdSlot slot="3143411927" /></section>}

    {reading && <Suspense fallback={<div className="insights-loading">جارٍ تجهيز النصائح والأخبار…</div>}><WeatherInsights city={city} reading={reading} /></Suspense>}

    {reading && <section className="dashboard-shell marine-section" id="marine"><div className="marine-copy"><span className="eyebrow"><Waves size={16} /> حالة البحر</span><h2>{city.coastal ? `ساحل ${city.name}` : "القراءة البحرية متاحة للمدن الساحلية"}</h2><p>{city.coastal ? "تعرض هذه القراءة مؤشرات الموج النموذجية للساحل الأقرب. استخدم النشرة البحرية الرسمية عند اتخاذ قرارات الملاحة." : "اختر الجزائر العاصمة أو وهران أو عنابة للاطلاع على مؤشرات البحر."}</p></div>{city.coastal && reading.marine ? <div className="marine-metrics"><span><b>{reading.marine.waveHeight?.toFixed(1) ?? "—"}</b> م ارتفاع الموج</span><span><b>{reading.marine.wavePeriod?.toFixed(1) ?? "—"}</b> ث فترة الموج</span><span><b>{reading.marine.waveDirection !== null ? windDirectionArabic(reading.marine.waveDirection) : "—"}</b> اتجاه الموج</span></div> : <div className="marine-empty">لا توجد قراءة بحرية لهذه المدينة.</div>}</section>}

    <section className="regions-section" id="regions"><div className="dashboard-shell"><div className="section-intro"><span>04 — الولايات</span><h2>اختر ولايتك مباشرة</h2><p>58 ولاية · صفحات ثابتة بروابط واضحة للمشاركة والفهرسة.</p></div><div className="city-index-toolbar"><label htmlFor="city-search">ابحث باسم الولاية أو المنطقة</label><input id="city-search" value={citySearch} onChange={(event) => setCitySearch(event.target.value)} placeholder="مثال: وهران، الهضاب، 31" /><strong>{visibleCities.length} / {ALGERIAN_CITIES.length}</strong></div><div className="region-grid">{visibleCities.map((item) => <Link key={item.slug} href={`/weather/${item.slug}`} className="region-card"><span>{item.code} · {item.region}</span><b>{item.name}</b><ArrowLeft size={18} /></Link>)}</div>{visibleCities.length === 0 && <div className="marine-empty">لا توجد ولاية مطابقة لهذا البحث.</div>}<AdSlot slot="8546947691" /></div></section>

    {reading && shareOpen && <Suspense fallback={null}><WeatherShareDialog reading={reading} onClose={() => setShareOpen(false)} /></Suspense>}
    <PublicFooter />
  </main>;
}
