import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Link } from "wouter";
import { loadAlgerianCommunes, type AlgerianCommune } from "@/data/communes";
import { normalizePlaceSearch } from "@/lib/citySearch";

export function WilayaCommunes({ wilayaCode, wilayaName }: { wilayaCode: string; wilayaName: string }) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(24);
  const [allCommunes, setAllCommunes] = useState<AlgerianCommune[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    loadAlgerianCommunes().then((records) => {
      if (active) setAllCommunes(records);
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : "تعذر تحميل البلديات.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const communes = useMemo(
    () => allCommunes.filter((commune) => commune.wilayaId === String(wilayaCode).padStart(2, "0")),
    [allCommunes, wilayaCode],
  );
  const results = useMemo(() => {
    const cleaned = normalizePlaceSearch(query);
    if (!cleaned) return communes;
    return communes.filter((commune) =>
      normalizePlaceSearch([commune.name, commune.name_fr, commune.name_en, commune.postCode, commune.id].filter(Boolean).join(" "))
        .includes(cleaned),
    );
  }, [communes, query]);

  return (
    <section className="dashboard-shell wilaya-communes" aria-labelledby="wilaya-communes-title">
      <div className="section-intro">
        <span>دليل البلديات</span>
        <h2 id="wilaya-communes-title">بلديات ولاية {wilayaName}</h2>
        <p>{loading ? "جارٍ تحميل دليل البلديات…" : communes.length + " بلدية، لكل منها صفحة طقس مستقلة تعتمد على إحداثياتها الجغرافية."}</p>
      </div>
      <label className="commune-search">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">البحث داخل بلديات الولاية</span>
        <input
          type="search"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setVisibleCount(24); }}
          placeholder="ابحث عن بلدية بالعربية أو الفرنسية أو الرمز البريدي"
          autoComplete="off"
        />
      </label>
      {loading && <div className="loading-card" role="status">جارٍ تحميل البلديات…</div>}
      {error && <div className="empty-state" role="alert">{error}</div>}
      {!loading && !error && (
        <>
          <div className="commune-grid">
            {results.slice(0, visibleCount).map((commune) => (
              <Link key={commune.id} href={"/communes/" + commune.slug + "/"} className="commune-card">
                <span className="commune-card__name">{commune.name}</span>
                <small className="commune-card__latin">{commune.name_fr} · {commune.postCode || "—"}</small>
                <span className="commune-card__action">توقعات الطقس <ArrowLeft size={15} aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
          {results.length === 0 && <div className="empty-state" role="status">لا توجد بلدية مطابقة لهذا البحث.</div>}
          {results.length > visibleCount && (
            <div className="region-actions">
              <button type="button" className="secondary-button" onClick={() => setVisibleCount((count) => count + 24)}>
                إظهار المزيد ({results.length - visibleCount})
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
