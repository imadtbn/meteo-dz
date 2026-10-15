/** Style reminder: Atlas Observatory turns every wilaya route into an indexable, source-aware weather landing page. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import cities from "../client/src/data/cities.json" with { type: "json" };
import { buildSitemap, sitemapUrls } from "./sitemap-core.mjs";

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
  // Parameter-based weather results have no useful indexable content without coordinates.
  // The route still works for visitors arriving from search and map links.
  const indexablePage = slug !== "global-weather";
  const safePage = indexablePage ? page : page.replace("</head>", '<meta name="robots" content="noindex,follow" /></head>');
  const output = path.join(dist, slug);
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, "index.html"), safePage);
}

await writeFile(path.join(dist, "sitemap.xml"), buildSitemap(siteRoot, cities));
const basePath = process.env.DEPLOY_TARGET === "github" ? "/meteo-dz/" : "/";
const manifest = { name: "الطقس الجزائري — مرصد الأطلس", short_name: "الطقس الجزائري", description: "نشرات وتوقعات الطقس لجميع ولايات الجزائر والعواصم العربية", id: basePath, start_url: basePath, scope: basePath, display: "standalone", dir: "rtl", lang: "ar", theme_color: "#0C5B8C", background_color: "#F5F0E6", icons: [{ src: `${basePath}icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any maskable" }, { src: `${basePath}icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any maskable" }, { src: `${basePath}favicon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" }], shortcuts: [{ name: "الولايات الجزائرية", short_name: "الولايات", url: `${basePath}wilayas/` }, { name: "البحث العالمي", short_name: "البحث", url: `${basePath}world-search/` }, { name: "خريطة الطقس", short_name: "الخريطة", url: `${basePath}weather-map/` }] };
await writeFile(path.join(dist, "manifest.webmanifest"), JSON.stringify(manifest, null, 2));
await writeFile(path.join(dist, "robots.txt"), `User-agent: *\nAllow: ${basePath}\nDisallow: ${basePath}api/\nSitemap: ${siteRoot}sitemap.xml\n`);

console.log(`Generated ${cities.length} static city pages, ${landingPages.length} landing pages, and ${sitemapUrls(siteRoot, cities).length} indexable sitemap URLs.`);
