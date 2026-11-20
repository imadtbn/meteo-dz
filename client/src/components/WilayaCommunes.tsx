import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Link } from "wouter";
import { getCommunesByWilaya } from "@/data/communes";
import { normalizePlaceSearch } from "@/lib/citySearch";

export function WilayaCommunes({ wilayaCode, wilayaName }: { wilayaCode: string; wilayaName: string }) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(24);
  const communes = useMemo(() => getCommunesByWilaya(wilayaCode), [wilayaCode]);
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
        <p>{communes.length} بلدية، لكل منها صفحة طقس مستقلة تعتمد على إحداثياتها الجغرافية.</p>
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
      <div className="commune-grid">
        {results.slice(0, visibleCount).map((commune) => (
          <Link key={commune.id} href={"/communes/" + commune.slug + "/"} className="commune-card">
            <span className="commune-card__name">{commune.name}</span>
            <span className="commune-card__latin">{commune.name_fr} · {commune.postCode || "—"}</span>
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
    </section>
  );
}
