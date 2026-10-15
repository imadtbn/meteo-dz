/** Reverse geocoding starts only after the visitor explicitly presses "موقعي".
 * The lookup provider receives coordinates to resolve country/admin/municipality.
 * No coordinates are stored by this module.
 */
export type ResolvedLocation = {
  country: string | null;
  region: string | null;
  municipality: string | null;
};

type ReversePayload = {
  countryName?: string;
  principalSubdivision?: string;
  city?: string;
  locality?: string;
  localityInfo?: {
    administrative?: Array<{ name?: string; order?: number; adminLevel?: number; description?: string }>;
  };
};

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** Prefer explicit API fields; don't falsely invent an administrative level. */
export function parseReverseLocation(data: ReversePayload): ResolvedLocation {
  const administrative = data.localityInfo?.administrative ?? [];
  const region = nonEmpty(data.principalSubdivision)
    ?? nonEmpty(administrative.find((item) => item.order === 4)?.name);
  const municipality = nonEmpty(data.city) ?? nonEmpty(data.locality)
    ?? nonEmpty(administrative.find((item) => item.order === 8)?.name);
  return {
    country: nonEmpty(data.countryName),
    region,
    municipality,
  };
}

export async function reverseGeocode(latitude: number, longitude: number, signal?: AbortSignal): Promise<ResolvedLocation> {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
      !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    throw new Error("إحداثيات الموقع غير صالحة.");
  }

  const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: "ar",
  }).toString();

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("تعذّر الوصول إلى خدمة أسماء المناطق.");
    const data: ReversePayload = await response.json();
    const parsed = parseReverseLocation(data);
    if (!parsed.country && !parsed.region && !parsed.municipality) throw new Error("لا تتوفر تفاصيل إدارية لهذا الموقع.");
    return parsed;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
