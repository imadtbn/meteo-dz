/** Style reminder: Atlas Observatory uses route-level pages that always preserve a clear route back to the current reading. */
import { lazy, Suspense, useEffect, useRef } from "react";
import NotFound from "@/pages/NotFound";
import { Route, Router as WouterRouter, Switch, useLocation, useRoute } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { pushVirtualPageView, shouldTrackVirtualPageView, type AnalyticsDataLayer } from "./lib/virtualPageView";
import City from "./pages/City";
import Home from "./pages/Home";
const WilayasWeatherIndex = lazy(() => import("./pages/Directories").then((module) => ({ default: module.WeatherDirectoryPage })));
const CommunesPage = lazy(() => import("./pages/Directories").then((module) => ({ default: module.CommunesPage })));
const WilayasPage = lazy(() => import("./pages/Directories").then((module) => ({ default: module.WilayasPage })));
const ArabCapitalsPage = lazy(() => import("./pages/Directories").then((module) => ({ default: module.ArabCapitalsPage })));
const GlobalWeatherPage = lazy(() => import("./pages/GlobalWeather"));
const WeatherMapPage = lazy(() => import("./pages/WeatherMap"));
const WorldSearchPage = lazy(() => import("./pages/WorldSearch").then((module) => ({ default: module.WorldSearchPage })));
const WorldCapitalsPage = lazy(() => import("./pages/Directories").then((module) => ({ default: module.WorldCapitalsPage })));
const AlertsPage = lazy(() => import("./pages/Alerts"));
const FavoritesPage = lazy(() => import("./pages/Favorites"));
const ClimateObservatoryPage = lazy(() => import("./pages/ClimateObservatory"));
const AgricultureWeatherPage = lazy(() => import("./pages/AgricultureWeather"));
const CommunePage = lazy(() => import("./pages/Commune"));

/**
 * Tracks client-side route changes with a custom GTM event.
 * The initial page view remains under GTM's normal page-load tracking.
 * This tracker never emits the GA4 "page_view" event itself.
 */
function SpaPageViewTracker() {
  const [location] = useLocation();
  const lastTrackedPath = useRef<string | null>(window.location.pathname);

  useEffect(() => {
    const pathname = window.location.pathname;
    if (!shouldTrackVirtualPageView(lastTrackedPath.current, pathname)) return;
    lastTrackedPath.current = pathname;

    const analyticsWindow = window as Window & { dataLayer?: AnalyticsDataLayer };
    const dataLayer = analyticsWindow.dataLayer ?? (analyticsWindow.dataLayer = []);
    pushVirtualPageView(dataLayer, pathname, document.title, window.location.origin);
  }, [location]);

  return null;
}

function LegacyWilayaRedirect() {
  const [, params] = useRoute("/weather/:slug");
  const [, navigate] = useLocation();
  useEffect(() => { if (params?.slug) navigate("/wilayas/" + params.slug + "/", { replace: true }); }, [params?.slug, navigate]);
  return <div className="loading-card" dir="rtl">جارٍ تحديث رابط الولاية…</div>;
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  const base = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";
  return (
    <WouterRouter base={base}>
      <SpaPageViewTracker />
      <Suspense fallback={<div className="loading-card" dir="rtl">جارٍ فتح صفحة المرصد…</div>}>
      <Switch>
      <Route path={"/"} component={() => <Home />} />
      <Route path={"/weather"} component={WilayasWeatherIndex} />
      <Route path={"/wilayas/:slug"} component={City} />
      <Route path={"/weather/:slug"} component={LegacyWilayaRedirect} />
      <Route path={"/communes"} component={CommunesPage} />
      <Route path={"/communes/:slug"} component={CommunePage} />
      <Route path={"/wilayas"} component={WilayasPage} />
      <Route path={"/arab-capitals"} component={ArabCapitalsPage} />
      <Route path={"/arab-capitals/:slug"} component={GlobalWeatherPage} />
      <Route path={"/world-capitals"} component={WorldCapitalsPage} />
      <Route path={"/world-capitals/:slug"} component={GlobalWeatherPage} />
      <Route path={"/world-search"} component={WorldSearchPage} />
      <Route path={"/global-weather"} component={GlobalWeatherPage} />
      <Route path={"/weather-map"} component={WeatherMapPage} />
      <Route path={"/alerts"} component={AlertsPage} />
      <Route path={"/favorites"} component={FavoritesPage} />
      <Route path={"/climate-observatory"} component={ClimateObservatoryPage} />
      <Route path={"/agriculture-weather"} component={AgricultureWeatherPage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
      </Switch>
      </Suspense>
    </WouterRouter>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass switchable ThemeProvider and use useTheme hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <Router />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
