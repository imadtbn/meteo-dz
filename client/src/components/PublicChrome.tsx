import { SiteActions } from "@/components/SiteActions";
import { useEffect, useState } from "react";
import {
  ArrowUpLeft,
  CloudSun,
  Compass,
  Globe2,
  Home,
  Landmark,
  Map,
  Menu,
  Search,
  Waves,
  X,
} from "lucide-react";
import { Link, useLocation } from "wouter";

const mainLinks = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/wilayas", label: "الولايات", icon: Landmark },
  { href: "/arab-capitals", label: "العواصم العربية", icon: Compass },
  { href: "/world-search", label: "بحث عالمي", icon: Search },
  { href: "/weather-map", label: "خريطة الطقس", icon: Map },
] as const;

export function PublicHeader({ showSections = false }: { showSections?: boolean }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => setOpen(false), [location]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <header className="site-header">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark" aria-hidden="true"><CloudSun size={21} /></span>
          <span>الطقس <b>الجزائري</b></span>
        </Link>

        <nav
          id="site-navigation"
          className={open ? "site-navigation is-open" : "site-navigation"}
          aria-label="التنقل الرئيسي"
        >
          {mainLinks.map(({ href, label, icon: Icon }) => (
            <Link
              href={href}
              key={href}
              className={location === href ? "nav-link is-active" : "nav-link"}
              aria-current={location === href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
          {showSections && (
            <>
              <a className="nav-link nav-link--section" href="#outlook" onClick={() => setOpen(false)}>
                <Globe2 size={17} aria-hidden="true" /><span>التوقعات</span>
              </a>
              <a className="nav-link nav-link--section" href="#marine" onClick={() => setOpen(false)}>
                <Waves size={17} aria-hidden="true" /><span>البحر</span>
              </a>
            </>
          )}
        </nav>

        <div className="header-actions">
          <SiteActions />
          <a className="header-source" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
            مصدر البيانات <ArrowUpLeft size={15} aria-hidden="true" />
          </a>
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setOpen((value) => !value)}
            aria-controls="site-navigation"
            aria-expanded={open}
            aria-label={open ? "إغلاق قائمة التنقل" : "فتح قائمة التنقل"}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>
      {open && (
        <button
          type="button"
          className="nav-backdrop"
          aria-label="إغلاق قائمة التنقل"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}

export function PublicFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-about">
        <span className="eyebrow"><CloudSun size={17} aria-hidden="true" /> مرصد الأطلس</span>
        <p>طقس الجزائر والعالم العربي: قراءة عملية محدثة، وتوقعات واضحة مع إظهار مصدر البيانات.</p>
      </div>
      <nav className="footer-links" aria-label="روابط التذييل">
        {mainLinks.map(({ href, label, icon: Icon }) => (
          <Link href={href} key={href}>
            <Icon size={16} aria-hidden="true" /> {label}
          </Link>
        ))}
      </nav>
      <div className="footer-disclaimer">
        <a href="https://www.meteo.dz/" target="_blank" rel="noopener noreferrer">
          النشرات الرسمية <ArrowUpLeft size={14} aria-hidden="true" />
        </a>
        <small>بيانات Open-Meteo إرشادية وليست تحذيرات رسمية. عند الأحوال الخطرة يُرجى الرجوع إلى الديوان الوطني للأرصاد الجوية.</small>
      </div>
    </footer>
  );
}
