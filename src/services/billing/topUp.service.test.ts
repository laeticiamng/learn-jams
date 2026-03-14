import { describe, it, expect } from "vitest";
import { CREDIT_PACKS, getPacksForFeature } from "./topUp.service";

describe("topUp", () => {
  describe("CREDIT_PACKS", () => {
    it("has 9 packs", () => {
      expect(CREDIT_PACKS.length).toBe(9);
    });

    it("all packs are active", () => {
      expect(CREDIT_PACKS.every((p) => p.active)).toBe(true);
    });

    it("all packs have positive prices", () => {
      expect(CREDIT_PACKS.every((p) => p.price > 0)).toBe(true);
    });

    it("all packs use EUR", () => {
      expect(CREDIT_PACKS.every((p) => p.currency === "EUR")).toBe(true);
    });
  });

  describe("getPacksForFeature", () => {
    it("returns music generation packs", () => {
      const packs = getPacksForFeature("music_generation");
      expect(packs.length).toBe(2);
      expect(packs[0].pack_key).toBe("songs_5");
      expect(packs[1].pack_key).toBe("songs_15");
    });

    it("returns escape game packs", () => {
      const packs = getPacksForFeature("escape_game_generation");
      expect(packs.length).toBe(2);
    });

    it("returns video AI packs", () => {
      const packs = getPacksForFeature("video_generation_ai_seconds");
      expect(packs.length).toBe(3);
    });

    it("returns SMS packs", () => {
      const packs = getPacksForFeature("guardian_sms");
      expect(packs.length).toBe(2);
    });

    it("returns empty for features with no packs", () => {
      expect(getPacksForFeature("dynamic_sheet_generation")).toEqual([]);
      expect(getPacksForFeature("guardian_email")).toEqual([]);
    });
  });
});
