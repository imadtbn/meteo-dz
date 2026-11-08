# Phase 1 — Detailed data, dependency, and runtime inventory

> Baseline: `main` at the start of `migration/vanilla-phase-1-inventory`.
> This document records observed repository files and source behavior. It does not claim that the vanilla migration is complete.

## 1. Repository and build topology

| Concern | Observed implementation | Migration constraint |
|---|---|---|
| Package runtime | ESM package, pnpm 10.4.1 | Keep package manager lockfile stable until the replacement build is proven |
| Frontend build | Vite 7, React plugin, Tailwind CSS V4 Vite plugin | The final Pages build must emit static documents and native JS/CSS without Vite runtime dependencies |
| UI runtime | React 19 / React DOM 19 / Wouter 3 | Replace rendering and routing progressively; preserve all current paths |
| Type checking | TypeScript 5.9, strict, no emit | Existing type checks remain a baseline until the new build has equivalent checks |
| Unit tests | Vitest 2; tests currently cover search, coordinates, favorites, NASA POWER, place visuals, sharing, weather and ad slots | Port or retain equivalent behavior tests before retiring the TS implementation |
| Build commands | `build:github` runs Vite, social asset generation and city prerender; `check`, `test`, `sitemap:check` are separate checks | Add a clean static build and route/output checks before changing deploy |
| Hosting | GitHub Pages, base path `/meteo-dz/` | All links, assets, manifest scope and service-worker paths must work below this prefix |
| Deployment workflow | `.github/workflows/deploy-pages.yml`; PR builds validate but deployment steps run only outside PR; deploy job requires build | Keep PR validation-only and main as the only production deployment source |
| Existing generated pages | Root `weather/<slug>/index.html`, landing route directories and a tracked root `404.html` are present | Preserve public URL shape; determine which generated files are tracked versus recreated by build |
| Build scripts | `scripts/prerender-cities.mjs`, `scripts/build-sitemap.mjs`, `scripts/sitemap-core.mjs`, `scripts/verify-static-output.mjs`, `scripts/generate-social-assets.mjs` | Port their outputs and assertions rather than dropping existing SEO/PWA safeguards |

## 2. Route inventory

Routes are declared in `client/src/App.tsx`.

| Public path | Source module | Current route behavior | Target document |
|---|---|---|---|
| `/` | `pages/Home.tsx` | Main dashboard and city/weather discovery | `index.html` |
| `/weather/:slug` | `pages/City.tsx` plus city data | City weather page; city HTML is prerendered | `weather/<slug>/index.html` |
| `/wilayas` | `pages/Directories.tsx` / WilayasPage | Searchable directory | `wilayas/index.html` |
| `/arab-capitals` | `pages/Directories.tsx` / ArabCapitalsPage | Arab capitals directory | `arab-capitals/index.html` |
| `/world-search` | `pages/WorldSearch.tsx` | Global geocoding/search and location flow | `world-search/index.html` |
| `/global-weather` | `pages/GlobalWeather.tsx` | Coordinate-parameter weather view | `global-weather/index.html` (noindex policy currently applied to generated landing page) |
| `/weather-map` | `pages/WeatherMap.tsx` | Interactive map and weather overlays | `weather-map/index.html` |
| `/alerts` | `pages/Alerts.tsx` | Official alert source directory | `alerts/index.html` |
| `/favorites` | `pages/Favorites.tsx` | Browser-local saved wilayas | `favorites/index.html` (noindex policy currently applied) |
| `/climate-observatory` | `pages/ClimateObservatory.tsx` | NASA POWER climate history and charts | `climate-observatory/index.html` |
| `/agriculture-weather` | `pages/AgricultureWeather.tsx` | Agriculture indicators from NASA POWER | `agriculture-weather/index.html` |
| `/404` and fallback | `pages/NotFound.tsx` | Client-rendered not-found view | Real static `404.html` |

Other route-like generated directories and SEO metadata must be checked against the sitemap generator before they are altered. The canonical sitemap currently contains the homepage, seven indexable landing routes, and the 69 city routes; `global-weather` and `favorites` are deliberately excluded.

## 3. Data inventory and integrity baseline

### 3.1 Algerian wilayas

Source of truth: `client/src/data/cities.json` (imported by `client/src/data/cities.ts`).

Verified directly from the JSON on `main`:

- 69 records.
- 69 unique administrative codes and 69 unique slugs.
- Fields per record: `code`, `slug`, `name` (Arabic), `region`, `latitude`, `longitude`, `name_fr`, `name_en`, `phone_code`, `administrative_era`.
- First record: code `01`, Adrar.
- Last record: code `69`, El Abiodh Sidi Cheikh.
- Coordinates are numeric source fields and must be preserved without rounding or regeneration.

Search implementation: `client/src/lib/citySearch.ts` normalizes Arabic diacritics and letter variants, Latin diacritics, whitespace and case. Wilaya search matches Arabic/French/English names, region, numeric code, slug and phone code. Preserve this behavior and the tests in `client/src/lib/citySearch.test.ts`.

### 3.2 Other geographic data

- `client/src/data/arab-capitals.ts`: typed Arab-capital records with slug, country, Arabic capital label, English name and latitude/longitude.
- `client/src/lib/coordinates.ts`: validates URL coordinate parameters; missing or invalid coordinates must not silently become `0,0`.
- `client/src/lib/placeVisuals.ts`: country/place visual helpers; has tests.
- `client/src/lib/reverseGeocode.ts`: reverse-geocoding request and response normalization.

### 3.3 Runtime and derived data

- Weather response types and transforms are in `client/src/lib/weather.ts`.
- NASA POWER response types, daily summaries and agriculture indicators are in `client/src/lib/nasaPower.ts`.
- City pages and sitemap are derived from the JSON source; do not hand-edit generated city HTML as a data source.
- Existing service worker caches only the local shell; comments explicitly say external forecast responses are not cached.

## 4. External services and network contracts

| Provider | Source module | Purpose | Migration requirement |
|---|---|---|---|
| Open-Meteo Forecast API | `lib/weather.ts` | Current, hourly and daily weather forecasts | Preserve requested parameters, units, timezone handling, error paths and stale-data behavior |
| Open-Meteo GFS endpoint | `lib/weather.ts` | Additional forecast/model path | Preserve only where the current implementation uses it |
| Open-Meteo Marine API | `lib/weather.ts` | Marine/wave indicators | Preserve marine fields and null/failure behavior |
| Open-Meteo Geocoding API | `pages/WorldSearch.tsx` | Global city/place search | Preserve query encoding, result selection and coordinate flow |
| BigDataCloud reverse geocoding | `lib/reverseGeocode.ts` | Resolve user-selected coordinates to administrative place labels | Must remain opt-in after the visitor explicitly requests their location; do not store raw coordinates |
| NASA POWER API | `lib/nasaPower.ts` | Historical daily climate data and agriculture indicators | Preserve date windows, parameters, missing-value handling and calculations |
| Official Algerian meteorology site | `pages/Alerts.tsx`, public chrome | Links to official vigilance, BMS and RSS/CAP sources | Keep outbound URLs and make external-link semantics accessible |
| OpenStreetMap / Leaflet resources | `pages/WeatherMap.tsx` and dependencies | Base map tiles, markers and map presentation | Keep attribution and map controls; use Leaflet directly, not React-Leaflet |

No live API keys are required by the listed public weather/data modules. Do not introduce credentials or proxy requirements without a separate security review.

## 5. Browser persistence and user preferences

| Key / behavior | Source | Current purpose | Vanilla parity |
|---|---|---|---|
| `atlas-favorite-cities-v1` | `lib/favorites.ts`, `hooks/useFavoriteCities.ts` | JSON array of unique city slugs; current validation caps saved items at 58 | Preserve key for existing users; review the legacy cap against the new 69-wilaya directory without silently losing saved values |
| `atlas-weather-*` family | `lib/weather.ts` | Cached weather readings used for resilience/stale display | Preserve exact key construction, expiry/validation and stale marker behavior; full key suffix and TTL need line-by-line audit during module port |
| `theme` | `contexts/ThemeContext.tsx` | Light/dark theme preference | Preserve key and default-light behavior |
| `atlas-location-asked...` family | `pages/Home.tsx` | Prevent repeated location prompt/ask flow | Preserve opt-in semantics; exact suffix/value and expiry require line-level audit |
| Storage events | `useFavoriteCities.ts` | Synchronize favorite updates across tabs | Native module should listen for the same `storage` event |

Storage calls are guarded where private browsing or storage limits can throw. The vanilla port must retain graceful fallbacks.

## 6. UI, behavior, and feature modules

| Area | Source files | Responsibilities to port |
|---|---|---|
| Global shell | `components/PublicChrome.tsx`, `components/DashboardLayout.tsx` | Header, navigation, responsive shell, footer, route chrome and ad placement |
| Site actions | `components/SiteActions.tsx`, `lib/shareSite.ts` | Share/copy links, install prompt, PWA affordances |
| City discovery | `components/CitySearch.tsx`, `pages/Directories.tsx`, `lib/citySearch.ts` | Search, normalization, selection, directory cards |
| Weather cards and insight | `components/WeatherCard.tsx`, `components/WeatherInsights.tsx` | Current/hourly/daily/marine readings and contextual insight |
| Map | `pages/WeatherMap.tsx`, `components/Map.tsx`, Leaflet | Base tiles, city/capital markers, overlays, controls, popups, responsive map |
| Alerts | `pages/Alerts.tsx` | Official source links and explanatory labels |
| Favorites | `pages/Favorites.tsx`, `lib/favorites.ts`, `hooks/useFavoriteCities.ts` | Local save/remove, empty state and cross-tab sync |
| Climate observatory | `pages/ClimateObservatory.tsx`, `lib/nasaPower.ts` | City selection, period selection, NASA data fetch, responsive SVG charts |
| Agriculture weather | `pages/AgricultureWeather.tsx`, `lib/nasaPower.ts` | City/period/base inputs and derived agricultural indicators |
| World search | `pages/WorldSearch.tsx`, `lib/reverseGeocode.ts`, `lib/placeVisuals.ts` | Remote search, location permission flow, country presentation and navigation |
| Ads | `components/AdSlot.tsx`, `components/AdSlot.test.ts` | Existing AdSense client and slots, reserved dimensions and no duplicate loader |
| Theme | `contexts/ThemeContext.tsx`, `client/src/index.css` | Default light theme, optional dark theme and CSS variables |
| PWA/offline | `client/public/manifest.webmanifest`, `client/public/sw.js`, icons | Install metadata, scope, local shell cache and registration |
| SEO assets | `scripts/generate-social-assets.mjs`, prerender and sitemap scripts | Open Graph/Twitter images, per-route title/description/canonical and XML sitemap |

The `components/ui/` directory contains a broad Radix/shadcn-style React component set. It is a dependency surface, not a reason to port every unused component. Each import from production page modules must be traced; only components actually required by the public routes should be recreated in native HTML/CSS/JS.

## 7. Dependency inventory and disposition

### Runtime dependencies observed in `package.json`

| Dependency family | Packages | Initial disposition |
|---|---|---|
| Framework and routing | `react`, `react-dom`, `wouter` | Remove only after every route is real HTML and no production module imports them |
| Mapping | `leaflet`, `react-leaflet` | Retain Leaflet; remove React-Leaflet after map port and regression checks |
| Charts | `recharts` | Audit actual imports; current climate page includes a custom SVG chart, so do not assume Recharts is essential |
| Icons | `lucide-react` | Replace with inline SVG/CSS/icon assets or a minimal native icon set |
| Theme | `next-themes` | Replace with a small native theme module |
| Styling | `tailwindcss`, `@tailwindcss/vite`, `tailwindcss-animate`, `tw-animate-css`, `autoprefixer`, `postcss` | Replace the generated styling pipeline with checked-in CSS only after all used styles are captured |
| UI primitives | Radix packages, `cmdk`, `vaul`, `embla-carousel-react`, `react-day-picker`, `react-resizable-panels`, `input-otp` | Trace imports; no blanket port or retention |
| Forms/data validation | `react-hook-form`, `@hookform/resolvers`, `zod` | Trace public route usage; implement native form validation where appropriate |
| Data/network | `axios`, `date-fns`, `nanoid`, `superjson` | Trace actual imports and preserve date/serialization semantics where used |
| Notifications/markdown | `sonner`, `streamdown` | Trace imports; replace only if present on public routes |
| Backend/runtime | Express, tRPC, Drizzle, MySQL, AWS S3 SDK, JOSE, cookie, dotenv | Not part of the static public Pages runtime by default; confirm no public route calls these before excluding from the static build |
| Build/test | Vite, TypeScript, esbuild, tsx, Vitest, Prettier, pnpm and Vite plugins | Remove from final production build only after the new build and tests run from a clean checkout |

### Direct import inventory

- Entry and route graph: `client/src/main.tsx`, `App.tsx`, 12 route targets listed above.
- Shared public chrome and interactions: `PublicChrome`, `SiteActions`, `AdSlot`, `WeatherCard`, `WeatherInsights`, `CitySearch`, `WilayaCard`, `PlaceIllustration`, `WeatherShareDialog`.
- Domain modules: `weather`, `citySearch`, `coordinates`, `favorites`, `nasaPower`, `reverseGeocode`, `placeVisuals`, `shareSite`.
- Theme module: `ThemeContext`.
- A dedicated follow-up import graph is still required for every page and nested component, especially lazy-loaded routes and the large `components/ui` directory. This is a deliberate open audit item, not an assumption that all packages are removable.

## 8. Existing automated checks and migration gates

Current repository checks include:

- `pnpm check`: TypeScript check.
- `pnpm test`: Vitest tests.
- `pnpm build:github`: GitHub Pages build and city prerender.
- `node scripts/verify-static-output.mjs`: HTML/PWA/sitemap/city-page and bundle-budget assertions.
- `pnpm sitemap:check`: canonical sitemap consistency.

The static output verifier currently asserts the React root shell, JavaScript/CSS bundle budgets, lazy map chunk, AdSense slots, manifest scope, SEO metadata, city-page output and sitemap parity. These checks describe the current implementation and must be replaced with vanilla-specific assertions when the HTML architecture is introduced; they must not simply be deleted.

## 9. Risk register

1. **Generated city HTML is not the actual standalone page yet.** Current prerendering modifies the Vite shell and injects SEO metadata; it does not eliminate the React runtime. A replacement must provide useful weather-page HTML without JS.
2. **The wilaya favorites cap is 58.** The directory has 69 entries, so storage validation must be intentionally migrated without discarding existing saved slugs.
3. **The map code has mixed history.** The current weather map page uses React-Leaflet/Leaflet; `components/Map.tsx` contains Google Maps integration guidance. Audit usage before choosing the single vanilla map implementation.
4. **Service worker cache versioning matters.** Update cache names and invalidate obsolete shells only with a tested upgrade path.
5. **Ad layout is part of visual behavior.** Preserve the current AdSense client/slot IDs and reserved layout; test layout shift and mobile overflow.
6. **Search and location permissions are privacy-sensitive.** Keep geolocation opt-in and never persist precise coordinates unless the current feature explicitly does so.
7. **The sitemap is intentionally selective.** Do not index parameter-only global weather or favorites pages by accident.
8. **Production workflow protection.** The workflow currently deploys only outside pull requests; preserve this condition and do not add deployment from migration branches.

## 10. Phase 1 status

- [x] Confirm repository default branch and write permission.
- [x] Create an isolated migration branch from `main`.
- [x] Verify current frontend/build stack and Pages workflow.
- [x] Enumerate declared application routes.
- [x] Verify the 69-record wilaya data set, unique codes/slugs and field schema.
- [x] Identify primary weather, geocoding, NASA POWER and map providers.
- [x] Identify known browser storage keys and persistence behavior.
- [x] Record the major page, UI, PWA, SEO and test modules.
- [ ] Complete recursive import/dependency reachability analysis for every public route.
- [ ] Audit all CSS tokens, breakpoints, font imports and route-specific styles.
- [ ] Record exact network request parameters, cache TTLs and fallback behavior for each data module.
- [ ] Capture baseline screenshots and route smoke-test results on mobile and desktop.

**Exit rule:** Phase 2 must not begin by replacing the live entry point. The next safe implementation step is to finish the remaining source audit, then add the new vanilla shell in a parallel directory while the React app remains the production entry.
