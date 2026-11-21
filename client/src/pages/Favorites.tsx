import { AdSlot } from "@/components/AdSlot";
import { useEffect, useState } from "react";
import { ArrowUpLeft, Star, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { useFavoriteCities } from "@/hooks/useFavoriteCities";
import { ALGERIAN_CITIES } from "@/data/cities";
import { loadAlgerianCommunes, type AlgerianCommune } from "@/data/communes";

export default function FavoritesPage() {
  const { favoriteSlugs, toggleFavorite } = useFavoriteCities();
  const [communes, setCommunes] = useState<AlgerianCommune[]>([]);
  useEffect(() => {
    let active = true;
    loadAlgerianCommunes().then((records) => {
      if (active) setCommunes(records);
    }).catch(() => {
      // Wilaya favorites remain available if the commune catalog is offline.
    });
    return () => { active = false; };
  }, []);
  const favorites = [...ALGERIAN_CITIES, ...communes].filter((city) => favoriteSlugs.includes(city.slug));

  return (
    <main dir="rtl">
      <PublicHeader />
      <section className="map-page-hero">
        <span className="eyebrow"><Star size={15} aria-hidden="true" /> مرصد الأطلس · تخصيص محلي</span>
        <h1>مدنك وبلدياتك المفضلة.</h1>
        <p>احتفظ بالولايات والبلديات التي تتابع طقسها باستمرار، وافتح توقعاتها مباشرة من هذا الجهاز دون إنشاء حساب.</p>
      </section>
      <AdSlot position="header" />
      <section className="directory-shell">
        <div className="section-intro">
          <span>خدمات المستخدم — 01</span>
          <h2>قائمة المواقع المحفوظة</h2>
          <p>{favorites.length} موقع محفوظ على هذا الجهاز.</p>
        </div>
        {favorites.length ? (
          <div className="directory-grid">
            {favorites.map((city) => (
              <article className="favorite-city-item" key={city.slug}>
                <Link className="directory-card favorite-city-link" href={city.administrativeLevel === "commune" ? `/communes/${city.slug}/` : `/wilayas/${city.slug}/`}>
                  <span>{city.region}</span>
                  <b>{city.name}</b>
                  <small>فتح توقعات الطقس</small>
                </Link>
                <button type="button" className="favorite-remove" onClick={() => toggleFavorite(city.slug)}>
                  <Trash2 size={14} aria-hidden="true" /> إزالة من المفضلة
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="favorite-empty">
            <Star size={28} aria-hidden="true" />
            <h3>لم تحفظ أي ولاية أو بلدية بعد.</h3>
            <p>افتح صفحة الطقس لأي ولاية أو بلدية، ثم اختر «أضف للمفضلة» لحفظها هنا.</p>
            <Link href="/wilayas">استكشف الولايات الجزائرية <ArrowUpLeft size={15} aria-hidden="true" /></Link>
          </div>
        )}
      </section>
      <PublicFooter />
    </main>
  );
}
