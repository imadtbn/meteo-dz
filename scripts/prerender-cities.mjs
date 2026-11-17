/** Prerender indexable landing pages for every unique geographic place. */
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildPlaceCatalog } from "./place-catalog.mjs";
import { buildSitemap, sitemapUrls } from "./sitemap-core.mjs";

const dist = path.resolve("dist/public");
await rm(path.join(dist, "__manus__"), { recursive: true, force: true });
const template = await readFile(path.join(dist, "index.html"), "utf8");
const siteUrl = process.env.SITE_URL || (process.env.DEPLOY_TARGET === "github" ? "https://imadtbn.github.io/meteo-dz" : "https://meteo-dz-modernized.manus.space");
const siteRoot = `${siteUrl.replace(/\/$/, "")}/`;
const places = buildPlaceCatalog();
const escapeHtml = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const escapeXml = (value) => escapeHtml(value);

function setSeo(html, { title, description, canonical, image = siteRoot + "social-preview.png" }) {
  const replaceMeta = (source, attr, key, value) => {
    const pattern = new RegExp('<meta ' + attr + '="' + key + '" content="[^"]*"\\s*/>');
    if (!pattern.test(source)) throw new Error("SEO tag missing: " + key);
    return source.replace(pattern, '<meta ' + attr + '="' + key + '" content="' + escapeXml(value) + '" />');
  };
  let result = html.replace(/<title>[^<]*<\\/title>/, '<title>' + escapeXml(title) + '</title>');
  result = result.replace(/<link rel="canonical" href="[^"]*" \\/>/, '<link rel="canonical" href="' + escapeXml(canonical) + '" />');
  for (const [attr, key, value] of [
    ["name", "description", description],
    ["property", "og:title", title],
    ["property", "og:description", description],
    ["property", "og:url", canonical],
    ["property", "og:image", image],
    ["name", "twitter:title", title],
    ["name", "twitter:description", description],
    ["name", "twitter:image", image],
  ]) result = replaceMeta(result, attr, key, value);
  return result;
}

await writeFile(path.join(dist, "index.html"), setSeo(template, {
  title: "الطقس الجزائري والعالمي — مرصد الأطلس",
  description: "حالة الطقس وتوقعات الأيام القادمة في ولايات الجزائر وعواصم الدول العربية والعالمية.",
  canonical: siteRoot,
}));

// The repository keeps original city photography outside Vite's client/public directory.
await cp(path.resolve("images"), path.join(dist, "images"), { recursive: true, force: true });

for (const place of places) {
  const canonical = siteRoot + place.canonicalPath + "/";
  const title = `طقس ${place.displayName} اليوم | ${place.country} | مرصد الأطلس`;
  const description = `حالة الطقس في ${place.displayName}، ${place.country}، مع توقعات الأيام القادمة وبيانات الموقع الجغرافي. ${place.englishName ? "Weather in " + place.englishName + "." : ""}`;
  const image = place.image ? siteRoot + place.image : siteRoot + "social-preview.png";
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: canonical,
    inLanguage: "ar-DZ",
    isPartOf: { "@type": "WebSite", name: "مرصد الأطلس للطقس", url: siteRoot },
    primaryImageOfPage: place.image ? { "@type": "ImageObject", contentUrl: image } : undefined,
    about: {
      "@type": "Place",
      name: place.displayName,
      alternateName: place.englishName || undefined,
      address: { "@type": "PostalAddress", addressCountry: place.countryCode || undefined, addressLocality: place.country },
      geo: { "@type": "GeoCoordinates", latitude: place.latitude, longitude: place.longitude },
    },
  });
  const photo = place.image ? `<img src="${escapeHtml(siteRoot + place.image)}" alt="صورة ${escapeHtml(place.displayName)}" width="960" height="540" loading="eager" fetchpriority="high">` : "";
  const liveUrl = siteRoot + "global-weather/?lat=" + place.latitude + "&lon=" + place.longitude + "&name=" + encodeURIComponent(place.displayName);
  const noscript = `<noscript><main dir="rtl" lang="ar"><nav><a href="${siteRoot}">الرئيسية</a> / <a href="${siteRoot}${place.kind === "wilaya" ? "wilayas/" : place.kind === "arab-capital" ? "arab-capitals/" : "world-capitals/"}">دليل المواقع</a></nav><article><h1>${escapeHtml(title)}</h1>${photo}<p>${escapeHtml(description)}</p><p>الإحداثيات الجغرافية: ${place.latitude}, ${place.longitude}</p><p><a href="${escapeHtml(liveUrl)}">عرض النشرة الجوية والتوقعات المباشرة</a></p></article></main></noscript>`;
  const page = setSeo(template, { title, description, canonical, image })
    .replace("<body>", `<body>${noscript}<script type="application/ld+json">${structuredData}</script>`);
  const output = path.join(dist, place.canonicalPath);
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, "index.html"), page);
}

const landingPages = [
  ["weather", "دليل الطقس في الجزائر", "استعرض صفحات الطقس المستقلة لجميع الولايات الجزائرية."],
  ["wilayas", "ولايات الجزائر الـ69", "دليل جميع الولايات الجزائرية مع روابط طقس ثابتة."],
  ["arab-capitals", "طقس عواصم الدول العربية", "دليل طقس عواصم الدول العربية وصفحات مستقلة لكل عاصمة."],
  ["world-capitals", "طقس عواصم العالم", "دليل الطقس في عواصم الدول حول العالم مع صفحات جغرافية مستقلة."],
  ["world-search", "البحث العالمي عن الطقس", "ابحث عن أي مدينة أو دولة وافتح قراءة الطقس العالمية."],
  ["global-weather", "قراءة الطقس العالمية", "صفحة الطقس العالمي المعتمدة على إحداثيات الموقع المختار."],
  ["weather-map", "خريطة الطقس التفاعلية", "خريطة تفاعلية لنقاط الطقس في الجزائر والعالم."],
  ["alerts", "الإنذارات الجوية الرسمية في الجزائر", "بوابة اليقظة الجوية والنشرات الخاصة ومصادر الإنذار الرسمية."],
  ["favorites", "مدن الطقس المفضلة", "صفحة محلية لحفظ الولايات والمدن المفضلة."],
  ["climate-observatory", "المرصد المناخي الجزائري", "سجل مناخي يومي للولايات الجزائرية من بيانات NASA POWER."],
  ["agriculture-weather", "مؤشرات الطقس الزراعي", "مؤشرات الحرارة المتراكمة والأمطار والصقيع حسب الولاية."]
];
for (const [slug, title, description] of landingPages) {
  const canonical = siteRoot + slug + "/";
  const structuredData = JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: title, description, url: canonical, inLanguage: "ar-DZ" });
  const page = setSeo(template, { title: `${title} | مرصد الأطلس`, description, canonical })
    .replace("<body>", `<body><noscript><main dir="rtl"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></main></noscript><script type="application/ld+json">${structuredData}</script>`);
  const indexablePage = !["global-weather", "favorites"].includes(slug);
  const safePage = indexablePage ? page : page.replace("</head>", '<meta name="robots" content="noindex,follow" /></head>');
  const output = path.join(dist, slug);
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, "index.html"), safePage);
}

await writeFile(path.join(dist, "sitemap.xml"), buildSitemap(siteRoot, places));
const basePath = process.env.DEPLOY_TARGET === "github" ? "/meteo-dz/" : "/";
const manifest = { name: "الطقس الجزائري والعالمي — مرصد الأطلس", short_name: "مرصد الأطلس", description: "نشرات وتوقعات الطقس للولايات الجزائرية وعواصم العالم", id: basePath, start_url: basePath, scope: basePath, display: "standalone", dir: "rtl", lang: "ar", theme_color: "#0C5B8C", background_color: "#F5F0E6", icons: [{ src: `${basePath}icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any maskable" }, { src: `${basePath}icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any maskable" }, { src: `${basePath}favicon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" }], shortcuts: [{ name: "الولايات الجزائرية", short_name: "الولايات", url: `${basePath}wilayas/` }, { name: "العواصم العالمية", short_name: "العواصم", url: `${basePath}world-capitals/` }, { name: "البحث العالمي", short_name: "البحث", url: `${basePath}world-search/` }, { name: "خريطة الطقس", short_name: "الخريطة", url: `${basePath}weather-map/` }] };
await writeFile(path.join(dist, "manifest.webmanifest"), JSON.stringify(manifest, null, 2));
await writeFile(path.join(dist, "robots.txt"), `User-agent: *\\nAllow: ${basePath}\\nDisallow: ${basePath}api/\\nSitemap: ${siteRoot}sitemap.xml\\n`);

console.log(`Generated ${places.length} unique place pages, ${landingPages.length} landing pages, copied city photography, and ${sitemapUrls(siteRoot, places).length} indexable sitemap URLs.`);
