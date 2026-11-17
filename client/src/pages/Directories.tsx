import { AdSlot } from "@/components/AdSlot";
import { useMemo, useState } from "react";
import { ArrowLeft, MapPin, Search } from "lucide-react";
import { Link } from "wouter";
import { ALGERIAN_CITIES } from "@/data/cities";
import { ARAB_CAPITALS } from "@/data/arab-capitals";
import { getCanonicalPlacePath } from "@/data/places";
import worldCapitals from "../../../data/world-capitals.json";
import { PlaceIllustration } from "@/components/PlaceIllustration";
import { WilayaCard } from "@/components/WilayaCard";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { countryCodeForArabName, flagForCountry, getCapitalScene } from "@/lib/placeVisuals";
import { filterWilayas } from "@/lib/citySearch";

function DirectorySearch({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="directory-search">
      <Search size={18} aria-hidden="true" />
      <span className="sr-only">بحث</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function WeatherDirectoryPage() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => filterWilayas(ALGERIAN_CITIES, query), [query]);

  return (
    <main dir="rtl">
      <PublicHeader />
      <section className="directory-hero">
        <span className="eyebrow"><MapPin size={15} /> دليل الطقس · الجزائر</span>
        <h1>الطقس في ولايتك، من صفحة واحدة.</h1>
        <p>اختر الولاية لفتح صفحة طقس مستقلة بعنوان ثابت وتوقعات محلية قابلة للمشاركة.</p>
        <DirectorySearch value={query} onChange={setQuery} placeholder="ابحث باسم الولاية أو المنطقة أو الرمز" />
      </section>
      <AdSlot position="header" />
      <section className="directory-shell">
        <div className="section-intro">
          <span>دليل الصفحات الجوية</span>
          <h2>{results.length} مدينة وولاية</h2>
          <p>كل بطاقة تفتح صفحة الطقس الخاصة بالمدينة مباشرة.</p>
        </div>
        <div className="directory-grid directory-grid--visual">
          {results.map((city) => <WilayaCard key={city.slug} city={city} />)}
        </div>
        {results.length === 0 && <div className="empty-state">لا توجد ولاية مطابقة لهذا البحث.</div>}
      </section>
      <PublicFooter />
    </main>
  );
}

export function WilayasPage() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => filterWilayas(ALGERIAN_CITIES, query), [query]);

  return (
    <main dir="rtl">
      <PublicHeader />
      <section className="directory-hero">
        <span className="eyebrow"><MapPin size={15} /> دليل الجزائر · 69 ولاية</span>
        <h1>اكتشف الطقس في كل ولاية.</h1>
        <p>مشاهد رمزية مستوحاة من طبيعة المناطق الجزائرية، مع رابط مباشر للقراءة الجوية والتوقعات.</p>
        <DirectorySearch value={query} onChange={setQuery} placeholder="ابحث باسم الولاية أو المنطقة أو الرمز" />
      </section>
      <AdSlot position="header" />
      <section className="directory-shell">
        <div className="section-intro">
          <span>01 — القائمة الوطنية</span>
          <h2>{results.length} ولاية مطابقة</h2>
          <p>الرسومات دلالية للمنطقة وليست صورًا فوتوغرافية للولاية.</p>
        </div>
        <div className="directory-grid directory-grid--visual">
          {results.map((city) => <WilayaCard key={city.slug} city={city} />)}
        </div>
        {results.length === 0 && <div className="empty-state">لا توجد ولاية مطابقة لهذا البحث.</div>}
      </section>
      <PublicFooter />
    </main>
  );
}

export function ArabCapitalsPage() {
  const [query, setQuery] = useState("");
  const results = useMemo(() =>
    ARAB_CAPITALS.filter((item) =>
      (item.country + " " + item.capital + " " + item.englishName).toLocaleLowerCase("ar").includes(query.trim().toLocaleLowerCase("ar"))
    ), [query]);

  return (
    <main dir="rtl">
      <PublicHeader />
      <section className="directory-hero directory-hero--arab">
        <span className="eyebrow">مرصد الأطلس · 22 عاصمة عربية</span>
        <h1>جولة جوية بين العواصم العربية.</h1>
        <p>اكتشف العواصم برسومات رمزية وأعلام دولها، ثم افتح توقعات الطقس حسب إحداثيات كل مدينة.</p>
        <DirectorySearch value={query} onChange={setQuery} placeholder="ابحث باسم الدولة أو العاصمة" />
      </section>
      <AdSlot position="header" />
      <section className="directory-shell">
        <div className="section-intro">
          <span>01 — المجال العربي</span>
          <h2>{results.length} عاصمة مطابقة</h2>
          <p>الرسومات رمزية وليست صورًا حقيقية لمعالم العاصمة.</p>
        </div>
        <div className="directory-grid directory-grid--visual">
          {results.map((item) => (
            <Link
              className="directory-card directory-card--visual"
              key={item.slug}
              href={item.slug === "algiers" ? "/weather/algiers/" : "/arab-capitals/" + item.slug + "/"}
            >
              <PlaceIllustration scene={getCapitalScene(item.slug)} label={item.capital} badge={item.englishName} image={item.countryImages} />
              <span className="directory-card__body">
                <span className="directory-card__meta">
                  <span className="place-flag" aria-hidden="true">{flagForCountry(countryCodeForArabName(item.country))}</span>
                  {item.country}
                </span>
                <strong className="directory-card__title">{item.capital}</strong>
                <span className="directory-card__action">عرض نشرة الطقس <ArrowLeft size={17} aria-hidden="true" /></span>
              </span>
            </Link>
          ))}
        </div>
        {results.length === 0 && <div className="empty-state">لا توجد عاصمة مطابقة لهذا البحث.</div>}
      </section>
      <PublicFooter />
    </main>
  );
}

export function WorldCapitalsPage() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => worldCapitals.filter((item) =>
    (item.country + " " + item.capital + " " + item.englishName).toLocaleLowerCase("ar").includes(query.trim().toLocaleLowerCase("ar"))
  ), [query]);

  return (
    <main dir="rtl">
      <PublicHeader />
      <section className="directory-hero directory-hero--arab">
        <span className="eyebrow">مرصد الأطلس · 195 عاصمة عالمية</span>
        <h1>الطقس في عواصم العالم.</h1>
        <p>تصفح عواصم الدول حسب البلد أو الاسم العربي والإنجليزي، وافتح صفحة الطقس المستقلة لكل موقع.</p>
        <DirectorySearch value={query} onChange={setQuery} placeholder="ابحث باسم الدولة أو العاصمة بالعربية أو الإنجليزية" />
      </section>
      <AdSlot position="header" />
      <section className="directory-shell">
        <div className="section-intro">
          <span>01 — الدليل العالمي</span>
          <h2>{results.length} عاصمة مطابقة</h2>
          <p>تُحال المدن المشتركة مع دليل الولايات أو العواصم العربية إلى رابطها الأساسي لتجنب الصفحات المكررة.</p>
        </div>
        <div className="directory-grid directory-grid--visual">
          {results.map((item) => (
            <Link className="directory-card directory-card--visual" key={item.slug} href={getCanonicalPlacePath(item.slug)}>
              <PlaceIllustration scene="city" label={item.capital} badge={item.englishName} image={item.countryImages} />
              <span className="directory-card__body">
                <span className="directory-card__meta">
                  <span className="place-flag" aria-hidden="true">{flagForCountry(item.countryCode)}</span>
                  {item.country}
                </span>
                <strong className="directory-card__title">{item.capital}</strong>
                <span className="directory-card__action">عرض نشرة الطقس <ArrowLeft size={17} aria-hidden="true" /></span>
              </span>
            </Link>
          ))}
        </div>
        {results.length === 0 && <div className="empty-state">لا توجد عاصمة مطابقة لهذا البحث.</div>}
      </section>
      <PublicFooter />
    </main>
  );
}
