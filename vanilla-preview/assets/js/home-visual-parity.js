import { createPlaceIllustration, wilayaScene } from "./place-illustration.js";

const dataNode = document.querySelector("#city-data");
const cityData = JSON.parse(dataNode?.textContent || "[]");
const cityBySlug = new Map(cityData.map(city => [city.slug, city]));
const enhance = () => {
  document.querySelectorAll(".region-grid--visual-home .directory-card--visual").forEach(card => {
    const match = card.getAttribute("href")?.match(/weather\/([^/]+)\//);
    const city = match && cityBySlug.get(decodeURIComponent(match[1]));
    if (!city) return;
    const old = card.querySelector(".place-illustration");
    if (old && !old.classList.contains("place-illustration--" + wilayaScene(city.region, city.coastal))) {
      old.replaceWith(createPlaceIllustration(wilayaScene(city.region, city.coastal), city.name, "ولاية " + city.code));
    }
  });
};
enhance();
const grid = document.querySelector(".region-grid--visual-home");
if (grid) new MutationObserver(enhance).observe(grid, { childList:true, subtree:true });
