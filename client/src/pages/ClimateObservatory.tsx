import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, CloudRain, Thermometer, Wind } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { ALGERIAN_CITIES } from "@/data/cities";
import { fetchNasaPowerDaily, summarizeNasaRecords, type NasaDailyRecord } from "@/lib/nasaPower";

type ChartRow = { date: string; maximum: number | null; minimum: number | null; rain: number | null };
type Series = { key: "maximum" | "minimum" | "rain"; label: string; color: string };

const formatDate = (value: string) => value.length === 8 ? value.slice(6, 8) + "/" + value.slice(4, 6) : value;

function ClimateLineChart({ data, series, unit, label }: { data: ChartRow[]; series: Series[]; unit: string; label: string }) {
  const width = 900;
  const height = 280;
  const left = 48;
  const right = 18;
  const top = 18;
  const bottom = 42;
  const values = data.flatMap((row) => series.map(({ key }) => row[key])).filter((value): value is number => value !== null && Number.isFinite(value));
  const rawMin = values.length ? Math.min(...values) : 0;
  const rawMax = values.length ? Math.max(...values) : 1;
  const range = Math.max(1, rawMax - rawMin);
  const min = Math.floor((rawMin - range * 0.08) / 5) * 5;
  const max = Math.ceil((rawMax + range * 0.08) / 5) * 5 || min + 5;
  const x = (index: number) => left + (index / Math.max(1, data.length - 1)) * (width - left - right);
  const y = (value: number) => top + ((max - value) / (max - min)) * (height - top - bottom);
  const ticks = Array.from({ length: 5 }, (_, index) => min + ((max - min) * index) / 4);
  const dateIndexes = Array.from(new Set([0, Math.floor((data.length - 1) / 4), Math.floor((data.length - 1) / 2), Math.floor(((data.length - 1) * 3) / 4), Math.max(0, data.length - 1)]));
  return (
    <div className="climate-chart" role="img" aria-label={label}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="#dce4e1" strokeDasharray="4 5" />
            <text x={left - 9} y={y(tick) + 4} textAnchor="end" fill="#60727a" fontSize="12">{Math.round(tick)}{unit}</text>
          </g>
        ))}
        {series.map((item) => {
          const points = data.map((row, index) => {
            const value = row[item.key];
            return value === null || !Number.isFinite(value) ? null : `${x(index).toFixed(1)},${y(value).toFixed(1)}`;
          });
          let path = "";
          points.forEach((point) => { path += point ? (path.endsWith(" ") || !path ? "M" : " L") + point : " "; });
          return <path key={item.key} d={path} fill="none" stroke={item.color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />;
        })}
        {dateIndexes.map((index) => (
          <text key={index} x={x(index)} y={height - 12} textAnchor="middle" fill="#60727a" fontSize="12">{data[index]?.date ?? ""}</text>
        ))}
      </svg>
      <div className="climate-chart-legend">
        {series.map((item) => <span key={item.key}><i style={{ background: item.color }} />{item.label}</span>)}
      </div>
    </div>
  );
}

export default function ClimateObservatoryPage() {
  const [slug, setSlug] = useState(ALGERIAN_CITIES[0]?.slug ?? "");
  const [period, setPeriod] = useState(90);
  const [rows, setRows] = useState<NasaDailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const city = ALGERIAN_CITIES.find((item) => item.slug === slug) ?? ALGERIAN_CITIES[0];
  useEffect(() => {
    if (!city) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchNasaPowerDaily(city, period, controller.signal).then(setRows)
      .catch((reason: unknown) => { if ((reason as Error)?.name !== "AbortError") setError((reason as Error)?.message ?? "تعذر تحميل البيانات المناخية."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [slug, period]);
  const summary = useMemo(() => summarizeNasaRecords(rows), [rows]);
  const chartData = useMemo<ChartRow[]>(() => rows.map((row) => ({
    date: formatDate(row.date),
    maximum: row.maximum,
    minimum: row.minimum,
    rain: row.precipitation,
  })), [rows]);
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
        <ClimateLineChart data={chartData} series={[{ key: "maximum", label: "العظمى", color: "#c56a36" }, { key: "minimum", label: "الصغرى", color: "#0c5b8c" }]} unit="°" label="منحنى درجات الحرارة العظمى والصغرى" />
        <div className="section-intro section-intro--compact"><span>03 — التساقطات</span><h2>الأمطار اليومية</h2></div>
        <ClimateLineChart data={chartData} series={[{ key: "rain", label: "الأمطار", color: "#268a78" }]} unit=" مم" label="منحنى الأمطار اليومية" />
      </>}
      <p className="map-attribution-note">المصدر: NASA POWER، بيانات يومية شبكية مشتقة من نماذج وإعادة تحليل ومصادر أقمار صناعية، وليست قياسات محطة محلية. تتأخر البيانات الجوية عادةً بنحو 2–3 أيام. <a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer">NASA POWER</a></p>
    </section><PublicFooter /></main>;
}
