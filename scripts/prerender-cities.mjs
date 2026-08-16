/** Style reminder: Atlas Observatory turns every city route into an indexable, source-aware weather landing page. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const cities = [
  ["algiers", "الجزائر العاصمة", "الساحل الأوسط"],
  ["oran", "وهران", "الساحل الغربي"],
  ["annaba", "عنابة", "الساحل الشرقي"],
  ["constantine", "قسنطينة", "الشرق الداخلي"],
  ["setif", "سطيف", "الهضاب العليا"],
  ["blida", "البليدة", "الأطلس البليدي"],
  ["tamanrasset", "تمنراست", "الجنوب الكبير"],
  ["adrar", "أدرار", "الجنوب الغربي"],
  ["ouargla", "ورقلة", "الجنوب الشرقي"],
];

const dist = path.resolve("dist/public");
const template = await readFile(path.join(dist, "index.html"), "utf8");

for (const [slug, name, region] of cities) {
  const canonical = `https://imadtbn.github.io/meteo-dz/weather/${slug}/`;
  const title = `طقس ${name} اليوم | الطقس الجزائري`;
  const description = `حالة الطقس في ${name} اليوم وتوقعات الأيام القادمة لمنطقة ${region}، مع وقت تحديث واضح وقراءة قابلة للمشاركة.`;
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: canonical,
    inLanguage: "ar-DZ",
    isPartOf: { "@type": "WebSite", name: "الطقس الجزائري", url: "https://imadtbn.github.io/meteo-dz/" },
  });
  const noscript = `<noscript><main dir="rtl"><h1>${title}</h1><p>${description}</p><p>فعّل JavaScript لعرض القراءة الجوية المباشرة والتوقعات المحدثة.</p></main></noscript>`;
  const page = template
    .replace("<title>الطقس الجزائري | قراءة واضحة لكل مدينة</title>", `<title>${title}</title>`)
    .replace('<link rel="canonical" href="https://imadtbn.github.io/meteo-dz/" />', `<link rel="canonical" href="${canonical}" />`)
    .replace('<meta name="description" content="الطقس الجزائري: قراءة حالية وتوقعات محلية للمدن الجزائرية، مع وقت تحديث واضح ومؤشرات بحرية للسواحل." />', `<meta name="description" content="${description}" />`)
    .replace('<meta property="og:title" content="الطقس الجزائري — مرصد الأطلس" />', `<meta property="og:title" content="${title}" />`)
    .replace('<meta property="og:description" content="قراءة طقس واضحة لكل مدينة جزائرية، قابلة للمشاركة." />', `<meta property="og:description" content="${description}" />`)
    .replace("<body>", `<body>${noscript}<script type="application/ld+json">${structuredData}</script>`);
  const output = path.join(dist, "weather", slug);
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, "index.html"), page);
}

console.log(`Generated ${cities.length} static city pages.`);
