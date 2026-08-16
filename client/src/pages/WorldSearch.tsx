/** Style reminder: global search is an atlas command surface—fast suggestions, clear source, and a non-blocking location permission. */
import { useEffect, useMemo, useState } from "react";
import { LocateFixed, Search, Wind } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";

export function WorldSearchPage() {
  const [query, setQuery] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 350);
    return () => window.clearTimeout(timer);
  }, [query]);
  const search = trpc.weather.searchLocations.useQuery({ query: debouncedQuery }, { enabled: debouncedQuery.trim().length >= 2, staleTime: 60_000 });
  const suggestions = useMemo(() => search.data ?? [], [search.data]);

  const detectLocation = () => {
    if (!navigator.geolocation) { setLocationMessage("المتصفح لا يدعم تحديد الموقع؛ استخدم البحث اليدوي."); return; }
    setLocationMessage("نطلب موقعك التقريبي لفتح قراءة محلية…");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      window.location.href = `/global-weather?lat=${coords.latitude.toFixed(4)}&lon=${coords.longitude.toFixed(4)}&name=موقعي الحالي`;
    }, () => setLocationMessage("لم نتمكن من تحديد الموقع. يمكنك متابعة البحث يدوياً."), { enableHighAccuracy: false, timeout: 8000 });
  };

  return <main dir="rtl"><PublicHeader /><section className="directory-hero"><span className="eyebrow">المحرك العالمي · Open-Meteo Geocoding</span><h1>ابحث عن أي مكان على الخريطة.</h1><p>اكتب اسم مدينة أو دولة، ثم اختر النتيجة لفتح قراءة طقس عالمية بإحداثيات واضحة.</p><div className="world-search-box"><Search size={20} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="مثال: Tokyo، دبي، وهران" aria-label="البحث عن مدينة أو دولة" /><button onClick={detectLocation}><LocateFixed size={16} /> موقعي</button></div>{locationMessage && <small className="search-note">{locationMessage}</small>}</section><section className="directory-shell"><div className="section-intro"><span>01 — اقتراحات الكلمات</span><h2>{search.isFetching ? "جارٍ البحث…" : debouncedQuery.trim().length >= 2 ? `${suggestions.length} نتائج` : "ابدأ بكلمتين على الأقل"}</h2><p>النتائج مرتبطة بإحداثيات قابلة للعرض على الخريطة.</p></div><div className="search-results">{suggestions.map((place) => <div key={`${place.id}-${place.latitude}`} className="search-result"><Link href={`/global-weather?lat=${place.latitude}&lon=${place.longitude}&name=${encodeURIComponent(place.name)}`}><span>{place.country ?? "العالم"} · {place.admin1 ?? place.timezone ?? ""}</span><b>{place.name}</b><small><Wind size={13} /> {place.latitude.toFixed(2)}, {place.longitude.toFixed(2)}</small></Link><Link className="result-map-link" href={`/weather-map?lat=${place.latitude}&lon=${place.longitude}`}>فتح على الخريطة</Link></div>)}</div>{debouncedQuery.trim().length >= 2 && !search.isFetching && suggestions.length === 0 && <div className="empty-state">لا توجد نتيجة. جرّب الاسم بالإنجليزية أو باسم الدولة.</div>}</section><PublicFooter /></main>;
}
