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
