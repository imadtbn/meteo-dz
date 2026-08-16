/** Style reminder: directories are compact field guides with searchable, source-aware links rather than decorative lists. */
import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Link } from "wouter";
import { ALGERIAN_CITIES } from "@/data/cities";
import { ARAB_CAPITALS } from "@/data/arab-capitals";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";

function DirectorySearch({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="directory-search"><Search size={17} /><span className="sr-only">بحث</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

export function WilayasPage() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => ALGERIAN_CITIES.filter((item) => `${item.name} ${item.region} ${item.code}`.toLocaleLowerCase("ar").includes(query.trim().toLocaleLowerCase("ar"))), [query]);
  return <main dir="rtl"><PublicHeader /><section className="directory-hero"><span className="eyebrow">دليل الجزائر · 58 ولاية</span><h1>كل الولايات، مناخ واحد متصل.</h1><p>اختر الولاية لفتح قراءة الطقس والتوقعات والبحر عند السواحل، مع رابط ثابت مناسب للمشاركة والفهرسة.</p><DirectorySearch value={query} onChange={setQuery} placeholder="ابحث باسم الولاية أو المنطقة أو الرمز" /></section><section className="directory-shell"><div className="section-intro"><span>01 — القائمة الوطنية</span><h2>{results.length} ولاية مطابقة</h2><p>المصدر الموحد: بيانات الولاية والإحداثيات ومسار الصفحة.</p></div><div className="directory-grid">{results.map((city) => <Link className="directory-card" key={city.slug} href={`/weather/${city.slug}`}><span>{city.code} · {city.region}</span><b>{city.name}</b><ArrowLeft size={17} /></Link>)}</div>{results.length === 0 && <div className="empty-state">لا توجد ولاية مطابقة لهذا البحث.</div>}</section><PublicFooter /></main>;
}

export function ArabCapitalsPage() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => ARAB_CAPITALS.filter((item) => `${item.country} ${item.capital} ${item.englishName}`.toLocaleLowerCase("ar").includes(query.trim().toLocaleLowerCase("ar"))), [query]);
  return <main dir="rtl"><PublicHeader /><section className="directory-hero directory-hero--arab"><span className="eyebrow">مرصد الأطلس · 22 عاصمة عربية</span><h1>طقس العواصم العربية في مسار واحد.</h1><p>دليل إقليمي يفتح قراءة الطقس لأي عاصمة عربية، مع إحداثيات ثابتة وسياق مكاني واضح.</p><DirectorySearch value={query} onChange={setQuery} placeholder="ابحث باسم الدولة أو العاصمة" /></section><section className="directory-shell"><div className="section-intro"><span>01 — المجال العربي</span><h2>{results.length} عاصمة مطابقة</h2><p>تبدأ القراءة من إحداثيات العاصمة وتُحدّث من مزود الطقس العالمي.</p></div><div className="directory-grid">{results.map((item) => <Link className="directory-card" key={item.slug} href={`/global-weather?lat=${item.latitude}&lon=${item.longitude}&name=${encodeURIComponent(item.capital)}`}><span>{item.country} · {item.englishName}</span><b>{item.capital}</b><ArrowLeft size={17} /></Link>)}</div></section><PublicFooter /></main>;
}
