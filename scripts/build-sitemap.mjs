/** Update both tracked sitemap.xml copies from the canonical geographic catalog. */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildPlaceCatalog } from "./place-catalog.mjs";
import { buildSitemap, sitemapUrls } from "./sitemap-core.mjs";

const root = path.resolve(".");
const targets = [path.join(root, "sitemap.xml"), path.join(root, "client/public/sitemap.xml")];
const site = "https://imadtbn.github.io/meteo-dz/";
const places = buildPlaceCatalog();
const sitemap = buildSitemap(site, places);
const checking = process.argv.includes("--check");
for (const file of targets) {
  if (checking) {
    const existing = await readFile(file, "utf8");
    if (existing !== sitemap) {
      console.error("Sitemap needs regeneration: " + path.relative(root, file));
      process.exitCode = 1;
    }
  } else {
    await writeFile(file, sitemap);
  }
}
if (!process.exitCode) {
  console.log((checking ? "Verified " : "Generated ") + sitemapUrls(site, places).length + " canonical URLs for " + places.length + " unique places.");
}
