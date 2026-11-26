import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { buildPlaceCatalog } from "./place-catalog.mjs";
import { buildCommuneCatalog } from "./commune-catalog.mjs";
import { buildSitemap, buildSitemapHtml, sitemapUrls, INDEXABLE_LANDING_ROUTES } from "./sitemap-core.mjs";

const places = buildPlaceCatalog();
const communeCatalog = buildCommuneCatalog();
assert.ok(communeCatalog.every((commune) => !/\d/.test(commune.slug)), "Commune slugs must not contain IDs or postal-code digits");
assert.equal(new Set(communeCatalog.map((commune) => commune.slug)).size, communeCatalog.length, "Commune routes must be unique after grouping");
assert.ok(communeCatalog.every((commune) => commune.locations.length >= 1), "Every canonical commune page must retain source locations");

const root = path.resolve("dist/public");
const load = (relative) => readFile(path.join(root, relative), "utf8");
const stripInjectedGtm = (html) => {
  const headStart = "<!-- Google Tag Manager: canonical container bootstrap shared by the app and prerendered pages. -->";
  const scriptEnd = "</script>";
  const headIndex = html.indexOf(headStart);
  if (headIndex >= 0) {
    const endIndex = html.indexOf(scriptEnd, headIndex);
    if (endIndex < 0) throw new Error("GTM bootstrap script is not closed");
    html = html.slice(0, headIndex) + html.slice(endIndex + scriptEnd.length);
  }

  const bodyStart = "<!-- Google Tag Manager (noscript) -->";
  const bodyEnd = "<!-- End Google Tag Manager (noscript) -->";
  const bodyIndex = html.indexOf(bodyStart);
  if (bodyIndex >= 0) {
    const endIndex = html.indexOf(bodyEnd, bodyIndex);
    if (endIndex < 0) throw new Error("GTM noscript block is not closed");
    html = html.slice(0, bodyIndex) + html.slice(endIndex + bodyEnd.length);
  }
  return html;
};

async function verifyGtmAcrossHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await verifyGtmAcrossHtml(filePath);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
    const html = await readFile(filePath, "utf8");
    const relative = path.relative(root, filePath);
    assert.equal(html.split("https://www.googletagmanager.com/gtm.js").length - 1, 1, "Each HTML page must load GTM exactly once: " + relative);
    assert.equal(html.split("https://www.googletagmanager.com/ns.html").length - 1, 1, "Each HTML page must include one GTM noscript fallback: " + relative);
    assert.ok(html.includes("GTM-M58X5KJ8"), "Active GTM container missing from " + relative);
    assert.ok(html.includes("gtm.start") && html.includes("gtm.js"), "GTM bootstrap missing from " + relative);
    assert.ok(!html.includes("GTM-K3DQR9RT"), "Legacy GTM container remains in " + relative);
  }
}

const landing = ["weather", "wilayas", "communes", "arab-capitals", "world-capitals", "world-search", "global-weather", "weather-map", "alerts", "favorites", "climate-observatory", "agriculture-weather"];

const homepage = await load("index.html");
assert.match(homepage, /<html lang="ar" dir="rtl">/);
assert.match(homepage, /<div id="root"><\/div>/);
assert.doesNotMatch(homepage, /%VITE_/);
assert.ok(!homepage.includes("manus-runtime") && !homepage.includes("__MANUS_HOST_DEV__"), "Development runtime must not be embedded in production HTML");
assert.ok(Buffer.byteLength(homepage, "utf8") < 100000, "Production homepage HTML should remain lightweight");
assert.ok(!(await readdir(root)).includes("__manus__"), "Development debug collector must not be published");
const adsenseLoader = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5656416032906373';
assert.equal(homepage.split(adsenseLoader).length - 1, 1, "Load AdSense exactly once per page");
const gtmContainerId = "GTM-M58X5KJ8";
assert.ok(homepage.includes(gtmContainerId), "Configured Google Tag Manager container is missing");
assert.ok(homepage.includes("gtm.start") && homepage.includes("gtm.js"), "Google Tag Manager bootstrap event is missing");
assert.ok(homepage.includes("googletagmanager.com/ns.html?id=" + gtmContainerId), "Google Tag Manager noscript fallback is missing");
assert.ok(!homepage.includes("GTM-K3DQR9RT"), "Unexpected legacy Google Tag Manager container remains");
const assetNames = await readdir(path.join(root, "assets"));
const staticScripts = assetNames.filter((name) => name.endsWith(".js"));
const initialAssetNames = [...homepage.matchAll(/(?:src|href)="[^"]*assets\/([^"]+\.js)"/g)].map((match) => match[1]);
assert.ok(initialAssetNames.length > 0, "Homepage entry scripts must be present");
const initialJsBytes = (await Promise.all(initialAssetNames.map(async (name) => (await stat(path.join(root, "assets", name))).size))).reduce((sum, size) => sum + size, 0);
const totalJsBytes = (await Promise.all(staticScripts.map(async (name) => (await stat(path.join(root, "assets", name))).size))).reduce((sum, size) => sum + size, 0);
const initialCssNames = [...homepage.matchAll(/href="[^"]*assets\/([^"]+\.css)"/g)].map((match) => match[1]);
const initialCssBytes = (await Promise.all(initialCssNames.map(async (name) => (await stat(path.join(root, "assets", name))).size))).reduce((sum, size) => sum + size, 0);
assert.ok(initialJsBytes < 420000, "Initial JavaScript budget exceeded: " + initialJsBytes + " bytes");
assert.ok(totalJsBytes < 700000, "Total JavaScript budget exceeded: " + totalJsBytes + " bytes");
assert.ok(initialCssBytes < 150000, "Initial CSS budget exceeded: " + initialCssBytes + " bytes");
const mapBundle = staticScripts.find((name) => name.startsWith("WeatherMap-"));
assert.ok(mapBundle, "Weather map must remain a separately emitted route chunk");
assert.ok((await stat(path.join(root, "assets", mapBundle))).size < 180000, "Weather map route chunk budget exceeded");
const appSource = await readFile("client/src/App.tsx", "utf8");
assert.match(appSource, /const WeatherMapPage = lazy\(/, "Weather map route must remain lazy-loaded");
assert.match(appSource, /const WilayasWeatherIndex = lazy\(/, "Weather directory route must remain lazy-loaded");
assert.doesNotMatch(appSource, /import \{ WeatherDirectoryPage as WilayasWeatherIndex \}/, "Weather directory must not be statically imported into the initial bundle");
assert.match(appSource, /const ClimateObservatoryPage = lazy\(/, "Climate observatory must be lazy-loaded");
assert.match(appSource, /const AgricultureWeatherPage = lazy\(/, "Agriculture weather page must be lazy-loaded");
assert.ok(appSource.includes('path={"/communes/:slug"}'), "Commune weather route must be registered");
assert.ok(appSource.includes('path={"/wilayas/:slug"}'), "Canonical wilaya weather route must be registered");
assert.ok(appSource.includes('path={"/communes"}'), "National communes directory route must be registered");
assert.ok(!homepage.includes(mapBundle), "Weather map bundle must not load with the homepage");
console.log("Performance budgets: initial JS " + initialJsBytes + " B, total JS " + totalJsBytes + " B, initial CSS " + initialCssBytes + " B.");
const builtScripts = (await Promise.all(staticScripts.map((name) => load(path.join("assets", name))))).join("\n");
assert.ok(builtScripts.includes("7867079394"), "Top slot missing from JS bundle");
assert.ok(builtScripts.includes("3143411927"), "Bottom slot missing from JS bundle");
assert.ok(builtScripts.includes("-fr+57+4a-dc+8g"), "Fluid ad layout key missing");
const chromeSource = await readFile("client/src/components/PublicChrome.tsx", "utf8");
assert.ok(chromeSource.includes('href: "/world-capitals/"'), "World capitals must be reachable from shared navigation");
const citySearchSource = await readFile("client/src/components/CitySearch.tsx", "utf8");
assert.ok(citySearchSource.includes("onSelectCommune"), "Global suggestions must open commune weather pages");
assert.ok(citySearchSource.includes(".slice(0, 4)"), "Global search suggestions must remain capped at four");
const worldSearchSource = await readFile("client/src/pages/WorldSearch.tsx", "utf8");
assert.ok(worldSearchSource.includes("localCommuneResults"), "Full global search must include local communes");
const wilayaCommunesSource = await readFile("client/src/components/WilayaCommunes.tsx", "utf8");
assert.ok(wilayaCommunesSource.includes("count + 24"), "Wilaya commune cards must load progressively");
const directorySource = await readFile("client/src/pages/Directories.tsx", "utf8");
assert.ok(directorySource.includes("image={item.countryImages}"), "Capital directory cards must use available city photography");
const wilayaCardSource = await readFile("client/src/components/WilayaCard.tsx", "utf8");
assert.ok(wilayaCardSource.includes("image={city.countryImages}"), "Wilaya directory cards must use available city photography");
const weatherMapSource = await readFile("client/src/pages/WeatherMap.tsx", "utf8");
assert.match(weatherMapSource, /href: `\/wilayas\/\$\{city\.slug\}\/`/, "Weather map city links must use canonical wilaya URLs");
assert.ok(!chromeSource.includes('<AdSlot position="header" />'), "Top ad must not be rendered by the shared header");
assert.ok(chromeSource.indexOf('<AdSlot position="footer" />') < chromeSource.indexOf('<footer className="site-footer">'), "Footer ad must remain before the shared footer");

const homeSource = await readFile("client/src/pages/Home.tsx", "utf8");
assert.ok(homeSource.includes("CommuneInternalLinks"), "Commune contextual links must be rendered inside the hero");
assert.ok(homeSource.includes("CommuneLocationsWeather"), "Grouped commune pages must render additional independent weather locations");
const communeLocationsSource = await readFile("client/src/components/CommuneLocationsWeather.tsx", "utf8");
assert.ok(communeLocationsSource.includes("fetchWeather") && communeLocationsSource.includes("location.latitude") && communeLocationsSource.includes("location.longitude"), "Additional commune locations must fetch weather from their own coordinates");
assert.ok(!homeSource.includes('aria-label="العودة إلى الولاية"'), "Do not append a separate wilaya-only section to commune pages");
const communeLinksSource = await readFile("client/src/components/CommuneInternalLinks.tsx", "utf8");
assert.ok(communeLinksSource.includes("commune-context-nav__siblings") && communeLinksSource.includes('href={"/wilayas/" + city.wilayaSlug + "/"}'), "Commune pages must link to the parent wilaya and sibling communes");
const homeHeroStart = homeSource.indexOf('<section className="hero-band">');
const homeHeroEnd = homeSource.indexOf("</section>", homeHeroStart);
const homeAd = homeSource.indexOf('<AdSlot position="header" />');
assert.ok(homeHeroStart >= 0 && homeHeroEnd > homeHeroStart && homeAd > homeHeroEnd, "Homepage top ad must be placed after the complete hero");

const worldHeroStart = worldSearchSource.indexOf('<section className="directory-hero">');
const worldHeroEnd = worldSearchSource.indexOf("</section>", worldHeroStart);
const worldAd = worldSearchSource.indexOf('<AdSlot position="header" />');
assert.ok(worldHeroStart >= 0 && worldHeroEnd > worldHeroStart && worldAd > worldHeroEnd, "World search top ad must be placed after the complete hero");

assert.match(homepage, /og:image" content="https:\/\/imadtbn.github.io\/meteo-dz\/social-preview.png"/);
assert.match(homepage, /twitter:card" content="summary_large_image"/);

await verifyGtmAcrossHtml(root);
console.log("Verified one active GTM loader and noscript fallback across every generated HTML page.");

const htmlSitemap = await load("sitemap.html");
const communeCount = places.filter((place) => place.kind === "commune").length;
assert.ok(htmlSitemap.includes(communeCount + " بلدية جزائرية"), "HTML sitemap must report the commune total");
const htmlCommuneLinks = [...htmlSitemap.matchAll(/href="https:\/\/imadtbn\.github\.io\/meteo-dz\/communes\/[^"]+\//g)];
assert.equal(htmlCommuneLinks.length, communeCount, "HTML sitemap must link every commune exactly once");
const communeSource = JSON.parse(await load("data/communes.json"));
assert.equal(communeSource.length, communeCount, "Published commune pages must match the canonical catalog");
const sourceLocationIds = communeSource.flatMap((item) => item.locations.map((location) => location.id));
assert.equal(new Set(sourceLocationIds).size, sourceLocationIds.length, "Source commune IDs must remain unique across grouped pages");
assert.equal(new Set(communeSource.map((item) => item.slug)).size, communeCount, "Published canonical commune slugs must be unique");
assert.ok(communeSource.every((item) => item.slug && !/\d/.test(item.slug) && item.legacy_slugs?.length >= 1 && item.wilaya_slug && item.locations?.length >= 1 && item.locations.every((location) => location.latitude >= 18 && location.latitude <= 38 && location.longitude >= -9 && location.longitude <= 12)), "Published commune records must use name-only routes and retain valid independent locations");
assert.ok(communeSource.some((item) => item.locations.length > 1), "Duplicate source records must be grouped into multi-location pages");
const searchIndex = JSON.parse(await load("data/global-search-index.json"));
const communeSearchEntries = searchIndex.filter((item) => item.kind === "commune");
assert.equal(communeSearchEntries.length, communeCount, "Global search index must include each canonical commune page exactly once");
assert.ok(communeSearchEntries.every((item) => communeSource.some((commune) => item.path === "/communes/" + commune.slug + "/")), "Global search index must contain only canonical commune URLs");

const manifest = JSON.parse(await load("manifest.webmanifest"));
assert.equal(manifest.start_url, "/meteo-dz/");
assert.equal(manifest.scope, "/meteo-dz/");
assert.ok(manifest.shortcuts?.length >= 3);
assert.ok(manifest.icons?.some((icon) => icon.sizes === "192x192" && icon.type === "image/png"));
assert.ok(manifest.icons?.some((icon) => icon.sizes === "512x512" && icon.type === "image/png"));

const sitemap = await load("sitemap.xml");
const expectedRoot = "https://imadtbn.github.io/meteo-dz/";
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((item) => item[1]);
assert.equal(urls.length, 1906, "Canonical XML sitemap must contain exactly 1,906 URLs");
assert.equal(urls.length, 1 + INDEXABLE_LANDING_ROUTES.length + places.length);
assert.equal(new Set(urls).size, urls.length);
assert.deepEqual(urls, sitemapUrls(expectedRoot, places));
assert.ok(urls.every((url) => new URL(url).pathname.endsWith("/")), "Every canonical sitemap URL must use a trailing slash");
assert.ok(!urls.some((url) => /\/weather\/[^/]+\/$/.test(new URL(url).pathname)), "Legacy wilaya weather routes must not appear in the sitemap");
assert.ok(!urls.some((url) => new URL(url).pathname.startsWith("/images/")), "Image assets must not appear as sitemap pages");
assert.ok(!urls.some((url) => /\/(favorites|global-weather)\/$/.test(new URL(url).pathname)), "Utility routes marked noindex must not appear in the sitemap");
assert.equal(await readFile("submet-url.xml", "utf8"), sitemapUrls(expectedRoot, places).join("\n") + "\n", "Submitted URL list must match canonical sitemap routes");
assert.equal(sitemap, buildSitemap(expectedRoot, places), "Deployed sitemap must match the canonical generator");
assert.equal(sitemap, await readFile("sitemap.xml", "utf8"), "Repository root sitemap must match deployment");
assert.equal(sitemap, await readFile("client/public/sitemap.xml", "utf8"), "Public sitemap must match deployment");
const expectedHtmlSitemap = buildSitemapHtml(expectedRoot, places);
const htmlSitemapRoot = await load("sitemap.html");
assert.equal(stripInjectedGtm(htmlSitemapRoot), expectedHtmlSitemap, "Root HTML sitemap content must match the canonical generator after removing the shared GTM injection");
assert.equal(await readFile("client/public/sitemap.html", "utf8"), expectedHtmlSitemap, "Public HTML sitemap must match the canonical generator");
assert.equal(places.filter((place) => place.kind === "wilaya").length, 69, "All 69 wilaya pages must be generated");
assert.equal(places.filter((place) => place.kind === "commune").length, 1609, "All canonical commune pages must be generated");
assert.equal(places.filter((place) => place.kind === "arab-capital").length, 22, "All 22 Arabic capital pages must be generated");
assert.equal(places.filter((place) => place.kind === "world-capital").length, 195, "All 195 world capital pages must be generated");
for (const place of places.filter((item) => item.kind === "arab-capital" || item.kind === "world-capital")) {
  assert.ok(urls.includes(expectedRoot + place.canonicalPath + "/"), "Every capital directory route must remain independently indexable: " + place.canonicalPath);
}
assert.ok(urls.every((url) => url.startsWith(expectedRoot) && !/[?#]/.test(url)), "Only canonical pages belong in sitemap");
assert.ok(!urls.includes(expectedRoot + "global-weather/"), "Empty parameter-based page must not be indexed");
for (const page of landing) {
  const html = await load(path.join(page, "index.html"));
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.ok(html.includes("og:url\" content=\"https://imadtbn.github.io/meteo-dz/" + page + "/\""));
  assert.ok(html.includes("twitter:image\" content=\"https://imadtbn.github.io/meteo-dz/social-preview.png\""));
  if (["global-weather", "favorites"].includes(page)) {
    assert.ok(html.includes('name="robots" content="noindex,follow"'));
    assert.ok(!urls.includes(expectedRoot + page + "/"));
  } else {
    assert.ok(!html.includes('name="robots" content="noindex'), "Indexable landing page must not carry noindex: " + page);
    assert.ok(urls.includes(expectedRoot + page + "/"));
  }
}
const arabCapitalsHtml = await load("arab-capitals/index.html");
const arabCapitalPlaces = places.filter((place) => place.kind === "arab-capital");
assert.equal(arabCapitalPlaces.length, 22);
for (const capital of arabCapitalPlaces) {
  assert.ok(arabCapitalsHtml.includes('href="https://imadtbn.github.io/meteo-dz/' + capital.canonicalPath + '/"'), "Arabic capitals landing page must link every capital: " + capital.slug);
}
const worldSearchHtml = await load("world-search/index.html");
for (const route of ["/world-capitals/", "/arab-capitals/", "/wilayas/", "/communes/"]) {
  assert.ok(worldSearchHtml.includes('href="https://imadtbn.github.io/meteo-dz' + route + '"'), "World search must provide crawlable directory links: " + route);
}
assert.ok(worldSearchHtml.includes("استكشف الطقس حسب المدينة والمنطقة"));
assert.ok(worldSearchHtml.includes('href="https://imadtbn.github.io/meteo-dz/world-capitals/dakar/"'), "World search must link to featured world-capital pages");
assert.ok(!urls.includes(expectedRoot + "images/beni-abbes.jpg"), "Image assets must not be submitted as standalone sitemap pages");
await stat(path.join(root, "images/beni-abbes.jpg"));

for (const place of places) {
  const relative = path.join(place.canonicalPath, "index.html");
  const html = await load(relative);
  assert.ok((await stat(path.join(root, relative))).size < 100000, "Generated place HTML should remain lightweight: " + place.slug);
  assert.ok(html.includes(place.displayName), "Missing place metadata: " + place.slug);
  assert.ok(html.includes('og:url" content="https://imadtbn.github.io/meteo-dz/' + place.canonicalPath + '/"'));
  assert.ok(html.includes('"@type":"Place"'), "Place JSON-LD missing: " + place.slug);
  assert.ok(html.includes('"@type":"BreadcrumbList"'), "Breadcrumb JSON-LD missing: " + place.slug);
  assert.ok(html.includes('"@graph"'), "Structured data graph missing: " + place.slug);
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(jsonLdMatch, "JSON-LD script missing: " + place.slug);
  const jsonLd = JSON.parse(jsonLdMatch[1]);
  assert.equal(jsonLd["@context"], "https://schema.org", "Unexpected JSON-LD context: " + place.slug);
  const webPageNode = jsonLd["@graph"]?.find((node) => node["@type"] === "WebPage");
  const breadcrumbNode = jsonLd["@graph"]?.find((node) => node["@type"] === "BreadcrumbList");
  assert.equal(webPageNode?.url, "https://imadtbn.github.io/meteo-dz/" + place.canonicalPath + "/", "WebPage canonical URL mismatch: " + place.slug);
  assert.equal(webPageNode?.about?.["@type"], "Place", "Place entity missing from WebPage: " + place.slug);
  assert.equal(webPageNode?.about?.geo?.latitude, place.latitude, "Place latitude mismatch: " + place.slug);
  assert.equal(webPageNode?.about?.geo?.longitude, place.longitude, "Place longitude mismatch: " + place.slug);
  assert.equal(breadcrumbNode?.itemListElement?.length, place.kind === "commune" ? 4 : 3, "Breadcrumb depth mismatch: " + place.slug);
  if (place.kind === "commune") {
    assert.ok(place.wilayaSlug && place.wilayaId, "Commune must be linked to a known wilaya: " + place.slug);
    assert.ok(html.includes("/wilayas/" + place.wilayaSlug + "/"), "Commune page must link to its wilaya: " + place.slug);
    assert.ok(html.includes('href="https://imadtbn.github.io/meteo-dz/wilayas/' + place.wilayaSlug + '/">ولاية '), "Commune breadcrumb/parent link must use the canonical wilaya URL: " + place.slug);
    assert.ok(html.includes("دليل البلديات"), "Commune breadcrumb must link to the national commune directory: " + place.slug);
    assert.ok(place.latitude >= 18 && place.latitude <= 38 && place.longitude >= -9 && place.longitude <= 12, "Commune coordinates must fall within Algeria: " + place.slug);
    assert.ok(place.locations.length >= 1, "Grouped commune page must retain source locations: " + place.slug);
    if (place.slug === "tamtert-beni-abbes" || place.slug === "tamtert-bechar") {
      assert.equal(place.locations.length, 1, "Each Tamtert municipality must retain only its own wilaya-specific source location");
      const location = place.locations[0];
      assert.ok(html.includes('data-source-id="' + location.id + '"'), "Tamtert page must expose its own source location: " + location.id);
      assert.ok(html.includes(String(location.latitude) + ", " + String(location.longitude)), "Tamtert page must include its own coordinates: " + location.id);
      assert.ok(html.includes("lat=" + location.latitude + "&amp;lon=" + location.longitude), "Tamtert page must link to its own weather reading: " + location.id);
      const otherSlug = place.slug === "tamtert-beni-abbes" ? "tamtert-bechar" : "tamtert-beni-abbes";
      const otherPlace = places.find((candidate) => candidate.slug === otherSlug);
      assert.ok(otherPlace, "The same-named Tamtert municipality in the other wilaya must have its own canonical page");
      assert.notEqual(location.id, otherPlace.locations[0].id, "Same-named Tamtert municipalities must not share source records");
      assert.ok(!html.includes('data-source-id="' + otherPlace.locations[0].id + '"'), "Tamtert page must not mix data from another wilaya");
      assert.ok(!html.includes('name="robots" content="noindex'), "Canonical Tamtert commune page must remain indexable");
    }
    for (const legacySlug of place.legacySlugs) {
      const legacyHtml = await load(path.join("communes", legacySlug, "index.html"));
      assert.ok(legacyHtml.includes('rel="canonical" href="https://imadtbn.github.io/meteo-dz/' + place.canonicalPath + '/"'), "Legacy route must canonicalize to the name-only URL: " + legacySlug);
      assert.ok(legacyHtml.includes('http-equiv="refresh"') && legacyHtml.includes("window.location.replace"), "Legacy route must redirect to the canonical URL: " + legacySlug);
      assert.ok(legacyHtml.includes('name="robots" content="noindex,follow"'), "Legacy route must not be indexed: " + legacySlug);
      assert.ok(!urls.includes("https://imadtbn.github.io/meteo-dz/communes/" + legacySlug + "/"), "Legacy route must not appear in the sitemap: " + legacySlug);
    }
  }
  assert.ok(html.includes("related-place-link"), "Related internal links missing: " + place.slug);
  if (place.kind === "wilaya") {
    const legacyWilaya = await load(path.join("weather", place.slug, "index.html"));
    assert.ok(legacyWilaya.includes('rel="canonical" href="https://imadtbn.github.io/meteo-dz/' + place.canonicalPath + '/"'), "Old wilaya route must canonicalize to /wilayas/:slug: " + place.slug);
    assert.ok(legacyWilaya.includes('http-equiv="refresh"') && legacyWilaya.includes("window.location.replace"), "Old wilaya route must redirect: " + place.slug);
    assert.ok(legacyWilaya.includes('name="robots" content="noindex,follow"'), "Legacy wilaya redirects must remain noindex: " + place.slug);
    assert.ok(!urls.includes(expectedRoot + "weather/" + place.slug + "/"), "Legacy wilaya redirects must not appear in the sitemap: " + place.slug);
  }
  if (place.image) {
    assert.ok(html.includes('fetchpriority="high"') && html.includes(place.image), "Primary city image missing: " + place.slug);
    assert.equal(webPageNode?.primaryImageOfPage?.contentUrl, "https://imadtbn.github.io/meteo-dz/" + place.image, "JSON-LD image URL mismatch: " + place.slug);
  }
  assert.ok(urls.includes("https://imadtbn.github.io/meteo-dz/" + place.canonicalPath + "/"));
  if (place.image) await stat(path.join(root, place.image));
}
const robots = await load("robots.txt");
assert.ok(robots.includes("Sitemap: " + expectedRoot + "sitemap.xml"));

const serviceWorkerSource = await readFile("client/public/sw.js", "utf8");
const serviceWorkerOutput = await load("sw.js");
assert.equal(serviceWorkerOutput, serviceWorkerSource, "Published service worker must match the single canonical source in client/public/sw.js");
assert.match(serviceWorkerSource, /const CACHE = "meteo-dz-shell-v6"/, "Service worker cache version must be explicitly versioned");
for (const asset of ["icons/icon-192.png", "icons/icon-512.png"]) {
  assert.ok(serviceWorkerSource.includes('BASE + "' + asset + '"'), "PWA install shell is missing " + asset);
}

await stat(path.join(root, "sw.js"));
await stat(path.join(root, "favicon.svg"));
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
for (const [file, width, height] of [["social-preview.png", 1200, 630], ["icons/icon-192.png", 192, 192], ["icons/icon-512.png", 512, 512]]) {
  const buffer = await readFile(path.join(root, file));
  assert.ok(buffer.subarray(0, 8).equals(pngSignature), "PNG signature missing: " + file);
  assert.equal(buffer.readUInt32BE(16), width);
  assert.equal(buffer.readUInt32BE(20), height);
}
console.log("Verified homepage, PWA files, " + landing.length + " landing routes and " + places.length + " unique geographic pages.");
