import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { buildPlaceCatalog } from "./place-catalog.mjs";
import { buildSitemap, sitemapUrls, INDEXABLE_LANDING_ROUTES } from "./sitemap-core.mjs";

const places = buildPlaceCatalog();

const root = path.resolve("dist/public");
const load = (relative) => readFile(path.join(root, relative), "utf8");
const landing = ["wilayas", "communes", "arab-capitals", "world-capitals", "world-search", "global-weather", "weather-map", "alerts", "favorites", "climate-observatory", "agriculture-weather"];

const homepage = await load("index.html");
assert.match(homepage, /<html lang="ar" dir="rtl">/);
assert.match(homepage, /<div id="root"><\/div>/);
assert.doesNotMatch(homepage, /%VITE_/);
assert.ok(!homepage.includes("manus-runtime") && !homepage.includes("__MANUS_HOST_DEV__"), "Development runtime must not be embedded in production HTML");
assert.ok(Buffer.byteLength(homepage, "utf8") < 100000, "Production homepage HTML should remain lightweight");
assert.ok(!(await readdir(root)).includes("__manus__"), "Development debug collector must not be published");
const adsenseLoader = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5656416032906373';
assert.equal(homepage.split(adsenseLoader).length - 1, 1, "Load AdSense exactly once per page");
const gtmContainerId = "GTM-K3DQR9RT";
assert.ok(homepage.includes(gtmContainerId), "Configured Google Tag Manager container is missing");
assert.ok(homepage.includes("gtm.start") && homepage.includes("gtm.js"), "Google Tag Manager bootstrap event is missing");
assert.ok(homepage.includes("googletagmanager.com/ns.html?id=" + gtmContainerId), "Google Tag Manager noscript fallback is missing");
assert.ok(!homepage.includes("GTM-M58X5KJ8"), "Unexpected legacy Google Tag Manager container remains");
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
assert.match(weatherMapSource, /href: `\/weather\/\$\{city\.slug\}\/`/, "Weather map city links must use canonical trailing-slash URLs");
assert.ok(!chromeSource.includes('<AdSlot position="header" />'), "Top ad must not be rendered by the shared header");
assert.ok(chromeSource.indexOf('<AdSlot position="footer" />') < chromeSource.indexOf('<footer className="site-footer">'), "Footer ad must remain before the shared footer");

const homeSource = await readFile("client/src/pages/Home.tsx", "utf8");
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

const htmlSitemap = await load("sitemap.html");
const communeCount = places.filter((place) => place.kind === "commune").length;
assert.ok(htmlSitemap.includes(communeCount + " بلدية جزائرية"), "HTML sitemap must report the commune total");
const htmlCommuneLinks = [...htmlSitemap.matchAll(/href="https:\/\/imadtbn\.github\.io\/meteo-dz\/communes\/[^"]+\//g)];
assert.equal(htmlCommuneLinks.length, communeCount, "HTML sitemap must link every commune exactly once");
const communeSource = JSON.parse(await load("data/communes.json"));
assert.equal(communeSource.length, communeCount, "Published commune source must match the canonical catalog");
assert.equal(new Set(communeSource.map((item) => item.id)).size, communeCount, "Published commune IDs must be unique");
assert.ok(communeSource.every((item) => item.slug && item.wilaya_slug && item.latitude >= 18 && item.latitude <= 38 && item.longitude >= -9 && item.longitude <= 12), "Published commune records must have stable routes, wilaya links and normalized Algerian coordinates");
const searchIndex = JSON.parse(await load("data/global-search-index.json"));
assert.equal(searchIndex.filter((item) => item.kind === "commune").length, communeCount, "Global search index must include every commune");

const manifest = JSON.parse(await load("manifest.webmanifest"));
assert.equal(manifest.start_url, "/meteo-dz/");
assert.equal(manifest.scope, "/meteo-dz/");
assert.ok(manifest.shortcuts?.length >= 3);
assert.ok(manifest.icons?.some((icon) => icon.sizes === "192x192" && icon.type === "image/png"));
assert.ok(manifest.icons?.some((icon) => icon.sizes === "512x512" && icon.type === "image/png"));

const sitemap = await load("sitemap.xml");
const expectedRoot = "https://imadtbn.github.io/meteo-dz/";
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((item) => item[1]);
assert.equal(urls.length, 1 + INDEXABLE_LANDING_ROUTES.length + places.length);
assert.equal(new Set(urls).size, urls.length);
assert.deepEqual(urls, sitemapUrls(expectedRoot, places));
assert.equal(sitemap, buildSitemap(expectedRoot, places), "Deployed sitemap must match the canonical generator");
assert.equal(sitemap, await readFile("sitemap.xml", "utf8"), "Repository root sitemap must match deployment");
assert.equal(sitemap, await readFile("client/public/sitemap.xml", "utf8"), "Public sitemap must match deployment");
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
    assert.ok(urls.includes(expectedRoot + page + "/"));
  }
}
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
    assert.ok(html.includes("/weather/" + place.wilayaSlug + "/"), "Commune page must link to its wilaya: " + place.slug);
    assert.ok(place.latitude >= 18 && place.latitude <= 38 && place.longitude >= -9 && place.longitude <= 12, "Commune coordinates must fall within Algeria: " + place.slug);
  }
  assert.ok(html.includes("related-place-link"), "Related internal links missing: " + place.slug);
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
