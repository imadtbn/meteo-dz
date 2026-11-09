import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const source = path.resolve("vanilla-preview");
const output = path.resolve("dist/public/vanilla-preview");
const read = file => readFile(path.join(source,file),"utf8");
const homeTemplate = await read("home.template.html");
const directoryTemplate = await read("directory-pages.template.html");
const visual = await read("assets/js/place-illustration.js");
const homeVisual = await read("assets/js/home-visual-parity.js");
const shareExport = await read("assets/js/share-export-parity.js");
const directory = await read("assets/js/directory-parity.js");
const homeParity = await read("assets/js/home-parity.js");
const homeCss = await read("assets/css/home-parity.css");
const weatherTemplate = await read("weather.template.html");
const css = await read("assets/css/directory-parity.css");
const home = await readFile(path.join(output,"index.html"),"utf8");
const wilayas = await readFile(path.join(output,"wilayas","index.html"),"utf8");
const capitals = await readFile(path.join(output,"arab-capitals","index.html"),"utf8");
const world = await readFile(path.join(output,"world-search","index.html"),"utf8");

assert.ok(homeTemplate.includes('assets/js/home-visual-parity.js'));
assert.ok(directoryTemplate.includes('assets/js/directory-parity.js'));
assert.ok(directoryTemplate.includes('assets/css/directory-parity.css'));
assert.ok(home.includes('assets/js/home-visual-parity.js'));
assert.ok(home.includes('assets/js/share-export-parity.js'));
for (const feature of ["stopImmediatePropagation","canvas.toBlob","URL.revokeObjectURL","image.onerror","image.onload","30000","weather-"]) assert.ok(shareExport.includes(feature), "Missing resilient PNG export behavior: " + feature);
for (const id of ["favorite-toggle","share-dialog","share-native","share-copy","share-image"]) assert.ok(home.includes(`id="${id}"`), `Missing share/favorite control: ${id}`);
for (const feature of ["navigator.share","share-image","toBlob","atlas-favorite-cities-v1","storage","function shareUrl()","weather/"]) assert.ok(homeParity.includes(feature), `Missing share/favorite behavior: ${feature}`);
assert.ok(homeCss.includes(".favorite-toggle") && homeCss.includes(".share-dialog") && homeCss.includes("@media(max-width:650px)"));
assert.ok(weatherTemplate.includes('id="favorite-toggle"') && weatherTemplate.includes('id="weather-refresh"'));
for (const page of [wilayas,capitals,world]) {
  assert.match(page,/<meta name="robots" content="noindex,nofollow">/);
  assert.ok(page.includes("assets/js/directory-parity.js"));
  assert.ok(page.includes("assets/css/directory-parity.css"));
}
assert.ok(!directoryTemplate.includes("../weather-map/"),"Standalone navigation must not point to a missing weather-map directory.");
for (const scene of ["coast","desert","mountain","highland","river","city"]) {
  assert.ok(visual.includes(scene),`Missing React illustration scene: ${scene}`);
}
for (const palette of ["#a9dbeb","#f3dcb2","#c1d9df","#d1e9df","#d9e3e3","#c7dde7"]) {
  assert.ok(visual.includes(palette),`Missing React illustration palette: ${palette}`);
}
for (const feature of ["wilayaScene","capitalScene","countryFlag","createPlaceIllustration","preserveAspectRatio","role","aria-label"]) {
  assert.ok(visual.includes(feature),`Missing illustration behavior: ${feature}`);
}
for (const feature of ["MutationObserver","region-grid--visual-home","createPlaceIllustration","wilayaScene"]) {
  assert.ok(homeVisual.includes(feature),`Missing homepage illustration enhancement: ${feature}`);
}
for (const feature of ["geocoding-api.open-meteo.com/v1/search","navigator.geolocation.getCurrentPosition","AbortController","reverse-geocode-client","timeout:12000","9000","Math.abs(latitude)>90","Math.abs(longitude)>180","pagehide","countryFlag","capitalScene","wilayaScene"]) {
  assert.ok(directory.includes(feature),`Missing standalone directory/search behavior: ${feature}`);
}
assert.ok(css.includes(".directory-grid--visual-parity"));
assert.ok(css.includes(".world-search-results"));
assert.ok(css.includes("@media(max-width:520px)"));
assert.ok(css.includes("min-width:0") && css.includes("minmax(0,1fr)"), "Responsive grids must constrain child overflow.");
for (const route of ["map","global-weather","climate-observatory","agriculture-weather","favorites","alerts","arab-capitals","world-search","wilayas"]) {
  const page = await readFile(path.join(output,route,"index.html"),"utf8");
  assert.match(page,/<meta name="robots" content="noindex,nofollow">/);
}
assert.ok(directoryTemplate.includes('href="../map/"'), "Directory navigation must link to the generated standalone map route.");
assert.doesNotMatch(visual+homeVisual+directory,/from ["']react|from ["']wouter|import\.meta\.env/);
console.log("Verified React-matched place illustrations, standalone wilaya/capital cards, world search, coordinate validation, geolocation/reverse-geocoding fallbacks, responsive styles, and isolated preview routes.");
