/** Style reminder: Atlas Observatory uses route-level pages that always preserve a clear route back to the current reading. */
import { lazy, Suspense } from "react";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import City from "./pages/City";
import Home from "./pages/Home";
const WilayasPage = lazy(() => import("./pages/Directories").then((module) => ({ default: module.WilayasPage })));
const ArabCapitalsPage = lazy(() => import("./pages/Directories").then((module) => ({ default: module.ArabCapitalsPage })));
const GlobalWeatherPage = lazy(() => import("./pages/GlobalWeather"));
const WeatherMapPage = lazy(() => import("./pages/WeatherMap"));
const WorldSearchPage = lazy(() => import("./pages/WorldSearch").then((module) => ({ default: module.WorldSearchPage })));

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Suspense fallback={<div className="loading-card" dir="rtl">جارٍ فتح صفحة المرصد…</div>}>
      <Switch>
      <Route path={"/"} component={() => <Home />} />
      <Route path={"/weather/:slug"} component={City} />
      <Route path={"/wilayas"} component={WilayasPage} />
      <Route path={"/arab-capitals"} component={ArabCapitalsPage} />
      <Route path={"/world-search"} component={WorldSearchPage} />
      <Route path={"/global-weather"} component={GlobalWeatherPage} />
      <Route path={"/weather-map"} component={WeatherMapPage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

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
