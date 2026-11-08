import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
const root=path.resolve("dist/public/vanilla-preview");
const home=await readFile(path.join(root,"index.html"),"utf8");
assert.match(home,/<html lang="ar" dir="rtl">/);
assert.match(home,/<meta name="robots" content="noindex,nofollow">/);
assert.match(home,/id="wilaya-search"/);
assert.match(home,/id="city-data"/);
const cities=JSON.parse(home.match(/<script type="application\/json" id="city-data">([\s\S]*?)<\/script>/)[1]);
assert.equal(cities.length,69);
assert.equal(new Set(cities.map(city=>city.slug)).size,69);
for(const city of cities){
 const page=await readFile(path.join(root,"weather",city.slug,"index.html"),"utf8");
 assert.ok(page.includes(`طقس ${city.name}`),`Missing city title: ${city.slug}`);
 assert.ok(!/__CITY_|__LAT__|__LON__/.test(page),`Unresolved template token: ${city.slug}`);
 assert.match(page,/<meta name="robots" content="noindex,nofollow">/);
}
await access(path.join(root,"assets/css/site.css"));
await access(path.join(root,"assets/js/site.js"));
await access(path.join(root,"assets/js/pages.js"));
console.log("Verified vanilla homepage, search data, assets, and all 69 standalone wilaya pages.");
