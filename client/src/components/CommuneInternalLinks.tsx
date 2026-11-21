import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { loadAlgerianCommunes, type AlgerianCommune } from "@/data/communes";
import type { AlgerianCity } from "@/data/cities";

export function CommuneInternalLinks({ city }: { city: AlgerianCity }) {
  const [communes, setCommunes] = useState<AlgerianCommune[]>([]);

  useEffect(() => {
    let active = true;
    loadAlgerianCommunes().then((records) => {
      if (active) setCommunes(records);
    }).catch(() => {
      // The weather page remains usable if the optional related-links catalog is unavailable.
    });
    return () => { active = false; };
  }, []);

  const related = useMemo(() => communes
    .filter((item) => item.wilayaId === city.wilayaId && item.slug !== city.slug)
    .slice(0, 5), [communes, city.wilayaId, city.slug]);

  if (!city.wilayaSlug || !city.wilayaName) return null;

  return (
    <nav className="commune-context-nav" aria-label="روابط البلدية والولاية">
      <div className="commune-context-nav__breadcrumb">
        <Link href="/communes/">دليل البلديات</Link>
        <span aria-hidden="true">/</span>
        <Link href={"/weather/" + city.wilayaSlug + "/"}>ولاية {city.wilayaName}</Link>
        <span aria-hidden="true">/</span>
        <strong aria-current="page">{city.name}</strong>
      </div>
      {related.length > 0 && (
        <div className="commune-context-nav__siblings">
          <span>بلديات أخرى من الولاية نفسها:</span>
          {related.map((item) => (
            <Link key={item.id} href={"/communes/" + item.slug + "/"}>{item.name}</Link>
          ))}
        </div>
      )}
    </nav>
  );
}
