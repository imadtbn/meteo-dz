import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
const root=path.resolve("dist/public/vanilla-preview");
const home=await readFile(path.join(root,"index.html"),"utf8");
const js=await readFile(path.join(root,"assets/js/pages.js"),"utf8");
const css=await readFile(path.join(root,"assets/css/site.css"),"utf8");
assert.match(home,/<html lang="ar" dir="rtl">/);
assert.match(home,/<meta name="robots" content="noindex,nofollow">/);
assert.match(home,/id="wilaya-search"/);
assert.match(home,/id="city-data"/);
const cities=JSON.parse(home.match(/<script type="application\\/json" id="city-data">([\\s\\S]*?)<\\/script>/)[1]);
assert.equal(cities.length,69);
assert.equal(new Set(cities.map(city=>city.slug)).size,69);
assert.ok(cities.every(city=>Number.isFinite(city.latitude)&&Number.isFinite(city.longitude)));
for(const city of cities){
 const page=await readFile(path.join(root,"weather",city.slug,"index.html"),"utf8");
 assert.ok(page.includes(`طقس ${city.name}`),`Missing city title: ${city.slug}`);
 assert.ok(!/__CITY_|__LAT__|__LON__|__COASTAL__/.test(page),`Unresolved template token: ${city.slug}`);
 assert.match(page,/<meta name="robots" content="noindex,nofollow">/);
 for(const id of ["weather-status","weather-current","weather-hourly","weather-daily","weather-insights","weather-refresh","favorite-toggle"]) {
  assert.ok(page.includes(`id="${id}"`),`Missing ${id} in ${city.slug}`);
 }
 assert.ok(page.includes(`data-coastal="${String(Boolean(city.coastal))}"`),`Missing coastal metadata: ${city.slug}`);
}
for(const feature of ["atlas-weather-","atlas-favorite-cities-v1","api.open-meteo.com/v1/forecast","api.open-meteo.com/v1/gfs","marine-api.open-meteo.com","wind_direction_10m","precipitation_probability","isStale"]) {
 assert.ok(js.includes(feature),`Missing weather parity feature: ${feature}`);
}
assert.ok(css.includes(".weather-hourly")&&css.includes(".weather-insights")&&css.includes("@media(max-width:600px)"));
assert.doesNotMatch(js,/from ["']react|from ["']wouter|import\.meta\.env/);
await access(path.join(root,"assets/css/site.css"));
await access(path.join(root,"assets/js/site.js"));
await access(path.join(root,"assets/js/pages.js"));
console.log("Verified isolated vanilla homepage, 69 wilaya pages, hourly/daily forecasts, coastal marine data, caching, favorites, and responsive assets.");
