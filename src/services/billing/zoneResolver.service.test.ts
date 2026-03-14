import { describe, it, expect } from "vitest";
import { resolveZone, getZoneMultiplier, getLocalCurrency } from "./zoneResolver.service";

describe("zoneResolver", () => {
  describe("resolveZone", () => {
    it("maps Zone A countries correctly", () => {
      expect(resolveZone("FR")).toBe("zone_a");
      expect(resolveZone("DE")).toBe("zone_a");
      expect(resolveZone("US")).toBe("zone_a");
      expect(resolveZone("JP")).toBe("zone_a");
    });

    it("maps Zone B countries correctly", () => {
      expect(resolveZone("PL")).toBe("zone_b");
      expect(resolveZone("TR")).toBe("zone_b");
      expect(resolveZone("BR")).toBe("zone_b");
      expect(resolveZone("SA")).toBe("zone_b");
    });

    it("maps Zone C countries correctly", () => {
      expect(resolveZone("IN")).toBe("zone_c");
      expect(resolveZone("NG")).toBe("zone_c");
      expect(resolveZone("PH")).toBe("zone_c");
      expect(resolveZone("VN")).toBe("zone_c");
    });

    it("defaults unknown countries to zone_a", () => {
      expect(resolveZone("XX")).toBe("zone_a");
      expect(resolveZone("ZZ")).toBe("zone_a");
    });

    it("handles lowercase country codes", () => {
      expect(resolveZone("fr")).toBe("zone_a");
      expect(resolveZone("in")).toBe("zone_c");
    });
  });

  describe("getZoneMultiplier", () => {
    it("returns correct multipliers", () => {
      expect(getZoneMultiplier("zone_a")).toBe(1.0);
      expect(getZoneMultiplier("zone_b")).toBe(0.75);
      expect(getZoneMultiplier("zone_c")).toBe(0.55);
    });
  });

  describe("getLocalCurrency", () => {
    it("returns correct currencies for known countries", () => {
      expect(getLocalCurrency("US")).toBe("USD");
      expect(getLocalCurrency("GB")).toBe("GBP");
      expect(getLocalCurrency("JP")).toBe("JPY");
      expect(getLocalCurrency("IN")).toBe("INR");
      expect(getLocalCurrency("BR")).toBe("BRL");
    });

    it("defaults to EUR for unknown countries", () => {
      expect(getLocalCurrency("FR")).toBe("EUR");
      expect(getLocalCurrency("XX")).toBe("EUR");
    });

    it("handles lowercase", () => {
      expect(getLocalCurrency("us")).toBe("USD");
    });
  });
});
