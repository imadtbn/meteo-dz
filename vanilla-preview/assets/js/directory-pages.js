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
 const input=node("input","directory-search-input");input.type="search";input.placeholder="اكتب اسم مدينة حول العالم";input.setAttribute("aria-label","بحث مدينة عالمية");const search=node("button","button button-primary","بحث");search.type="button";const controls=node("div","");controls.style.cssText="display:flex;gap:.6rem;flex-wrap:wrap;grid-column:1/-1";controls.append(input,search);root.append(controls);
 const results=node("div","");results.style.cssText="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:1rem;grid-column:1/-1";root.append(results);
 let controller=null;const run=async()=>{const q=input.value.trim();if(q.length<2){setStatus("أدخل حرفين على الأقل للبحث.");return}controller?.abort();controller=new AbortController();setStatus("جارٍ البحث في المدن العالمية…");results.replaceChildren();try{const url=new URL("https://geocoding-api.open-meteo.com/v1/search");url.search=new URLSearchParams({name:q,count:"10",language:"ar",format:"json"}).toString();const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error("network");const payload=await response.json();const places=Array.isArray(payload.results)?payload.results.filter(p=>typeof p.latitude==="number"&&Math.abs(p.latitude)<=90&&typeof p.longitude==="number"&&Math.abs(p.longitude)<=180):[];setCount(places.length+" نتيجة");results.replaceChildren(...places.map(p=>card(p.name,[p.admin1,p.country].filter(Boolean).join(" · "), "../global-weather/?lat="+p.latitude+"&lon="+p.longitude+"&name="+encodeURIComponent(p.name),"عرض الطقس")));setStatus(places.length?"":"لم نعثر على نتائج. جرّب كتابة الاسم باللاتينية.");}catch(error){if(error.name!=="AbortError")setStatus("تعذر الاتصال بمحرك البحث. تحقق من الإنترنت وحاول مجدداً.");}};
 search.addEventListener("click",run);input.addEventListener("keydown",e=>{if(e.key==="Enter")run()});
}else{setStatus("نوع الصفحة غير معروف.");}
