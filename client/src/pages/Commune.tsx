import { useRoute } from "wouter";
import { ALGERIAN_COMMUNES } from "@/data/communes";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";

export default function CommunePage() {
  const [, params] = useRoute("/communes/:slug");
  const commune = ALGERIAN_COMMUNES.find((item) => item.slug === params?.slug);
  if (!commune) return <NotFound />;
  return <Home forcedCity={commune} detail />;
}
