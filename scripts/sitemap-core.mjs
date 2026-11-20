/**
 * Canonical URLs shared by checked-in and deployed sitemaps.
 * Dynamic coordinate queries are deliberately excluded.
 */
export const INDEXABLE_LANDING_ROUTES = Object.freeze([
  "weather", "wilayas", "arab-capitals", "world-capitals", "world-search",
  "weather-map", "climate-observatory", "agriculture-weather", "alerts",
]);

const VALID_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function sitemapUrls(siteRoot, places) {
  const root = new URL(siteRoot);
  if (root.protocol !== "https:" || root.search || root.hash) {
    throw new Error("Sitemap base URL must be an absolute HTTPS URL");
  }
  const base = root.href.endsWith("/") ? root.href : root.href + "/";
  if (!Array.isArray(places) || !places.length) throw new Error("No geographic place records found");
  const paths = ["", ...INDEXABLE_LANDING_ROUTES];
  for (const place of places) {
    if (!VALID_SLUG.test(place?.slug ?? "") || !VALID_SLUG.test(place?.canonicalPath?.split("/").at(-1) ?? "")) {
      throw new Error("Invalid place route: " + String(place?.canonicalPath));
    }
    paths.push(place.canonicalPath);
  }
  const urls = paths.map((route) => new URL(route ? route.replace(/^\/+|\/+$/g, "") + "/" : "", base).href);
  if (new Set(urls).size !== urls.length) throw new Error("Duplicate canonical URLs in sitemap");
  if (urls.some((url) => !url.startsWith(base) || url.includes("?") || url.includes("#"))) {
    throw new Error("Noncanonical sitemap URL detected");
  }
  return urls;
}

export function buildSitemap(siteRoot, places) {
  const urls = sitemapUrls(siteRoot, places);
  const body = urls.map((url) => "  <url><loc>" + url.replaceAll("&", "&amp;") + "</loc></url>").join("\n");
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + body + "\n</urlset>\n";
}

const escapeHtml = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

export function buildSitemapHtml(siteRoot, places) {
  const wilayas = places.filter((place) => place.kind === "wilaya");
  const communes = places.filter((place) => place.kind === "commune");
  const links = (items) => items.map((place) =>
    '<li><a href="' + siteRoot + place.canonicalPath + '/">' + escapeHtml(place.displayName) + '</a></li>'
  ).join("\n");
  const wilayaSections = wilayas.map((wilaya) => {
    const children = communes.filter((commune) => commune.wilayaId === String(wilaya.slug === "" ? "" : commune.wilayaId) && commune.wilayaSlug === wilaya.slug);
    return '<section><h3><a href="' + siteRoot + wilaya.canonicalPath + '/">' + escapeHtml(wilaya.displayName) + '</a> <small>(' + children.length + ' بلدية)</small></h3><ul>' + links(children) + '</ul></section>';
  }).join("\n");
  const otherPlaces = places.filter((place) => place.kind === "arab-capital" || place.kind === "world-capital");
  return '<!doctype html>\n<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>خريطة الموقع | مرصد الأطلس للطقس</title><meta name="description" content="خريطة صفحات الطقس في الولايات والبلديات الجزائرية والعواصم العربية والعالمية."><link rel="canonical" href="' + siteRoot + 'sitemap.html"><style>body{margin:0;background:#f5f0e6;color:#132a38;font-family:Tahoma,Arial,sans-serif;line-height:1.8}main{max-width:1100px;margin:auto;padding:2rem 1rem}h1,h2,h3{color:#0c5b8c}section{margin:1rem 0;padding:1rem;border:1px solid #d4ddd9;border-radius:12px;background:#fffdf8}ul{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.35rem 1rem;padding-right:1.2rem}a{color:#0c5b8c;text-decoration:none}a:hover{text-decoration:underline}small{color:#60727a}@media(max-width:520px){ul{grid-template-columns:repeat(2,minmax(0,1fr))}}</style></head><body><main><h1>خريطة موقع أحوال الطقس</h1><p>تضم الخريطة ' + communes.length + ' بلدية جزائرية و' + wilayas.length + ' ولاية، إضافة إلى العواصم العربية والعالمية.</p><p><a href="' + siteRoot + '">الرئيسية</a> · <a href="' + siteRoot + 'wilayas/">دليل الولايات</a> · <a href="' + siteRoot + 'world-search/">البحث العالمي</a></p><h2>الولايات والبلديات الجزائرية</h2>' + wilayaSections + '<h2>العواصم العربية والعالمية</h2><ul>' + links(otherPlaces) + '</ul></main></body></html>\n';
}
