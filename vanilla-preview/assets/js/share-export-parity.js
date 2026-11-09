const labels = {0:"سماء صافية",1:"صحو غالباً",2:"غائم جزئياً",3:"غائم",45:"ضباب",48:"ضباب كثيف",51:"رذاذ خفيف",53:"رذاذ",55:"رذاذ كثيف",61:"أمطار خفيفة",63:"أمطار",65:"أمطار غزيرة",71:"ثلوج خفيفة",73:"ثلوج",75:"ثلوج كثيفة",80:"زخات مطر",81:"زخات مطر",82:"زخات غزيرة",95:"عواصف رعدية",96:"عواصف مع برد",99:"عواصف قوية"};
const status = document.querySelector("#share-status");
const escapeXml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[char]));
const setStatus = message => { if (status) status.textContent = message; };

async function exportWeatherCard() {
  const cities = JSON.parse(document.querySelector("#city-data")?.textContent || "[]");
  const slug = new URLSearchParams(location.search).get("city");
  const city = cities.find(item => item.slug === slug) || cities[0];
  const title = document.querySelector("#current-card .current-card__main h2")?.textContent || city?.name || "الطقس";
  let current = null;
  try {
    const cached = JSON.parse(localStorage.getItem("atlas-weather-" + (city?.slug || "")) || "null");
    current = cached?.value?.data?.current || null;
  } catch {}
  const temperature = current && Number.isFinite(current.temperature_2m)
    ? Math.round(current.temperature_2m) + "°"
    : document.querySelector("#current-card .temperature")?.textContent || "—";
  const condition = current ? (labels[current.weather_code] || "حالة جوية متغيرة")
    : document.querySelector("#current-card .condition-label")?.textContent || "حالة جوية متغيرة";
  const humidity = current && Number.isFinite(current.relative_humidity_2m)
    ? Math.round(current.relative_humidity_2m) + "%"
    : document.querySelector("#current-card .current-metrics span:nth-child(1) b")?.textContent || "—";
  const wind = current && Number.isFinite(current.wind_speed_10m)
    ? Math.round(current.wind_speed_10m) + " كم/س"
    : document.querySelector("#current-card .current-metrics span:nth-child(2) b")?.textContent || "—";
  if (!document.querySelector("#current-card .temperature")) {
    setStatus("انتظر ظهور قراءة الطقس الحالية قبل تنزيل البطاقة.");
    return;
  }
  setStatus("جارٍ تجهيز صورة الطقس…");
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><rect width="1080" height="1350" fill="#f5f0e6"/><rect x="45" y="45" width="990" height="1260" rx="40" fill="#103f59"/><g fill="#fff" font-family="Arial,sans-serif" text-anchor="end"><text x="950" y="180" font-size="58">الطقس الجزائري</text><text x="950" y="390" font-size="76">'+escapeXml(title)+'</text><text x="950" y="760" font-size="270">'+escapeXml(temperature)+'</text><text x="950" y="900" font-size="48">'+escapeXml(condition)+'</text><text x="950" y="1020" font-size="38">الرطوبة '+escapeXml(humidity)+' · الرياح '+escapeXml(wind)+'</text><text x="950" y="1190" font-size="30">Open-Meteo · '+escapeXml(new Intl.DateTimeFormat("ar-DZ",{dateStyle:"medium",timeStyle:"short",timeZone:"Africa/Algiers"}).format(new Date()))+'</text></g></svg>';
  const svgUrl = URL.createObjectURL(new Blob([svg],{type:"image/svg+xml;charset=utf-8"}));
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(svgUrl);
      setStatus("تعذر إنشاء صورة البطاقة في هذا المتصفح.");
      return;
    }
    context.drawImage(image,0,0);
    canvas.toBlob(png => {
      URL.revokeObjectURL(svgUrl);
      if (!png) {
        setStatus("تعذر تحويل البطاقة إلى PNG. حاول مجدداً.");
        return;
      }
      const pngUrl = URL.createObjectURL(png);
      const anchor = document.createElement("a");
      anchor.href = pngUrl;
      anchor.download = "weather-"+(city?.slug || "current")+".png";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setStatus("تم تجهيز بطاقة الطقس بصيغة PNG.");
      window.setTimeout(() => URL.revokeObjectURL(pngUrl),30000);
    },"image/png");
  };
  image.onerror = () => {
    URL.revokeObjectURL(svgUrl);
    setStatus("تعذر رسم بطاقة الطقس. تحقق من دعم الصور ثم حاول مجدداً.");
  };
  image.src = svgUrl;
}

document.addEventListener("click",event => {
  const button = event.target instanceof Element ? event.target.closest("#share-image") : null;
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  exportWeatherCard().catch(() => setStatus("حدث خطأ أثناء تجهيز صورة الطقس."));
},true);
