/**
 * Parse coordinates from a shareable weather URL.
 * Missing values must never silently turn into 0,0.
 */
export function parseCoordinates(search: string): { latitude: number; longitude: number } | null {
  const params = new URLSearchParams(search);
  const rawLat = params.get("lat");
  const rawLon = params.get("lon");
  if (!rawLat?.trim() || !rawLon?.trim()) return null;
  const latitude = Number(rawLat);
  const longitude = Number(rawLon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}
