// ============================================================
// Tests — Escape Game Types & Selection Logic
// ============================================================

import { describe, it, expect } from "vitest";
import {
  selectUniverseProfile,
  selectMissionFamily,
  ESCAPE_BRICK_TYPES,
  MISSION_FAMILIES,
  AUDIENCE_LEVELS,
} from "./escapeGame.types";

describe("escapeGame types", () => {
  describe("selectUniverseProfile", () => {
    it("returns playful tone for college level", () => {
      const profile = selectUniverseProfile("college");
      expect(profile.tone).toBe("playful");
      expect(profile.hint_style).toBe("generous");
      expect(profile.tension_level).toBeLessThanOrEqual(3);
    });

    it("returns engaging tone for lycee level", () => {
      const profile = selectUniverseProfile("lycee");
      expect(profile.tone).toBe("engaging");
      expect(profile.ambiance).toBe("mystery");
    });

    it("returns rigorous tone for prepa level", () => {
      const profile = selectUniverseProfile("prepa");
      expect(profile.tone).toBe("rigorous");
      expect(profile.tension_level).toBeGreaterThanOrEqual(4);
      expect(profile.hint_style).toBe("sparse");
    });

    it("returns clinical ambiance for medical level", () => {
      const profile = selectUniverseProfile("medical");
      expect(profile.ambiance).toBe("clinical");
      expect(profile.abstraction_level).toBe(5);
    });

    it("returns courtroom ambiance for law level", () => {
      const profile = selectUniverseProfile("law");
      expect(profile.ambiance).toBe("courtroom");
      expect(profile.tone).toBe("analytical");
    });

    it("returns direct tone for adult_pro level", () => {
      const profile = selectUniverseProfile("adult_pro");
      expect(profile.tone).toBe("direct");
      expect(profile.narrative_style).toBe("minimal");
    });

    it("defines a profile for every audience level", () => {
      for (const level of AUDIENCE_LEVELS) {
        const profile = selectUniverseProfile(level);
        expect(profile.audience_level).toBe(level);
        expect(profile.tone).toBeDefined();
        expect(profile.ambiance).toBeDefined();
      }
    });
  });

  describe("selectMissionFamily", () => {
    it("selects clinical_simulation for medical courses", () => {
      expect(selectMissionFamily("médecine générale", "medical")).toBe("clinical_simulation");
      expect(selectMissionFamily("santé publique", "university")).toBe("clinical_simulation");
    });

    it("selects legal_reasoning for law courses", () => {
      expect(selectMissionFamily("droit constitutionnel", "law")).toBe("legal_reasoning");
      expect(selectMissionFamily("juridique", "university")).toBe("legal_reasoning");
    });

    it("selects logic_sequencing for math courses", () => {
      expect(selectMissionFamily("mathématiques", "lycee")).toBe("logic_sequencing");
      expect(selectMissionFamily("algorithmique", "prepa")).toBe("logic_sequencing");
    });

    it("selects scientific_discovery for science courses", () => {
      expect(selectMissionFamily("physique quantique", "university")).toBe("scientific_discovery");
      expect(selectMissionFamily("chimie organique", "prepa")).toBe("scientific_discovery");
      expect(selectMissionFamily("biologie cellulaire", "lycee")).toBe("scientific_discovery");
    });

    it("selects investigation for history/geography courses", () => {
      expect(selectMissionFamily("histoire contemporaine", "lycee")).toBe("investigation");
      expect(selectMissionFamily("géographie humaine", "university")).toBe("investigation");
    });

    it("selects exploration for college level by default", () => {
      expect(selectMissionFamily("français", "college")).toBe("exploration");
    });

    it("falls back to exploration for unknown course types", () => {
      expect(selectMissionFamily("unknown course", "university")).toBe("exploration");
    });
  });

  describe("constants", () => {
    it("has at least 10 escape brick types", () => {
      expect(ESCAPE_BRICK_TYPES.length).toBeGreaterThanOrEqual(10);
    });

    it("has at least 5 mission families", () => {
      expect(MISSION_FAMILIES.length).toBeGreaterThanOrEqual(5);
    });

    it("has at least 5 audience levels", () => {
      expect(AUDIENCE_LEVELS.length).toBeGreaterThanOrEqual(5);
    });
  });
});
