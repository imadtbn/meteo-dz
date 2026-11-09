import { createPlaceIllustration, wilayaScene } from "./place-illustration.js";

const cityData = JSON.parse(document.querySelector("#city-data")?.textContent || "[]");
const cityBySlug = new Map(cityData.map(city => [city.slug, city]));
document.querySelectorAll(".region-grid--visual-home .directory-card--visual").forEach(card => {
  const match = card.getAttribute("href")?.match(/weather\/([^/]+)\//);
  const city = match && cityBySlug.get(decodeURIComponent(match[1]));
  if (!city) return;
  const old = card.querySelector(".place-illustration");
  if (old) old.replaceWith(createPlaceIllustration(wilayaScene(city.region, city.coastal), city.name, "ولاية " + city.code));
});
