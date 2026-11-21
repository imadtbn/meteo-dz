import assert from "node:assert/strict";

const siteUrl = process.env.SITE_URL || "https://imadtbn.github.io/meteo-dz/";
const site = new URL(siteUrl);
assert.equal(site.protocol, "https:", "Deployed site must use HTTPS");
const base = site.href.endsWith("/") ? site.href : site.href + "/";

async function fetchPage(url) {
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
    headers: { "user-agent": "meteo-dz-deployment-verifier/1.0" },
  });
  assert.equal(response.status, 200, url + " returned HTTP " + response.status);
  assert.equal(response.url, url, "Unexpected response URL: " + url);
  return response;
}

const sitemapUrl = new URL("sitemap.xml", base).href;
const sitemapResponse = await fetchPage(sitemapUrl);
const sitemapXml = await sitemapResponse.text();
assert.match(sitemapXml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
assert.match(sitemapXml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);

const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert.ok(urls.length >= 250, "Unexpectedly small deployed sitemap: " + urls.length);
assert.equal(new Set(urls).size, urls.length, "Deployed sitemap contains duplicate URLs");
assert.ok(urls.every((url) => url.startsWith(base) && !/[?#]/.test(url)), "Sitemap contains a URL outside the canonical site path");
assert.ok(urls.includes(base), "Homepage is missing from sitemap");

const robotsUrl = new URL("robots.txt", base).href;
const robotsResponse = await fetchPage(robotsUrl);
const robots = await robotsResponse.text();
assert.match(robots, /^User-agent:\s*\*/m);
assert.ok(robots.includes("Sitemap: " + sitemapUrl), "robots.txt does not reference the deployed sitemap");

const requiredRoutes = [
  "weather/",
  "wilayas/",
  "communes/",
  "arab-capitals/",
  "world-capitals/",
  "world-search/",
  "weather-map/",
  "climate-observatory/",
  "agriculture-weather/",
  "alerts/",
];
for (const route of requiredRoutes) {
  assert.ok(urls.includes(new URL(route, base).href), "Required directory missing from sitemap: " + route);
}

const geographicUrls = urls.filter((url) => /\/(weather|communes|arab-capitals|world-capitals)\/[^/]+\/$/.test(new URL(url).pathname));
const communeUrls = geographicUrls.filter((url) => new URL(url).pathname.includes("/communes/"));
assert.ok(communeUrls.length >= 1700, "Unexpectedly small commune page set: " + communeUrls.length);
const legacyRedirects = new Map([
  [base + "communes/inoughissen-127/", base + "communes/inoughissen/"],
  [base + "communes/el-adjiba-327/", base + "communes/el-adjiba/"],
]);
const representative = [
  ...requiredRoutes.map((route) => new URL(route, base).href),
  ...legacyRedirects.keys(),
  ...geographicUrls.filter((url) => url.includes("/weather/")).slice(0, 3),
  ...communeUrls.slice(0, 3),
  ...geographicUrls.filter((url) => url.includes("/arab-capitals/")).slice(0, 2),
  ...geographicUrls.filter((url) => url.includes("/world-capitals/")).slice(0, 3),
];
assert.ok(geographicUrls.length >= 200, "Geographic pages missing from sitemap");

for (const url of [...new Set([base, ...representative])]) {
  const response = await fetchPage(url);
  const html = await response.text();
  assert.match(html, /<title>[^<]+<\/title>/, "Missing title: " + url);
  if (url === base) {
    assert.ok(html.includes("GTM-K3DQR9RT"), "Configured GTM container missing from the live homepage");
    assert.ok(html.includes("gtm.start") && html.includes("gtm.js"), "Live homepage GTM bootstrap event is missing");
    assert.ok(html.includes("googletagmanager.com/ns.html?id=GTM-K3DQR9RT"), "Live homepage GTM noscript fallback is missing");
  }
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"\s*\/?\s*>/i);
  assert.ok(canonical, "Missing canonical: " + url);
  if (legacyRedirects.has(url)) {
    const target = legacyRedirects.get(url);
    assert.equal(canonical[1], target, "Legacy commune canonical target mismatch: " + url);
    assert.match(html, /http-equiv="refresh"/, "Legacy commune URL must contain a meta refresh: " + url);
    assert.ok(html.includes("window.location.replace"), "Legacy commune URL must contain a client redirect: " + url);
    assert.match(html, /name="robots" content="noindex,follow"/, "Legacy commune URL must be noindex: " + url);
    continue;
  }
  assert.equal(canonical[1], url, "Canonical mismatch: " + url);
  if (/\/(weather|communes|arab-capitals|world-capitals)\/[^/]+\/$/.test(new URL(url).pathname)) {
    assert.match(html, /<script type="application\/ld\+json">[\s\S]*?"@type":"Place"/, "Place JSON-LD missing: " + url);
    assert.match(html, /"@type":"BreadcrumbList"/, "Breadcrumb JSON-LD missing: " + url);
  }
}

console.log(
  "Live deployment verified: " + urls.length + " unique sitemap URLs, " +
  geographicUrls.length + " geographic pages including " + communeUrls.length + " communes, " + new Set([base, ...representative]).size +
  " representative pages, and robots.txt sitemap reference."
);
