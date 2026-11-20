/** Update the tracked XML and HTML sitemap copies from the canonical geographic catalog. */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildPlaceCatalog } from "./place-catalog.mjs";
import { buildSitemap, buildSitemapHtml, sitemapUrls } from "./sitemap-core.mjs";

const root = path.resolve(".");
const site = "https://imadtbn.github.io/meteo-dz/";
const places = buildPlaceCatalog();
const sitemap = buildSitemap(site, places);
const htmlSitemap = buildSitemapHtml(site, places);
const targets = [
  [path.join(root, "sitemap.xml"), sitemap],
  [path.join(root, "client/public/sitemap.xml"), sitemap],
  [path.join(root, "sitemap.html"), htmlSitemap],
  [path.join(root, "client/public/sitemap.html"), htmlSitemap],
];
const checking = process.argv.includes("--check");
for (const [file, expected] of targets) {
  if (checking) {
    const existing = await readFile(file, "utf8").catch(() => "");
    if (existing !== expected) {
      console.error("Sitemap needs regeneration: " + path.relative(root, file));
      process.exitCode = 1;
    }
  } else {
    await writeFile(file, expected);
  }
}
if (!process.exitCode) {
  console.log((checking ? "Verified " : "Generated ") + sitemapUrls(site, places).length + " canonical URLs for " + places.length + " unique places.");
}
