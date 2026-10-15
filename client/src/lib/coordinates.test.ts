import { describe, expect, it } from "vitest";
import { parseCoordinates } from "@/lib/coordinates";

describe("shareable geographic routes", () => {
  it("accepts Algerian and international coordinates", () => {
    expect(parseCoordinates("?lat=36.75&lon=3.05")).toEqual({ latitude: 36.75, longitude: 3.05 });
    expect(parseCoordinates("lat=-33.87&lon=151.2")).toEqual({ latitude: -33.87, longitude: 151.2 });
  });

  it("rejects omitted and blank coordinates instead of substituting 0,0", () => {
    expect(parseCoordinates("")).toBeNull();
    expect(parseCoordinates("?lat=36.75")).toBeNull();
    expect(parseCoordinates("?lat=&lon=4")).toBeNull();
    expect(parseCoordinates("?lat=36.75&lon=")).toBeNull();
  });

  it("rejects invalid or out-of-range coordinates", () => {
    expect(parseCoordinates("?lat=hello&lon=3")).toBeNull();
    expect(parseCoordinates("?lat=91&lon=3")).toBeNull();
    expect(parseCoordinates("?lat=12&lon=181")).toBeNull();
    expect(parseCoordinates("?lat=Infinity&lon=3")).toBeNull();
  });
});
