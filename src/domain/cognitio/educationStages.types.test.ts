import { describe, it, expect } from "vitest";
import {
  EDUCATION_STAGES,
  INSTITUTION_TYPES,
  FIELD_CATEGORIES,
  STAGE_METADATA,
  HEALTH_SUBFIELD_METADATA,
  HEALTH_SUBFIELDS,
  MEDICAL_PROGRESSIONS,
  MEDICAL_PROGRESSION_METADATA,
  isHealthStage,
  type EducationStage,
  type EducationProfile,
} from "./educationStages.types";

describe("EDUCATION_STAGES", () => {
  it("has 13 stages", () => {
    expect(EDUCATION_STAGES).toHaveLength(13);
  });

  it("contains all expected values", () => {
    expect(EDUCATION_STAGES).toContain("college");
    expect(EDUCATION_STAGES).toContain("lycee");
    expect(EDUCATION_STAGES).toContain("lycee_pro");
    expect(EDUCATION_STAGES).toContain("bts_but");
    expect(EDUCATION_STAGES).toContain("prepa");
    expect(EDUCATION_STAGES).toContain("licence");
    expect(EDUCATION_STAGES).toContain("master");
    expect(EDUCATION_STAGES).toContain("doctorat");
    expect(EDUCATION_STAGES).toContain("medical");
    expect(EDUCATION_STAGES).toContain("law");
    expect(EDUCATION_STAGES).toContain("engineering");
    expect(EDUCATION_STAGES).toContain("commerce");
    expect(EDUCATION_STAGES).toContain("adult_pro");
  });
});

describe("INSTITUTION_TYPES", () => {
  it("has 7 types", () => {
    expect(INSTITUTION_TYPES).toHaveLength(7);
  });

  it("contains expected values", () => {
    expect(INSTITUTION_TYPES).toContain("public_school");
    expect(INSTITUTION_TYPES).toContain("private_school");
    expect(INSTITUTION_TYPES).toContain("university");
    expect(INSTITUTION_TYPES).toContain("grande_ecole");
    expect(INSTITUTION_TYPES).toContain("iut");
    expect(INSTITUTION_TYPES).toContain("training_center");
    expect(INSTITUTION_TYPES).toContain("self_taught");
  });
});

describe("FIELD_CATEGORIES", () => {
  it("has 12 categories", () => {
    expect(FIELD_CATEGORIES).toHaveLength(12);
  });

  it("contains expected values", () => {
    expect(FIELD_CATEGORIES).toContain("sciences");
    expect(FIELD_CATEGORIES).toContain("humanities");
    expect(FIELD_CATEGORIES).toContain("languages");
    expect(FIELD_CATEGORIES).toContain("law_political");
    expect(FIELD_CATEGORIES).toContain("health_medical");
    expect(FIELD_CATEGORIES).toContain("engineering_tech");
    expect(FIELD_CATEGORIES).toContain("business_management");
    expect(FIELD_CATEGORIES).toContain("arts_design");
    expect(FIELD_CATEGORIES).toContain("education");
    expect(FIELD_CATEGORIES).toContain("social_sciences");
    expect(FIELD_CATEGORIES).toContain("sport");
    expect(FIELD_CATEGORIES).toContain("other");
  });
});

describe("STAGE_METADATA", () => {
  it("has one entry per education stage (13 entries)", () => {
    expect(STAGE_METADATA).toHaveLength(13);
  });

  it("each entry has required fields", () => {
    for (const entry of STAGE_METADATA) {
      expect(entry).toHaveProperty("stage");
      expect(entry).toHaveProperty("label_key");
      expect(entry).toHaveProperty("description_key");
      expect(entry).toHaveProperty("emoji");
      expect(entry).toHaveProperty("typical_age_range");
      expect(entry).toHaveProperty("audience_level");
    }
  });

  it("every EDUCATION_STAGES value has a matching metadata entry", () => {
    const metadataStages = STAGE_METADATA.map((entry) => entry.stage);
    for (const stage of EDUCATION_STAGES) {
      expect(metadataStages).toContain(stage);
    }
  });

  it("college maps to audience_level 'college'", () => {
    const entry = STAGE_METADATA.find((e) => e.stage === "college");
    expect(entry?.audience_level).toBe("college");
  });

  it("lycee maps to audience_level 'lycee'", () => {
    const entry = STAGE_METADATA.find((e) => e.stage === "lycee");
    expect(entry?.audience_level).toBe("lycee");
  });

  it("medical maps to audience_level 'medical'", () => {
    const entry = STAGE_METADATA.find((e) => e.stage === "medical");
    expect(entry?.audience_level).toBe("medical");
  });

  it("law maps to audience_level 'law'", () => {
    const entry = STAGE_METADATA.find((e) => e.stage === "law");
    expect(entry?.audience_level).toBe("law");
  });

  it("adult_pro maps to audience_level 'adult_pro'", () => {
    const entry = STAGE_METADATA.find((e) => e.stage === "adult_pro");
    expect(entry?.audience_level).toBe("adult_pro");
  });

  it("prepa maps to audience_level 'prepa'", () => {
    const entry = STAGE_METADATA.find((e) => e.stage === "prepa");
    expect(entry?.audience_level).toBe("prepa");
  });
});

describe("EducationProfile type (structural)", () => {
  it("can create a valid profile with just stage", () => {
    const profile: EducationProfile = {
      stage: "licence",
    };
    expect(profile.stage).toBe("licence");
    expect(profile.institution_type).toBeUndefined();
    expect(profile.field_category).toBeUndefined();
    expect(profile.field_of_study).toBeUndefined();
    expect(profile.year_in_program).toBeUndefined();
  });

  it("can create a full profile with all fields", () => {
    const profile: EducationProfile = {
      stage: "master",
      institution_type: "university",
      field_category: "sciences",
      field_of_study: "Physique quantique",
      year_in_program: 1,
    };
    expect(profile.stage).toBe("master");
    expect(profile.institution_type).toBe("university");
    expect(profile.field_category).toBe("sciences");
    expect(profile.field_of_study).toBe("Physique quantique");
    expect(profile.year_in_program).toBe(1);
  });

  it("can create a health profile with subfield and progression", () => {
    const profile: EducationProfile = {
      stage: "medical",
      field_category: "health_medical",
      health_subfield: "medecine",
      medical_progression: "dfasm",
      field_of_study: "Pneumologie",
    };
    expect(profile.stage).toBe("medical");
    expect(profile.health_subfield).toBe("medecine");
    expect(profile.medical_progression).toBe("dfasm");
    expect(profile.field_of_study).toBe("Pneumologie");
  });
});

describe("HEALTH_SUBFIELDS", () => {
  it("has 9 subfields", () => {
    expect(HEALTH_SUBFIELDS).toHaveLength(9);
  });

  it("contains all key health tracks", () => {
    expect(HEALTH_SUBFIELDS).toContain("pass");
    expect(HEALTH_SUBFIELDS).toContain("las");
    expect(HEALTH_SUBFIELDS).toContain("medecine");
    expect(HEALTH_SUBFIELDS).toContain("pharmacie");
    expect(HEALTH_SUBFIELDS).toContain("maieutique");
    expect(HEALTH_SUBFIELDS).toContain("odontologie");
  });
});

describe("HEALTH_SUBFIELD_METADATA", () => {
  it("has one entry per subfield", () => {
    expect(HEALTH_SUBFIELD_METADATA).toHaveLength(HEALTH_SUBFIELDS.length);
  });

  it("each entry has label, emoji, description", () => {
    for (const meta of HEALTH_SUBFIELD_METADATA) {
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.emoji.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
    }
  });
});

describe("MEDICAL_PROGRESSIONS", () => {
  it("has 7 progressions", () => {
    expect(MEDICAL_PROGRESSIONS).toHaveLength(7);
  });

  it("has metadata for each progression", () => {
    expect(MEDICAL_PROGRESSION_METADATA).toHaveLength(MEDICAL_PROGRESSIONS.length);
  });
});

describe("isHealthStage", () => {
  it("returns true for medical", () => {
    expect(isHealthStage("medical")).toBe(true);
  });

  it("returns false for other stages", () => {
    expect(isHealthStage("licence")).toBe(false);
    expect(isHealthStage("college")).toBe(false);
    expect(isHealthStage("law")).toBe(false);
  });
});
