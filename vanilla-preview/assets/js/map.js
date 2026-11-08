const dataNode=document.querySelector("#city-data");
const mapNode=document.querySelector("#atlas-map");
const statusNode=document.querySelector("#map-status");
const countNode=document.querySelector("#map-count");
const cities=JSON.parse(dataNode?.textContent||"[]");
const Leaflet=window.L;
if(!mapNode||!Leaflet){if(statusNode)statusNode.textContent="تعذر تحميل مكتبة الخرائط. تحقق من الاتصال ثم أعد تحميل الصفحة.";}
else{
 const params=new URLSearchParams(location.search);
 const lat=Number(params.get("lat")),lon=Number(params.get("lon"));
 const hasCenter=Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;
 const map=Leaflet.map(mapNode,{scrollWheelZoom:true}).setView(hasCenter?[lat,lon]:[28,2.8],hasCenter?7:5);
 Leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
 const markers=Leaflet.featureGroup();
 const markerIcon=Leaflet.icon({iconUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",iconRetinaUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",shadowUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",iconSize:[25,41],iconAnchor:[12,41],popupAnchor:[1,-34],shadowSize:[41,41]});
 cities.forEach(city=>{
  const marker=Leaflet.marker([city.latitude,city.longitude],{icon:markerIcon,title:city.name,alt:"ولاية "+city.name});
  const popup=document.createElement("div");popup.dir="rtl";
  const title=document.createElement("strong");title.textContent=city.name;
  const meta=document.createElement("small");meta.textContent="ولاية "+city.code+" · "+city.region+" · "+city.latitude.toFixed(2)+", "+city.longitude.toFixed(2);
  const link=document.createElement("a");link.href="../weather/"+encodeURIComponent(city.slug)+"/";link.textContent="فتح قراءة الطقس";
  popup.append(title,meta,link);marker.bindPopup(popup);marker.addTo(markers);
 });
 markers.addTo(map);
 if(!hasCenter&&markers.getBounds().isValid())map.fitBounds(markers.getBounds().pad(.12));
 if(statusNode)statusNode.textContent="الخريطة جاهزة · اختر علامة ولاية لفتح تفاصيل الطقس.";
 if(countNode)countNode.textContent=cities.length+" ولاية جزائرية";
 let activeLayer=null;
 const overlays={tmp2m:"tmp2m",precip:"precip",wind:"wind",pressure:"pressure"};
 const frame=()=>{const now=new Date();now.setUTCMinutes(0,0,0);return now.toISOString().slice(0,10).replaceAll("-","")+now.toISOString().slice(11,13);};
 document.querySelectorAll("[data-layer]").forEach(button=>button.addEventListener("click",()=>{
  const id=button.dataset.layer;
  document.querySelectorAll("[data-layer]").forEach(item=>item.setAttribute("aria-pressed",String(item===button)));
  if(activeLayer){map.removeLayer(activeLayer);activeLayer=null;}
  if(overlays[id]){
   const url="https://weathermaps.weatherapi.com/"+overlays[id]+"/tiles/"+frame()+"/{z}/{x}/{y}.png";
   activeLayer=Leaflet.tileLayer(url,{opacity:.62,attribution:'Weather maps &copy; <a href="https://www.weatherapi.com/">WeatherAPI</a>',maxZoom:10});
   activeLayer.on("tileerror",()=>{if(statusNode)statusNode.textContent="تعذر تحميل طبقة "+button.textContent+" حالياً؛ يمكنك استخدام خريطة الولايات الأساسية.";});
   activeLayer.addTo(map);
   if(statusNode)statusNode.textContent="طبقة "+button.textContent+" · توقعات شبكية مرتبطة بالساعة الحالية UTC.";
  }else if(statusNode)statusNode.textContent="الخريطة الأساسية · "+cities.length+" ولاية جزائرية.";
 }));
}
