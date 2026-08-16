/** Style reminder: Atlas Observatory shares a concise, legible weather reading as an exportable editorial card. */
import { useEffect, useState } from "react";
import { Check, Copy, Download, Share2, X } from "lucide-react";
import type { WeatherReading } from "@/lib/weather";
import { buildShareText, formatUpdatedAt, getWeatherCondition } from "@/lib/weather";

type WeatherShareDialogProps = { reading: WeatherReading; onClose: () => void };

const escapeXml = (value: string) => value.replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[character] ?? character));

function createCardSvg(reading: WeatherReading) {
  const condition = getWeatherCondition(reading.current.weatherCode);
  const city = escapeXml(reading.city.name);
  const status = escapeXml(condition.label);
  const updated = escapeXml(formatUpdatedAt(reading.updatedAt));
  const temp = Math.round(reading.current.temperature);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0C5B8C"/><stop offset="1" stop-color="#0A3959"/></linearGradient></defs>
    <rect width="1080" height="1350" fill="#F5F0E6"/><rect x="48" y="48" width="984" height="1254" rx="42" fill="url(#sky)"/>
    <path d="M90 310C230 210 390 360 520 260S800 170 990 300" fill="none" stroke="#DDECF3" stroke-opacity=".24" stroke-width="3"/>
    <path d="M100 1030C300 920 420 1120 630 1010S840 940 980 1040" fill="none" stroke="#DDECF3" stroke-opacity=".18" stroke-width="3"/>
    <circle cx="153" cy="150" r="52" fill="#F2B84B"/><path d="M153 112v-28M153 216v28M115 150H87M219 150h-28M126 123l-20-20M180 177l20 20M180 123l20-20M126 177l-20 20" stroke="#F2B84B" stroke-width="12" stroke-linecap="round"/>
    <text x="920" y="145" text-anchor="end" fill="#F7F4EC" font-size="52" font-family="Arial, sans-serif" font-weight="700">الطقس الجزائري</text>
    <text x="920" y="208" text-anchor="end" fill="#C9E0EC" font-size="30" font-family="Arial, sans-serif">قراءة طقس قابلة للمشاركة</text>
    <text x="920" y="415" text-anchor="end" fill="#FFFFFF" font-size="74" font-family="Arial, sans-serif" font-weight="700">${city}</text>
    <text x="920" y="482" text-anchor="end" fill="#C9E0EC" font-size="36" font-family="Arial, sans-serif">${status}</text>
    <text x="920" y="760" text-anchor="end" fill="#FFFFFF" font-size="286" font-family="Arial, sans-serif" font-weight="700">${temp}°</text>
    <line x1="100" y1="870" x2="980" y2="870" stroke="#DDECF3" stroke-opacity=".25"/>
    <text x="920" y="965" text-anchor="end" fill="#FFFFFF" font-size="42" font-family="Arial, sans-serif">الرياح ${Math.round(reading.current.windSpeed)} كم/س</text>
    <text x="920" y="1030" text-anchor="end" fill="#FFFFFF" font-size="42" font-family="Arial, sans-serif">الرطوبة ${Math.round(reading.current.humidity)}%</text>
    <text x="920" y="1190" text-anchor="end" fill="#C9E0EC" font-size="31" font-family="Arial, sans-serif">آخر تحديث: ${updated}</text>
    <text x="920" y="1245" text-anchor="end" fill="#C9E0EC" font-size="28" font-family="Arial, sans-serif">المصدر: Open-Meteo عبر الطقس الجزائري</text>
  </svg>`;
}

async function toPng(svg: string) {
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const image = new Image();
  image.src = svgUrl;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  context?.drawImage(image, 0, 0);
  URL.revokeObjectURL(svgUrl);
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("تعذر إنشاء الصورة"))), "image/png"));
}

export function WeatherShareDialog({ reading, onClose }: WeatherShareDialogProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "shared">("idle");
  const shareText = buildShareText(reading);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const download = async () => {
    const blob = await toPng(createCardSvg(reading));
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `weather-${reading.city.slug}.png`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const share = async () => {
    const url = `${window.location.origin}${import.meta.env.BASE_URL}?city=${reading.city.slug}`;
    try {
      const blob = await toPng(createCardSvg(reading));
      const file = new File([blob], `weather-${reading.city.slug}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: `طقس ${reading.city.name}`, text: shareText, url, files: [file] });
      else if (navigator.share) await navigator.share({ title: `طقس ${reading.city.name}`, text: shareText, url });
      else await navigator.clipboard.writeText(`${shareText}\n${url}`);
      setStatus("shared");
    } catch (error) {
      if ((error as Error).name !== "AbortError") await navigator.clipboard.writeText(`${shareText}\n${url}`);
    }
  };

  const copy = async () => {
    const url = `${window.location.origin}${import.meta.env.BASE_URL}?city=${reading.city.slug}`;
    await navigator.clipboard.writeText(`${shareText}\n${url}`);
    setStatus("copied");
  };

  return <div className="share-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="icon-button" onClick={onClose} aria-label="إغلاق نافذة المشاركة"><X size={20} /></button>
      <span className="eyebrow"><Share2 size={15} /> بطاقة المشاركة</span>
      <h2 id="share-title">أرسل حالة {reading.city.name} كما هي الآن</h2>
      <p>تتضمن البطاقة الحرارة والحالة ووقت القراءة، مع رابط مباشر للمدينة.</p>
      <div className="share-preview">
        <span>الطقس الجزائري</span><strong>{reading.city.name}</strong><b>{Math.round(reading.current.temperature)}°</b><small>{getWeatherCondition(reading.current.weatherCode).label}</small>
      </div>
      <div className="share-actions">
        <button className="primary-button" onClick={share}>{status === "shared" ? <Check size={18} /> : <Share2 size={18} />}{status === "shared" ? "تمت المشاركة" : "مشاركة الآن"}</button>
        <button className="secondary-button" onClick={download}><Download size={18} /> تنزيل PNG</button>
        <button className="secondary-button" onClick={copy}>{status === "copied" ? <Check size={18} /> : <Copy size={18} />}{status === "copied" ? "تم النسخ" : "نسخ الرابط"}</button>
      </div>
    </section>
  </div>;
}

export default WeatherShareDialog;
