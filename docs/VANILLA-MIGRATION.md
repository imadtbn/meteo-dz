# Vanilla HTML/CSS/JavaScript Migration

## Safety and scope

- Target branch: `migration/vanilla-html-css-js`
- Production branch: `main` (must remain untouched during migration)
- Target: semantic, independently indexable HTML documents, shared CSS, and native JavaScript ES modules.
- No replacement framework.
- React, TypeScript, Vite, and their source files remain until parity and release checks pass.
- Existing public URLs and the GitHub Pages base path `/meteo-dz/` are compatibility requirements.

## Phase 1 — verified source inventory

### Build and deployment

| Area | Current implementation | Migration implication |
|---|---|---|
| Package/build | `package.json`: Vite 7, TypeScript 5.9, React 19; `build:github` runs Vite plus social-asset and city prerender scripts | Replace the Pages build only after the static output generator and checks are equivalent |
| Routing | `client/src/App.tsx`: Wouter routes with lazy-loaded route modules | Preserve each route and slug; use ordinary links and real HTML documents |
| Pages root | Vite root is `client/`; public assets are in `client/public/` | Audit generated and public files separately; do not assume root-level HTML is the complete source |
| Pages deployment | `.github/workflows/deploy-pages.yml` builds, tests, verifies static output, then deploys only for main/non-PR events | Keep deployment gated to main; PR builds must remain validation-only |
| URL base | Vite uses `/meteo-dz/` for GitHub Pages | All internal asset and navigation URLs must work under this subpath |
| HTML entry | root `index.html` currently references hashed JS/CSS bundles and contains a large embedded runtime | This is a React application shell, not the target static HTML architecture |

### Current application routes

| Route | Current page module / component | Static migration requirement |
|---|---|---|
| `/` | `Home` | Full meaningful home content in HTML |
| `/weather/:slug` | `City` | One crawlable HTML page per supported city slug |
| `/wilayas` | `Directories.WilayasPage` | HTML directory with all 69 wilayas |
| `/arab-capitals` | `Directories.ArabCapitalsPage` | Independent HTML document |
| `/world-search` | `WorldSearch.WorldSearchPage` | Search interface and indexable explanatory content |
| `/global-weather` | `GlobalWeather` | Independent HTML document |
| `/weather-map` | `WeatherMap` | HTML map container plus native JS map modules |
| `/alerts` | `Alerts` | Indexable alert page; dynamic data enhancement |
| `/favorites` | `Favorites` | HTML shell with local saved-state enhancement |
| `/climate-observatory` | `ClimateObservatory` | Static page content plus SVG/canvas charts |
| `/agriculture-weather` | `AgricultureWeather` | Static page content plus interactive weather/agriculture tools |
| `/404` | `NotFound` | Real static 404 document |

### Confirmed runtime dependencies

- React / React DOM / Wouter: rendering and client-side routing.
- Leaflet / React-Leaflet: maps and map layers; target will use Leaflet directly without React bindings.
- Recharts: charts; target will use native SVG (or Canvas only where appropriate).
- next-themes: theme state; target will use a small native theme module and persistent preference.
- Remaining dependencies must be traced from page imports before removing packages; do not infer they are unused from the top-level manifest alone.

## Required feature parity checklist

- [ ] Existing route paths and city slugs remain valid.
- [ ] All 69 wilaya records and geographic coordinates are unchanged and validated.
- [ ] Leaflet maps, weather overlays/layers, legends, markers, and interactions work.
- [ ] Climate and agriculture charts retain their data, labels, and responsive behavior.
- [ ] Favorites persist and can be added/removed without duplicates.
- [ ] Light/dark mode persists and respects the existing default behavior.
- [ ] Search supports current names/aliases and keyboard/mobile interaction.
- [ ] Alerts remain available with their existing data/update behavior.
- [ ] Main page content is present in HTML before JavaScript executes.
- [ ] Canonicals, metadata, structured data where present, sitemap, robots, manifest, icons, and service worker are valid under `/meteo-dz/`.
- [ ] No runtime dependency on React, React DOM, Wouter, Vite, or TypeScript remains in the final Pages artifact.

## Migration phases and gates

1. **Inventory** — map all source pages, components, data files, API calls, browser storage keys, external services, and imports. Gate: complete route/function/dependency matrix.
2. **Shared CSS and shell** — establish tokens, responsive layout, header, navigation, footer, accessibility states. Gate: shell works on representative mobile and desktop pages.
3. **Home and wilayas** — create real HTML documents and preserve all records/coordinates. Gate: route and data parity checks.
4. **Maps, global search, alerts** — port Leaflet integration and overlays, search behavior, and alert rendering. Gate: functional map/search/alert smoke tests.
5. **Favorites, observatory, agriculture** — port persistence and visualizations. Gate: saved-state and chart/map regression tests.
6. **JavaScript modules** — split modules by responsibility and remove React-specific runtime assumptions. Gate: no React imports in the vanilla implementation.
7. **Static build** — build output without React or Vite. Gate: clean build from a fresh checkout and no framework bundles in output.
8. **SEO/PWA/URLs** — validate all old paths, canonical URLs, sitemap, robots, manifest, service worker, metadata, and 404 handling. Gate: automated URL and metadata checks.
9. **Device/performance/deploy** — test mobile/desktop, accessibility, console/network errors, performance, and Pages artifact. Gate: successful CI and reviewed PR before merge.

## Change control

- Implement in small commits on this branch only.
- Do not modify the production deployment workflow to deploy this branch.
- Do not delete or rename legacy React/TypeScript files during feature migration.
- Do not replace existing URLs with client-side-only fallback routing.
- Merge only after all gates pass and the pull request has a successful validation run.
