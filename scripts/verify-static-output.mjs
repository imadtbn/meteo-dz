import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import cities from "../client/src/data/cities.json" with { type: "json" };
import { buildSitemap, sitemapUrls, INDEXABLE_LANDING_ROUTES } from "./sitemap-core.mjs";

const root = path.resolve("dist/public");
const load = (relative) => readFile(path.join(root, relative), "utf8");
const landing = ["wilayas", "arab-capitals", "world-search", "global-weather", "weather-map", "alerts", "favorites", "climate-observatory", "agriculture-weather"];

const homepage = await load("index.html");
assert.match(homepage, /<html lang="ar" dir="rtl">/);
assert.match(homepage, /<div id="root"><\/div>/);
assert.doesNotMatch(homepage, /%VITE_/);
assert.ok(!homepage.includes("manus-runtime") && !homepage.includes("__MANUS_HOST_DEV__"), "Development runtime must not be embedded in production HTML");
assert.ok(Buffer.byteLength(homepage, "utf8") < 100000, "Production homepage HTML should remain lightweight");
assert.ok(!(await readdir(root)).includes("__manus__"), "Development debug collector must not be published");
const adsenseLoader = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5656416032906373';
assert.equal(homepage.split(adsenseLoader).length - 1, 1, "Load AdSense exactly once per page");
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
assert.ok(initialCssBytes < 140000, "Initial CSS budget exceeded: " + initialCssBytes + " bytes");
const mapBundle = staticScripts.find((name) => name.startsWith("WeatherMap-"));
assert.ok(mapBundle, "Weather map must remain a separately emitted route chunk");
assert.ok((await stat(path.join(root, "assets", mapBundle))).size < 180000, "Weather map route chunk budget exceeded");
const appSource = await readFile("client/src/App.tsx", "utf8");
assert.match(appSource, /const WeatherMapPage = lazy\(/, "Weather map route must remain lazy-loaded");
assert.match(appSource, /const ClimateObservatoryPage = lazy\(/, "Climate observatory must be lazy-loaded");
assert.match(appSource, /const AgricultureWeatherPage = lazy\(/, "Agriculture weather page must be lazy-loaded");
assert.ok(!homepage.includes(mapBundle), "Weather map bundle must not load with the homepage");
console.log("Performance budgets: initial JS " + initialJsBytes + " B, total JS " + totalJsBytes + " B, initial CSS " + initialCssBytes + " B.");
const builtScripts = (await Promise.all(staticScripts.map((name) => load(path.join("assets", name))))).join("\n");
assert.ok(builtScripts.includes("7867079394"), "Top slot missing from JS bundle");
assert.ok(builtScripts.includes("3143411927"), "Bottom slot missing from JS bundle");
assert.ok(builtScripts.includes("-fr+57+4a-dc+8g"), "Fluid ad layout key missing");
const chromeSource = await readFile("client/src/components/PublicChrome.tsx", "utf8");
assert.ok(chromeSource.indexOf('<AdSlot position="header" />') > chromeSource.indexOf("</header>"));
assert.ok(chromeSource.indexOf('<AdSlot position="footer" />') < chromeSource.indexOf('<footer className="site-footer">'));

assert.match(homepage, /og:image" content="https:\/\/imadtbn.github.io\/meteo-dz\/social-preview.png"/);
assert.match(homepage, /twitter:card" content="summary_large_image"/);

const manifest = JSON.parse(await load("manifest.webmanifest"));
assert.equal(manifest.start_url, "/meteo-dz/");
assert.equal(manifest.scope, "/meteo-dz/");
assert.ok(manifest.shortcuts?.length >= 3);
assert.ok(manifest.icons?.some((icon) => icon.sizes === "192x192" && icon.type === "image/png"));
assert.ok(manifest.icons?.some((icon) => icon.sizes === "512x512" && icon.type === "image/png"));

const sitemap = await load("sitemap.xml");
const expectedRoot = "https://imadtbn.github.io/meteo-dz/";
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((item) => item[1]);
assert.equal(urls.length, 1 + INDEXABLE_LANDING_ROUTES.length + cities.length);
assert.equal(new Set(urls).size, urls.length);
assert.deepEqual(urls, sitemapUrls(expectedRoot, cities));
assert.equal(sitemap, buildSitemap(expectedRoot, cities), "Deployed sitemap must match the canonical generator");
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
for (const city of cities) {
  const html = await load(path.join("weather", city.slug, "index.html"));
  assert.ok((await stat(path.join(root, "weather", city.slug, "index.html"))).size < 100000, "Generated city HTML must remain lightweight: " + city.slug);
  assert.ok(html.includes(city.name), "Missing city metadata: " + city.slug);
  assert.ok(html.includes('og:url" content="https://imadtbn.github.io/meteo-dz/weather/' + city.slug + '/"'));
  assert.ok(html.includes('og:image" content="https://imadtbn.github.io/meteo-dz/social-preview.png"'));
  assert.ok(urls.includes("https://imadtbn.github.io/meteo-dz/weather/" + city.slug + "/"));
}
const robots = await load("robots.txt");
assert.ok(robots.includes("Sitemap: " + expectedRoot + "sitemap.xml"));
await stat(path.join(root, "sw.js"));
await stat(path.join(root, "favicon.svg"));
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
for (const [file, width, height] of [["social-preview.png", 1200, 630], ["icons/icon-192.png", 192, 192], ["icons/icon-512.png", 512, 512]]) {
  const buffer = await readFile(path.join(root, file));
  assert.ok(buffer.subarray(0, 8).equals(pngSignature), "PNG signature missing: " + file);
  assert.equal(buffer.readUInt32BE(16), width);
  assert.equal(buffer.readUInt32BE(20), height);
}
console.log("Verified homepage, PWA files, " + landing.length + " landing routes and " + cities.length + " city pages.");
