/** Style reminder: global search is an atlas command surface—fast suggestions, clear source, and a non-blocking location permission. */
import { useEffect, useState } from "react";
import { LocateFixed, Search, Wind } from "lucide-react";
import { Link } from "wouter";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";

type Place = { id: number; name: string; latitude: number; longitude: number; country?: string; admin1?: string; timezone?: string };

export function WorldSearchPage() {
  const [query, setQuery] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  useEffect(() => {
    const cleaned = query.trim();
    if (cleaned.length < 2) { setSuggestions([]); setIsSearching(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
        url.search = new URLSearchParams({ name: cleaned, count: "10", language: "ar", format: "json" }).toString();
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("search failed");
        const payload = await response.json();
        setSuggestions(Array.isArray(payload.results) ? payload.results : []);
      } catch (error) { if ((error as Error).name !== "AbortError") setSuggestions([]); } finally { if (!controller.signal.aborted) setIsSearching(false); }
    }, 350);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query]);
  const detectLocation = () => {
    if (!navigator.geolocation) { setLocationMessage("المتصفح لا يدعم تحديد الموقع؛ استخدم البحث اليدوي."); return; }
    setLocationMessage("نطلب موقعك التقريبي لفتح قراءة محلية…");
    navigator.geolocation.getCurrentPosition(({ coords }) => { window.location.href = `${import.meta.env.BASE_URL}global-weather?lat=${coords.latitude.toFixed(4)}&lon=${coords.longitude.toFixed(4)}&name=موقعي الحالي`; }, () => setLocationMessage("لم نتمكن من تحديد الموقع. يمكنك متابعة البحث يدوياً."), { enableHighAccuracy: false, timeout: 8000 });
  };
  return <main dir="rtl"><PublicHeader /><section className="directory-hero"><span className="eyebrow">المحرك العالمي · Open-Meteo Geocoding</span><h1>ابحث عن أي مكان على الخريطة.</h1><p>اكتب اسم مدينة أو دولة، ثم اختر النتيجة لفتح قراءة طقس عالمية بإحداثيات واضحة.</p><div className="world-search-box"><Search size={20} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="مثال: Tokyo، دبي، وهران" aria-label="البحث عن مدينة أو دولة" /><button onClick={detectLocation}><LocateFixed size={16} /> موقعي</button></div>{locationMessage && <small className="search-note">{locationMessage}</small>}</section><section className="directory-shell"><div className="section-intro"><span>01 — اقتراحات الكلمات</span><h2>{isSearching ? "جارٍ البحث…" : query.trim().length >= 2 ? `${suggestions.length} نتائج` : "ابدأ بكلمتين على الأقل"}</h2><p>النتائج مرتبطة بإحداثيات قابلة للعرض على الخريطة.</p></div><div className="search-results">{suggestions.map((place) => <div key={`${place.id}-${place.latitude}`} className="search-result"><Link href={`/global-weather?lat=${place.latitude}&lon=${place.longitude}&name=${encodeURIComponent(place.name)}`}><span>{place.country ?? "العالم"} · {place.admin1 ?? place.timezone ?? ""}</span><b>{place.name}</b><small><Wind size={13} /> {place.latitude.toFixed(2)}, {place.longitude.toFixed(2)}</small></Link><Link className="result-map-link" href={`/weather-map?lat=${place.latitude}&lon=${place.longitude}`}>فتح على الخريطة</Link></div>)}</div>{query.trim().length >= 2 && !isSearching && suggestions.length === 0 && <div className="empty-state">لا توجد نتيجة. جرّب الاسم بالإنجليزية أو باسم الدولة.</div>}</section><PublicFooter /></main>;
}
