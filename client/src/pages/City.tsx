/** Style reminder: Atlas Observatory city pages preserve the same calm operational hierarchy as the main observation view. */
import { useRoute } from "wouter";
import { getCityBySlug } from "@/data/cities";
import Home from "@/pages/Home";

export default function City() {
  const [, params] = useRoute("/weather/:slug");
  return <Home forcedCity={getCityBySlug(params?.slug)} detail />;
}
