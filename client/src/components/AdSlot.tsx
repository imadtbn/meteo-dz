import { useEffect, useRef } from "react";

/**
 * Both slots share the same AdSense loader (declared once in index.html).
 * The first stays below the shared header, the second above the shared footer.
 */
export const ADS_CLIENT = "ca-pub-5656416032906373" as const;
export const ADS_SLOTS = {
  header: { slot: "7867079394", format: "fluid", layoutKey: "-fr+57+4a-dc+8g" },
  footer: { slot: "3143411927", format: "auto" },
} as const;

export const isUsableAdWidth = (width: number) => Number.isFinite(width) && width >= 250;

type SlotPosition = keyof typeof ADS_SLOTS;
type AdWindow = Window & { adsbygoogle?: { push: (item: Record<string, never>) => unknown } };

export function AdSlot({ position }: { position: SlotPosition }) {
  const containerRef = useRef<HTMLElement>(null);
  const adRef = useRef<HTMLElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const ad = adRef.current;
    if (!container || !ad || initialized.current) return;

    let visible = false;
    let cancelled = false;
    let animationId = 0;

    const tryRequest = () => {
      if (cancelled || initialized.current || !visible || document.visibilityState === "hidden") return;
      if (!navigator.onLine) return;

      // Wait for measured, usable dimensions. This also avoids AdSense
      // "No slot size for availableWidth=81" in collapsing flex layouts.
      const width = Math.floor(ad.getBoundingClientRect().width);
      if (!isUsableAdWidth(width)) return;
      if (ad.dataset.adsbygoogleStatus) {
        initialized.current = true;
        return;
      }

      initialized.current = true; // one push per <ins>, even after rerenders
      try {
        const win = window as AdWindow;
        (win.adsbygoogle ??= []).push({});
      } catch (error) {
        // Ad blockers and restricted browsers must not break the weather UI.
        console.warn("[AdSense] Slot request was skipped", error);
      }
    };

    const scheduleRequest = () => {
      if (animationId) cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(tryRequest);
    };

    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) scheduleRequest();
      },
      { rootMargin: "350px 0px", threshold: 0 },
    );

    if (observer) observer.observe(container);
    else {
      visible = true;
      scheduleRequest();
    }

    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleRequest);
    resizeObserver?.observe(container);
    const onVisibility = () => scheduleRequest();
    const onOnline = () => scheduleRequest();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      if (animationId) cancelAnimationFrame(animationId);
      observer?.disconnect();
      resizeObserver?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const isHeader = position === "header";
  const config = ADS_SLOTS[position];
  return (
    <aside
      className={"site-ad site-ad--" + position}
      data-ad-position={position}
      aria-label={isHeader ? "مساحة إعلانية أسفل الهيدر" : "مساحة إعلانية قبل تذييل الموقع"}
      ref={containerRef}
    >
      <div className="site-ad__inner">
        <span className="site-ad__label">إعلان</span>
        <div className="site-ad__reserved">
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{ display: "block", width: "100%" }}
            data-ad-client={ADS_CLIENT}
            data-ad-slot={config.slot}
            data-ad-format={config.format}
            {...(position === "header" ? { "data-ad-layout-key": ADS_SLOTS.header.layoutKey } : { "data-full-width-responsive": "true" })}
          />
        </div>
      </div>
    </aside>
  );
}
