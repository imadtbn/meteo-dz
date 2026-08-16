/** Style reminder: the interactive weather map is a measured atlas surface with explicit markers, not a decorative full-screen map. */
import { useMemo } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Link } from "wouter";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { ALGERIAN_CITIES } from "@/data/cities";
import { ARAB_CAPITALS } from "@/data/arab-capitals";

const atlasIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function WeatherMapPage() {
  const mapCenter = useMemo(() => { const params = new URLSearchParams(window.location.search); const lat = Number(params.get("lat")); const lng = Number(params.get("lon")); return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : { lat: 28, lng: 15 }; }, []);
  const locations = useMemo(() => [...ALGERIAN_CITIES.map((city) => ({ slug: city.slug, name: city.name, latitude: city.latitude, longitude: city.longitude, group: "ولاية جزائرية" })), ...ARAB_CAPITALS.map((city) => ({ slug: city.slug, name: city.capital, latitude: city.latitude, longitude: city.longitude, group: "عاصمة عربية" }))], []);

  return <main dir="rtl"><PublicHeader /><section className="map-page-hero"><span className="eyebrow"><Navigation size={15} /> مرصد الأطلس · خريطة تفاعلية</span><h1>الطقس على خريطة واحدة.</h1><p>تصفح نقاط الولايات الجزائرية والعواصم العربية، ثم افتح القراءة العالمية من العلامة الأقرب.</p></section><section className="map-shell"><div className="map-legend"><span><MapPin size={14} /> {ALGERIAN_CITIES.length} ولاية جزائرية</span><span><MapPin size={14} /> {ARAB_CAPITALS.length} عاصمة عربية</span><Link href="/world-search">ابحث عن موقع آخر</Link></div><MapContainer className="atlas-map" center={[mapCenter.lat, mapCenter.lng]} zoom={mapCenter.lat === 28 && mapCenter.lng === 15 ? 3 : 8} scrollWheelZoom><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{locations.map((location) => <Marker key={`${location.group}-${location.slug}`} position={[location.latitude, location.longitude]} icon={atlasIcon}><Popup><div dir="rtl"><b>{location.name}</b><small>{location.group} · {location.latitude.toFixed(2)}, {location.longitude.toFixed(2)}</small><Link className="popup-weather-link" href={`/global-weather?lat=${location.latitude}&lon=${location.longitude}&name=${encodeURIComponent(location.name)}`}>فتح قراءة الطقس</Link></div></Popup></Marker>)}</MapContainer><p className="map-attribution-note">الخريطة الجغرافية من OpenStreetMap؛ بيانات الطقس تُفتح من بطاقة الموقع عبر Open-Meteo.</p></section><PublicFooter /></main>;
}
