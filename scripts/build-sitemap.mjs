/** Update both tracked sitemap.xml copies from the site's source data.
 * Usage: node scripts/build-sitemap.mjs [--check]
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import cities from "../client/src/data/cities.json" with { type: "json" };
import { buildSitemap, sitemapUrls } from "./sitemap-core.mjs";

const root = path.resolve(".");
const targets = [path.join(root, "sitemap.xml"), path.join(root, "client/public/sitemap.xml")];
const site = "https://imadtbn.github.io/meteo-dz/";
const sitemap = buildSitemap(site, cities);
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
  console.log((checking ? "Verified " : "Generated ") + sitemapUrls(site, cities).length + " canonical URLs in both sitemap.xml files.");
}
