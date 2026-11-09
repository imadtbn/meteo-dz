import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import cities from "../client/src/data/cities.json" with { type: "json" };

const source = path.resolve("vanilla-preview");
const output = path.resolve("dist/public/vanilla-preview");
const homeTemplate = await readFile(path.join(source, "home.template.html"), "utf8");
const cityTemplate = await readFile(path.join(source, "weather.template.html"), "utf8");
const mapTemplate = await readFile(path.join(source, "map.template.html"), "utf8");
const globalWeatherTemplate = await readFile(path.join(source, "global-weather.template.html"), "utf8");
const climateTemplate = await readFile(path.join(source, "climate-observatory.template.html"), "utf8");
const agricultureTemplate = await readFile(path.join(source, "agriculture-weather.template.html"), "utf8");
const directoryTemplate = await readFile(path.join(source, "directory-pages.template.html"), "utf8");
const arabCapitals = JSON.parse(await readFile(path.resolve("vanilla-preview/data/arab-capitals.json"), "utf8"));
const injectAdContainer = (html, placement) => html.replace(/(<section class="(?:hero-band|hero(?:\\s[^"]*)?|map-hero|map-page-hero|climate-hero)"[^>]*>[\\s\\S]*?<\\/section>)/, match => `${match}\\n<section class="ad-slot" data-ad-placement="${placement}" aria-label="مساحة إعلانية"><span>مساحة إعلانية</span><div class="ad-slot__content" aria-hidden="true"></div></section>`);
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
await writeFile(path.join(output,"index.html"),injectAdContainer(homeTemplate.replace("__CITY_DATA__",data),"home"));
const mapRoot=path.join(output,"map");
await mkdir(mapRoot,{recursive:true});
const capitalData = JSON.stringify(arabCapitals).replaceAll("<","\\u003c").replaceAll(">","\\u003e").replaceAll("&","\\u0026");
await writeFile(path.join(mapRoot,"index.html"),injectAdContainer(mapTemplate.replace("__CITY_DATA__",data).replace("__CAPITAL_DATA__",capitalData),"map"));
const globalRoot=path.join(output,"global-weather");
await mkdir(globalRoot,{recursive:true});
await writeFile(path.join(globalRoot,"index.html"),injectAdContainer(globalWeatherTemplate,"global-weather"));
const climateRoot=path.join(output,"climate-observatory");
await mkdir(climateRoot,{recursive:true});
await writeFile(path.join(climateRoot,"index.html"),injectAdContainer(climateTemplate.replace("__CITY_DATA__",data),"climate"));
const agricultureRoot=path.join(output,"agriculture-weather");
await mkdir(agricultureRoot,{recursive:true});
await writeFile(path.join(agricultureRoot,"index.html"),injectAdContainer(agricultureTemplate.replace("__CITY_DATA__",data),"agriculture"));

const directoryPages=[
 {slug:"wilayas",kind:"wilayas",title:"دليل الولايات الجزائرية",description:"دليل الولايات الجزائرية الـ69 والبحث بأسماء الولايات ورموزها",heading:"ولايات الجزائر الـ69",intro:"ابحث عن أي ولاية بالاسم العربي أو الفرنسي أو اللاتيني أو رمز الولاية أو الهاتف.",subheading:"اختر الولاية لفتح توقعات الطقس"},
 {slug:"favorites",kind:"favorites",title:"ولاياتي المفضلة",description:"الولايات المحفوظة محلياً في مرصد الأطلس",heading:"ولاياتك المفضلة",intro:"قائمة الولايات التي حفظتها على هذا الجهاز، دون الحاجة إلى إنشاء حساب.",subheading:"الولايات المحفوظة"},
 {slug:"alerts",kind:"alerts",title:"الإنذارات الجوية الرسمية",description:"روابط النشرات والتحذيرات الرسمية للديوان الوطني للأرصاد الجوية",heading:"الإنذارات الجوية الرسمية",intro:"الوصول إلى اليقظة الجوية والنشرات الخاصة من مصادرها الرسمية.",subheading:"مصادر التنبيه المعتمدة"},
 {slug:"arab-capitals",kind:"arab-capitals",title:"العواصم العربية",description:"دليل الطقس في 22 عاصمة عربية",heading:"الطقس في العواصم العربية",intro:"اختر عاصمة عربية لفتح القراءة الجوية والتوقعات حسب إحداثياتها.",subheading:"العواصم الـ22"},
 {slug:"world-search",kind:"world-search",title:"البحث العالمي عن المدن",description:"ابحث عن المدن حول العالم وافتح توقعات الطقس",heading:"ابحث عن مدينة حول العالم",intro:"استخدم محرك البحث الجغرافي للعثور على المدن وفتح توقعات الطقس العالمية.",subheading:"محرك البحث العالمي"}
];
for(const page of directoryPages){
 const directory=path.join(output,page.slug);await mkdir(directory,{recursive:true});
 const html=injectAdContainer(directoryTemplate.replaceAll("__TITLE__",page.title).replaceAll("__DESCRIPTION__",page.description).replaceAll("__HEADING__",page.heading).replaceAll("__INTRO__",page.intro).replaceAll("__SUBHEADING__",page.subheading).replaceAll("__KIND__",page.kind).replace("__CITY_DATA__",data).replace("__CAPITAL_DATA__",capitalData),page.slug);
 await writeFile(path.join(directory,"index.html"),injectAdContainer(html,`wilaya-${city.code}`));
}
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
