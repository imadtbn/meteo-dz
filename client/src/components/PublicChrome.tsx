/** Style reminder: Atlas Observatory chrome is editorial, compact, RTL-first, and keeps every route one click from weather reading. */
import { ArrowUpLeft, CloudSun, Search, Map, Landmark } from "lucide-react";
import { Link } from "wouter";

export function PublicHeader() {
  return <header className="site-header"><Link href="/" className="brand"><span className="brand-mark" aria-hidden="true"><CloudSun size={20} /></span><span>الطقس <b>العربي</b></span></Link><nav aria-label="التنقل الرئيسي"><Link href="/">الآن</Link><Link href="/wilayas">الولايات</Link><Link href="/arab-capitals">العواصم العربية</Link><Link href="/world-search"><Search size={14} /> بحث</Link><Link href="/weather-map"><Map size={14} /> الخريطة</Link></nav><a className="header-source" href="https://open-meteo.com/" target="_blank" rel="noreferrer">مصدر البيانات <ArrowUpLeft size={15} /></a></header>;
}

export function PublicFooter() {
  return <footer className="site-footer"><div><span className="eyebrow"><CloudSun size={15} /> مرصد الأطلس</span><p>قراءة طقس عملية، بمصدر ووقت تحديث واضحين، من الجزائر إلى العالم.</p></div><div className="footer-links"><Link href="/wilayas"><Landmark size={14} /> الولايات الجزائرية</Link><Link href="/arab-capitals">عواصم عربية</Link><Link href="/world-search">بحث عالمي</Link><Link href="/weather-map">خريطة الطقس</Link></div><small>البيانات الجوية للاسترشاد؛ راجع السلطات الرسمية في الحالات الحساسة.</small></footer>;
}
