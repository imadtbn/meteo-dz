import { ArrowUpLeft, Star, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { useFavoriteCities } from "@/hooks/useFavoriteCities";
import { ALGERIAN_CITIES } from "@/data/cities";

export default function FavoritesPage() {
  const { favoriteSlugs, toggleFavorite } = useFavoriteCities();
  const favorites = ALGERIAN_CITIES.filter((city) => favoriteSlugs.includes(city.slug));

  return (
    <main dir="rtl">
      <PublicHeader />
      <section className="map-page-hero">
        <span className="eyebrow"><Star size={15} aria-hidden="true" /> مرصد الأطلس · تخصيص محلي</span>
        <h1>ولاياتك المفضلة.</h1>
        <p>احتفظ بالولايات التي تتابع طقسها باستمرار، وافتح توقعاتها مباشرة من هذا الجهاز دون إنشاء حساب.</p>
      </section>
      <section className="directory-shell">
        <div className="section-intro">
          <span>خدمات المستخدم — 01</span>
          <h2>قائمة المدن المحفوظة</h2>
          <p>{favorites.length} ولاية محفوظة على هذا الجهاز.</p>
        </div>
        {favorites.length ? (
          <div className="directory-grid">
            {favorites.map((city) => (
              <article className="favorite-city-item" key={city.slug}>
                <Link className="directory-card favorite-city-link" href={`/weather/${city.slug}`}>
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
            <h3>لم تحفظ أي ولاية بعد.</h3>
            <p>افتح صفحة الطقس لأي ولاية، ثم اختر «أضف للمفضلة» لحفظها هنا.</p>
            <Link href="/wilayas">استكشف الولايات الجزائرية <ArrowUpLeft size={15} aria-hidden="true" /></Link>
          </div>
        )}
      </section>
      <PublicFooter />
    </main>
  );
}
