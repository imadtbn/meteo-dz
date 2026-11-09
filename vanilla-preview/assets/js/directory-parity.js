import { createPlaceIllustration, wilayaScene, capitalScene, countryFlag } from "./place-illustration.js";

const kind = document.body.dataset.page;
const root = document.querySelector("#page-content");
const count = document.querySelector("#page-count");
const status = document.querySelector("#page-status");
const cities = JSON.parse(document.querySelector("#city-data")?.textContent || "[]");
const capitals = JSON.parse(document.querySelector("#capital-data")?.textContent || "[]");
const normalize = value => String(value ?? "").normalize("NFKD").toLocaleLowerCase("en")
  .replace(/[\u064B-\u065F\u0670\u0640]/g,"").replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي")
  .replace(/ة/g,"ه").replace(/[\u0300-\u036f]/g,"").trim().replace(/\s+/g," ");
const setStatus = message => { status.hidden = !message; status.textContent = message || ""; };
const setCount = message => { count.textContent = message || ""; };
const makeCard = ({ href, label, scene, badge, meta, title }) => {
  const link = document.createElement("a");
  link.className = "directory-card directory-card--visual";
  link.href = href;
  link.setAttribute("aria-label", label);
  link.append(createPlaceIllustration(scene, title, badge));
  const body = document.createElement("span");
  body.className = "directory-card__body";
  const metadata = document.createElement("span");
  metadata.className = "directory-card__meta";
  metadata.textContent = meta;
  const heading = document.createElement("strong");
  heading.className = "directory-card__title";
  heading.textContent = title;
  const action = document.createElement("span");
  action.className = "directory-card__action";
  action.textContent = "عرض نشرة الطقس ←";
  body.append(metadata, heading, action);
  link.append(body);
  return link;
};

if (kind === "wilayas" || kind === "arab-capitals") {
  let input = root.querySelector("input.directory-search-input");
  if (!input) {
    input = document.createElement("input");
    input.className = "directory-search-input";
    input.type = "search";
    input.setAttribute("aria-label", kind === "wilayas" ? "بحث الولايات" : "بحث العواصم");
  }
  const inputWrap = document.createElement("div");
  inputWrap.className = "directory-parity-search";
  inputWrap.append(input);
  const grid = document.createElement("div");
  grid.className = "directory-grid directory-grid--visual-parity";
  root.replaceChildren(inputWrap, grid);
  const render = () => {
    const query = normalize(input.value);
    if (kind === "wilayas") {
      const rows = cities.filter(city => normalize([city.name,city.name_fr,city.name_en,city.region,city.code,city.slug,city.phone_code].filter(Boolean).join(" ")).includes(query));
      grid.replaceChildren(...rows.map(city => makeCard({
        href:"../weather/"+encodeURIComponent(city.slug)+"/",
        label:"عرض نشرة الطقس في "+city.name,
        scene:wilayaScene(city.region,city.coastal),
        badge:"ولاية "+city.code,
        meta:city.code+" · "+city.region,
        title:city.name
      })));
      setCount(rows.length+" ولاية مطابقة من أصل "+cities.length);
      setStatus(rows.length ? "الرسومات رمزية مستوحاة من طبيعة المنطقة وليست صوراً فوتوغرافية." : "لا توجد ولاية مطابقة لهذا البحث.");
    } else {
      const rows = capitals.filter(city => normalize([city.country,city.capital,city.englishName].join(" ")).includes(query));
      grid.replaceChildren(...rows.map(city => {
        const card = makeCard({
          href:"../global-weather/?lat="+encodeURIComponent(city.latitude)+"&lon="+encodeURIComponent(city.longitude)+"&name="+encodeURIComponent(city.capital),
          label:"عرض الطقس في "+city.capital,
          scene:capitalScene(city.slug),
          badge:city.englishName,
          meta:countryFlag(city.country)+" · "+city.country,
          title:city.capital
        });
        return card;
      }));
      setCount(rows.length+" عاصمة مطابقة من أصل "+capitals.length);
      setStatus(rows.length ? "الأعلام والرسومات رمزية؛ بيانات الموقع مرتبطة بإحداثيات العاصمة." : "لا توجد عاصمة مطابقة لهذا البحث.");
    }
  };
  input.addEventListener("input",render);
  render();
}

if (kind === "world-search") {
  const params = new URLSearchParams(location.search);
  const initial = (params.get("q") || "").slice(0,100);
  const input = document.createElement("input");
  input.className = "directory-search-input";
  input.type = "search";
  input.placeholder = "ابحث باسم المدينة أو الدولة بالعربية أو اللاتينية";
  input.setAttribute("aria-label","البحث عن مدينة أو دولة");
  input.autocomplete = "off";
  input.value = initial;
  const locate = document.createElement("button");
  locate.className = "button button-secondary";
  locate.type = "button";
  locate.textContent = "موقعي الحالي";
  const controls = document.createElement("div");
  controls.className = "world-search-controls";
  controls.append(input,locate);
  const results = document.createElement("div");
  results.className = "world-search-results";
  const note = document.createElement("p");
  note.className = "world-search-note";
  note.setAttribute("role","status");
  note.setAttribute("aria-live","polite");
  root.replaceChildren(controls,note,results);

  const validCoordinates = place => place && typeof place.id === "number" && typeof place.name === "string" && place.name.trim() &&
    Number.isFinite(place.latitude) && Math.abs(place.latitude) <= 90 &&
    Number.isFinite(place.longitude) && Math.abs(place.longitude) <= 180;
  const weatherUrl = (lat,lon,name) => "../global-weather/?lat="+encodeURIComponent(lat)+"&lon="+encodeURIComponent(lon)+"&name="+encodeURIComponent(name);
  const mapUrl = (lat,lon) => "../map/?lat="+encodeURIComponent(lat)+"&lon="+encodeURIComponent(lon);
  let searchController = null, reverseController = null, debounce = null, searchSequence = 0, locateSequence = 0;
  const setNote = message => { note.textContent = message; };
  const renderPlaces = places => results.replaceChildren(...places.map(place => {
    const card = document.createElement("article");
    card.className = "search-result search-result--visual";
    const flag = document.createElement("span");
    flag.className = "search-result__flag";
    flag.textContent = countryFlag(place.country_code);
    flag.setAttribute("aria-label","علم "+(place.country || "الدولة"));
    const info = document.createElement("div");
    info.className = "search-result__info";
    const meta = document.createElement("span");
    meta.className = "search-result__meta";
    meta.textContent = [place.admin1,place.country,place.timezone].filter(Boolean).join(" · ") || "مدينة عالمية";
    const title = document.createElement("strong");
    title.textContent = place.name;
    const coords = document.createElement("small");
    coords.dir = "ltr";
    coords.textContent = place.latitude.toFixed(3)+", "+place.longitude.toFixed(3);
    const actions = document.createElement("div");
    actions.className = "search-result__actions";
    const weather = document.createElement("a");
    weather.className = "button button-primary";
    weather.href = weatherUrl(place.latitude,place.longitude,place.name);
    weather.textContent = "عرض الطقس";
    const map = document.createElement("a");
    map.className = "button button-secondary";
    map.href = mapUrl(place.latitude,place.longitude);
    map.textContent = "على الخريطة";
    actions.append(weather,map);
    info.append(meta,title,coords,actions);
    card.append(flag,info);
    return card;
  }));
  const runSearch = async query => {
    const cleaned = query.trim();
    const sequence = ++searchSequence;
    searchController?.abort();
    if (cleaned.length < 2) {
      results.replaceChildren();
      setNote("اكتب حرفين على الأقل للبحث العالمي.");
      return;
    }
    const controller = new AbortController();
    searchController = controller;
    setNote("جارٍ البحث في المدن والدول حول العالم…");
    try {
      const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
      url.search = new URLSearchParams({name:cleaned,count:"10",language:"ar",format:"json"}).toString();
      const response = await fetch(url,{signal:controller.signal});
      if (!response.ok) throw new Error("search failed");
      const payload = await response.json();
      if (controller.signal.aborted || sequence !== searchSequence) return;
      const places = Array.isArray(payload.results) ? payload.results.filter(validCoordinates).slice(0,10) : [];
      renderPlaces(places);
      setNote(places.length ? places.length+" نتائج. اختر مدينة لفتح الطقس أو الخريطة." : "لا توجد نتائج. جرّب الاسم باللغة الإنجليزية أو أضف اسم الدولة.");
    } catch (error) {
      if (!controller.signal.aborted && sequence === searchSequence) {
        results.replaceChildren();
        setNote("تعذر الاتصال بمحرك البحث. تحقق من الإنترنت ثم حاول مجدداً.");
      }
    }
  };
  const scheduleSearch = () => {
    clearTimeout(debounce);
    searchController?.abort();
    debounce = setTimeout(() => runSearch(input.value),350);
  };
  input.addEventListener("input",scheduleSearch);
  input.addEventListener("keydown",event => { if (event.key === "Enter") { event.preventDefault(); clearTimeout(debounce); runSearch(input.value); } });
  locate.addEventListener("click",() => {
    const request = ++locateSequence;
    reverseController?.abort();
    if (!window.isSecureContext) { setNote("خدمة الموقع تحتاج إلى HTTPS. يمكنك البحث يدوياً."); return; }
    if (!navigator.geolocation) { setNote("هذا المتصفح لا يدعم تحديد الموقع. يمكنك البحث يدوياً."); return; }
    locate.disabled = true;
    setNote("جارٍ الحصول على موقع الجهاز بعد موافقتك…");
    navigator.geolocation.getCurrentPosition(async ({coords}) => {
      if (request !== locateSequence) return;
      const {latitude,longitude} = coords;
      if (!Number.isFinite(latitude) || Math.abs(latitude)>90 || !Number.isFinite(longitude) || Math.abs(longitude)>180) {
        locate.disabled = false;
        setNote("تعذر الحصول على إحداثيات صالحة.");
        return;
      }
      const panel = document.createElement("section");
      panel.className = "my-location-panel";
      panel.setAttribute("aria-label","تفاصيل موقعي الحالي");
      const heading = document.createElement("strong");
      heading.textContent = "موقعي الحالي";
      const coordinates = document.createElement("span");
      coordinates.dir = "ltr";
      coordinates.textContent = latitude.toFixed(4)+", "+longitude.toFixed(4);
      const detail = document.createElement("p");
      detail.textContent = "جارٍ معرفة البلد والولاية والبلدية…";
      const actions = document.createElement("div");
      actions.className = "search-result__actions";
      const weather = document.createElement("a");
      weather.className = "button button-primary";
      weather.href = weatherUrl(latitude,longitude,"موقعي الحالي");
      weather.textContent = "عرض طقس موقعي";
      const map = document.createElement("a");
      map.className = "button button-secondary";
      map.href = mapUrl(latitude,longitude);
      map.textContent = "فتح الخريطة";
      actions.append(weather,map);
      panel.append(heading,coordinates,detail,actions);
      results.prepend(panel);
      setNote("تم تحديد الإحداثيات. أسماء المناطق تقريبية حسب خدمة الخرائط.");
      const controller = new AbortController();
      reverseController = controller;
      const timeout = setTimeout(() => { controller.abort(); if (request === locateSequence) detail.textContent = "تم تحديد الإحداثيات، لكن انتهت مهلة معرفة أسماء المناطق. يمكنك فتح الطقس أو الخريطة مباشرة."; },9000);
      try {
        const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
        url.search = new URLSearchParams({latitude:String(latitude),longitude:String(longitude),localityLanguage:"ar"}).toString();
        const response = await fetch(url,{signal:controller.signal});
        if (!response.ok) throw new Error("reverse geocode failed");
        const data = await response.json();
        if (controller.signal.aborted || request !== locateSequence) return;
        const name = data.city || data.locality || data.principalSubdivision || data.countryName || "موقعي الحالي";
        detail.textContent = [data.countryName,data.principalSubdivision,data.city || data.locality].filter(Boolean).join(" · ") || "تعذر تحديد أسماء المناطق.";
        weather.href = weatherUrl(latitude,longitude,name);
        weather.textContent = "عرض طقس "+name;
      } catch {
        if (request === locateSequence) detail.textContent = "تم تحديد الإحداثيات، لكن تعذر جلب أسماء المناطق. يمكنك فتح الطقس أو الخريطة مباشرة.";
      } finally {
        clearTimeout(timeout);
        if (request === locateSequence) locate.disabled = false;
      }
    },error => {
      if (request !== locateSequence) return;
      locate.disabled = false;
      setNote(error.code===1 ? "تم رفض صلاحية الموقع. اسمح بها من إعدادات المتصفح أو ابحث يدوياً." :
        error.code===2 ? "تعذر العثور على موقع الجهاز. تأكد من تشغيل خدمات الموقع." :
        "انتهت مهلة تحديد الموقع. أعد المحاولة أو استخدم البحث اليدوي.");
    },{enableHighAccuracy:false,timeout:12000,maximumAge:300000});
  });
  if (initial.length >= 2) runSearch(initial);
  else setNote("ابحث باسم المدينة أو الدولة، أو استخدم «موقعي» لتحديد موقعك بعد موافقتك.");
  window.addEventListener("pagehide",() => { searchController?.abort(); reverseController?.abort(); clearTimeout(debounce); },{once:true});
}
