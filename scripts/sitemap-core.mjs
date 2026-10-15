/**
 * Canonical public URLs shared by checked-in and deployed sitemaps.
 * Coordinates-based /global-weather?lat=... routes are deliberately excluded:
 * they have no standalone place until coordinates are supplied.
 * Do not add timestamps merely because a new build was deployed.
 */
export const INDEXABLE_LANDING_ROUTES = Object.freeze([
  "wilayas",
  "arab-capitals",
  "world-search",
  "weather-map",
]);

const VALID_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function sitemapUrls(siteRoot, cities) {
  const root = new URL(siteRoot);
  if (root.protocol !== "https:" || root.search || root.hash) {
    throw new Error("Sitemap base URL must be an absolute HTTPS URL");
  }
  const base = root.href.endsWith("/") ? root.href : root.href + "/";
  const paths = ["", ...INDEXABLE_LANDING_ROUTES];

  if (!Array.isArray(cities) || !cities.length) throw new Error("No city records found");

  for (const city of cities) {
    if (!VALID_SLUG.test(city?.slug ?? "")) {
      throw new Error("Invalid city slug: " + String(city?.slug));
    }
    paths.push("weather/" + city.slug);
  }
  const urls = paths.map((path) => new URL(path ? path + "/" : "", base).href);
  if (new Set(urls).size !== urls.length) throw new Error("Duplicate canonical URLs in sitemap");
  if (urls.some((url) => !url.startsWith(base) || url.includes("?") || url.includes("#"))) {
    throw new Error("Noncanonical sitemap URL detected");
  }
  return urls;
}

export function buildSitemap(siteRoot, cities) {
  const urls = sitemapUrls(siteRoot, cities);
  const body = urls.map((url) => "  <url><loc>" + url.replaceAll("&", "&amp;") + "</loc></url>").join("\n");
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + body + "\n</urlset>\n";
}
