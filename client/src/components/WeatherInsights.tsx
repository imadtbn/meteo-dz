/** Style reminder: insights are compact observatory notes—every warning has a source label and every tip is marked as guidance. */
import { AlertTriangle, BarChart3, ExternalLink, Newspaper, ShieldCheck, Sun } from "lucide-react";
import type { AlgerianCity } from "@/data/cities";
import type { WeatherReading } from "@/lib/weather";

export function WeatherInsights({ city, reading }: { city: AlgerianCity; reading: WeatherReading }) {
  const rainiest = [...reading.daily].sort((a, b) => b.precipitationProbability - a.precipitationProbability)[0];
  const warmest = [...reading.daily].sort((a, b) => b.max - a.max)[0];
  const tips = [
    reading.current.precipitation > 0 || rainiest?.precipitationProbability > 50 ? "احمل مظلة وراجع التحديث قبل الخروج." : "الأجواء جافة نسبياً؛ احرص على شرب الماء خلال النشاط الخارجي.",
    reading.current.windSpeed > 30 ? "الرياح قوية؛ ثبّت الأشياء الخفيفة وتوخ الحذر في التنقل." : "الرياح ضمن مستوى معتدل وفق القراءة الحالية.",
    warmest ? `أعلى قراءة متوقعة خلال الأيام القادمة: ${Math.round(warmest.max)}°.` : "تابع التحديثات قبل الرحلات الطويلة.",
  ];
  return <section className="insights-shell dashboard-shell"><div className="section-intro"><span>05 — قراءة أوسع</span><h2>نصيحة، إحصائية، ومصدر</h2><p>إرشاد آلي لا يحل محل النشرة الرسمية.</p></div><div className="insight-grid"><article className="insight-card insight-card--alert"><div className="insight-card__head"><AlertTriangle size={18} /><span>التحذير الرسمي · ONM</span></div><div><strong><ShieldCheck size={16} /> راجع يقظة الديوان الوطني للأرصاد</strong><p>نسخة GitHub Pages لا تستنتج التحذيرات ولا تخزّنها؛ افتح المصدر الرسمي للتحقق من اللون والظاهرة والمدة الخاصة بـ{city.name}.</p><a href="https://www.meteo.dz/" target="_blank" rel="noreferrer">فتح ONM <ExternalLink size={13} /></a></div></article><article className="insight-card"><div className="insight-card__head"><Sun size={18} /><span>نصائح طقسية</span></div><ul>{tips.map((tip) => <li key={tip}>{tip}</li>)}</ul></article><article className="insight-card"><div className="insight-card__head"><BarChart3 size={18} /><span>إحصائيات سريعة</span></div><div className="stat-lines"><span>متوسط الخمسة أيام <b>{Math.round(reading.daily.reduce((sum, day) => sum + day.max, 0) / Math.max(1, reading.daily.length))}°</b></span><span>أعلى احتمال مطر <b>{Math.round(rainiest?.precipitationProbability ?? 0)}%</b></span><span>المحسوس الآن <b>{Math.round(reading.current.apparentTemperature)}°</b></span></div></article><article className="insight-card"><div className="insight-card__head"><Newspaper size={18} /><span>أخبار الطقس والمناخ</span></div><div><p>للاطلاع على الأخبار المناخية الموثوقة، انتقل إلى المصدر العالمي مباشرة.</p><a href="https://www.noaa.gov/news" target="_blank" rel="noreferrer">فتح NOAA <ExternalLink size={13} /></a></div></article></div></section>;
}
