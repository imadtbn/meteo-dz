import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildCommuneCatalog } from "./commune-catalog.mjs";

const root = path.resolve(".");
const outputPath = path.join(root, "client/public/data/communes.json");
const expected = JSON.stringify(buildCommuneCatalog().map((commune) => ({
  id: commune.id,
  slug: commune.slug,
  name: commune.displayName,
  name_ar: commune.arabicName,
  name_fr: commune.englishName,
  name_en: commune.englishName,
  post_code: commune.postCode,
  wilaya_id: commune.wilayaId,
  wilaya_name: commune.wilayaName,
  wilaya_slug: commune.wilayaSlug,
  latitude: commune.latitude,
  longitude: commune.longitude,
})), null, 2) + "\n";

if (process.argv.includes("--check")) {
  const actual = await readFile(outputPath, "utf8").catch(() => "");
  if (actual !== expected) {
    console.error("Published commune data is stale. Run: pnpm communes:build");
    process.exitCode = 1;
  } else {
    console.log("Verified normalized public data for " + buildCommuneCatalog().length + " communes.");
  }
} else {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, expected);
  console.log("Generated normalized public commune data.");
}
