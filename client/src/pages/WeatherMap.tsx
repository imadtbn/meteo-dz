/** Style reminder: the interactive weather map is a measured atlas surface with sourced overlays and explicit attribution. */
import { useMemo, useState } from "react";
import { Layers, MapPin, Navigation } from "lucide-react";
import { Link } from "wouter";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { ALGERIAN_CITIES } from "@/data/cities";
import { ARAB_CAPITALS } from "@/data/arab-capitals";
import { parseCoordinates } from "@/lib/coordinates";

const atlasIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const overlays = [
  { id: "tmp2m", label: "الحرارة", path: "tmp2m" },
  { id: "precip", label: "الأمطار", path: "precip" },
  { id: "wind", label: "الرياح", path: "wind" },
  { id: "pressure", label: "الضغط", path: "pressure" },
] as const;
type OverlayId = typeof overlays[number]["id"];

export default function WeatherMapPage() {
  const [activeOverlay, setActiveOverlay] = useState<OverlayId | "none">("precip");
  const mapCenter = useMemo(() => { const coordinates = parseCoordinates(window.location.search); return coordinates ? { lat: coordinates.latitude, lng: coordinates.longitude } : { lat: 28, lng: 15 }; }, []);
  const frame = useMemo(() => {
    const hour = new Date();
    hour.setUTCMinutes(0, 0, 0);
    return hour.toISOString().slice(0, 10).replaceAll("-", "") + hour.toISOString().slice(11, 13);
  }, []);
  const locations = useMemo(() => [
    ...ALGERIAN_CITIES.map((city) => ({ slug: city.slug, name: city.name, latitude: city.latitude, longitude: city.longitude, group: "ولاية جزائرية" })),
    ...ARAB_CAPITALS.map((city) => ({ slug: city.slug, name: city.capital, latitude: city.latitude, longitude: city.longitude, group: "عاصمة عربية" })),
  ], []);
  const selected = overlays.find((item) => item.id === activeOverlay);
  const overlayUrl = selected ? "https://weathermaps.weatherapi.com/" + selected.path + "/tiles/" + frame + "/{z}/{x}/{y}.png" : undefined;

  return <main dir="rtl">
    <PublicHeader />
    <section className="map-page-hero"><span className="eyebrow"><Navigation size={15} /> مرصد الأطلس · مركز الخرائط</span><h1>الطقس على خريطة واحدة.</h1><p>طبقات توقعات الطقس للحرارة والأمطار والرياح والضغط، مع مواقع الولايات الجزائرية والعواصم العربية.</p></section>
    <section className="map-shell">
      <div className="map-legend"><span><MapPin size={14} /> {ALGERIAN_CITIES.length} ولاية جزائرية</span><span><MapPin size={14} /> {ARAB_CAPITALS.length} عاصمة عربية</span><Link href="/world-search">ابحث عن موقع آخر</Link></div>
      <div className="weather-layer-toolbar" aria-label="طبقات الطقس">
        <span><Layers size={16} /> طبقة الخريطة</span>
        <button type="button" className={activeOverlay === "none" ? "is-active" : ""} onClick={() => setActiveOverlay("none")}>بدون طبقة</button>
        {overlays.map((item) => <button type="button" key={item.id} className={activeOverlay === item.id ? "is-active" : ""} onClick={() => setActiveOverlay(item.id)}>{item.label}</button>)}
      </div>
      <MapContainer className="atlas-map" center={[mapCenter.lat, mapCenter.lng]} zoom={mapCenter.lat === 28 && mapCenter.lng === 15 ? 3 : 8} scrollWheelZoom>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {overlayUrl && <TileLayer key={activeOverlay + frame} url={overlayUrl} opacity={0.62} />}
        {locations.map((location) => <Marker key={location.group + "-" + location.slug} position={[location.latitude, location.longitude]} icon={atlasIcon}><Popup><div dir="rtl"><b>{location.name}</b><small>{location.group} · {location.latitude.toFixed(2)}, {location.longitude.toFixed(2)}</small><Link className="popup-weather-link" href={"/global-weather?lat=" + location.latitude + "&lon=" + location.longitude + "&name=" + encodeURIComponent(location.name)}>فتح قراءة الطقس</Link></div></Popup></Marker>)}
      </MapContainer>
      <p className="map-attribution-note">خرائط الأساس: OpenStreetMap. طبقات الحرارة والهطول والرياح والضغط: WeatherAPI Weather Maps، توقعات شبكية بفاصل ساعة وليست رادار أمطار أو صور أقمار صناعية. الطبقة المعروضة مرتبطة بالساعة الحالية UTC.</p>
    </section>
    <PublicFooter />
  </main>;
}
