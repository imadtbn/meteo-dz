const normalize = (value) => String(value ?? "").normalize("NFKD").toLocaleLowerCase("en").replace(/[\u064B-\u065F\u0670\u0640]/g,"").replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/[\u0300-\u036f]/g,"").trim().replace(/\s+/g," ");
const dataNode = document.querySelector("#city-data");
if (dataNode) {
  const cities = JSON.parse(dataNode.textContent);
  const input = document.querySelector("#wilaya-search");
  const grid = document.querySelector("#wilaya-grid");
  const count = document.querySelector("#result-count");
  const render = () => {
    const query = normalize(input.value);
    const matches = cities.filter(city => normalize([city.name,city.name_fr,city.name_en,city.region,city.code,city.slug,city.phone_code].filter(Boolean).join(" ")).includes(query));
    count.textContent = query ? `${matches.length} نتيجة مطابقة` : `${cities.length} ولاية`;
    grid.replaceChildren();
    for (const city of matches) {
      const link = document.createElement("a");
      link.className = "wilaya-card";
      link.href = `weather/${encodeURIComponent(city.slug)}/`;
      const number = document.createElement("span"); number.className="wilaya-code"; number.textContent=city.code;
      const title = document.createElement("strong"); title.textContent=city.name;
      const detail = document.createElement("small"); detail.textContent=`${city.name_fr || ""} · ${city.region}`;
      const action = document.createElement("span"); action.className="wilaya-action"; action.textContent="عرض الطقس ←";
      link.append(number,title,detail,action); grid.append(link);
    }
    if (!matches.length) { const empty=document.createElement("p"); empty.textContent="لا توجد ولاية مطابقة لهذا البحث."; grid.append(empty); }
  };
  input.addEventListener("input",render); render();
}
const cityPage = document.querySelector(".city-page");
if (cityPage) {
  const lat=Number(cityPage.dataset.lat), lon=Number(cityPage.dataset.lon), name=cityPage.dataset.city;
  const status=document.querySelector("#weather-status"), current=document.querySelector("#weather-current"), daily=document.querySelector("#weather-daily"), updated=document.querySelector("#weather-updated");
  const favorite=document.querySelector("#favorite-toggle"), key="atlas-favorite-cities-v1";
  const slug=location.pathname.split("/").filter(Boolean).at(-1);
  const readFavorites=()=>{try{const value=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(value)?value.filter(x=>typeof x==="string"):[]}catch{return []}};
  const paintFavorite=()=>{const active=readFavorites().includes(slug);favorite.setAttribute("aria-pressed",String(active));favorite.textContent=active?"★ في المفضلة":"☆ أضف للمفضلة"};
  favorite.addEventListener("click",()=>{const values=readFavorites();const next=values.includes(slug)?values.filter(x=>x!==slug):[...values,slug];try{localStorage.setItem(key,JSON.stringify(next));}catch{}paintFavorite();});
  paintFavorite();
  const labels={0:"سماء صافية",1:"صحو غالباً",2:"غائم جزئياً",3:"غائم",45:"ضباب",48:"ضباب كثيف",51:"رذاذ خفيف",53:"رذاذ",55:"رذاذ كثيف",61:"أمطار خفيفة",63:"أمطار",65:"أمطار غزيرة",71:"ثلوج خفيفة",73:"ثلوج",75:"ثلوج كثيفة",80:"زخات مطر",81:"زخات مطر",82:"زخات غزيرة",95:"عواصف رعدية",96:"عواصف رعدية"};
  const formatDate=value=>new Intl.DateTimeFormat("ar-DZ",{weekday:"long",day:"numeric",month:"short",timeZone:"Africa/Algiers"}).format(new Date(value+"T12:00:00+01:00"));
  async function loadWeather(){
    status.hidden=false;status.textContent="جارٍ جلب بيانات الطقس من Open-Meteo…";
    current.hidden=true;daily.hidden=true;
    const params=new URLSearchParams({latitude:String(lat),longitude:String(lon),current:"temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",daily:"weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",timezone:"Africa/Algiers",forecast_days:"7"});
    try{
      const response=await fetch("https://api.open-meteo.com/v1/forecast?"+params,{headers:{Accept:"application/json"}});
      if(!response.ok)throw new Error("HTTP "+response.status);
      const data=await response.json();
      if(!Number.isFinite(data?.current?.temperature_2m)||!Array.isArray(data?.daily?.time))throw new Error("استجابة الطقس غير مكتملة");
      const c=data.current;
      const panel=document.createElement("div");panel.className="current-reading";
      const temp=document.createElement("strong");temp.className="current-temperature";temp.textContent=Math.round(c.temperature_2m)+"°";
      const condition=document.createElement("span");condition.textContent=labels[c.weather_code]||"حالة جوية متغيرة";
      const metrics=document.createElement("p");metrics.textContent=`المحسوس ${Math.round(c.apparent_temperature)}° · الرطوبة ${c.relative_humidity_2m}% · الرياح ${Math.round(c.wind_speed_10m)} كم/س`;
      panel.append(temp,condition,metrics);current.replaceChildren(panel);current.hidden=false;
      const rows=data.daily.time.map((date,i)=>{const row=document.createElement("article");row.className="forecast-row";const day=document.createElement("strong");day.textContent=formatDate(date);const desc=document.createElement("span");desc.textContent=labels[data.daily.weather_code[i]]||"متغير";const range=document.createElement("b");range.textContent=`${Math.round(data.daily.temperature_2m_max[i])}° / ${Math.round(data.daily.temperature_2m_min[i])}°`;const rain=document.createElement("small");rain.textContent="احتمال المطر "+(data.daily.precipitation_probability_max[i]??0)+"%";row.append(day,desc,range,rain);return row;});
      daily.replaceChildren(...rows);daily.hidden=false;status.hidden=true;
      updated.textContent="آخر تحديث من المصدر: "+new Intl.DateTimeFormat("ar-DZ",{hour:"numeric",minute:"2-digit",timeZone:"Africa/Algiers"}).format(new Date(c.time));
    }catch(error){status.textContent="تعذر جلب قراءة الطقس حالياً. "+error.message+" يمكنك إعادة المحاولة أو فتح النسخة الحالية."; }
  }
  document.querySelector("#weather-refresh").addEventListener("click",loadWeather);loadWeather();
}