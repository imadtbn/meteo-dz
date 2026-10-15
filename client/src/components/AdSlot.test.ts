import { describe, expect, it } from "vitest";
import { ADS_CLIENT, ADS_SLOTS, isUsableAdWidth } from "@/components/AdSlot";

describe("responsive AdSense placement", () => {
  it("uses exactly the supplied publisher and the two requested ad units in order", () => {
    expect(ADS_CLIENT).toBe("ca-pub-5656416032906373");
    expect(Object.keys(ADS_SLOTS)).toEqual(["header", "footer"]);
    expect(ADS_SLOTS.header).toEqual({
      slot: "7867079394",
      format: "fluid",
      layoutKey: "-fr+57+4a-dc+8g",
    });
    expect(ADS_SLOTS.footer).toEqual({ slot: "3143411927", format: "auto" });
  });

  it("does not request ad content from collapsed or zero-width containers", () => {
    for (const width of [0, 1, 81, 130, 249, NaN, Infinity]) {
      expect(isUsableAdWidth(width)).toBe(false);
    }
    expect(isUsableAdWidth(250)).toBe(true);
    expect(isUsableAdWidth(320)).toBe(true);
    expect(isUsableAdWidth(1040)).toBe(true);
  });
});
