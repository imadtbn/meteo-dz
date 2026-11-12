import { useEffect, useState } from "react";
import { Globe2, LoaderCircle, MapPin, Search } from "lucide-react";
import { parseGlobalPlaces, type GlobalPlace } from "@/lib/citySearch";
import { reverseGeocode } from "@/lib/reverseGeocode";

export type ClimateLocation = {
  name: string;
  latitude: number;
  longitude: number;
  slug: string;
};

type Props = {
  value: ClimateLocation;
  onChange: (location: ClimateLocation) => void;
};

export function ClimateLocationPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const cleaned = query.trim();
    if (cleaned.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setError("");
      try {
        const languages = ["ar", "en", "fr"] as const;
        const responses = await Promise.allSettled(languages.map(async (language) => {
          const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
          url.search = new URLSearchParams({ name: cleaned, count: "10", language, format: "json" }).toString();
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) throw new Error("تعذر البحث عن المكان.");
          return response.json() as Promise<unknown>;
        }));
        if (controller.signal.aborted) return;
        const places = responses.flatMap((result) => result.status === "fulfilled" ? parseGlobalPlaces(result.value, 10) : []);
        const unique = new Map<number, GlobalPlace>();
        places.forEach((place) => { if (!unique.has(place.id)) unique.set(place.id, place); });
        setResults(Array.from(unique.values()).slice(0, 12));
        if (!unique.size && responses.every((result) => result.status === "rejected")) {
          setError("تعذر الاتصال بمحرك البحث العالمي. تحقق من الإنترنت وحاول مجدداً.");
        }
      } catch {
        if (!controller.signal.aborted) setError("تعذر البحث عن المكان حالياً.");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query]);

  const choose = (place: GlobalPlace) => {
    const slug = "global-" + place.id;
    onChange({
      name: [place.name, place.admin1, place.country].filter(Boolean).join("، "),
      latitude: place.latitude,
      longitude: place.longitude,
      slug,
    });
    setQuery("");
    setResults([]);
    setError("");
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("متصفحك لا يدعم تحديد الموقع الجغرافي.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const resolved = await reverseGeocode(coords.latitude, coords.longitude);
        const name = [resolved.municipality, resolved.region, resolved.country].filter(Boolean).join("، ") || "موقعي الحالي";
        onChange({
          name,
          latitude: coords.latitude,
          longitude: coords.longitude,
          slug: "gps-" + coords.latitude.toFixed(4) + "-" + coords.longitude.toFixed(4),
        });
        setQuery("");
        setResults([]);
      } catch {
        onChange({
          name: "موقعي الحالي",
          latitude: coords.latitude,
          longitude: coords.longitude,
          slug: "gps-" + coords.latitude.toFixed(4) + "-" + coords.longitude.toFixed(4),
        });
      } finally {
        setLocating(false);
      }
    }, (reason) => {
      setLocating(false);
      setError(reason.code === 1 ? "يرجى السماح بالوصول إلى موقعك لاستخدام هذه الميزة." : "تعذر تحديد موقعك. تحقق من إعدادات GPS وحاول مجدداً.");
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
  };

  return (
    <div className="climate-location-picker">
      <label className="climate-location-search">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">ابحث عن مكان حول العالم</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="اكتب اسم المدينة أو المنطقة بأي لغة…"
          autoComplete="off"
          spellCheck={false}
        />
        {searching && <LoaderCircle className="is-spinning" size={17} aria-label="جارٍ البحث" />}
      </label>
      <button type="button" className="climate-location-gps" onClick={useCurrentLocation} disabled={locating}>
        {locating ? <LoaderCircle className="is-spinning" size={17} /> : <MapPin size={17} />}
        {locating ? "جارٍ تحديد الموقع…" : "تحديد موقعي"}
      </button>
      <p className="climate-location-current"><Globe2 size={15} /> موقع المتابعة: <strong>{value.name}</strong></p>
      {error && <p className="climate-location-error" role="alert">{error}</p>}
      {query.trim().length >= 2 && (results.length > 0 || (!searching && !error)) && (
        <div className="climate-location-results" role="listbox" aria-label="نتائج البحث العالمي">
          {results.map((place) => (
            <button type="button" role="option" aria-selected="false" key={place.id} onClick={() => choose(place)}>
              <MapPin size={16} />
              <span><strong>{place.name}</strong><small>{[place.admin1, place.country].filter(Boolean).join(" · ")}</small></span>
            </button>
          ))}
          {!results.length && <p>لا توجد نتائج. جرّب كتابة الاسم بلغة أخرى.</p>}
        </div>
      )}
    </div>
  );
}
