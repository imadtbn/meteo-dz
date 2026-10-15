/** Style reminder: Atlas Observatory structures a weather visit from immediate reading to local context, never decorative noise. */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Compass, Info, RefreshCw, Search, Waves, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { WeatherCard } from "@/components/WeatherCard";
import { WilayaCard } from "@/components/WilayaCard";
import { CitySearch } from "@/components/CitySearch";
import { filterWilayas, globalWeatherLink, type GlobalPlace } from "@/lib/citySearch";
const WeatherInsights = lazy(() => import("@/components/WeatherInsights").then((module) => ({ default: module.WeatherInsights })));
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { ALGERIAN_CITIES, getCityBySlug, type AlgerianCity } from "@/data/cities";
import { fetchWeather, formatDay, formatHour, getAdvice, getWeatherCondition, type WeatherReading, windDirectionArabic } from "@/lib/weather";

const WeatherShareDialog = lazy(() => import("@/components/WeatherShareDialog"));

type HomeProps = { forcedCity?: AlgerianCity; detail?: boolean };

function useWeather(city: AlgerianCity) {
  const [reading, setReading] = useState<WeatherReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const forceNextRefresh = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    const forceRefresh = forceNextRefresh.current;
    forceNextRefresh.current = false;
    setReading(null); setLoading(true); setError(null);
    fetchWeather(city, controller.signal, forceRefresh).then(setReading).catch((reason) => {
      if (reason.name !== "AbortError") setError(reason.message ?? "تعذر تحميل البيانات.");
    }).finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [city.slug, refreshKey]);
  return { reading, loading, error, refresh: () => { forceNextRefresh.current = true; setRefreshKey((value) => value + 1); } };
}

export default function Home({ forcedCity, detail = false }: HomeProps) {
  const [, navigate] = useLocation();
  const initial = useMemo(() => forcedCity ?? getCityBySlug(new URLSearchParams(window.location.search).get("city") ?? undefined), [forcedCity]);
  const [city, setCity] = useState(initial);
  const { reading, loading, error, refresh } = useWeather(city);
  const [shareOpen, setShareOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const [locationPrompt, setLocationPrompt] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    if (!forcedCity) return;
    setCity(forcedCity);
  }, [forcedCity]);

  useEffect(() => {
    const place = city.name;
    document.title = detail ? `طقس ${place} اليوم | الطقس الجزائري` : "الطقس الجزائري | قراءة واضحة لكل مدينة";
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute("content", `حالة الطقس الحالية وتوقعات الأيام القادمة في ${place}، مع قراءة بحرية للسواحل ووقت تحديث واضح.`);
  }, [city.name, detail]);

  useEffect(() => setVisibleCount(12), [citySearch]);

  const visibleCities = useMemo(() => filterWilayas(ALGERIAN_CITIES, citySearch), [citySearch]);

  const selectCity = (next: string) => {
    const found = getCityBySlug(next);
    if (detail) {
      navigate(`/weather/${found.slug}`);
      return;
    }
    setCity(found);
    window.history.replaceState({}, "", `${import.meta.env.BASE_URL}?city=${found.slug}`);
  };

  const locate = () => {
    setLocationError("");
    if (!window.isSecureContext) {
      setLocationError("تحديد الموقع يحتاج إلى اتصال HTTPS آمن. ابحث عن مدينتك أو ولايتك في الحقل.");
      setLocationPrompt(false);
      return;
    }
    if (!navigator.geolocation) {
      setLocationError("هذا المتصفح لا يدعم تحديد الموقع. يمكنك البحث عن الولاية أو المدينة يدويًا.");
      setLocationPrompt(false);
      return;
    }

    setLocationPrompt(false);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
          setLocationError("الإحداثيات المستلمة غير صالحة. ابحث عن مدينتك يدويًا.");
          return;
        }
        const longitudeFactor = Math.cos(coords.latitude * Math.PI / 180);
        const nearest = ALGERIAN_CITIES.reduce((best, candidate) => {
          const distance = Math.hypot(candidate.latitude - coords.latitude, (candidate.longitude - coords.longitude) * longitudeFactor);
          const bestDistance = Math.hypot(best.latitude - coords.latitude, (best.longitude - coords.longitude) * longitudeFactor);
          return distance < bestDistance ? candidate : best;
        }, ALGERIAN_CITIES[0]);
        selectCity(nearest.slug);
        setLocationError("");
      },
      (reason) => {
        const message = reason.code === 1
          ? "تم رفض إذن الموقع أو حظره من إعدادات المتصفح. فعّل إذن الموقع لهذا الموقع، أو ابحث عن المدينة يدويًا."
          : reason.code === 2
            ? "تعذر تحديد موقع الجهاز. تأكد من تشغيل خدمات الموقع أو اختر الولاية يدويًا."
            : "استغرق تحديد الموقع وقتًا طويلًا. يمكنك المحاولة مجددًا أو استخدام البحث عن مدينة.";
        setLocationError(message);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 },
    );
  };

  return <main dir="rtl">
    <PublicHeader showSections />

    <section className="hero-band">
      <div className="hero-content"><span className="eyebrow">مرصد محلي · وقت الجزائر</span><h1>{detail ? <>حالة {city.name}<br />بوضوح، قبل أن تتحرك.</> : <>الطقس الذي تحتاجه<br />قبل أن تتحرك.</>}</h1><p>قراءة مباشرة، ساعات قادمة، وتفاصيل ساحلية موثقة، بلا ادعاءات أو أرقام غير قابلة للتحقق.</p></div>
      <CitySearch city={city} onSelectCity={selectCity} onSelectGlobal={(place: GlobalPlace) => navigate(globalWeatherLink(place))} onRequestLocation={() => { setLocationError(""); setLocationPrompt(true); }} />{locationError && <p className="location-error" role="status">{locationError}</p>}{locationPrompt && <div className="location-consent" role="region" aria-label="طلب تحديد الموقع"><b>اعرض طقس منطقتك تلقائياً؟</b><p>سنستخدم موقع جهازك لاختيار أقرب ولاية. لن نحفظ إحداثياتك في الموقع؛ لا يلزم السماح لعرض الطقس.</p><div><button onClick={locate}>السماح</button><button className="location-consent__later" onClick={() => { localStorage.setItem("atlas-location-asked", "1"); setLocationPrompt(false); }}>البحث يدويًا</button></div></div>}
    </section>

    <section className="dashboard-shell" id="now">
      <div className="section-intro"><span>01 — القراءة المحلية</span><h2>الآن في {city.name}</h2><button className="refresh-button" onClick={refresh} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""} /> تحديث القراءة</button></div>
      {loading && <div className="loading-card" aria-live="polite"><span className="loading-orb" />جارٍ جلب قراءة موثقة للطقس…</div>}
      {error && <div className="error-card" role="alert"><b>تعذر تحديث القراءة.</b><span>{error}</span><button onClick={refresh}>أعد المحاولة</button></div>}
      {reading?.isStale && <div className="weather-stale-note" role="status"><AlertTriangle size={19} aria-hidden="true" /><span>تعذّر الاتصال بمصدر الطقس، لذلك نعرض آخر قراءة محفوظة لهذه الولاية. قد لا تمثل الأحوال الحالية. يمكنك الضغط على «تحديث القراءة» للمحاولة مجددًا، والرجوع للنشرة الرسمية عند الضرورة.</span></div>}
      {reading && <div className="now-grid"><WeatherCard reading={reading} onShare={() => setShareOpen(true)} /><aside className="decision-panel"><span className="eyebrow"><Compass size={15} /> ملخص اليوم</span><h3>{getAdvice(reading)}</h3><div className="decision-points"><span>المحسوس <b>{Math.round(reading.current.apparentTemperature)}°</b></span><span>السحب <b>{Math.round(reading.current.cloudCover)}%</b></span><span>الرياح <b>{windDirectionArabic(reading.current.windDirection)}</b></span></div><small><Info size={14} /> إرشاد آلي مبني على القراءة الحالية، وليس تحذيراً رسمياً.</small></aside></div>}
    </section>

    {reading && <section className="dashboard-shell forecast-section" id="outlook"><div className="section-intro"><span>02 — الإيقاع القريب</span><h2>الساعات القادمة</h2><p>نموذج التنبؤ · Open-Meteo · توقيت الجزائر</p></div><div className="hourly-rail observation-rail">{reading.hourly.map((hour) => { const condition = getWeatherCondition(hour.weatherCode); return <article key={hour.time} className={`hour-card tone-${condition.tone}`}><time><i />{formatHour(hour.time)}</time><b className={`weather-glyph tone-${condition.tone}`}>{condition.icon}</b><strong>{Math.round(hour.temperature)}°</strong><span>{condition.label}</span><small>مطر {Math.round(hour.precipitationProbability)}%</small></article>; })}</div><div className="section-intro section-intro--compact"><span>03 — نظرة أسبوعية</span><h2>سبعة أيام قادمة</h2><p>أقصى وأدنى قراءة يومية</p></div><div className="daily-list">{reading.daily.map((day) => { const condition = getWeatherCondition(day.weatherCode); return <article key={day.date} className={`day-row tone-${condition.tone}`}><time>{formatDay(day.date)}</time><span className={`weather-glyph tone-${condition.tone}`}>{condition.icon}</span><span>{condition.label}</span><b>{Math.round(day.max)}° <i>{Math.round(day.min)}°</i></b><small>مطر {Math.round(day.precipitationProbability)}% · رياح {Math.round(day.windSpeed)} كم/س</small></article>; })}</div></section>}

    {reading && <Suspense fallback={<div className="insights-loading">جارٍ تجهيز النصائح والأخبار…</div>}><WeatherInsights city={city} reading={reading} /></Suspense>}

    {reading && <section className="dashboard-shell marine-section" id="marine"><div className="marine-copy"><span className="eyebrow"><Waves size={16} /> حالة البحر</span><h2>{city.coastal ? `ساحل ${city.name}` : "القراءة البحرية متاحة للمدن الساحلية"}</h2><p>{city.coastal ? "تعرض هذه القراءة مؤشرات الموج النموذجية للساحل الأقرب. استخدم النشرة البحرية الرسمية عند اتخاذ قرارات الملاحة." : "اختر الجزائر العاصمة أو وهران أو عنابة للاطلاع على مؤشرات البحر."}</p></div>{city.coastal && reading.marine ? <div className="marine-metrics"><span><b>{reading.marine.waveHeight?.toFixed(1) ?? "—"}</b> م ارتفاع الموج</span><span><b>{reading.marine.wavePeriod?.toFixed(1) ?? "—"}</b> ث فترة الموج</span><span><b>{reading.marine.waveDirection !== null ? windDirectionArabic(reading.marine.waveDirection) : "—"}</b> اتجاه الموج</span></div> : <div className="marine-empty">لا توجد قراءة بحرية لهذه المدينة.</div>}</section>}


    <section className="regions-section" id="regions">
      <div className="dashboard-shell">
        <div className="section-intro">
          <span>04 — الولايات</span>
          <h2>اختر ولايتك مباشرة</h2>
          <p>ابحث باسم الولاية أو المنطقة، ثم افتح نشرة الطقس من البطاقة المصوّرة.</p>
        </div>
        <div className="city-index-toolbar city-index-toolbar--home">
          <label htmlFor="city-search">البحث في ولايات الجزائر</label>
          <div className="city-index-input-wrap">
            <Search size={18} aria-hidden="true" />
            <input
              id="city-search"
              type="search"
              value={citySearch}
              onChange={(event) => setCitySearch(event.target.value)}
              placeholder="مثال: وهران، الأوراس، 31"
              autoComplete="off"
              aria-controls="home-wilaya-results"
            />
            {citySearch && (
              <button
                type="button"
                aria-label="مسح البحث عن الولاية"
                title="مسح البحث"
                onClick={() => setCitySearch("")}
              >
                <X size={17} aria-hidden="true" />
              </button>
            )}
          </div>
          <strong role="status" aria-live="polite">
            {citySearch.trim() ? `${visibleCities.length} نتيجة مطابقة` : `${ALGERIAN_CITIES.length} ولاية`}
          </strong>
        </div>
        <div className="region-grid region-grid--visual-home" id="home-wilaya-results">
          {visibleCities.slice(0, visibleCount).map((item) => (
            <WilayaCard key={item.slug} city={item} />
          ))}
        </div>
        {visibleCities.length > 0 && (
          <div className="region-actions">
            {visibleCities.length > visibleCount && (
              <button type="button" className="secondary-button" onClick={() => setVisibleCount((count) => count + 12)}>
                إظهار المزيد ({visibleCities.length - visibleCount})
              </button>
            )}
            <Link href="/wilayas" className="all-cities-link">
              استعرض دليل الولايات الكامل <ArrowLeft size={16} aria-hidden="true" />
            </Link>
          </div>
        )}
        {visibleCities.length === 0 && (
          <div className="region-empty-home" role="status">
            لا توجد ولاية مطابقة لهذا البحث.
            <button type="button" onClick={() => setCitySearch("")}>عرض جميع الولايات</button>
          </div>
        )}
      </div>
    </section>

    {reading && shareOpen && <Suspense fallback={null}><WeatherShareDialog reading={reading} onClose={() => setShareOpen(false)} /></Suspense>}
    <PublicFooter />
  </main>;
}
