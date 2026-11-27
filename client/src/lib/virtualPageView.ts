export const VIRTUAL_PAGE_VIEW_EVENT = "meteo_virtual_page_view";

export interface VirtualPageViewPayload {
  event: typeof VIRTUAL_PAGE_VIEW_EVENT;
  page_path: string;
  page_location: string;
  page_title: string;
}

export type AnalyticsDataLayer = Array<Record<string, unknown> | VirtualPageViewPayload>;

/**
 * Build a privacy-conscious SPA navigation event.
 * Query strings and hashes are intentionally excluded from analytics.
 */
export function createVirtualPageViewPayload(
  pathname: string,
  title: string,
  origin: string,
): VirtualPageViewPayload {
  const normalizedPath = new URL(pathname, origin).pathname || "/";
  return {
    event: VIRTUAL_PAGE_VIEW_EVENT,
    page_path: normalizedPath,
    page_location: new URL(normalizedPath, origin).toString(),
    page_title: title,
  };
}

export function pushVirtualPageView(
  dataLayer: AnalyticsDataLayer,
  pathname: string,
  title: string,
  origin: string,
): void {
  dataLayer.push(createVirtualPageViewPayload(pathname, title, origin));
}
