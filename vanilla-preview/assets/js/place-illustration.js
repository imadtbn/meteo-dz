const NS = "http://www.w3.org/2000/svg";

const palettes = {
  coast: { sky:"#a9dbeb", horizon:"#cfe8e5", ground:"#4e9ebb", skyline:"#2e637d" },
  desert: { sky:"#f3dcb2", horizon:"#f5deb3", ground:"#ce9861", skyline:"#9e6c47" },
  mountain: { sky:"#c1d9df", horizon:"#e3e8e1", ground:"#859da5", skyline:"#456a76" },
  highland: { sky:"#d1e9df", horizon:"#e8eacf", ground:"#88ab8d", skyline:"#54856b" },
  river: { sky:"#d9e3e3", horizon:"#f0e8d8", ground:"#7ca9b7", skyline:"#456e7c" },
  city: { sky:"#c7dde7", horizon:"#eff0e6", ground:"#98b7bf", skyline:"#55747f" }
};

export function wilayaScene(region, coastal = false) {
  if (coastal || String(region).includes("الساحل")) return "coast";
  if (/الأوراس|القبائل|الأطلس/.test(region)) return "mountain";
  if (/الصحراء|الجنوب/.test(region)) return "desert";
  if (/الهضاب/.test(region)) return "highland";
  if (/وادي|داخلي|الشرق/.test(region)) return "river";
  return "city";
}

const coastalCapitals = new Set(["algiers","manama","moroni","djibouti","kuwait-city","beirut","tripoli","nouakchott","rabat","muscat","doha","mogadishu","tunis","abu-dhabi"]);
const riverCapitals = new Set(["cairo","baghdad","khartoum"]);
const mountainCapitals = new Set(["amman","ramallah","sanaa","damascus"]);
export function capitalScene(slug) {
  if (coastalCapitals.has(slug)) return "coast";
  if (riverCapitals.has(slug)) return "river";
  if (mountainCapitals.has(slug)) return "mountain";
  return "desert";
}

const countryCodes = {
  "الجزائر":"DZ","البحرين":"BH","جزر القمر":"KM","جيبوتي":"DJ","مصر":"EG","العراق":"IQ",
  "الأردن":"JO","الكويت":"KW","لبنان":"LB","ليبيا":"LY","موريتانيا":"MR","المغرب":"MA",
  "عُمان":"OM","فلسطين":"PS","قطر":"QA","السعودية":"SA","الصومال":"SO","السودان":"SD",
  "سوريا":"SY","تونس":"TN","الإمارات العربية المتحدة":"AE","اليمن":"YE"
};
export function countryFlag(country) {
  const code = countryCodes[country];
  return code ? [...code].map(char => String.fromCodePoint(127397 + char.charCodeAt(0))).join("") : "🌐";
}

function svgNode(tag, attrs = {}) {
  const element = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
  return element;
}

export function createPlaceIllustration(scene, label, badge = "مرصد الأطلس") {
  const colors = palettes[scene] || palettes.city;
  const root = document.createElement("div");
  root.className = "place-illustration place-illustration--" + (palettes[scene] ? scene : "city");
  root.setAttribute("role", "img");
  root.setAttribute("aria-label", "رسم رمزي لمعالم " + label);
  const svg = svgNode("svg", { viewBox:"0 0 460 186", preserveAspectRatio:"xMidYMid slice", "aria-hidden":"true", focusable:"false" });
  svg.append(svgNode("rect",{width:460,height:186,fill:colors.sky}));
  svg.append(svgNode("circle",{cx:371,cy:44,r:22,fill:"#fff7d8",opacity:".94"}));
  svg.append(svgNode("path",{d:"M0 112 Q75 105 146 114 T290 108 T460 110 L460 186 H0Z",fill:colors.horizon}));
  if (scene === "mountain") {
    svg.append(svgNode("path",{d:"M-30 164L80 63L144 128L238 43L355 158L410 79L490 162V186H-30Z",fill:"#748f9c"}));
    svg.append(svgNode("path",{d:"M53 88L80 63L110 95 M215 69L238 43L266 78 M391 97L410 79L432 107",fill:"none",stroke:"#f4f5f3","stroke-width":11,"stroke-linejoin":"round"}));
  } else if (scene === "desert") {
    svg.append(svgNode("path",{d:"M0 147Q95 73 190 129T460 113V186H0Z",fill:"#dfb077"}));
    svg.append(svgNode("path",{d:"M0 171Q110 125 210 161T460 141V186H0Z",fill:colors.ground}));
    svg.append(svgNode("path",{d:"M343 141v-39m-12 25q12 2 12-17m0 13q14 0 14-17",fill:"none",stroke:"#8a7553","stroke-width":5,"stroke-linecap":"round"}));
  } else if (scene === "highland") {
    svg.append(svgNode("path",{d:"M0 140Q70 91 148 137T300 131T460 117V186H0Z",fill:"#98b99c"}));
    svg.append(svgNode("path",{d:"M0 169Q116 125 204 155T460 143V186H0Z",fill:colors.ground}));
  } else {
    svg.append(svgNode("path",{d:"M0 131Q90 116 174 133T340 123T460 133V186H0Z",fill:colors.ground}));
    svg.append(svgNode("path",{d:"M0 151Q70 142 127 151T263 148T460 153",fill:"none",stroke:"#edf9f5","stroke-width":3,opacity:".65"}));
  }
  if (["coast","river","city"].includes(scene)) {
    const buildings = [[53,109,31,38],[96,87,34,60],[137,102,23,45],[170,75,29,72],[208,94,39,53],[258,84,31,63],[297,107,27,40],[335,90,29,57]];
    const group = svgNode("g",{fill:colors.skyline,opacity:".95"});
    for (const [x,y,w,h] of buildings) group.append(svgNode("rect",{x,y,width:w,height:h,rx:2}));
    svg.append(group);
  }
  if (["coast","river"].includes(scene)) svg.append(svgNode("path",{d:"M0 160Q70 148 126 160T254 158T460 159",stroke:"#effbfc","stroke-width":3,opacity:".75",fill:"none"}));
  root.append(svg);
  const tag = document.createElement("span");
  tag.className = "place-illustration__tag";
  tag.textContent = badge;
  root.append(tag);
  return root;
}
