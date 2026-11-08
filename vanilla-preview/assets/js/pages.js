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
    count.textContent = matches.length + " ولاية من أصل " + cities.length;
    grid.replaceChildren(...matches.map(city => {
      const link=document.createElement("a");link.className="wilaya-card";link.href="weather/"+encodeURIComponent(city.slug)+"/";
      const code=document.createElement("span");code.className="wilaya-code";code.textContent="ولاية "+city.code;
      const name=document.createElement("strong");name.textContent=city.name;
      const meta=document.createElement("small");meta.textContent=[city.name_fr,city.region].filter(Boolean).join(" · ");
      const action=document.createElement("span");action.className="wilaya-action";action.textContent="عرض الطقس ←";
      link.append(code,name,meta,action);return link;
    }));
    if(!matches.length){const empty=document.createElement("p");empty.textContent="لا توجد ولاية مطابقة للبحث.";grid.replaceChildren(empty);}
  };
  input.addEventListener("input",render);render();
}

const cityPage=document.querySelector(".city-page");
if(cityPage){
  const lat=Number(cityPage.dataset.lat),lon=Number(cityPage.dataset.lon),name=cityPage.dataset.city;
  const slug=cityPage.dataset.slug,coastal=cityPage.dataset.coastal==="true";
  const status=document.querySelector("#weather-status"),current=document.querySelector("#weather-current");
  const hourly=document.querySelector("#weather-hourly"),daily=document.querySelector("#weather-daily");
  const marineSection=document.querySelector("#marine-section"),marineNode=document.querySelector("#weather-marine");
  const insights=document.querySelector("#weather-insights"),updated=document.querySelector("#weather-updated");
  const favorite=document.querySelector("#favorite-toggle"),refresh=document.querySelector("#weather-refresh");
  const favoriteKey="atlas-favorite-cities-v1",cacheKey="atlas-weather-"+slug;
  const readFavorites=()=>{try{const value=JSON.parse(localStorage.getItem(favoriteKey)||"[]");return Array.isArray(value)?value.filter(x=>typeof x==="string"):[]}catch{return []}};
  const paintFavorite=()=>{const active=readFavorites().includes(slug);favorite.setAttribute("aria-pressed",String(active));favorite.textContent=active?"★ في المفضلة":"☆ أضف للمفضلة"};
  favorite.addEventListener("click",()=>{const values=readFavorites();const next=values.includes(slug)?values.filter(x=>x!==slug):[...values,slug];try{localStorage.setItem(favoriteKey,JSON.stringify(next));}catch{}paintFavorite();});
  paintFavorite();

  const labels={0:"سماء صافية",1:"صحو غالباً",2:"غائم جزئياً",3:"غائم",45:"ضباب",48:"ضباب كثيف",51:"رذاذ خفيف",53:"رذاذ",55:"رذاذ كثيف",56:"رذاذ متجمد",57:"رذاذ متجمد كثيف",61:"أمطار خفيفة",63:"أمطار",65:"أمطار غزيرة",66:"مطر متجمد",67:"مطر متجمد كثيف",71:"ثلوج خفيفة",73:"ثلوج",75:"ثلوج كثيفة",77:"حبيبات ثلجية",80:"زخات مطر",81:"زخات مطر",82:"زخات غزيرة",85:"زخات ثلجية",86:"زخات ثلجية كثيفة",95:"عواصف رعدية",96:"عواصف مع برد",99:"عواصف قوية مع برد"};
  const iconFor=code=>[0].includes(code)?"☀":[1,2].includes(code)?"⛅":[3,45,48].includes(code)?"☁":[71,73,75,77,85,86].includes(code)?"❄":[95,96,99].includes(code)?"ϟ":"☂";
  const direction=degrees=>["شمال","شمال شرقي","شرق","جنوب شرقي","جنوب","جنوب غربي","غرب","شمال غربي"][Math.round((degrees%360)/45)%8];
  const parseTime=value=>/Z$|[+-]\d{2}:\d{2}$/.test(value)?new Date(value):new Date(value+(value.includes("T")?"+01:00":"T12:00:00+01:00"));
  const formatHour=value=>new Intl.DateTimeFormat("ar-DZ",{hour:"numeric",minute:"2-digit",timeZone:"Africa/Algiers"}).format(parseTime(value));
  const formatDay=value=>new Intl.DateTimeFormat("ar-DZ",{weekday:"long",day:"numeric",month:"short",timeZone:"Africa/Algiers"}).format(parseTime(value));
  const formatUpdated=value=>new Intl.DateTimeFormat("ar-DZ",{hour:"numeric",minute:"2-digit",day:"numeric",month:"short",timeZone:"Africa/Algiers"}).format(parseTime(value));
  const element=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const setStatus=message=>{status.hidden=false;status.textContent=message;};
  const cacheRead=()=>{try{const item=JSON.parse(localStorage.getItem(cacheKey)||"null");if(!item||!Number.isFinite(item.savedAt)||item.value?.city?.slug!==slug)return null;const age=Date.now()-item.savedAt;return age>=0&&age<=6*60*60*1000&&Number.isFinite(item.value.current?.temperature)?item:null;}catch{return null;}};
  const fetchJson=async(url,timeout=9000)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);try{const response=await fetch(url,{signal:controller.signal,headers:{Accept:"application/json"}});if(!response.ok)throw new Error("HTTP "+response.status);const data=await response.json();if(!data||data.error)throw new Error("استجابة غير صالحة من المصدر");return data;}catch(error){if(error.name==="AbortError")throw new Error("انتهت مهلة الاتصال بمصدر الطقس.");throw error;}finally{clearTimeout(timer);}};
  const validWeather=data=>Boolean(data?.current?.time&&Number.isFinite(data.current.temperature_2m)&&Number.isFinite(data.current.relative_humidity_2m)&&Array.isArray(data?.hourly?.time)&&Array.isArray(data.hourly.temperature_2m)&&Array.isArray(data?.daily?.time)&&Array.isArray(data.daily.temperature_2m_max)&&data.hourly.time.length===data.hourly.temperature_2m.length&&data.daily.time.length===data.daily.temperature_2m_max.length);

  function renderReading(reading){
    const c=reading.current,condition=labels[c.weatherCode]||"حالة جوية متغيرة";
    const panel=element("article","current-reading");
    const top=element("div","reading-topline",(reading.isStale?"● قراءة محفوظة (غير مباشرة)":"● قراءة محدثة")+" · "+formatUpdated(reading.updatedAt));
    const main=element("div","reading-main");
    const temperature=element("strong","current-temperature",Math.round(c.temperature)+"°");
    const summary=element("div","reading-condition");
    summary.append(element("span","condition-icon",iconFor(c.weatherCode)),element("strong","",condition),element("small","", "المحسوس "+Math.round(c.apparentTemperature)+"°"));
    main.append(temperature,summary);
    const metrics=element("div","current-metrics");
    [["الرطوبة",Math.round(c.humidity)+"%"],["الرياح",Math.round(c.windSpeed)+" كم/س"],["اتجاه الرياح",direction(c.windDirection)],["الهطول",Number(c.precipitation).toFixed(1)+" مم"],["الغيوم",Math.round(c.cloudCover)+"%"]].forEach(([label,value])=>{const item=element("div","metric-item");item.append(element("small","",label),element("strong","",value));metrics.append(item);});
    const advice=reading.isStale?"هذه بيانات محفوظة وليست تحديثاً مباشراً. راجع النشرة الرسمية قبل اتخاذ قرار السفر أو الخروج.":c.weatherCode>=95?"عاصفة محتملة: تجنب المناطق المكشوفة وتابع النشرة الرسمية المحلية.":c.windSpeed>=55?"رياح قوية: ثبّت الأغراض الخارجية وخفّف الأنشطة في الأماكن المكشوفة.":c.temperature>=38?"حرارة مرتفعة: خطّط للتنقل خارج ساعات الذروة واحمل الماء.":[61,63,65,80,81,82].includes(c.weatherCode)?"هطول محتمل: راجع حالة الطريق وخذ احتياطاتك قبل التنقل.":"الأحوال مستقرة نسبياً: راقب التحديثات قبل أي رحلة طويلة.";
    panel.append(top,main,metrics,element("p","weather-advice",advice));current.replaceChildren(panel);current.hidden=false;
    updated.textContent=(reading.isStale?"آخر قراءة محفوظة · ":"آخر تحديث · ")+formatUpdated(reading.updatedAt)+" · Open-Meteo";
    renderHourly(reading.hourly);renderDaily(reading.daily);renderMarine(reading.marine);renderInsights(reading);
  }
  function renderHourly(rows){
    const now=new Date(),localNow=new Intl.DateTimeFormat("sv-SE",{timeZone:"Africa/Algiers",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit"}).format(now).replace(" ","T");
    let start=rows.findIndex(row=>row.time>=localNow);if(start<0)start=0;
    const selected=rows.slice(start,start+12);
    hourly.replaceChildren(...selected.map(row=>{const card=element("article","hour-card");card.append(element("small","",formatHour(row.time)),element("span","hour-icon",iconFor(row.weatherCode)),element("strong","",Math.round(row.temperature)+"°"),element("small","", "مطر "+(row.precipitationProbability??0)+"%"),element("small","",Math.round(row.windSpeed)+" كم/س"));return card;}));
    if(!selected.length)hourly.append(element("p","","لا تتوفر توقعات ساعية حالياً."));
  }
  function renderDaily(rows){
    daily.replaceChildren(...rows.map(row=>{const card=element("article","forecast-row");card.append(element("strong","forecast-day",formatDay(row.date)),element("span","forecast-condition",iconFor(row.weatherCode)+" "+(labels[row.weatherCode]||"متغير")),element("b","forecast-range",Math.round(row.max)+"° / "+Math.round(row.min)+"°"),element("small","forecast-extra","مطر "+(row.precipitationProbability??0)+"% · رياح "+Math.round(row.windSpeed)+" كم/س"));return card;}));
  }
  function renderMarine(value){
    if(!coastal||!value)return;
    marineSection.hidden=false;marineNode.replaceChildren();
    [["ارتفاع الموج",value.waveHeight==null?"غير متاح":Number(value.waveHeight).toFixed(1)+" م"],["اتجاه الموج",value.waveDirection==null?"غير متاح":direction(value.waveDirection)],["فترة الموج",value.wavePeriod==null?"غير متاح":Number(value.wavePeriod).toFixed(1)+" ث"]].forEach(([label,val])=>{const card=element("article","marine-card");card.append(element("small","",label),element("strong","",val));marineNode.append(card);});
  }
  function renderInsights(reading){
    const rainiest=[...reading.daily].sort((a,b)=>b.precipitationProbability-a.precipitationProbability)[0],warmest=[...reading.daily].sort((a,b)=>b.max-a.max)[0];
    const tips=[reading.current.precipitation>0||rainiest?.precipitationProbability>50?"احمل مظلة وراجع التحديث قبل الخروج.":"الأجواء جافة نسبياً؛ احرص على شرب الماء خلال النشاط الخارجي.",reading.current.windSpeed>30?"الرياح قوية؛ ثبّت الأشياء الخفيفة وتوخ الحذر في التنقل.":"الرياح ضمن مستوى معتدل وفق القراءة الحالية.",warmest?"أعلى درجة متوقعة خلال الأيام القادمة: "+Math.round(warmest.max)+"°.":"تابع التحديثات قبل الرحلات الطويلة."];
    const average=reading.daily.reduce((sum,row)=>sum+row.max,0)/Math.max(1,reading.daily.length);
    insights.replaceChildren();
    const tipsCard=element("article","insight-card");tipsCard.append(element("h3","","نصائح الطقس"));const list=element("ul","");tips.forEach(tip=>list.append(element("li","",tip)));tipsCard.append(list);
    const stats=element("article","insight-card");stats.append(element("h3","","إحصائيات سريعة"));[["متوسط العظمى",Math.round(average)+"°"],["أعلى احتمال مطر",Math.round(rainiest?.precipitationProbability??0)+"%"],["المحسوس الآن",Math.round(reading.current.apparentTemperature)+"°"]].forEach(([label,value])=>{const row=element("p","stat-line");row.append(element("span","",label),element("strong","",value));stats.append(row);});
    const sources=element("article","insight-card");sources.append(element("h3","","المصادر والتنبيهات الرسمية"),element("p","","القراءة والتوقعات من Open-Meteo. لا تستنتج هذه الصفحة التحذيرات الرسمية؛ تحقق من النشرة واليقظة الصادرة عن الديوان الوطني للأرصاد الجوية."));const link=element("a","source-link","فتح الديوان الوطني للأرصاد الجوية ↗");link.href="https://www.meteo.dz/";link.target="_blank";link.rel="noopener noreferrer";sources.append(link);
    const news=element("article","insight-card");news.append(element("h3","","متابعة الطقس والمناخ"),element("p","","مصدر إضافي للأخبار والمعلومات المناخية."));const newsLink=element("a","source-link","أخبار NOAA ↗");newsLink.href="https://www.noaa.gov/news";newsLink.target="_blank";newsLink.rel="noopener noreferrer";news.append(newsLink);
    insights.append(tipsCard,stats,sources,news);
  }
  async function loadWeather(force=false){
    refresh.disabled=true;refresh.textContent="جارٍ التحديث…";setStatus("جارٍ جلب القراءة الحالية والتوقعات من Open-Meteo…");current.hidden=true;
    const cached=cacheRead();
    if(!force&&cached&&Date.now()-cached.savedAt<15*60*1000){renderReading(cached.value);status.hidden=true;refresh.disabled=false;refresh.textContent="تحديث القراءة";return;}
    const params=new URLSearchParams({latitude:String(lat),longitude:String(lon),current:"temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day,precipitation,cloud_cover",hourly:"temperature_2m,precipitation_probability,weather_code,wind_speed_10m",daily:"weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",timezone:"Africa/Algiers",forecast_days:"7"});
    const marineParams=new URLSearchParams({latitude:String(lat),longitude:String(lon),current:"wave_height,wave_direction,wave_period",timezone:"Africa/Algiers"});
    const marinePromise=coastal?fetchJson("https://marine-api.open-meteo.com/v1/marine?"+marineParams,6500).then(data=>data?.current?{waveHeight:data.current.wave_height??null,waveDirection:data.current.wave_direction??null,wavePeriod:data.current.wave_period??null}:null).catch(()=>null):Promise.resolve(null);
    try{
      let payload=null,lastError=null;
      for(const endpoint of ["https://api.open-meteo.com/v1/forecast","https://api.open-meteo.com/v1/gfs"]){
        try{const data=await fetchJson(endpoint+"?"+params);if(!validWeather(data))throw new Error("الاستجابة الجوية غير مكتملة");payload=data;break;}catch(error){lastError=error;}
      }
      if(!payload)throw lastError||new Error("خدمة الطقس غير متاحة");
      const marine=await marinePromise,c=payload.current;
      const hours=payload.hourly.time.map((time,i)=>({time,temperature:payload.hourly.temperature_2m[i],weatherCode:payload.hourly.weather_code[i],precipitationProbability:payload.hourly.precipitation_probability[i],windSpeed:payload.hourly.wind_speed_10m[i]}));
      const days=payload.daily.time.map((date,i)=>({date,weatherCode:payload.daily.weather_code[i],max:payload.daily.temperature_2m_max[i],min:payload.daily.temperature_2m_min[i],precipitationProbability:payload.daily.precipitation_probability_max[i],windSpeed:payload.daily.wind_speed_10m_max[i]}));
      const reading={city:{slug,name},updatedAt:c.time,isStale:false,current:{temperature:c.temperature_2m,apparentTemperature:c.apparent_temperature,humidity:c.relative_humidity_2m,weatherCode:c.weather_code,windSpeed:c.wind_speed_10m,windDirection:c.wind_direction_10m,precipitation:c.precipitation,cloudCover:c.cloud_cover,isDay:Boolean(c.is_day)},hourly:hours,daily:days,marine};
      try{localStorage.setItem(cacheKey,JSON.stringify({savedAt:Date.now(),value:reading}));}catch{}
      renderReading(reading);status.hidden=true;
    }catch(error){
      if(cached){const stale={...cached.value,isStale:true};renderReading(stale);setStatus("تعذر الاتصال بالمصدر؛ نعرض آخر قراءة محفوظة.");}
      else setStatus(navigator.onLine===false?"لا يوجد اتصال بالإنترنت. تحقق من الشبكة ثم أعد المحاولة.":"تعذر جلب بيانات الطقس حالياً. "+error.message+" يمكنك إعادة المحاولة أو الرجوع إلى النسخة الحالية.");
    }finally{refresh.disabled=false;refresh.textContent="تحديث القراءة";}
  }
  refresh.addEventListener("click",()=>loadWeather(true));loadWeather();
}
