export const SITE_NAME = "الطقس الجزائري — مرصد الأطلس";
export const SITE_DESCRIPTION = "تابع حالة الطقس في ولايات الجزائر والعواصم العربية ومدن العالم، مع توقعات الأيام القادمة والخرائط. اكتشف الطقس وشارك الرابط مع أصدقائك.";
export const SITE_URL = "https://imadtbn.github.io/meteo-dz/";

export type ShareDetails = { title: string; description: string; url: string };

/** Prefer a prerendered city route so crawlers see the city's own Open Graph tags. */
export function getShareDetails(location: Pick<Location, "pathname" | "search" | "origin">, basePath: string): ShareDetails {
  const prefix = basePath.endsWith("/") ? basePath : basePath + "/";
  const path = location.pathname.startsWith(prefix)
    ? location.pathname.slice(prefix.length).replace(/^\/+|\/+$/g, "")
    : "";
  const params = new URLSearchParams(location.search);
  const selectedCity = params.get("city");
  const knownSlug = /^[a-z0-9-]{1,64}$/.test(selectedCity ?? "") ? selectedCity : null;
  const route = !path && knownSlug ? "weather/" + knownSlug : path;
  const titleByRoute: Record<string, string> = {
    wilayas: "الولايات الجزائرية | الطقس الجزائري",
    "arab-capitals": "العواصم العربية | الطقس الجزائري",
    "world-search": "البحث العالمي عن الطقس | الطقس الجزائري",
    "weather-map": "خريطة الطقس | الطقس الجزائري",
  };
  return {
    title: titleByRoute[route] ?? SITE_NAME,
    description: SITE_DESCRIPTION,
    url: new URL(route ? route + "/" : "", location.origin + prefix).toString(),
  };
}

export function socialShareLinks(details: ShareDetails) {
  const combined = details.description + "\n" + details.url;
  return {
    whatsapp: "https://wa.me/?text=" + encodeURIComponent(combined),
    telegram: "https://t.me/share/url?url=" + encodeURIComponent(details.url) + "&text=" + encodeURIComponent(details.description),
    facebook: "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(details.url),
    x: "https://twitter.com/intent/tweet?url=" + encodeURIComponent(details.url) + "&text=" + encodeURIComponent(details.description),
  };
}
