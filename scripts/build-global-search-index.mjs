import { readFile, writeFile } from "node:fs/promises";
import { buildCommuneCatalog } from "./commune-catalog.mjs";

const file = new URL("../data/global-search-index.json", import.meta.url);
const existing = JSON.parse(await readFile(file, "utf8"));
if (!Array.isArray(existing)) throw new Error("Global search index must be a JSON array.");

const nonCommuneEntries = existing.filter((item) => item.kind !== "commune");
const paths = new Set(nonCommuneEntries.map((item) => item.path));
const communes = buildCommuneCatalog();
const entries = communes.map((commune) => {
  const locationTerms = commune.locations.flatMap((location) => [
    location.displayName, location.arabicName, location.englishName, location.postCode, location.id,
  ]);
  return {
    type: "city",
    kind: "commune",
    id: commune.id,
    source_ids: commune.locations.map((location) => location.id),
    name: commune.displayName,
    aliases: commune.aliases,
    detail: "بلدية " + commune.displayName + " · ولاية " + commune.wilayaName
      + (commune.locations.length > 1 ? " · " + commune.locations.length + " مواقع" : ""),
    latin: commune.englishName,
    name_fr: commune.englishName,
    name_en: commune.englishName,
    englishName: commune.englishName,
    wilaya_id: commune.wilayaId,
    wilaya: commune.wilayaName,
    post_code: commune.postCode,
    latitude: commune.latitude,
    longitude: commune.longitude,
    locations: commune.locations,
    terms: [
      commune.displayName, commune.englishName, commune.wilayaName,
      ...commune.aliases, ...commune.englishAliases, ...locationTerms,
      "الجزائر", "Algeria", "commune", "municipality", "weather", "meteo", "طقس", "أحوال الطقس",
    ].filter(Boolean).join(" "),
    path: "/" + commune.canonicalPath + "/",
  };
}).filter((entry) => !paths.has(entry.path));

const result = [...nonCommuneEntries, ...entries];
const output = JSON.stringify(result, null, 2) + "\n";
const check = process.argv.includes("--check");
if (check) {
  const current = await readFile(file, "utf8");
  if (current !== output) {
    console.error("Global search index is stale. Run: pnpm search-index");
    process.exitCode = 1;
  } else {
    console.log("Verified " + communes.length + " canonical commune entries in global index.");
  }
} else {
  await writeFile(file, output);
  console.log("Added " + entries.length + " canonical commune entries; global index now has " + result.length + " records.");
}
