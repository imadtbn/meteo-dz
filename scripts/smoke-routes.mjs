const routes = ["/", "/wilayas", "/arab-capitals", "/world-search", "/weather-map", "/weather/adrar", "/weather/algeria", "/global-weather?lat=36.75&lon=3.05&name=الجزائر"];
const origin = process.env.SMOKE_ORIGIN ?? "http://localhost:4173";
const results = [];
for (const route of routes) {
  const response = await fetch(`${origin}${route}`);
  const body = await response.text();
  results.push({ route, status: response.status, hasRoot: body.includes('id="root"'), bytes: body.length });
}
console.log(JSON.stringify(results, null, 2));
if (results.some((result) => result.status !== 200 || !result.hasRoot)) process.exit(1);
