import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import cities from "../client/src/data/cities.json" with { type: "json" };

const source = path.resolve("vanilla-preview");
const output = path.resolve("dist/public/vanilla-preview");
const homeTemplate = await readFile(path.join(source, "home.template.html"), "utf8");
const cityTemplate = await readFile(path.join(source, "weather.template.html"), "utf8");
const escapeHtml = (value) => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
const safeCities = cities.map(city => ({
  code:String(city.code),slug:String(city.slug),name:String(city.name),name_fr:String(city.name_fr ?? ""),
  name_en:String(city.name_en ?? ""),phone_code:String(city.phone_code ?? ""),coastal:Boolean(city.coastal),region:String(city.region),
  latitude:Number(city.latitude),longitude:Number(city.longitude)
}));
if (safeCities.length !== 69 || new Set(safeCities.map(city=>city.slug)).size !== 69) {
  throw new Error("Vanilla preview requires exactly 69 unique city slugs.");
}
await mkdir(output,{recursive:true});
await cp(path.join(source,"assets"),path.join(output,"assets"),{recursive:true});
const data = JSON.stringify(safeCities).replaceAll("<","\\u003c").replaceAll(">","\\u003e").replaceAll("&","\\u0026");
await writeFile(path.join(output,"index.html"),homeTemplate.replace("__CITY_DATA__",data));
const cityRoot=path.join(output,"weather");
for(const city of safeCities){
  const values={
    "__CITY_NAME__":escapeHtml(city.name),"__CITY_SLUG__":encodeURIComponent(city.slug),
    "__CITY_CODE__":escapeHtml(city.code),"__CITY_FR__":escapeHtml(city.name_fr || "غير متوفر"),
    "__CITY_EN__":escapeHtml(city.name_en || "غير متوفر"),"__REGION__":escapeHtml(city.region),
    "__PHONE__":escapeHtml(city.phone_code || "غير متوفر"),"__COASTAL__":String(city.coastal),"__LAT__":String(city.latitude),"__LON__":String(city.longitude)
  };
  let html=cityTemplate;
  for(const [token,value] of Object.entries(values)) html=html.replaceAll(token,value);
  const directory=path.join(cityRoot,city.slug);
  await mkdir(directory,{recursive:true});
  await writeFile(path.join(directory,"index.html"),html);
}
console.log(`Generated isolated vanilla homepage and ${safeCities.length} standalone wilaya pages.`);
