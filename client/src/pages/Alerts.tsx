import { AlertTriangle, ArrowUpLeft, Rss, ShieldAlert, Waves } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";

const officialSources = [
  {
    title: "خريطة اليقظة الجوية",
    label: "اليقظة العامة والبحرية",
    description: "تابع مستوى اليقظة حسب الولاية والظواهر الجوية من الواجهة الرسمية للديوان الوطني للأرصاد الجوية.",
    href: "https://www.meteo.dz/?lang=ar",
    icon: ShieldAlert,
  },
  {
    title: "النشرات الجوية الخاصة BMS",
    label: "النشرات والتحذيرات",
    description: "انتقل إلى صفحة النشرات الخاصة للاطلاع على التحذيرات الرسمية ومناطق سريانها.",
    href: "https://www.meteo.dz/bms",
    icon: AlertTriangle,
  },
  {
    title: "موجز RSS وCAP",
    label: "قنوات النشر الرسمية",
    description: "افتح صفحة قنوات التنبيه الرسمية المتاحة لدى الديوان، وتحقق من حالة النشرة وتاريخ إصدارها.",
    href: "https://www.meteo.dz/rss",
    icon: Rss,
  },
];

export default function AlertsPage() {
  return (
    <main dir="rtl">
      <PublicHeader />
      <section className="map-page-hero">
        <span className="eyebrow"><AlertTriangle size={15} aria-hidden="true" /> مرصد الأطلس · مصادر الإنذار الرسمية</span>
        <h1>الإنذارات الجوية في الجزائر.</h1>
        <p>بوابة وصول سريعة إلى اليقظة الجوية والنشرات الخاصة الصادرة عن الديوان الوطني للأرصاد الجوية، مع إبقاء المصدر الرسمي مرجع القرار والتنبيه.</p>
      </section>
      <section className="directory-shell">
        <div className="section-intro">
          <span>01 — المصادر الرسمية</span>
          <h2>تابع النشرة من مصدرها.</h2>
          <p>اختر نوع النشرة التي تريد مراجعتها. تفتح الروابط الموقع الرسمي في نافذة مستقلة.</p>
        </div>
        <div className="insight-grid">
          {officialSources.map(({ title, label, description, href, icon: Icon }) => (
            <article className="insight-card insight-card--alert" key={href}>
              <div className="insight-card__head"><Icon size={18} aria-hidden="true" /> {label}</div>
              <strong>{title}</strong>
              <p>{description}</p>
              <a href={href} target="_blank" rel="noopener noreferrer">
                زيارة الديوان الوطني للأرصاد الجوية <ArrowUpLeft size={14} aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>
        <div className="section-intro section-intro--compact">
          <span>02 — السلامة الجوية</span>
          <h2>كيف تستخدم هذه الصفحة؟</h2>
        </div>
        <div className="insight-grid">
          <article className="insight-card">
            <div className="insight-card__head"><ShieldAlert size={18} aria-hidden="true" /> المصدر المعتمد</div>
            <p>اعتمد على النشرة الرسمية لمعرفة الولايات والظواهر ومستوى اليقظة وفترة الصلاحية. لا تعتبر توقعات الطقس العامة بديلاً عن التحذير الرسمي.</p>
          </article>
          <article className="insight-card">
            <div className="insight-card__head"><Waves size={18} aria-hidden="true" /> اليقظة البحرية</div>
            <p>قبل الأنشطة الساحلية أو البحرية، راجع النشرة البحرية الرسمية وأحوال البحر الصادرة عن الجهات المختصة.</p>
          </article>
          <article className="insight-card">
            <div className="insight-card__head"><Rss size={18} aria-hidden="true" /> تحديث النشرات</div>
            <p>تحقق من وقت الإصدار وحالة النشرة عند فتح المصدر، فقد تُحدّث التحذيرات أو تُلغى قبل انتهاء اليوم.</p>
          </article>
        </div>
        <p className="map-attribution-note">هذه الصفحة دليل روابط وليست خدمة إنذار مستقلة. لا ننسخ أو نعيد نشر محتوى النشرات؛ جميع التفاصيل والتحديثات والقرارات الرسمية لدى الديوان الوطني للأرصاد الجوية.</p>
      </section>
      <PublicFooter />
    </main>
  );
}
