import { ArrowRight, CloudSun, Home, Search } from "lucide-react";
import { Link } from "wouter";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";

export default function NotFound() {
  return (
    <main dir="rtl">
      <PublicHeader />
      <section className="not-found-section" aria-labelledby="not-found-heading">
        <span className="eyebrow"><CloudSun size={17} /> مرصد الأطلس · صفحة غير متوفرة</span>
        <strong className="not-found-code" aria-hidden="true">404</strong>
        <h1 id="not-found-heading">لم نعثر على هذه الصفحة</h1>
        <p>ربما تغيّر عنوان الصفحة أو حُذف. يمكنك العودة إلى النشرة الرئيسية أو البحث عن مدينتك.</p>
        <div className="not-found-actions">
          <Link href="/" className="primary-button"><Home size={18} /> العودة للرئيسية</Link>
          <Link href="/world-search" className="secondary-button"><Search size={18} /> البحث عن مدينة <ArrowRight size={16} /></Link>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
