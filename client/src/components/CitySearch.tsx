import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowLeft, Globe2, LocateFixed, MapPin, Search, X } from "lucide-react";
import { Link } from "wouter";
import { ALGERIAN_CITIES, type AlgerianCity } from "@/data/cities";
import { flagForCountry } from "@/lib/placeVisuals";
import { findLocalCities, parseGlobalPlaces, type GlobalPlace } from "@/lib/citySearch";

type SearchChoice =
  | { kind: "local"; city: AlgerianCity; key: string }
  | { kind: "global"; place: GlobalPlace; key: string };

const featuredSlugs = ["algiers", "oran", "constantine", "annaba", "bejaia", "setif"];

type CitySearchProps = {
  city: AlgerianCity;
  onSelectCity: (slug: string) => void;
  onSelectGlobal: (place: GlobalPlace) => void;
  onRequestLocation: () => void;
};

export function CitySearch({ city, onSelectCity, onSelectGlobal, onRequestLocation }: CitySearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [globalResults, setGlobalResults] = useState<GlobalPlace[]>([]);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [globalError, setGlobalError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const cleaned = query.trim();
  const localResults = useMemo(() =>
    cleaned
      ? findLocalCities(ALGERIAN_CITIES, cleaned, 6)
      : featuredSlugs.map((slug) => ALGERIAN_CITIES.find((item) => item.slug === slug)).filter((item): item is AlgerianCity => Boolean(item)),
    [cleaned],
  );

  useEffect(() => {
    if (cleaned.length < 2) {
      setGlobalResults([]);
      setLoadingGlobal(false);
      setGlobalError(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingGlobal(true);
      setGlobalError(false);
      try {
        const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
        url.search = new URLSearchParams({
          name: cleaned,
          count: "8",
          language: "ar",
          format: "json",
        }).toString();
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Search request failed");
        const payload: unknown = await response.json();
        if (!controller.signal.aborted) setGlobalResults(parseGlobalPlaces(payload));
      } catch {
        if (!controller.signal.aborted) {
          setGlobalResults([]);
          setGlobalError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoadingGlobal(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [cleaned]);

  const suggestions = useMemo<SearchChoice[]>(() => [
    ...localResults.map((item) => ({ kind: "local" as const, city: item, key: "dz-" + item.slug })),
    ...globalResults.map((item) => ({ kind: "global" as const, place: item, key: "world-" + item.id })),
  ], [localResults, globalResults]);

  useEffect(() => setActiveIndex(0), [cleaned, globalResults]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [open]);

  const choose = (choice: SearchChoice) => {
    setQuery("");
    setGlobalResults([]);
    setOpen(false);
    if (choice.kind === "local") {
      onSelectCity(choice.city.slug);
    } else {
      onSelectGlobal(choice.place);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (suggestions.length) {
        setActiveIndex((index) => (index + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length);
      }
      return;
    }
    if (event.key === "Enter" && open && suggestions[activeIndex]) {
      event.preventDefault();
      choose(suggestions[activeIndex]);
    }
  };

  return (
    <div ref={containerRef} className="city-picker">
      <div className="city-command city-command--search" role="search">
        <Search size={21} aria-hidden="true" className="city-search-symbol" />
        <label className="sr-only" htmlFor="hero-global-city-search">ابحث عن ولاية جزائرية أو مدينة في العالم</label>
        <input
          id="hero-global-city-search"
          ref={inputRef}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open && suggestions[activeIndex] ? listboxId + "-option-" + activeIndex : undefined}
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setGlobalResults([]);
            setLoadingGlobal(false);
            setGlobalError(false);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="ابحث عن مدينة أو ولاية في الجزائر أو العالم…"
        />
        {query && (
          <button type="button" className="city-picker__clear" aria-label="مسح البحث" onClick={() => {
            setQuery("");
            setGlobalResults([]);
            setOpen(true);
            inputRef.current?.focus();
          }}>
            <X size={17} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className="icon-button dark"
          aria-label="تحديد موقعي الجغرافي"
          title="موقعي"
          onClick={() => { setOpen(false); onRequestLocation(); }}
        >
          <LocateFixed size={20} aria-hidden="true" />
        </button>
      </div>

      <p className="city-picker__current"><MapPin size={15} aria-hidden="true" /> النشرة الحالية: <strong>{city.name}</strong></p>

      {open && (
        <div className="city-picker__panel">
          <div className="city-picker__panel-heading">
            <span>{cleaned ? "نتائج مطابقة لبحثك" : "مدن جزائرية مقترحة"}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق الاقتراحات"><X size={16} /></button>
          </div>
          <div id={listboxId} role="listbox" aria-label="اقتراحات الولايات والمدن" className="city-picker__results">
            {localResults.length > 0 && (
              <div role="group" aria-label="ولايات الجزائر">
                <span className="city-picker__group-label">ولايات الجزائر</span>
                {localResults.map((item, index) => (
                  <button
                    type="button"
                    role="option"
                    id={listboxId + "-option-" + index}
                    aria-selected={index === activeIndex}
                    className={index === activeIndex ? "city-picker__option is-highlighted" : "city-picker__option"}
                    key={item.slug}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose({ kind: "local", city: item, key: "dz-" + item.slug })}
                  >
                    <MapPin size={17} aria-hidden="true" />
                    <span><strong>{item.name}</strong><small>الجزائر · {item.region}</small></span>
                    <ArrowLeft size={15} aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
            {globalResults.length > 0 && (
              <div role="group" aria-label="نتائج عالمية">
                <span className="city-picker__group-label"><Globe2 size={14} aria-hidden="true" /> مدن العالم</span>
                {globalResults.map((item, index) => {
                  const optionIndex = index + localResults.length;
                  return (
                    <button
                      type="button"
                      role="option"
                      id={listboxId + "-option-" + optionIndex}
                      aria-selected={optionIndex === activeIndex}
                      className={optionIndex === activeIndex ? "city-picker__option is-highlighted" : "city-picker__option"}
                      key={item.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(optionIndex)}
                      onClick={() => choose({ kind: "global", place: item, key: "world-" + item.id })}
                    >
                      <span className="city-picker__flag" aria-hidden="true">{flagForCountry(item.country_code)}</span>
                      <span><strong>{item.name}</strong><small>{[item.admin1, item.country].filter(Boolean).join(" · ") || "مدينة عالمية"}</small></span>
                      <ArrowLeft size={15} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            )}
            {loadingGlobal && <p className="city-picker__notice" role="status">جارٍ البحث في مدن العالم…</p>}
            {globalError && <p className="city-picker__notice">تعذّر البحث العالمي حاليًا؛ ما زال البحث في الولايات متاحًا.</p>}
            {cleaned && !suggestions.length && !loadingGlobal && !globalError &&
              <p className="city-picker__notice">لا توجد نتيجة مطابقة. جرّب اسمًا آخر أو استخدم البحث الموسّع.</p>}
            {cleaned.length === 1 && <p className="city-picker__notice">اكتب حرفًا إضافيًا لبدء البحث العالمي.</p>}
          </div>
          <Link href={cleaned ? "/world-search?q=" + encodeURIComponent(cleaned) : "/world-search"} className="city-picker__full-search" onClick={() => setOpen(false)}>
            <Globe2 size={16} aria-hidden="true" /> البحث العالمي الموسّع <ArrowLeft size={16} aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
