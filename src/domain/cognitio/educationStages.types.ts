export const EDUCATION_STAGES = [
  "college",       // Collège (6e-3e)
  "lycee",         // Lycée général/technologique
  "lycee_pro",     // Lycée professionnel
  "bts_but",       // BTS / BUT
  "prepa",         // Classes préparatoires
  "licence",       // Licence (L1-L3)
  "master",        // Master (M1-M2)
  "doctorat",      // Doctorat
  "medical",       // Études de santé (PASS/LAS, externat, internat)
  "law",           // Études de droit
  "engineering",   // École d'ingénieur
  "commerce",      // École de commerce
  "adult_pro",     // Formation professionnelle / reconversion
] as const;

export type EducationStage = (typeof EDUCATION_STAGES)[number];

export const INSTITUTION_TYPES = [
  "public_school",
  "private_school",
  "university",
  "grande_ecole",
  "iut",
  "training_center",
  "self_taught",
] as const;

export type InstitutionType = (typeof INSTITUTION_TYPES)[number];

export const FIELD_CATEGORIES = [
  "sciences",
  "humanities",
  "languages",
  "law_political",
  "health_medical",
  "engineering_tech",
  "business_management",
  "arts_design",
  "education",
  "social_sciences",
  "sport",
  "other",
] as const;

export type FieldCategory = (typeof FIELD_CATEGORIES)[number];

export interface EducationProfile {
  stage: EducationStage;
  institution_type?: InstitutionType;
  field_category?: FieldCategory;
  field_of_study?: string;       // free text: "Droit constitutionnel", "Médecine générale"
  year_in_program?: number;       // e.g., L2 = 2, M1 = 1
}

// Stage metadata for UI
export interface StageMetadata {
  stage: EducationStage;
  label_key: string;              // i18n key
  description_key: string;        // i18n key
  emoji: string;
  typical_age_range: string;
  typical_fields: FieldCategory[];
  audience_level: string;         // maps to escapeGame.types AudienceLevel
}

export const STAGE_METADATA: StageMetadata[] = [
  {
    stage: "college",
    label_key: "education.stage.college",
    description_key: "education.stage.college.description",
    emoji: "📚",
    typical_age_range: "11-15 ans",
    typical_fields: ["sciences", "humanities", "languages", "social_sciences"],
    audience_level: "college",
  },
  {
    stage: "lycee",
    label_key: "education.stage.lycee",
    description_key: "education.stage.lycee.description",
    emoji: "🎓",
    typical_age_range: "15-18 ans",
    typical_fields: ["sciences", "humanities", "languages", "social_sciences", "arts_design"],
    audience_level: "lycee",
  },
  {
    stage: "lycee_pro",
    label_key: "education.stage.lycee_pro",
    description_key: "education.stage.lycee_pro.description",
    emoji: "🔧",
    typical_age_range: "15-18 ans",
    typical_fields: ["engineering_tech", "business_management", "arts_design", "other"],
    audience_level: "lycee",
  },
  {
    stage: "bts_but",
    label_key: "education.stage.bts_but",
    description_key: "education.stage.bts_but.description",
    emoji: "📋",
    typical_age_range: "18-20 ans",
    typical_fields: ["engineering_tech", "business_management", "sciences", "arts_design"],
    audience_level: "university",
  },
  {
    stage: "prepa",
    label_key: "education.stage.prepa",
    description_key: "education.stage.prepa.description",
    emoji: "⚡",
    typical_age_range: "18-20 ans",
    typical_fields: ["sciences", "humanities", "engineering_tech", "business_management"],
    audience_level: "prepa",
  },
  {
    stage: "licence",
    label_key: "education.stage.licence",
    description_key: "education.stage.licence.description",
    emoji: "🏛️",
    typical_age_range: "18-21 ans",
    typical_fields: [
      "sciences",
      "humanities",
      "languages",
      "law_political",
      "social_sciences",
      "business_management",
    ],
    audience_level: "university",
  },
  {
    stage: "master",
    label_key: "education.stage.master",
    description_key: "education.stage.master.description",
    emoji: "🔬",
    typical_age_range: "21-23 ans",
    typical_fields: [
      "sciences",
      "humanities",
      "engineering_tech",
      "law_political",
      "business_management",
      "social_sciences",
    ],
    audience_level: "university",
  },
  {
    stage: "doctorat",
    label_key: "education.stage.doctorat",
    description_key: "education.stage.doctorat.description",
    emoji: "🎯",
    typical_age_range: "23+ ans",
    typical_fields: [
      "sciences",
      "humanities",
      "engineering_tech",
      "health_medical",
      "law_political",
      "social_sciences",
    ],
    audience_level: "university",
  },
  {
    stage: "medical",
    label_key: "education.stage.medical",
    description_key: "education.stage.medical.description",
    emoji: "🏥",
    typical_age_range: "18-28 ans",
    typical_fields: ["health_medical", "sciences"],
    audience_level: "medical",
  },
  {
    stage: "law",
    label_key: "education.stage.law",
    description_key: "education.stage.law.description",
    emoji: "⚖️",
    typical_age_range: "18-23 ans",
    typical_fields: ["law_political", "humanities", "social_sciences"],
    audience_level: "law",
  },
  {
    stage: "engineering",
    label_key: "education.stage.engineering",
    description_key: "education.stage.engineering.description",
    emoji: "⚙️",
    typical_age_range: "18-23 ans",
    typical_fields: ["engineering_tech", "sciences"],
    audience_level: "university",
  },
  {
    stage: "commerce",
    label_key: "education.stage.commerce",
    description_key: "education.stage.commerce.description",
    emoji: "💼",
    typical_age_range: "18-23 ans",
    typical_fields: ["business_management", "law_political", "social_sciences"],
    audience_level: "university",
  },
  {
    stage: "adult_pro",
    label_key: "education.stage.adult_pro",
    description_key: "education.stage.adult_pro.description",
    emoji: "🔄",
    typical_age_range: "25+ ans",
    typical_fields: [
      "engineering_tech",
      "business_management",
      "health_medical",
      "education",
      "other",
    ],
    audience_level: "adult_pro",
  },
];
