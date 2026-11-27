import { describe, expect, it } from "vitest";
import {
  createVirtualPageViewPayload,
  pushVirtualPageView,
  VIRTUAL_PAGE_VIEW_EVENT,
} from "@/lib/virtualPageView";

describe("SPA virtual page view tracking", () => {
  it("uses a custom event instead of a duplicate page_view event", () => {
    const payload = createVirtualPageViewPayload(
      "/meteo-dz/wilayas/algiers/",
      "طقس الجزائر العاصمة",
      "https://imadtbn.github.io",
    );

    expect(payload).toEqual({
      event: "meteo_virtual_page_view",
      page_path: "/meteo-dz/wilayas/algiers/",
      page_location: "https://imadtbn.github.io/meteo-dz/wilayas/algiers/",
      page_title: "طقس الجزائر العاصمة",
    });
    expect(payload.event).not.toBe("page_view");
  });

  it("excludes query strings and hashes from analytics", () => {
    const payload = createVirtualPageViewPayload(
      "/meteo-dz/world-search/?q=private#results",
      "بحث المدن",
      "https://imadtbn.github.io",
    );

    expect(payload.page_path).toBe("/meteo-dz/world-search/");
    expect(payload.page_location).toBe("https://imadtbn.github.io/meteo-dz/world-search/");
  });

  it("pushes exactly one custom event to the data layer", () => {
    const dataLayer: Record<string, unknown>[] = [];
    pushVirtualPageView(dataLayer, "/meteo-dz/alerts/", "التنبيهات", "https://imadtbn.github.io");

    expect(dataLayer).toHaveLength(1);
    expect(dataLayer[0].event).toBe(VIRTUAL_PAGE_VIEW_EVENT);
  });
});
