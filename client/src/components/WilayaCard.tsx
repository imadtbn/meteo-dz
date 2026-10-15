/** One visual card for both the homepage directory and /wilayas. */
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { AlgerianCity } from "@/data/cities";
import { PlaceIllustration } from "@/components/PlaceIllustration";
import { getWilayaScene } from "@/lib/placeVisuals";

export function WilayaCard({ city }: { city: AlgerianCity }) {
  return (
    <Link
      className="directory-card directory-card--visual region-card--visual-home"
      href={`/weather/${city.slug}`}
      aria-label={`عرض نشرة الطقس في ${city.name}`}
    >
      <PlaceIllustration
        scene={getWilayaScene(city.region, city.coastal)}
        label={city.name}
        badge={`ولاية ${city.code}`}
      />
      <span className="directory-card__body">
        <span className="directory-card__meta">{city.code} · {city.region}</span>
        <strong className="directory-card__title">{city.name}</strong>
        <span className="directory-card__action">
          عرض نشرة الطقس <ArrowLeft size={17} aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}
