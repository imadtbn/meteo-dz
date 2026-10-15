/** Style reminder: Atlas Observatory turns every wilaya route into an indexable, source-aware weather landing page. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import cities from "../client/src/data/cities.json" with { type: "json" };

const dist = path.resolve("dist/public");
const template = await readFile(path.join(dist, "index.html"), "utf8");
const siteUrl = process.env.SITE_URL || (process.env.DEPLOY_TARGET === "github" ? "https://imadtbn.github.io/meteo-dz" : "https://meteo-dz-modernized.manus.space");
const siteRoot = `${siteUrl.replace(/\/$/, "")}/`;
const escapeXml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
function setSeo(html, { title, description, canonical }) {
  const replaceMeta = (source, attr, key, value) => {
    const pattern = new RegExp('<meta ' + attr + '="' + key + '" content="[^"]*"\\s*/>');
    if (!pattern.test(source)) throw new Error("SEO tag missing: " + key);
    return source.replace(pattern, '<meta ' + attr + '="' + key + '" content="' + escapeXml(value) + '" />');
  };

  let result = html.replace(/<title>[^<]*<\/title>/, '<title>' + escapeXml(title) + '</title>');
  result = result.replace(/<link rel="canonical" href="[^"]*" \/>/, '<link rel="canonical" href="' + escapeXml(canonical) + '" />');
  for (const [attr, key, value] of [
    ["name", "description", description],
    ["property", "og:title", title],
    ["property", "og:description", description],
    ["property", "og:url", canonical],
    ["property", "og:image", siteRoot + "social-preview.png"],
    ["name", "twitter:title", title],
    ["name", "twitter:description", description],
    ["name", "twitter:image", siteRoot + "social-preview.png"],
  ]) result = replaceMeta(result, attr, key, value);
  return result;
}

await writeFile(path.join(dist, "index.html"), setSeo(template, {
  title: "الطقس الجزائري — مرصد الأطلس",
  description: "حالة الطقس وتوقعات الأيام القادمة في ولايات الجزائر ومدن العالم، مع خرائط تفاعلية.",
  canonical: siteRoot,
}));

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
  const page = setSeo(template, { title, description, canonical })
    .replace("<body>", `<body>${noscript}<script type="application/ld+json">${structuredData}</script>`);
  const output = path.join(dist, "weather", city.slug);
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, "index.html"), page);
}

const landingPages = [
  ["wilayas", "ولايات الجزائر الـ58", "دليل جميع الولايات الجزائرية مع روابط طقس ثابتة."],
  ["arab-capitals", "طقس عواصم الدول العربية", "دليل طقس عواصم الدول العربية بإحداثيات واضحة."],
  ["world-search", "البحث العالمي عن الطقس", "ابحث عن أي مدينة أو دولة وافتح قراءة الطقس العالمية."],
  ["global-weather", "قراءة الطقس العالمية", "صفحة الطقس العالمي المعتمدة على إحداثيات الموقع المختار."],
  ["weather-map", "خريطة الطقس التفاعلية", "خريطة تفاعلية لنقاط الطقس في الجزائر والعالم العربي."],
];
for (const [slug, title, description] of landingPages) {
  const canonical = `${siteRoot}${slug}/`;
  const structuredData = JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: title, description, url: canonical, inLanguage: "ar-DZ" });
  const page = setSeo(template, { title: `${title} | الطقس الجزائري`, description, canonical })
    .replace("<body>", `<body><noscript><main dir="rtl"><h1>${title}</h1><p>${description}</p><p>فعّل JavaScript لعرض الصفحة التفاعلية.</p></main></noscript><script type="application/ld+json">${structuredData}</script>`);
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
const basePath = process.env.DEPLOY_TARGET === "github" ? "/meteo-dz/" : "/";
const manifest = { name: "الطقس الجزائري — مرصد الأطلس", short_name: "الطقس الجزائري", description: "نشرات وتوقعات الطقس لجميع ولايات الجزائر والعواصم العربية", id: basePath, start_url: basePath, scope: basePath, display: "standalone", dir: "rtl", lang: "ar", theme_color: "#0C5B8C", background_color: "#F5F0E6", icons: [{ src: `${basePath}icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any maskable" }, { src: `${basePath}icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any maskable" }, { src: `${basePath}favicon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" }], shortcuts: [{ name: "الولايات الجزائرية", short_name: "الولايات", url: `${basePath}wilayas/` }, { name: "البحث العالمي", short_name: "البحث", url: `${basePath}world-search/` }, { name: "خريطة الطقس", short_name: "الخريطة", url: `${basePath}weather-map/` }] };
await writeFile(path.join(dist, "manifest.webmanifest"), JSON.stringify(manifest, null, 2));
await writeFile(path.join(dist, "robots.txt"), `User-agent: *\nAllow: ${basePath}\nDisallow: ${basePath}api/\nSitemap: ${siteRoot}sitemap.xml\n`);

console.log(`Generated ${cities.length} static city pages, ${landingPages.length} landing pages, and ${urls.length} sitemap URLs.`);
