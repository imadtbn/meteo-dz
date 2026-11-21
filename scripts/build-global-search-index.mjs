import { readFile, writeFile } from "node:fs/promises";
import { buildCommuneCatalog } from "./commune-catalog.mjs";

const file = new URL("../data/global-search-index.json", import.meta.url);
const existing = JSON.parse(await readFile(file, "utf8"));
if (!Array.isArray(existing)) throw new Error("Global search index must be a JSON array.");

const nonCommuneEntries = existing.filter((item) => item.kind !== "commune");
const paths = new Set(nonCommuneEntries.map((item) => item.path));
const communes = buildCommuneCatalog();
const entries = communes.map((commune) => ({
  type: "city",
  kind: "commune",
  id: commune.id,
  name: commune.displayName,
  detail: "بلدية " + commune.displayName + " · ولاية " + commune.wilayaName,
  latin: commune.englishName,
  name_fr: commune.englishName,
  name_en: commune.englishName,
  englishName: commune.englishName,
  wilaya_id: commune.wilayaId,
  wilaya: commune.wilayaName,
  post_code: commune.postCode,
  latitude: commune.latitude,
  longitude: commune.longitude,
  terms: [
    commune.displayName,
    commune.englishName,
    commune.wilayaName,
    commune.postCode,
    commune.id,
    "الجزائر",
    "Algeria",
    "commune",
    "municipality",
    "weather",
    "meteo",
    "طقس",
    "أحوال الطقس",
  ].filter(Boolean).join(" "),
  path: "/" + commune.canonicalPath + "/",
})).filter((entry) => !paths.has(entry.path));

const result = [...nonCommuneEntries, ...entries];
const output = JSON.stringify(result, null, 2) + "\n";
const check = process.argv.includes("--check");
if (check) {
  const current = await readFile(file, "utf8");
  if (current !== output) {
    console.error("Global search index is stale. Run: pnpm search-index");
    process.exitCode = 1;
  } else {
    console.log("Verified " + communes.length + " commune entries in global search index.");
  }
} else {
  await writeFile(file, output);
  console.log("Added " + entries.length + " commune entries; global index now has " + result.length + " records.");
}
