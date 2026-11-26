import assert from "node:assert/strict";
import { buildPlaceCatalog } from "./place-catalog.mjs";
import { buildCommuneCatalog } from "./commune-catalog.mjs";
import { sitemapUrls, INDEXABLE_LANDING_ROUTES } from "./sitemap-core.mjs";

const siteUrl = process.env.SITE_URL || "https://imadtbn.github.io/meteo-dz/";
const site = new URL(siteUrl);
assert.equal(site.protocol, "https:", "Deployed site must use HTTPS");
const base = site.href.endsWith("/") ? site.href : site.href + "/";
const places = buildPlaceCatalog();
const communes = buildCommuneCatalog();
const expectedUrls = sitemapUrls(base, places);
const expectedRoot = base;

async function fetchPage(url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(20000),
        headers: { "user-agent": "meteo-dz-deployment-verifier/2.0" },
      });
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        continue;
      }
      assert.equal(response.status, 200, url + " returned HTTP " + response.status);
      assert.equal(response.url, url, "Unexpected response URL: " + url);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        continue;
      }
    }
  }
  throw lastError || new Error("Unable to fetch " + url);
}

async function mapLimit(items, limit, task) {
  const results = new Array(items.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await task(items[index], index);
    }
  }));
  return results;
}

const sitemapUrl = new URL("sitemap.xml", base).href;
const sitemapResponse = await fetchPage(sitemapUrl);
const sitemapXml = await sitemapResponse.text();
assert.match(sitemapXml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
assert.match(sitemapXml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);

const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert.equal(urls.length, 1906, "Unexpected number of canonical sitemap URLs");
assert.equal(new Set(urls).size, urls.length, "Deployed sitemap contains duplicate URLs");
assert.deepEqual(urls, expectedUrls, "Deployed sitemap differs from the canonical geographic catalog");
assert.ok(urls.every((url) => url.startsWith(base) && !/[?#]/.test(url)), "Sitemap contains a noncanonical URL");
assert.ok(urls.includes(base), "Homepage is missing from sitemap");

const byKind = {
  wilaya: places.filter((place) => place.kind === "wilaya"),
  commune: places.filter((place) => place.kind === "commune"),
  arabCapital: places.filter((place) => place.kind === "arab-capital"),
  worldCapital: places.filter((place) => place.kind === "world-capital"),
};
assert.equal(byKind.wilaya.length, 69, "Expected 69 wilaya pages");
assert.equal(byKind.commune.length, 1609, "Expected 1,609 unique commune pages");
assert.equal(byKind.arabCapital.length, 22, "Expected 22 Arabic capital pages");
assert.equal(byKind.worldCapital.length, 195, "Expected 195 world capital pages");
const sourceCommuneCount = communes.reduce((sum, commune) => sum + commune.locations.length, 0);
assert.equal(sourceCommuneCount, 1708, "Every source commune record must be represented in the canonical catalog");
assert.equal(byKind.commune.reduce((sum, commune) => sum + commune.locations.length, 0), 1708);

const geographicUrls = urls.filter((url) => /\/(wilayas|communes|arab-capitals|world-capitals)\/[^/]+\/$/.test(new URL(url).pathname));
const communeUrls = geographicUrls.filter((url) => new URL(url).pathname.includes("/communes/"));
assert.equal(geographicUrls.length, places.length, "Every geographic page must have one sitemap URL");
assert.equal(communeUrls.length, 1609, "Every canonical commune page must have one sitemap URL");
assert.ok(communeUrls.every((url) => !/\d/.test(new URL(url).pathname.split("/").filter(Boolean).at(-1))), "Canonical commune URLs must not contain IDs or postal-code digits");

const requiredRoutes = [
  ...INDEXABLE_LANDING_ROUTES,
];
for (const route of requiredRoutes) {
  assert.ok(urls.includes(new URL(route + "/", base).href), "Required directory missing from sitemap: " + route);
}

const robotsUrl = new URL("robots.txt", base).href;
const robotsResponse = await fetchPage(robotsUrl);
const robots = await robotsResponse.text();
assert.match(robots, /^User-agent:\s*\*/m);
assert.ok(robots.includes("Sitemap: " + sitemapUrl), "robots.txt does not reference the deployed sitemap");

const sitemapHtmlUrl = new URL("sitemap.html", base).href;
const sitemapHtmlResponse = await fetchPage(sitemapHtmlUrl);
const sitemapHtml = await sitemapHtmlResponse.text();
assert.match(sitemapHtml, /<title>خريطة الموقع/);
const htmlLinks = [...sitemapHtml.matchAll(/href="([^"]+)"/g)].map((match) => new URL(match[1], base).href);
const htmlGeographicLinks = htmlLinks.filter((url) => /\/(wilayas|communes|arab-capitals|world-capitals)\/[^/]+\/$/.test(new URL(url).pathname));
assert.equal(htmlGeographicLinks.length, places.length, "HTML sitemap must link every geographic page exactly once");
assert.equal(new Set(htmlGeographicLinks).size, places.length, "HTML sitemap contains duplicate geographic links");
assert.deepEqual(
  [...htmlGeographicLinks].sort(),
  geographicUrls.slice().sort(),
  "HTML and XML sitemaps must contain the same geographic page URLs",
);

const placeByUrl = new Map(places.map((place) => [expectedRoot + place.canonicalPath + "/", place]));
const legacyRedirects = new Map([
  [base + "communes/tinerkouk-timimoun-49016/", base + "communes/tinerkouk-timimoun/"],
  [base + "communes/deldoul-timimoun-49017/", base + "communes/deldoul-timimoun/"],
  [base + "communes/ouled-aissa-timimoun-49027/", base + "communes/ouled-aissa-timimoun/"],
  [base + "communes/timiaouine-bordj-badji-mokhtar-50028/", base + "communes/timiaouine-bordj-badji-mokhtar/"],
  [base + "communes/inoughissen-127/", base + "communes/inoughissen-batna/"],
  [base + "communes/el-adjiba-327/", base + "communes/el-adjiba-bouira/"],
  [base + "weather/algiers/", base + "wilayas/algiers/"],
  [base + "weather/djanet/", base + "wilayas/djanet/"],
  [base + "weather/oran/", base + "wilayas/oran/"],
  [base + "weather/ain-temouchent/", base + "wilayas/ain-temouchent/"],
]);

await mapLimit(urls, 12, async (url) => {
  const response = await fetchPage(url);
  const html = await response.text();
  assert.match(html, /<title>[^<]+<\/title>/, "Missing title: " + url);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"\s*\/?\s*>/i);
  assert.ok(canonical, "Missing canonical: " + url);
  assert.equal(canonical[1], url, "Canonical mismatch: " + url);

  if (url === base) {
    assert.ok(html.includes("GTM-K3DQR9RT"), "Configured GTM container missing from the live homepage");
    assert.ok(html.includes("gtm.start") && html.includes("gtm.js"), "Live homepage GTM bootstrap event is missing");
    assert.ok(html.includes("googletagmanager.com/ns.html?id=GTM-K3DQR9RT"), "Live homepage GTM noscript fallback is missing");
  }

  if (url === base + "arab-capitals/") {
    for (const capital of byKind.arabCapital) {
      assert.ok(html.includes('href="' + base + capital.canonicalPath + '/"'), "Arabic capitals page is missing a crawlable capital link: " + capital.slug);
    }
  }
  if (url === base + "world-search/") {
    for (const route of ["world-capitals/", "arab-capitals/", "wilayas/", "communes/"]) {
      assert.ok(html.includes('href="' + base + route + '"'), "World search is missing a crawlable directory link: " + route);
    }
  }

  const place = placeByUrl.get(url);
  if (!place) return;
  assert.ok(html.includes(place.displayName), "Missing place-specific HTML content: " + place.canonicalPath);
  assert.match(html, /<script type="application\/ld\+json">[\s\S]*?<\/script>/, "Place JSON-LD missing: " + url);
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  const jsonLd = JSON.parse(jsonLdMatch[1]);
  assert.equal(jsonLd["@context"], "https://schema.org", "Unexpected JSON-LD context: " + url);
  const webPageNode = jsonLd["@graph"]?.find((node) => node["@type"] === "WebPage");
  const placeNode = webPageNode?.about;
  const breadcrumbNode = jsonLd["@graph"]?.find((node) => node["@type"] === "BreadcrumbList");
  assert.equal(webPageNode?.url, url, "WebPage structured URL mismatch: " + url);
  assert.equal(placeNode?.["@type"], "Place", "Place entity missing: " + url);
  assert.equal(placeNode?.geo?.latitude, place.latitude, "Latitude mismatch: " + url);
  assert.equal(placeNode?.geo?.longitude, place.longitude, "Longitude mismatch: " + url);
  assert.equal(breadcrumbNode?.itemListElement?.length, place.kind === "commune" ? 4 : 3, "Breadcrumb depth mismatch: " + url);

  if (place.kind === "commune") {
    assert.ok(place.wilayaSlug && place.wilayaId, "Commune is missing its parent wilaya: " + place.slug);
    assert.ok(html.includes("/wilayas/" + place.wilayaSlug + "/"), "Commune page is not linked to its parent wilaya: " + place.slug);
    assert.ok(html.includes("دليل البلديات"), "Commune page is missing its national directory link: " + place.slug);
    assert.ok(place.latitude >= 18 && place.latitude <= 38 && place.longitude >= -9 && place.longitude <= 12, "Commune coordinates are outside Algeria: " + place.slug);
    if (place.slug === "tamtert-beni-abbes" || place.slug === "tamtert-bechar") {
      assert.equal(place.locations.length, 1, "Same-named Tamtert communes must retain separate wilaya-specific records");
      const location = place.locations[0];
      assert.ok(html.includes('data-source-id="' + location.id + '"'), "Tamtert live page is missing its source location: " + place.slug);
      assert.ok(html.includes("lat=" + location.latitude + "&amp;lon=" + location.longitude), "Tamtert live page is missing its separate weather link: " + place.slug);
    }
  }
});

for (const [legacyUrl, targetUrl] of legacyRedirects) {
  const response = await fetchPage(legacyUrl);
  const html = await response.text();
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"\s*\/?\s*>/i);
  assert.equal(canonical?.[1], targetUrl, "Legacy URL canonical target mismatch: " + legacyUrl);
  assert.match(html, /http-equiv="refresh"/, "Legacy URL must contain a meta refresh: " + legacyUrl);
  assert.ok(html.includes("window.location.replace"), "Legacy URL must contain a client redirect: " + legacyUrl);
  assert.match(html, /name="robots" content="noindex,follow"/, "Legacy URL must be noindex: " + legacyUrl);
  assert.ok(!urls.includes(legacyUrl), "Legacy URL must not appear in sitemap: " + legacyUrl);
  assert.ok(urls.includes(targetUrl), "Legacy URL destination must be present in sitemap: " + targetUrl);
}

for (const route of ["favorites/", "global-weather/"]) {
  const utilityUrl = new URL(route, base).href;
  const response = await fetchPage(utilityUrl);
  const html = await response.text();
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"\\s*\\/?\\s*>/i);
  assert.equal(canonical?.[1], utilityUrl, "Utility page canonical mismatch: " + utilityUrl);
  assert.match(html, /name="robots" content="noindex,follow"/, "Utility page must remain noindex: " + utilityUrl);
  assert.ok(!urls.includes(utilityUrl), "Noindex utility page must not appear in sitemap: " + utilityUrl);
}

const beniImageUrl = new URL("images/beni-abbes.jpg", base).href;
const beniImageResponse = await fetchPage(beniImageUrl);
assert.match(beniImageResponse.headers.get("content-type") || "", /^image\\/jpeg/i, "Beni Abbes image must remain a JPEG asset");
assert.ok(!urls.includes(beniImageUrl), "Image assets must not appear in the XML sitemap");

console.log(
  "Full deployment verification passed: " + urls.length + " sitemap URLs, " +
  byKind.wilaya.length + " wilayas, " + sourceCommuneCount + " source commune records grouped into " +
  byKind.commune.length + " canonical commune pages, " + byKind.arabCapital.length +
  " Arabic capitals, " + byKind.worldCapital.length + " world capitals, and " +
  htmlGeographicLinks.length + " matching HTML sitemap links. All sitemap pages returned HTTP 200 with valid canonical metadata."
);
