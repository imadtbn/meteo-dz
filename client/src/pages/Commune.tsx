import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { loadAlgerianCommunes, type AlgerianCommune } from "@/data/communes";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";

export default function CommunePage() {
  const [, params] = useRoute("/communes/:slug");
  const [commune, setCommune] = useState<AlgerianCommune | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    loadAlgerianCommunes().then((records) => {
      if (active) setCommune(records.find((item) => item.slug === params?.slug) ?? null);
    }).catch(() => {
      if (active) setCommune(null);
    }).finally(() => {
      if (active) setLoaded(true);
    });
    return () => { active = false; };
  }, [params?.slug]);

  if (!loaded) return <main dir="rtl"><div className="loading-card" role="status">جارٍ تحميل بيانات البلدية…</div></main>;
  if (!commune) return <NotFound />;
  return <Home forcedCity={commune} detail />;
}
