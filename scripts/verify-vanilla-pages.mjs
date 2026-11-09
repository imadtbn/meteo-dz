import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
const root=path.resolve("dist/public/vanilla-preview");
const home=await readFile(path.join(root,"index.html"),"utf8");
const js=await readFile(path.join(root,"assets/js/pages.js"),"utf8");
const css=await readFile(path.join(root,"assets/css/site.css"),"utf8");
const mapPage=await readFile(path.join(root,"map","index.html"),"utf8");
const mapJs=await readFile(path.join(root,"assets/js/map.js"),"utf8");
const mapCss=await readFile(path.join(root,"assets/css/map.css"),"utf8");
const globalPage=await readFile(path.join(root,"global-weather","index.html"),"utf8");
const globalJs=await readFile(path.join(root,"assets/js/global-weather.js"),"utf8");
const climatePage=await readFile(path.join(root,"climate-observatory","index.html"),"utf8");
const climateJs=await readFile(path.join(root,"assets/js/climate.js"),"utf8");
const climateCss=await readFile(path.join(root,"assets/css/climate.css"),"utf8");
const agriculturePage=await readFile(path.join(root,"agriculture-weather","index.html"),"utf8");
const agricultureJs=await readFile(path.join(root,"assets/js/agriculture-weather.js"),"utf8");
const agricultureCss=await readFile(path.join(root,"assets/css/agriculture-weather.css"),"utf8");
assert.match(home,/<html lang="ar" dir="rtl">/);
assert.match(home,/<meta name="robots" content="noindex,nofollow">/);
assert.match(home,/id="wilaya-search"/);
assert.match(home,/id="city-data"/);
assert.match(home,/href="map\/">/);
assert.match(mapPage,/<meta name="robots" content="noindex,nofollow">/);
assert.match(mapPage,/id="atlas-map"/);
assert.match(mapPage,/id="city-data"/);
assert.match(mapPage,/id="capital-data"/);
assert.ok(mapJs.includes("capital-data")&&mapJs.includes("global-weather")&&mapJs.includes("tileload")&&mapJs.includes("tileerror"));
assert.ok(mapPage.includes("22 عاصمة عربية"));
assert.match(mapPage,/assets\/js\/map.js/);
assert.match(globalPage,/<meta name="robots" content="noindex,nofollow">/);
assert.match(climatePage,/<meta name="robots" content="noindex,nofollow">/);
assert.ok(climatePage.includes('id="climate-city"')&&climatePage.includes('id="climate-results"')&&climatePage.includes('id="city-data"'));
assert.ok(climateJs.includes("power.larc.nasa.gov/api/temporal/daily/point")&&climateJs.includes("T2M_MAX,T2M_MIN,PRECTOTCORR,WS10M,RH2M")&&climateJs.includes("atlas-nasa-power:")&&climateJs.includes("growingDegreeDays")===false);
assert.ok(climateJs.includes("frost")&&climateJs.includes("hot")&&climateJs.includes("precipitation")&&climateJs.includes("AbortController"));
assert.ok(climateCss.includes(".climate-stat-grid")&&climateCss.includes("@media(max-width:760px)"));
assert.ok(home.includes("climate-observatory/"),"Homepage must link to the climate observatory.");
assert.match(agriculturePage,/<meta name="robots" content="noindex,nofollow">/);
for(const id of ["agri-city","agri-period","agri-base","agri-results","agri-gdd","agri-rain","agri-frost","agri-heat","agri-rainy","city-data"]) assert.ok(agriculturePage.includes(`id="${id}"`),`Missing agriculture control: ${id}`);
for(const feature of ["power.larc.nasa.gov/api/temporal/daily/point","T2M_MAX,T2M_MIN,PRECTOTCORR","growingDegreeDays","frostDays","heatDays","rainyDays","AbortController","atlas-agriculture-power:"]) assert.ok(agricultureJs.includes(feature),`Missing agriculture feature: ${feature}`);
assert.ok(agricultureCss.includes(".agriculture-stat-grid")&&agricultureCss.includes("@media (max-width: 760px)"));
assert.ok(agriculturePage.includes("لا تستخدم النتائج وحدها لاتخاذ قرارات الري أو المعالجة"));
assert.ok(globalPage.includes("global-current")&&globalPage.includes("global-days"));
assert.ok(globalJs.includes("api.open-meteo.com/v1/forecast")&&globalJs.includes("forecast_days")&&globalJs.includes("precipitation_probability_max"));
assert.ok(mapJs.includes("../global-weather/"),"Capital markers must link to the generated global weather page.");
assert.ok(mapJs.includes("OpenStreetMap")&&mapJs.includes("weatherapi.com")&&mapJs.includes("data-layer"));
assert.ok(mapCss.includes(".atlas-map")&&mapCss.includes("@media(max-width:700px)"));
const marker = '<script type="application/json" id="city-data">';
const dataStart=home.indexOf(marker)+marker.length;
const dataEnd=home.indexOf("</script>",dataStart);
assert.ok(dataStart>=marker.length&&dataEnd>dataStart,"Embedded city JSON block must exist");
const cities=JSON.parse(home.slice(dataStart,dataEnd));
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
await access(path.join(root,"map","index.html"));
await access(path.join(root,"climate-observatory","index.html"));
await access(path.join(root,"agriculture-weather","index.html"));
await access(path.join(root,"assets/js/agriculture-weather.js"));
await access(path.join(root,"assets/css/agriculture-weather.css"));
await access(path.join(root,"assets/css/climate.css"));
await access(path.join(root,"assets/js/climate.js"));
await access(path.join(root,"assets/css/map.css"));
await access(path.join(root,"assets/js/map.js"));

const directoryJs=await readFile(path.join(root,"assets/js/directory-pages.js"),"utf8");
for(const slug of ["wilayas","favorites","alerts","arab-capitals","world-search"]){
 const page=await readFile(path.join(root,slug,"index.html"),"utf8");
 assert.match(page,/<meta name="robots" content="noindex,nofollow">/);
 assert.match(page,/id="city-data"/);
 assert.match(page,/id="capital-data"/);
 assert.match(page,/assets\/js\/directory-pages.js/);
}
for(const feature of ["atlas-favorite-cities-v1","geocoding-api.open-meteo.com","arab-capitals","world-search","meteo.dz/bms","meteo.dz/rss","wilayas","AbortController"]) assert.ok(directoryJs.includes(feature),`Missing directory parity feature: ${feature}`);
assert.ok(home.includes('href="wilayas/"')&&home.includes('href="favorites/"')&&home.includes('href="alerts/"')&&home.includes('href="world-search/"'));
assert.ok(home.includes('href="arab-capitals/"'));
console.log("Verified isolated vanilla homepage, 69 wilaya pages, hourly/daily forecasts, coastal marine data, caching, favorites, interactive weather map, NASA POWER climate observatory, and responsive assets.");
