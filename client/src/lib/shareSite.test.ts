import { describe, expect, it } from "vitest";
import { getShareDetails, SITE_DESCRIPTION, SITE_NAME, socialShareLinks } from "@/lib/shareSite";

describe("site sharing and social preview URLs", () => {
  const origin = "https://imadtbn.github.io";
  const base = "/meteo-dz/";

  it("shares the homepage with a readable short description", () => {
    expect(getShareDetails({ origin, pathname: base, search: "" }, base)).toEqual({
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      url: origin + base,
    });
  });

  it("normalizes a homepage city query to its indexable static weather route", () => {
    expect(getShareDetails({ origin, pathname: base, search: "?city=oran" }, base).url)
      .toBe("https://imadtbn.github.io/meteo-dz/weather/oran/");
  });

  it("shares a weather subpage without noncanonical query parameters", () => {
    const details = getShareDetails({
      origin, pathname: "/meteo-dz/weather/annaba/", search: "?utm_source=example",
    }, base);
    expect(details.url).toBe(origin + "/meteo-dz/weather/annaba/");
  });

  it("shares static directory routes with correct titles", () => {
    const details = getShareDetails({ origin, pathname: "/meteo-dz/wilayas/", search: "" }, base);
    expect(details.url).toBe(origin + "/meteo-dz/wilayas/");
    expect(details.title).toContain("الولايات");
  });

  it("provides encoded URLs for WhatsApp, Telegram, Facebook and X", () => {
    const links = socialShareLinks({ title: SITE_NAME, description: SITE_DESCRIPTION, url: origin + base });
    expect(links.whatsapp).toContain(encodeURIComponent(SITE_DESCRIPTION));
    expect(links.telegram).toContain(encodeURIComponent(origin + base));
    expect(links.facebook).toContain(encodeURIComponent(origin + base));
    expect(links.x).toContain("intent/tweet");
  });
});
