import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const pages = ["/", "/wilayas", "/world-search", "/weather-map"];
mkdirSync("/tmp/meteo-lh-pages", { recursive: true });
for (const page of pages) {
  const slug = page === "/" ? "home" : page.slice(1).replaceAll("/", "-");
  const output = `/tmp/meteo-lh-pages/${slug}.json`;
  execFileSync("pnpm", ["dlx", "lighthouse", `http://localhost:4173${page}`, "--output=json", `--output-path=${output}`, "--chrome-flags=--headless --no-sandbox", "--quiet"], { stdio: "inherit" });
  const report = JSON.parse(readFileSync(output, "utf8"));
  console.log(JSON.stringify({ page, performance: report.categories.performance.score, accessibility: report.categories.accessibility.score, bestPractices: report.categories["best-practices"].score, seo: report.categories.seo.score, lcp: report.audits["largest-contentful-paint"].displayValue }, null, 2));
}
writeFileSync("/tmp/meteo-lh-pages/summary.json", JSON.stringify(pages, null, 2));
