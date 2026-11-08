import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, CloudRain, Thermometer, Wind } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { ALGERIAN_CITIES } from "@/data/cities";
import { fetchNasaPowerDaily, summarizeNasaRecords, type NasaDailyRecord } from "@/lib/nasaPower";
const formatDate = (value: string) => value.length === 8 ? value.slice(6, 8) + "/" + value.slice(4, 6) : value;
export default function ClimateObservatoryPage() {
  const [slug, setSlug] = useState(ALGERIAN_CITIES[0]?.slug ?? "");
  const [period, setPeriod] = useState(90);
  const [rows, setRows] = useState<NasaDailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const city = ALGERIAN_CITIES.find((item) => item.slug === slug) ?? ALGERIAN_CITIES[0];
  useEffect(() => {
    if (!city) return;
    const controller = new AbortController(); setLoading(true); setError("");
    fetchNasaPowerDaily(city, period, controller.signal).then(setRows)
      .catch((reason: unknown) => { if ((reason as Error)?.name !== "AbortError") setError((reason as Error)?.message ?? "تعذر تحميل البيانات المناخية."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [slug, period]);
  const summary = useMemo(() => summarizeNasaRecords(rows), [rows]);
  const chartData = useMemo(() => rows.map((row) => ({ date: formatDate(row.date), maximum: row.maximum, minimum: row.minimum, rain: row.precipitation })), [rows]);
  return <main dir="rtl"><PublicHeader />
    <section className="map-page-hero"><span className="eyebrow"><Activity size={15} /> مرصد الأطلس · سجل المناخ</span><h1>المرصد المناخي الجزائري.</h1><p>استكشف السلاسل المناخية اليومية حسب الولاية، وقارن الحرارة والأمطار خلال الفترات الأخيرة اعتماداً على بيانات NASA POWER.</p></section>
    <section className="directory-shell climate-shell">
      <div className="climate-toolbar">
        <label>الولاية<select value={slug} onChange={(event) => setSlug(event.target.value)}>{ALGERIAN_CITIES.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
        <label>الفترة<select value={period} onChange={(event) => setPeriod(Number(event.target.value))}><option value={90}>آخر 90 يوماً</option><option value={365}>آخر 365 يوماً</option></select></label>
      </div>
      {loading && <div className="loading-card">جارٍ تحميل السجل المناخي…</div>}
      {error && <div className="error-card" role="alert">{error}<a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer">زيارة NASA POWER</a></div>}
      {!loading && !error && rows.length > 0 && <>
        <div className="section-intro"><span>01 — ملخص الفترة</span><h2>المؤشرات المناخية في {city.name}</h2><p>{rows.length} يوماً متاحاً في قاعدة البيانات.</p></div>
        <div className="climate-stat-grid">
          <article><Thermometer /><small>متوسط الحرارة</small><strong>{summary.averageTemperature === null ? "—" : summary.averageTemperature.toFixed(1) + "°م"}</strong></article>
          <article><CloudRain /><small>مجموع الأمطار</small><strong>{summary.rainfallTotal === null ? "—" : summary.rainfallTotal.toFixed(1) + " مم"}</strong></article>
          <article><Wind /><small>أيام الصقيع (≤ 0°)</small><strong>{summary.frostDays}</strong></article>
          <article><CalendarDays /><small>أيام الحرارة (≥ 35°)</small><strong>{summary.hotDays}</strong></article>
        </div>
        <div className="section-intro section-intro--compact"><span>02 — تطور الحرارة</span><h2>الحرارة العظمى والصغرى</h2></div>
        <div className="climate-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" minTickGap={28} /><YAxis unit="°" /><Tooltip /><Line type="monotone" dataKey="maximum" name="العظمى" stroke="#c56a36" dot={false} connectNulls /><Line type="monotone" dataKey="minimum" name="الصغرى" stroke="#0c5b8c" dot={false} connectNulls /></LineChart></ResponsiveContainer></div>
        <div className="section-intro section-intro--compact"><span>03 — التساقطات</span><h2>الأمطار اليومية</h2></div>
        <div className="climate-chart climate-chart--rain"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" minTickGap={28} /><YAxis unit=" مم" /><Tooltip /><Line type="monotone" dataKey="rain" name="الأمطار" stroke="#268a78" dot={false} connectNulls /></LineChart></ResponsiveContainer></div>
      </>}
      <p className="map-attribution-note">المصدر: NASA POWER، بيانات يومية شبكية مشتقة من نماذج وإعادة تحليل ومصادر أقمار صناعية، وليست قياسات محطة محلية. تتأخر البيانات الجوية عادةً بنحو 2–3 أيام. <a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer">NASA POWER</a></p>
    </section><PublicFooter /></main>;
}
