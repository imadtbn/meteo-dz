import report from "/tmp/meteo-lighthouse-prod-final2.json" with { type: "json" };
const scores = {
  performance: report.categories.performance.score,
  accessibility: report.categories.accessibility.score,
  bestPractices: report.categories["best-practices"].score,
  seo: report.categories.seo.score,
};
const audits = Object.values(report.audits).filter((audit) => audit.score !== null && audit.score < 0.9).sort((a, b) => (a.score ?? 0) - (b.score ?? 0)).slice(0, 8).map((audit) => ({ id: audit.id, title: audit.title, score: audit.score, displayValue: audit.displayValue }));
console.log(JSON.stringify({ scores, audits }, null, 2));
