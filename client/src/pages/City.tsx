import { useRoute } from "wouter";
import { ALGERIAN_CITIES } from "@/data/cities";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";

export default function City() {
  const [, params] = useRoute("/weather/:slug");
  const city = ALGERIAN_CITIES.find((item) => item.slug === params?.slug);
  if (!city) return <NotFound />;
  return <Home forcedCity={city} detail />;
}
