import { AdSlot } from "@/components/AdSlot";
import { useEffect, useMemo, useState } from "react";
import { CloudRain, Leaf, Snowflake, Sun, Thermometer } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { ALGERIAN_CITIES } from "@/data/cities";
import { calculateAgricultureIndicators, fetchNasaPowerDaily, type NasaDailyRecord } from "@/lib/nasaPower";
export default function AgricultureWeatherPage() {
  const [slug, setSlug] = useState(ALGERIAN_CITIES[0]?.slug ?? "");
  const [period, setPeriod] = useState(30);
  const [base, setBase] = useState(10);
  const [rows, setRows] = useState<NasaDailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const city = ALGERIAN_CITIES.find((item) => item.slug === slug) ?? ALGERIAN_CITIES[0];
  useEffect(() => {
    if (!city) return;
    const controller = new AbortController(); setLoading(true); setError("");
    fetchNasaPowerDaily(city, period, controller.signal).then(setRows)
      .catch((reason: unknown) => { if ((reason as Error)?.name !== "AbortError") setError((reason as Error)?.message ?? "تعذر تحميل المؤشرات الزراعية."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [slug, period]);
  const metrics = useMemo(() => calculateAgricultureIndicators(rows, base), [rows, base]);
  return <main dir="rtl"><PublicHeader />
    <section className="map-page-hero"><span className="eyebrow"><Leaf size={15} /> مرصد الأطلس · المناخ والزراعة</span><h1>مؤشرات الطقس الزراعي.</h1><p>متابعة الحرارة المتراكمة والأمطار وأيام الصقيع والحرارة حسب الولاية، كمؤشرات مناخية مساعدة وليست بديلاً عن القياسات الحقلية.</p></section>
      <AdSlot position="header" />
    <section className="directory-shell climate-shell">
      <div className="climate-toolbar">
        <label>موقع المتابعة<select value={slug} onChange={(event) => setSlug(event.target.value)}>{ALGERIAN_CITIES.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
        <label>الفترة<select value={period} onChange={(event) => setPeriod(Number(event.target.value))}><option value={30}>آخر 30 يوماً</option><option value={90}>آخر 90 يوماً</option></select></label>
        <label>درجة الأساس لـ GDD<select value={base} onChange={(event) => setBase(Number(event.target.value))}><option value={5}>5°م</option><option value={10}>10°م</option><option value={15}>15°م</option></select></label>
      </div>
      {loading && <div className="loading-card">جارٍ حساب المؤشرات الزراعية…</div>}
      {error && <div className="error-card" role="alert">{error}<a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer">زيارة NASA POWER</a></div>}
      {!loading && !error && rows.length > 0 && <>
        <div className="section-intro"><span>01 — لوحة المتابعة</span><h2>المؤشرات الجوية في {city.name}</h2><p>الفترة: {metrics.days} يوماً · مجموع حراري تقريبي بقاعدة {base}°م.</p></div>
        <div className="climate-stat-grid agriculture-stat-grid">
          <article><Sun /><small>الوحدات الحرارية المتراكمة GDD</small><strong>{metrics.growingDegreeDays.toFixed(1)}°-يوم</strong></article>
          <article><CloudRain /><small>الأمطار المتراكمة</small><strong>{metrics.rainfall.toFixed(1)} مم</strong></article>
          <article><Snowflake /><small>أيام الصقيع (الصغرى ≤ 0°)</small><strong>{metrics.frostDays}</strong></article>
          <article><Thermometer /><small>أيام الحرارة (العظمى ≥ 35°)</small><strong>{metrics.heatDays}</strong></article>
          <article><CloudRain /><small>أيام أمطار ≥ 5 مم</small><strong>{metrics.rainyDays}</strong></article>
        </div>
        <div className="insight-card agriculture-method"><strong>كيف تُحسب المؤشرات؟</strong><p>GDD = مجموع max(0، متوسط العظمى والصغرى − درجة الأساس). الأمطار مجموع القيم اليومية. الصقيع والحرارة عدد الأيام التي تجاوزت فيها الحدود الموضحة. هذه مؤشرات أولية عامة لا تراعي نوع المحصول أو مرحلة نموه أو خصائص التربة.</p></div>
      </>}
      <p className="map-attribution-note">المصدر: NASA POWER · بيانات مناخية شبكية يومية وليست رصداً مباشراً داخل الحقول. لا تتوفر في هذه النسخة بيانات رطوبة التربة أو التبخر-نتح المرجعي أو مخاطر الأمراض؛ لا تستخدم النتائج وحدها لاتخاذ قرارات الري أو المعالجة. <a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer">المصدر والمنهجية</a></p>
    </section><PublicFooter /></main>;
}
