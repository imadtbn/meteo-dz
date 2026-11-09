const kind=document.body.dataset.page;
const root=document.querySelector("#page-content"),count=document.querySelector("#page-count"),status=document.querySelector("#page-status");
const cities=JSON.parse(document.querySelector("#city-data")?.textContent||"[]");
const capitals=JSON.parse(document.querySelector("#capital-data")?.textContent||"[]");
const norm=value=>String(value??"").normalize("NFKD").toLocaleLowerCase("en").replace(/[\u064B-\u065F\u0670\u0640]/g,"").replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/[\u0300-\u036f]/g,"").trim().replace(/\s+/g," ");
const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
const card=(title,description,href,label="فتح الصفحة")=>{const a=node("a","feature-card");a.href=href;a.append(node("span","feature-index","↗"),node("h3","",title),node("p","",description),node("span","",label+" ←"));return a;};
const setStatus=message=>{status.hidden=!message;status.textContent=message||"";};
const setCount=message=>{count.textContent=message||"";};
const localHref=slug=>"../weather/"+encodeURIComponent(slug)+"/";
const saved=()=>{try{const data=JSON.parse(localStorage.getItem("atlas-favorite-cities-v1")||"[]");return Array.isArray(data)?data.filter(x=>typeof x==="string"):[]}catch{return []}};
if(kind==="wilayas"){
 const input=node("input","directory-search-input");input.type="search";input.placeholder="ابحث بالعربية أو الفرنسية أو اللاتينية أو رمز الولاية والهاتف";input.setAttribute("aria-label","بحث الولايات");
 const wrap=node("div","");wrap.style.cssText="display:grid;gap:1rem;grid-column:1/-1";wrap.append(input);
 const grid=node("div","directory-grid");grid.style.cssText="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:1rem;grid-column:1/-1";root.append(wrap,grid);
 const render=()=>{const q=norm(input.value);const rows=cities.filter(c=>norm([c.name,c.name_fr,c.name_en,c.region,c.code,c.slug,c.phone_code].join(" ")).includes(q));setCount(rows.length+" ولاية من أصل "+cities.length);grid.replaceChildren(...rows.map(c=>card(c.name,"ولاية "+c.code+" · "+c.region+" · "+(c.name_fr||""),localHref(c.slug),"توقعات الطقس")));if(!rows.length)setStatus("لا توجد ولاية مطابقة للبحث.");else setStatus("");};
 input.addEventListener("input",render);render();
}else if(kind==="favorites"){
 const render=()=>{const ids=saved(),rows=cities.filter(c=>ids.includes(c.slug));setCount(rows.length+" ولاية محفوظة على هذا الجهاز");root.replaceChildren(...rows.map(c=>{const wrap=node("div","feature-card");wrap.append(node("h3","",c.name),node("p","",c.region+" · ولاية "+c.code),card("فتح توقعات "+c.name,"القراءة الحالية والتوقعات الساعية واليومية",localHref(c.slug)));const remove=node("button","action-button","إزالة من المفضلة");remove.type="button";remove.addEventListener("click",()=>{try{localStorage.setItem("atlas-favorite-cities-v1",JSON.stringify(ids.filter(x=>x!==c.slug)))}catch{}render()});wrap.append(remove);return wrap;}));if(!rows.length){root.append(card("استكشف الولايات","أضف الولايات التي تتابعها إلى المفضلة من صفحة الطقس.","../wilayas/"));setStatus("لم تحفظ أي ولاية بعد. أضف ولاية من صفحة الطقس لعرضها هنا.");}else setStatus("");};
 render();window.addEventListener("storage",render);
}else if(kind==="alerts"){
 setCount("المصادر الرسمية للتحذيرات الجوية");
 const sources=[["خريطة اليقظة الجوية","تابع مستوى اليقظة العامة والبحرية حسب الولاية والظواهر الجوية.","https://www.meteo.dz/?lang=ar"],["النشرات الجوية الخاصة BMS","راجع التحذيرات الرسمية ومناطق سريانها وفترة صلاحيتها.","https://www.meteo.dz/bms"],["قنوات RSS وCAP","تحقق من قنوات النشر الرسمية المتاحة لدى الديوان الوطني للأرصاد الجوية.","https://www.meteo.dz/rss"]];
 root.replaceChildren(...sources.map(([title,desc,url])=>card(title,desc,url,"زيارة المصدر الرسمي")));
 root.append(card("إرشادات السلامة","اعتمد على النشرة الرسمية ولا تعتبر التوقعات العامة بديلاً عن التحذير. تحقق من وقت الإصدار والإلغاء قبل النشاط البحري أو التنقل.","https://www.meteo.dz/?lang=ar","مراجعة الديوان"));
 setStatus("هذه صفحة دليل روابط وليست خدمة إنذار مستقلة. المصدر الرسمي هو المرجع الوحيد للتحذيرات والقرارات.");
}else if(kind==="arab-capitals"){
 const render=items=>{root.replaceChildren(...items.map(c=>card(c.capital,c.country+" · "+c.englishName,"../global-weather/?lat="+encodeURIComponent(c.latitude)+"&lon="+encodeURIComponent(c.longitude)+"&name="+encodeURIComponent(c.capital),"عرض الطقس")));setCount(items.length+" عاصمة عربية");};
 const input=node("input","directory-search-input");input.type="search";input.placeholder="ابحث باسم الدولة أو العاصمة";input.setAttribute("aria-label","بحث العواصم");const wrap=node("div","");wrap.style.cssText="grid-column:1/-1";wrap.append(input);root.append(wrap);input.addEventListener("input",()=>{const q=norm(input.value);render(capitals.filter(c=>norm([c.country,c.capital,c.englishName].join(" ")).includes(q)))});render(capitals);
}else if(kind==="world-search"){
 const params=new URLSearchParams(location.search),initial=(params.get("q")||"").slice(0,100);
 const input=node("input","directory-search-input");input.type="search";input.placeholder="ابحث بالعربية أو اللاتينية عن مدينة أو دولة";input.setAttribute("aria-label","البحث عن مدينة أو دولة");input.value=initial;input.autocomplete="off";
 const search=node("button","button button-primary","بحث عالمي");search.type="button";
 const locate=node("button","button button-secondary","موقعي الحالي");locate.type="button";
 const controls=node("div","");controls.style.cssText="display:flex;gap:.6rem;flex-wrap:wrap;grid-column:1/-1";controls.append(input,search,locate);root.append(controls);
 const results=node("div","");results.style.cssText="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:1rem;grid-column:1/-1";root.append(results);
 const weatherUrl=(lat,lon,name)=>"../global-weather/?lat="+encodeURIComponent(lat)+"&lon="+encodeURIComponent(lon)+"&name="+encodeURIComponent(name);
 const flag=code=>{if(!/^[a-z]{2}$/i.test(code||""))return "🌍";return String.fromCodePoint(...code.toUpperCase().split("").map(c=>127397+c.charCodeAt(0)))};
 let controller=null,timer=null,sequence=0;
 const renderLocal=q=>cities.filter(c=>norm([c.name,c.name_fr,c.name_en,c.region,c.code,c.slug,c.phone_code].join(" ")).includes(norm(q))).slice(0,6).map(c=>{const a=card(c.name,"الجزائر · "+c.region+" · الولاية "+c.code,localHref(c.slug),"توقعات الطقس");a.classList.add("search-result");return a;});
 const renderPlaces=places=>places.map(p=>{const wrap=node("article","feature-card");wrap.append(node("span","feature-index",flag(p.country_code)),node("h3","",p.name),node("p","",[p.admin1,p.country,p.timezone].filter(Boolean).join(" · ")||"مدينة عالمية"),node("p","",Number(p.latitude).toFixed(3)+"°, "+Number(p.longitude).toFixed(3)+"°"));const actions=node("div","search-result__actions");const weather=node("a","button button-primary","عرض الطقس");weather.href=weatherUrl(p.latitude,p.longitude,p.name);const map=node("a","button button-secondary","عرض على الخريطة");map.href="../map/?lat="+encodeURIComponent(p.latitude)+"&lon="+encodeURIComponent(p.longitude);actions.append(weather,map);wrap.append(actions);return wrap;});
 const run=async(q=input.value.trim())=>{
  clearTimeout(timer);const request=++sequence;if(q.length<2){controller?.abort();results.replaceChildren();setCount("ابدأ بكتابة حرفين على الأقل");setStatus("اكتب حرفين على الأقل للبحث العالمي.");return;}
  controller?.abort();controller=new AbortController();const local=renderLocal(q);results.replaceChildren(...local);setCount(local.length+" ولاية جزائرية مطابقة · جارٍ البحث عالميًا…");setStatus("جارٍ البحث في المدن والدول حول العالم…");
  try{const url=new URL("https://geocoding-api.open-meteo.com/v1/search");url.search=new URLSearchParams({name:q,count:"10",language:"ar",format:"json"}).toString();const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error("network");const payload=await response.json();if(request!==sequence)return;
   const places=Array.isArray(payload.results)?payload.results.filter(p=>p&&typeof p.name==="string"&&Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=90&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180):[];
   const remote=renderPlaces(places);results.replaceChildren(...local,...remote);setCount((local.length+places.length)+" نتيجة · "+local.length+" محلية و"+places.length+" عالمية");setStatus(local.length||places.length?"اختر نتيجة لفتح توقعات الطقس أو موقعها على الخريطة.":"لا توجد نتائج. جرّب الاسم باللغة الإنجليزية أو أضف اسم الدولة.");
  }catch(error){if(error.name!=="AbortError"&&request===sequence){setCount(local.length+" نتيجة محلية");setStatus("تعذر الاتصال بمحرك البحث العالمي. تحقق من الإنترنت؛ نتائج الولايات الجزائرية ما زالت متاحة.");}}
 };
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>run(),350)};
 input.addEventListener("input",schedule);search.addEventListener("click",()=>run());input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();run();}});
 locate.addEventListener("click",()=>{
  if(!window.isSecureContext){setStatus("تحديد الموقع يحتاج إلى اتصال HTTPS آمن.");return;}
  if(!navigator.geolocation){setStatus("هذا المتصفح لا يدعم تحديد الموقع.");return;}
  locate.disabled=true;setStatus("جارٍ تحديد موقع الجهاز بعد موافقتك…");
  navigator.geolocation.getCurrentPosition(async({coords})=>{
   const lat=coords.latitude,lon=coords.longitude;if(!Number.isFinite(lat)||!Number.isFinite(lon)){setStatus("الإحداثيات المستلمة غير صالحة.");locate.disabled=false;return;}
   let name="موقعي الحالي";try{const u=new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");u.search=new URLSearchParams({latitude:String(lat),longitude:String(lon),localityLanguage:"ar"}).toString();const response=await fetch(u);if(response.ok){const data=await response.json();name=data.city||data.locality||data.principalSubdivision||data.countryName||name;}}catch{}
   const a=node("a","button button-primary","عرض طقس "+name);a.href=weatherUrl(lat,lon,name);const m=node("a","button button-secondary","فتح الخريطة");m.href="../map/?lat="+lat+"&lon="+lon;results.replaceChildren(a,m);setCount("تم تحديد موقعك");setStatus("الإحداثيات: "+lat.toFixed(4)+", "+lon.toFixed(4)+" · أسماء المناطق تقريبية.");locate.disabled=false;
  },error=>{locate.disabled=false;setStatus(error.code===1?"رفضت إذن الموقع. يمكنك البحث عن المدينة يدويًا.":error.code===2?"تعذر تحديد موقع الجهاز. تحقق من خدمات الموقع.":"انتهت مهلة تحديد الموقع. حاول مجددًا أو ابحث يدويًا.");},{enableHighAccuracy:false,timeout:12000,maximumAge:300000});
 });
 if(initial.length>=2)run(initial);else{setCount("ابحث في مدن العالم");setStatus("يدعم البحث أسماء المدن والدول بالعربية واللاتينية، كما يعرض الولايات الجزائرية المطابقة.");}
}else{setStatus("نوع الصفحة غير معروف.");}
