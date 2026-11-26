/** Prerender indexable landing pages for every unique geographic place. */
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildPlaceCatalog } from "./place-catalog.mjs";
import { buildSitemap, buildSitemapHtml, sitemapUrls } from "./sitemap-core.mjs";

const dist = path.resolve("dist/public");
await rm(path.join(dist, "__manus__"), { recursive: true, force: true });
const template = await readFile(path.join(dist, "index.html"), "utf8");
const siteUrl = process.env.SITE_URL || (process.env.DEPLOY_TARGET === "github" ? "https://imadtbn.github.io/meteo-dz" : "https://meteo-dz-modernized.manus.space");
const siteRoot = `${siteUrl.replace(/\/$/, "")}/`;
const places = buildPlaceCatalog();
const escapeHtml = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const escapeXml = (value) => escapeHtml(value);
const writtenRedirects = new Set();
async function writeLegacyRedirect(relativePath, canonical, displayName) {
  if (!relativePath || relativePath === canonical.replace(siteRoot, "").replace(/\/$/, "")) return;
  if (writtenRedirects.has(relativePath)) throw new Error("Duplicate legacy redirect path: " + relativePath);
  writtenRedirects.add(relativePath);
  const output = path.join(dist, relativePath);
  const redirectPage = '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>تم تحديث رابط ' + escapeHtml(displayName) + '</title><link rel="canonical" href="' + escapeHtml(canonical) + '"><meta name="robots" content="noindex,follow"><meta http-equiv="refresh" content="0;url=' + escapeHtml(canonical) + '"><script>window.location.replace(' + JSON.stringify(canonical) + ');</script></head><body><main><h1>تم تحديث الرابط</h1><p>الرابط الجديد لـ ' + escapeHtml(displayName) + ':</p><p><a href="' + escapeHtml(canonical) + '">' + escapeHtml(canonical) + '</a></p></main></body></html>';
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, "index.html"), redirectPage);
}


function setSeo(html, { title, description, canonical, image = siteRoot + "social-preview.png" }) {
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
await mkdir(path.join(dist, "data"), { recursive: true });
await cp(path.resolve("data/global-search-index.json"), path.join(dist, "data/global-search-index.json"), { force: true });
await cp(path.resolve("client/public/data/communes.json"), path.join(dist, "data/communes.json"), { force: true });

for (const place of places) {
  const canonical = siteRoot + place.canonicalPath + "/";
  const title = place.kind === "commune"
    ? "طقس بلدية " + place.displayName + " اليوم في ولاية " + place.region + " | مرصد الأطلس"
    : "طقس " + place.displayName + " اليوم | " + place.country + " | مرصد الأطلس";
  const description = place.kind === "commune"
    ? "تعرف على حالة الطقس في بلدية " + place.displayName + " بولاية " + place.region + "، درجات الحرارة الحالية وتوقعات الأيام القادمة والرياح والأمطار وفق إحداثيات البلدية. Weather in " + place.englishName + "."
    : "حالة الطقس في " + place.displayName + "، " + place.country + "، مع توقعات الأيام القادمة وبيانات الموقع الجغرافي. " + (place.englishName ? "Weather in " + place.englishName + "." : "");
  const image = place.image ? siteRoot + place.image : siteRoot + "social-preview.png";
  const relatedCandidates = places.filter((candidate) => {
    if (candidate.slug === place.slug) return false;
    if (place.kind === "commune") return candidate.kind === "commune" && candidate.wilayaId === place.wilayaId;
    if (place.kind === "wilaya") return candidate.kind === "wilaya" && Boolean(place.region) && candidate.region === place.region;
    if (place.kind === "world-capital") return candidate.kind === "world-capital" && Boolean(place.continent) && candidate.continent === place.continent;
    return candidate.kind === "arab-capital";
  });
  const relatedPlaces = (relatedCandidates.length ? relatedCandidates : places.filter((candidate) => candidate.slug !== place.slug && candidate.kind === place.kind)).slice(0, 6);
  const directoryPath = place.kind === "commune" ? "communes/" : place.kind === "wilaya" ? "wilayas/" : place.kind === "arab-capital" ? "arab-capitals/" : "world-capitals/";
  const directoryLabel = place.kind === "commune" ? "دليل البلديات" : place.kind === "wilaya" ? "دليل الولايات" : place.kind === "arab-capital" ? "العواصم العربية" : "عواصم العالم";
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
    "@type": "WebPage",
    "@id": canonical + "#webpage",
    name: title,
    description,
    url: canonical,
    inLanguage: "ar-DZ",
    isPartOf: { "@type": "WebSite", name: "مرصد الأطلس للطقس", url: siteRoot },
    primaryImageOfPage: place.image ? { "@type": "ImageObject", contentUrl: image, caption: "صورة " + place.displayName } : undefined,
    keywords: [place.displayName, place.englishName, "الطقس في " + place.displayName, "حالة الطقس " + place.displayName, "weather " + place.englishName, "forecast " + place.englishName].filter(Boolean).join(", "),
    breadcrumb: { "@id": canonical + "#breadcrumb" },
    mainEntity: { "@id": canonical + "#place" },
    about: {
      "@type": "Place",
      "@id": canonical + "#place",
      name: place.displayName,
      alternateName: place.englishName || undefined,
      address: { "@type": "PostalAddress", addressCountry: place.countryCode || undefined, addressLocality: place.kind === "commune" ? place.displayName : place.country, addressRegion: place.kind === "commune" ? place.region : undefined },
      geo: { "@type": "GeoCoordinates", latitude: place.latitude, longitude: place.longitude },
    },
      },
      {
        "@type": "BreadcrumbList",
        "@id": canonical + "#breadcrumb",
        itemListElement: place.kind === "commune" ? [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: siteRoot },
          { "@type": "ListItem", position: 2, name: "دليل البلديات", item: siteRoot + "communes/" },
          { "@type": "ListItem", position: 3, name: "ولاية " + place.region, item: siteRoot + "wilayas/" + place.wilayaSlug + "/" },
          { "@type": "ListItem", position: 4, name: place.displayName, item: canonical },
        ] : [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: siteRoot },
          { "@type": "ListItem", position: 2, name: place.kind === "wilaya" ? "ولايات الجزائر" : place.kind === "arab-capital" ? "العواصم العربية" : "عواصم العالم", item: siteRoot + directoryPath },
          { "@type": "ListItem", position: 3, name: place.displayName, item: canonical },
        ],
      },
    ],
  });
  const photo = place.image ? `<img src="${escapeHtml(siteRoot + place.image)}" alt="صورة ${escapeHtml(place.displayName)}" width="960" height="540" loading="eager" fetchpriority="high">` : "";
  const liveUrl = siteRoot + "global-weather/?lat=" + place.latitude + "&lon=" + place.longitude + "&name=" + encodeURIComponent(place.displayName);
  const communeLocations = place.kind === "commune" ? place.locations.map((location, index) => {
    const locationName = location.displayName || place.displayName;
    const locationUrl = siteRoot + "global-weather/?lat=" + location.latitude + "&lon=" + location.longitude + "&name=" + encodeURIComponent(locationName);
    const postalText = location.postCode ? " · الرمز البريدي " + location.postCode : "";
    return '<li data-source-id="' + escapeHtml(location.id) + '"><h3>الموقع ' + (index + 1) + ': ' + escapeHtml(locationName) + '</h3><p>' + escapeHtml(location.englishName || "") + postalText + ' · الإحداثيات: ' + location.latitude + ', ' + location.longitude + '</p><a href="' + escapeHtml(locationUrl) + '">عرض الطقس والتوقعات لهذا الموقع</a></li>';
  }).join("") : "";
  const communeLocationsSection = communeLocations
    ? '<section aria-labelledby="commune-weather-sites"><h2 id="commune-weather-sites">مواقع الطقس داخل البلدية</h2><p>تحتفظ هذه الصفحة ببيانات كل موقع جغرافي بصورة مستقلة، ويمكن فتح نشرة الطقس لكل موقع على حدة.</p><ul>' + communeLocations + '</ul></section>'
    : "";
  const liveWeatherLink = place.kind === "commune" ? communeLocationsSection
    : '<p><a href="' + escapeHtml(liveUrl) + '">عرض النشرة الجوية والتوقعات المباشرة</a></p>';
  const relatedLinks = relatedPlaces.map((candidate) =>
    '<li><a class="related-place-link" href="' + siteRoot + candidate.canonicalPath + '/">' + escapeHtml(candidate.displayName) + '</a></li>',
  ).join("");
  const regionText = place.region ? " وتقع ضمن " + place.region : "";
  const parentLink = place.kind === "commune" ? ' · <a href="' + siteRoot + "wilayas/" + place.wilayaSlug + '/">ولاية ' + escapeHtml(place.region) + "</a>" : "";
  const relatedHeading = place.kind === "commune" ? "بلديات أخرى في ولاية " + escapeHtml(place.region) : "مواقع ذات صلة";
  const relatedNav = place.kind === "commune"
    ? '<nav aria-label="' + relatedHeading + '"><strong>' + relatedHeading + "</strong><ul>" + relatedLinks + "</ul></nav>"
    : '<section aria-labelledby="related-places"><h2 id="related-places">' + relatedHeading + "</h2><ul>" + relatedLinks + "</ul></section>";
  const noscript = '<noscript><main dir="rtl" lang="ar"><nav aria-label="مسار التنقل"><a href="' + siteRoot + '">الرئيسية</a> / <a href="' + siteRoot + directoryPath + '">' + directoryLabel + '</a>' + parentLink + ' / ' + escapeHtml(place.displayName) + '</nav><article><h1>' + escapeHtml(title) + '</h1>' + photo + '<p>' + escapeHtml(description) + ' تقع ' + escapeHtml(place.displayName) + ' في ' + escapeHtml(place.country) + escapeHtml(regionText) + '، وإحداثياتها المرجعية ' + place.latitude + ' شمالاً/جنوباً و' + place.longitude + ' شرقاً/غرباً.</p><p>تعرض الصفحة المواقع الجغرافية المسجلة للبلدية وروابط مستقلة لقراءة الطقس والتوقعات وفق إحداثيات كل موقع، ويمكن استخدام الاسم العربي أو اللاتيني للعثور عليها.</p>' + liveWeatherLink + relatedNav + '<p><a href="' + siteRoot + 'world-search/">البحث العالمي عن مدينة أخرى</a> · <a href="' + siteRoot + 'weather-map/">استكشاف خريطة الطقس</a></p></article></main></noscript>';
  const page = setSeo(template, { title, description, canonical, image })
    .replace("<body>", '<body>' + noscript + '<script type="application/ld+json">' + structuredData + "</script>");
  const output = path.join(dist, place.canonicalPath);
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, "index.html"), page);

  // GitHub Pages cannot emit HTTP 301 rules. Keep old commune and wilaya paths as noindex HTML redirects.
  const legacyPaths = place.kind === "commune"
    ? (place.legacySlugs || []).map((slug) => "communes/" + slug)
    : place.kind === "wilaya" ? ["weather/" + place.slug] : [];
  for (const legacyPath of legacyPaths) {
    await writeLegacyRedirect(legacyPath, canonical, place.displayName);
  }
}

const landingPages = [
  ["weather", "دليل الطقس في الجزائر", "استعرض صفحات الطقس المستقلة لجميع الولايات الجزائرية."],
  ["wilayas", "ولايات الجزائر الـ69", "دليل جميع الولايات الجزائرية مع روابط طقس ثابتة."],
  ["communes", "دليل البلديات الجزائرية", "دليل بحث شامل لجميع البلديات الجزائرية مع صفحات طقس مستقلة لكل بلدية."],
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
  let landingContent = '<h1>' + escapeHtml(title) + '</h1><p>' + escapeHtml(description) + '</p>';
  if (slug === "arab-capitals") {
    const capitalLinks = places.filter((place) => place.kind === "arab-capital").map((place) =>
      '<li><a href="' + siteRoot + place.canonicalPath + '/">' + escapeHtml(place.displayName) + '</a> — ' + escapeHtml(place.country) + '</li>',
    ).join("");
    landingContent += '<section aria-labelledby="arab-capitals-list"><h2 id="arab-capitals-list">قائمة العواصم العربية الـ22</h2><p>اختر العاصمة لفتح صفحة مستقلة تتضمن الموقع الجغرافي ومعلومات الطقس والتوقعات.</p><ul>' + capitalLinks + '</ul></section>';
  } else if (slug === "world-search") {
    const featuredWorldCapitals = places.filter((place) => place.kind === "world-capital").slice(0, 15).map((place) =>
      '<li><a href="' + siteRoot + place.canonicalPath + '/">' + escapeHtml(place.displayName) + '</a> — ' + escapeHtml(place.country) + '</li>',
    ).join("");
    landingContent += '<section aria-labelledby="world-search-guide"><h2 id="world-search-guide">استكشف الطقس حسب المدينة والمنطقة</h2><p>تتيح أداة البحث العثور على المدن والدول بالاسم العربي أو اللاتيني، ثم فتح قراءة الطقس وفق الموقع الجغرافي. ويمكن الوصول مباشرة إلى الأدلة الجغرافية التالية:</p><ul><li><a href="' + siteRoot + 'world-capitals/">دليل عواصم العالم</a> — صفحات مستقلة لعواصم الدول</li><li><a href="' + siteRoot + 'arab-capitals/">دليل العواصم العربية</a> — 22 عاصمة عربية</li><li><a href="' + siteRoot + 'wilayas/">دليل الولايات الجزائرية</a> — 69 ولاية</li><li><a href="' + siteRoot + 'communes/">دليل البلديات الجزائرية</a> — صفحات مستقلة للبلديات</li></ul><h2>نماذج من المدن العالمية</h2><ul>' + featuredWorldCapitals + '</ul></section>';
  }
  const page = setSeo(template, { title: `${title} | مرصد الأطلس`, description, canonical })
    .replace("<body>", `<body><noscript><main dir="rtl">${landingContent}</main></noscript><script type="application/ld+json">${structuredData}</script>`);
  const indexablePage = !["global-weather", "favorites"].includes(slug);
  const safePage = indexablePage ? page : page.replace("</head>", '<meta name="robots" content="noindex,follow" /></head>');
  const output = path.join(dist, slug);
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, "index.html"), safePage);
}

await writeFile(path.join(dist, "sitemap.xml"), buildSitemap(siteRoot, places));
await writeFile(path.join(dist, "sitemap.html"), buildSitemapHtml(siteRoot, places));
const basePath = process.env.DEPLOY_TARGET === "github" ? "/meteo-dz/" : "/";
const manifest = { name: "الطقس الجزائري والعالمي — مرصد الأطلس", short_name: "مرصد الأطلس", description: "نشرات وتوقعات الطقس للولايات الجزائرية وعواصم العالم", id: basePath, start_url: basePath, scope: basePath, display: "standalone", dir: "rtl", lang: "ar", theme_color: "#0C5B8C", background_color: "#F5F0E6", icons: [{ src: `${basePath}icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any maskable" }, { src: `${basePath}icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any maskable" }, { src: `${basePath}favicon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" }], shortcuts: [{ name: "الولايات الجزائرية", short_name: "الولايات", url: `${basePath}wilayas/` }, { name: "البلديات الجزائرية", short_name: "البلديات", url: `${basePath}communes/` }, { name: "العواصم العالمية", short_name: "العواصم", url: `${basePath}world-capitals/` }, { name: "البحث العالمي", short_name: "البحث", url: `${basePath}world-search/` }, { name: "خريطة الطقس", short_name: "الخريطة", url: `${basePath}weather-map/` }] };
await writeFile(path.join(dist, "manifest.webmanifest"), JSON.stringify(manifest, null, 2));
await writeFile(path.join(dist, "robots.txt"), `User-agent: *\nAllow: ${basePath}\nDisallow: ${basePath}api/\nSitemap: ${siteRoot}sitemap.xml\n`);

console.log(`Generated ${places.length} unique place pages, ${landingPages.length} landing pages, copied city photography, and ${sitemapUrls(siteRoot, places).length} indexable sitemap URLs.`);
