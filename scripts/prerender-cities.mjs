/** Style reminder: Atlas Observatory turns every wilaya route into an indexable, source-aware weather landing page. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import cities from "../client/src/data/cities.json" with { type: "json" };

const dist = path.resolve("dist/public");
const sourcePublic = path.resolve("client/public");
const template = await readFile(path.join(dist, "index.html"), "utf8");
const siteUrl = process.env.SITE_URL || (process.env.DEPLOY_TARGET === "github" ? "https://imadtbn.github.io/meteo-dz" : "https://meteo-dz-modernized.manus.space");
const siteRoot = `${siteUrl.replace(/\/$/, "")}/`;
const mainPage = template.replace('<link rel="canonical" href="https://imadtbn.github.io/meteo-dz/" />', `<link rel="canonical" href="${siteRoot}" />`);
await writeFile(path.join(dist, "index.html"), mainPage);

const escapeXml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");

for (const city of cities) {
  const canonical = `${siteRoot}weather/${city.slug}/`;
  const title = `طقس ${city.name} اليوم | الطقس الجزائري`;
  const description = `حالة الطقس في ${city.name} اليوم وتوقعات الأيام القادمة لمنطقة ${city.region}، مع وقت تحديث واضح وقراءة قابلة للمشاركة.`;
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: canonical,
    inLanguage: "ar-DZ",
    isPartOf: { "@type": "WebSite", name: "الطقس الجزائري", url: siteRoot },
  });
  const noscript = `<noscript><main dir="rtl"><h1>${title}</h1><p>${description}</p><p>فعّل JavaScript لعرض القراءة الجوية المباشرة والتوقعات المحدثة.</p></main></noscript>`;
  const page = template
    .replace("<title>الطقس الجزائري | قراءة واضحة لكل مدينة</title>", `<title>${title}</title>`)
    .replace('<link rel="canonical" href="https://imadtbn.github.io/meteo-dz/" />', `<link rel="canonical" href="${canonical}" />`)
    .replace('<meta name="description" content="الطقس الجزائري: قراءة حالية وتوقعات محلية للمدن الجزائرية، مع وقت تحديث واضح ومؤشرات بحرية للسواحل." />', `<meta name="description" content="${description}" />`)
    .replace('<meta property="og:title" content="الطقس الجزائري — مرصد الأطلس" />', `<meta property="og:title" content="${title}" />`)
    .replace('<meta property="og:description" content="قراءة طقس واضحة لكل مدينة جزائرية، قابلة للمشاركة." />', `<meta property="og:description" content="${description}" />`)
    .replace("<body>", `<body>${noscript}<script type="application/ld+json">${structuredData}</script>`);
  const output = path.join(dist, "weather", city.slug);
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, "index.html"), page);
}

const landingPages = [
  ["wilayas", "ولايات الجزائر الـ58", "دليل جميع الولايات الجزائرية مع روابط طقس ثابتة."],
  ["arab-capitals", "طقس عواصم الدول العربية", "دليل طقس عواصم الدول العربية بإحداثيات واضحة."],
  ["world-search", "البحث العالمي عن الطقس", "ابحث عن أي مدينة أو دولة وافتح قراءة الطقس العالمية."],
  ["weather-map", "خريطة الطقس التفاعلية", "خريطة تفاعلية لنقاط الطقس في الجزائر والعالم العربي."],
];
for (const [slug, title, description] of landingPages) {
  const canonical = `${siteRoot}${slug}/`;
  const structuredData = JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: title, description, url: canonical, inLanguage: "ar-DZ" });
  const page = template.replace("<title>الطقس الجزائري | قراءة واضحة لكل مدينة</title>", `<title>${title} | الطقس الجزائري</title>`).replace('<link rel="canonical" href="https://imadtbn.github.io/meteo-dz/" />', `<link rel="canonical" href="${canonical}" />`).replace('<meta name="description" content="الطقس الجزائري: قراءة حالية وتوقعات محلية للمدن الجزائرية، مع وقت تحديث واضح ومؤشرات بحرية للسواحل." />', `<meta name="description" content="${description}" />`).replace("<body>", `<body><noscript><main dir="rtl"><h1>${title}</h1><p>${description}</p><p>فعّل JavaScript لعرض الصفحة التفاعلية.</p></main></noscript><script type="application/ld+json">${structuredData}</script>`);
  const output = path.join(dist, slug);
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, "index.html"), page);
}

const urls = [
  `<url><loc>${siteRoot}</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>`,
  ...landingPages.map(([slug]) => `<url><loc>${escapeXml(`${siteRoot}${slug}/`)}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`),
  ...cities.map((city) => `<url><loc>${escapeXml(`${siteRoot}weather/${city.slug}/`)}</loc><changefreq>hourly</changefreq><priority>${city.coastal ? "0.9" : "0.8"}</priority></url>`),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${urls.join("\n  ")}\n</urlset>\n`;
await writeFile(path.join(dist, "sitemap.xml"), sitemap);
await writeFile(path.join(sourcePublic, "sitemap.xml"), sitemap);
const basePath = process.env.DEPLOY_TARGET === "github" ? "/meteo-dz/" : "/";
const manifest = { name: "الطقس العربي — مرصد الأطلس", short_name: "الطقس العربي", start_url: basePath, scope: basePath, display: "standalone", dir: "rtl", lang: "ar", theme_color: "#0C5B8C", background_color: "#F4F0E7", icons: [{ src: "/manus-storage/atlas-mark_78817ed0.png", sizes: "192x192", type: "image/png" }, { src: "/manus-storage/atlas-mark_78817ed0.png", sizes: "512x512", type: "image/png" }] };
await writeFile(path.join(dist, "manifest.webmanifest"), JSON.stringify(manifest, null, 2));
await writeFile(path.join(dist, "robots.txt"), `User-agent: *\nAllow: ${basePath}\nDisallow: ${basePath}api/\nSitemap: ${siteRoot}sitemap.xml\n`);

console.log(`Generated ${cities.length} static city pages, ${landingPages.length} landing pages, and ${urls.length} sitemap URLs.`);
