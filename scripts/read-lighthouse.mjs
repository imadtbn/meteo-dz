import report from "/tmp/meteo-lighthouse-prod-final.json" with { type: "json" };
const failed = Object.values(report.audits)
  .filter((audit) => audit.score !== null && audit.score < 0.9)
  .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
  .slice(0, 12)
  .map((audit) => ({ id: audit.id, title: audit.title, score: audit.score, displayValue: audit.displayValue }));
console.log(JSON.stringify(failed, null, 2));
