import { useEffect, useRef, useState } from "react";
import { ArrowLeft, LocateFixed, MapPin, Navigation, Search } from "lucide-react";
import { Link } from "wouter";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { flagForCountry } from "@/lib/placeVisuals";
import { reverseGeocode, type ResolvedLocation } from "@/lib/reverseGeocode";

type Place = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
};

type LocatedPlace = {
  latitude: number;
  longitude: number;
  address: ResolvedLocation | null;
};

const weatherLink = (latitude: number, longitude: number, name: string) =>
  "/global-weather?lat=" + latitude + "&lon=" + longitude + "&name=" + encodeURIComponent(name);

export function WorldSearchPage() {
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get("q")?.slice(0, 100) ?? "");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [myLocation, setMyLocation] = useState<LocatedPlace | null>(null);
  const reverseRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const cleaned = query.trim();
    if (cleaned.length < 2) {
      setSuggestions([]);
      setSearchError("");
      setIsSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError("");
      try {
        const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
        url.search = new URLSearchParams({ name: cleaned, count: "10", language: "ar", format: "json" }).toString();
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("search failed");
        const payload = await response.json();
        if (!controller.signal.aborted) {
          setSuggestions(Array.isArray(payload.results) ? payload.results : []);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setSearchError("تعذر الاتصال بمحرك البحث. تحقّق من الإنترنت ثم حاول مجددًا.");
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => () => reverseRequest.current?.abort(), []);

  const detectLocation = () => {
    if (locating) return;
    setLocationMessage("");
    if (!window.isSecureContext) {
      setLocationMessage("خدمة الموقع تحتاج إلى HTTPS. يمكنك البحث يدويًا.");
      return;
    }
    if (!navigator.geolocation) {
      setLocationMessage("هذا المتصفح لا يدعم تحديد الموقع. يمكنك البحث يدويًا.");
      return;
    }

    reverseRequest.current?.abort();
    setLocating(true);
    setMyLocation(null);
    setLocationMessage("جارٍ الحصول على موقع الجهاز بعد موافقتك…");

    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const { latitude, longitude } = coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        setLocationMessage("تعذر الحصول على إحداثيات صالحة.");
        setLocating(false);
        return;
      }

      // Coordinates are ready even if the optional administrative lookup fails.
      setMyLocation({ latitude, longitude, address: null });
      setLocationMessage("تم تحديد الإحداثيات. جارٍ معرفة البلد والولاية والبلدية…");
      const controller = new AbortController();
      reverseRequest.current = controller;
      try {
        const address = await reverseGeocode(latitude, longitude, controller.signal);
        if (!controller.signal.aborted) {
          setMyLocation({ latitude, longitude, address });
          setLocationMessage("تم تحديد الموقع. أسماء المناطق تقريبية وفق خدمة الخرائط.");
        }
      } catch {
        if (!controller.signal.aborted) {
          setLocationMessage("تم تحديد الإحداثيات، لكن تعذّر جلب أسماء المناطق. يمكنك فتح الطقس أو الخريطة مباشرة.");
        }
      } finally {
        if (!controller.signal.aborted) setLocating(false);
      }
    }, (error) => {
      setLocating(false);
      setLocationMessage(
        error.code === 1
          ? "تم رفض صلاحية الموقع. اسمح بها من إعدادات المتصفح أو ابحث عن مدينتك يدويًا."
          : error.code === 2
            ? "تعذر العثور على موقع الجهاز. تأكد من تشغيل خدمات الموقع."
            : "انتهت مهلة تحديد الموقع. أعد المحاولة أو استخدم البحث اليدوي."
      );
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  };

  const address = myLocation?.address;
  const myLocationName = address?.municipality || address?.region || address?.country || "موقعي الحالي";

  return (
    <main dir="rtl">
      <PublicHeader />
      <section className="directory-hero">
        <span className="eyebrow">المحرك العالمي · Open-Meteo Geocoding</span>
        <h1>ابحث عن أي مكان على الخريطة.</h1>
        <p>ابحث باسم المدينة أو الدولة، أو اختر «موقعي» لعرض البلد والولاية والبلدية ثم الطقس.</p>
        <div className="world-search-box">
          <Search size={20} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="مثال: Tokyo، دبي، وهران" aria-label="البحث عن مدينة أو دولة" />
          <button type="button" onClick={detectLocation} disabled={locating}>
            <LocateFixed size={16} aria-hidden="true" /> {locating ? "جارٍ التحديد…" : "موقعي"}
          </button>
        </div>
        <small className="location-privacy-note">لا نطلب الموقع تلقائيًا. عند استخدام «موقعي»، تُستخدم إحداثياتك لدى خدمة تحديد أسماء الأماكن.</small>
        {locationMessage && <p className="search-note location-status" role="status" aria-live="polite">{locationMessage}</p>}
        {myLocation && (
          <section className="my-location-panel" aria-label="تفاصيل موقعي الحالي">
            <div className="my-location-panel__head">
              <strong><MapPin size={18} aria-hidden="true" /> موقعي الحالي</strong>
              <span dir="ltr">{myLocation.latitude.toFixed(4)}, {myLocation.longitude.toFixed(4)}</span>
            </div>
            <div className="my-location-panel__grid">
              <span><small>البلد</small><b>{address?.country || "غير متوفر"}</b></span>
              <span><small>الولاية / المحافظة</small><b>{address?.region || "غير متوفرة"}</b></span>
              <span><small>البلدية / المدينة</small><b>{address?.municipality || "غير متوفرة"}</b></span>
            </div>
            <div className="my-location-panel__actions">
              <Link className="primary-button" href={weatherLink(myLocation.latitude, myLocation.longitude, myLocationName)}>
                عرض طقس موقعي <ArrowLeft size={16} aria-hidden="true" />
              </Link>
              <Link className="secondary-button" href={"/weather-map?lat=" + myLocation.latitude + "&lon=" + myLocation.longitude}>
                <Navigation size={16} aria-hidden="true" /> فتح الخريطة
              </Link>
            </div>
          </section>
        )}
      </section>
      <section className="directory-shell">
        <div className="section-intro">
          <span>01 — نتائج البحث العالمي</span>
          <h2>{isSearching ? "جارٍ البحث…" : query.trim().length >= 2 ? suggestions.length + " نتائج" : "ابدأ بكتابة حرفين على الأقل"}</h2>
          <p>أعلام الدول رمزية؛ اختر النتيجة لفتح النشرة الجوية أو موقعها على الخريطة.</p>
        </div>
        {searchError && <div className="error-card" role="alert">{searchError}</div>}
        <div className="search-results search-results--visual">
          {suggestions.map((place) => (
            <article key={place.id + "-" + place.latitude} className="search-result search-result--visual">
              <div className="search-result__flag" aria-label={"علم " + (place.country || "الدولة")}>
                <span aria-hidden="true">{flagForCountry(place.country_code)}</span>
              </div>
              <div className="search-result__info">
                <span className="search-result__meta">{place.country ?? "العالم"} · {place.admin1 || place.timezone || "—"}</span>
                <strong>{place.name}</strong>
                <small><MapPin size={14} aria-hidden="true" /> <span dir="ltr">{place.latitude.toFixed(2)}, {place.longitude.toFixed(2)}</span></small>
                <div className="search-result__actions">
                  <Link href={weatherLink(place.latitude, place.longitude, place.name)}>عرض الطقس <ArrowLeft size={15} aria-hidden="true" /></Link>
                  <Link href={"/weather-map?lat=" + place.latitude + "&lon=" + place.longitude}>على الخريطة</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        {query.trim().length >= 2 && !isSearching && !searchError && suggestions.length === 0 && <div className="empty-state">لا توجد نتيجة. جرّب الاسم باللغة الإنجليزية أو أضف اسم الدولة.</div>}
      </section>
      <PublicFooter />
    </main>
  );
}
