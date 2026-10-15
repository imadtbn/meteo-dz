import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import cities from "../client/src/data/cities.json" with { type: "json" };
import { buildSitemap, sitemapUrls, INDEXABLE_LANDING_ROUTES } from "./sitemap-core.mjs";

const root = path.resolve("dist/public");
const load = (relative) => readFile(path.join(root, relative), "utf8");
const landing = ["wilayas", "arab-capitals", "world-search", "global-weather", "weather-map"];

const homepage = await load("index.html");
assert.match(homepage, /<html lang="ar" dir="rtl">/);
assert.match(homepage, /<div id="root"><\/div>/);
assert.doesNotMatch(homepage, /%VITE_/);
const adsenseLoader = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5656416032906373';
assert.equal(homepage.split(adsenseLoader).length - 1, 1, "Load AdSense exactly once per page");
const staticScripts = (await readdir(path.join(root, "assets"))).filter((name) => name.endsWith(".js"));
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
  if (page === "global-weather") {
    assert.ok(html.includes('name="robots" content="noindex,follow"'));
    assert.ok(!urls.includes(expectedRoot + page + "/"));
  } else {
    assert.ok(urls.includes(expectedRoot + page + "/"));
  }
}
for (const city of cities) {
  const html = await load(path.join("weather", city.slug, "index.html"));
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
