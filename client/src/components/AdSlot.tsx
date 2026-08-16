/** Style reminder: Atlas Observatory keeps advertising clearly labeled, spaced, and secondary to weather decisions. */
import { useEffect, useRef } from "react";

type AdSlotProps = { slot: string; className?: string };

const client = import.meta.env.VITE_ADSENSE_CLIENT || "ca-pub-5656416032906373";

export function AdSlot({ slot, className = "" }: AdSlotProps) {
  const ref = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!client || !ref.current || ref.current.dataset.loaded === "true") return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      ref.current.dataset.loaded = "true";
    } catch {
      // A blocked ad script must not affect the weather interface.
    }
  }, []);

  return (
    <aside className={`ad-slot ${className}`} aria-label="إعلان">
      <span>إعلان</span>
      <ins ref={ref} className="adsbygoogle" style={{ display: "block" }} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}
