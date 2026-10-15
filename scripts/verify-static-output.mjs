import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import cities from "../client/src/data/cities.json" with { type: "json" };

const root = path.resolve("dist/public");
const load = (relative) => readFile(path.join(root, relative), "utf8");
const landing = ["wilayas", "arab-capitals", "world-search", "global-weather", "weather-map"];

const homepage = await load("index.html");
assert.match(homepage, /<html lang="ar" dir="rtl">/);
assert.match(homepage, /<div id="root"><\/div>/);
assert.doesNotMatch(homepage, /%VITE_/);

const manifest = JSON.parse(await load("manifest.webmanifest"));
assert.equal(manifest.start_url, "/meteo-dz/");
assert.equal(manifest.scope, "/meteo-dz/");
assert.ok(manifest.shortcuts?.length >= 3);

const sitemap = await load("sitemap.xml");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((item) => item[1]);
assert.equal(urls.length, 1 + landing.length + cities.length);
assert.equal(new Set(urls).size, urls.length);
for (const page of landing) {
  const html = await load(path.join(page, "index.html"));
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.ok(urls.includes("https://imadtbn.github.io/meteo-dz/" + page + "/"));
}
for (const city of cities) {
  const html = await load(path.join("weather", city.slug, "index.html"));
  assert.ok(html.includes(city.name), "Missing city metadata: " + city.slug);
  assert.ok(urls.includes("https://imadtbn.github.io/meteo-dz/weather/" + city.slug + "/"));
}
await stat(path.join(root, "sw.js"));
await stat(path.join(root, "favicon.svg"));
console.log("Verified homepage, PWA files, " + landing.length + " landing routes and " + cities.length + " city pages.");
