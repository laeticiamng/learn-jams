// ============================================================
// COGNITIO Education Stages — Taxonomy with natural labels
// Includes explicit health/medical tracks for PASS/LAS/médecine etc.
// ============================================================

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

// ---------- Field Categories ----------

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

// ---------- Health / Medical Subfields ----------

export const HEALTH_SUBFIELDS = [
  "pass",             // PASS (Parcours Accès Santé Spécifique)
  "las",              // LAS (Licence Accès Santé)
  "medecine",         // Médecine
  "pharmacie",        // Pharmacie
  "maieutique",       // Maïeutique (sage-femme)
  "odontologie",      // Odontologie
  "kinesitherapie",   // Kinésithérapie
  "infirmier",        // Soins infirmiers
  "other_health",     // Autres études de santé
] as const;

export type HealthSubfield = (typeof HEALTH_SUBFIELDS)[number];

// ---------- Medical Progression ----------

export const MEDICAL_PROGRESSIONS = [
  "pass_las",         // PASS / LAS (1re année)
  "dfgsm",            // DFGSM (2e-3e année)
  "dfasm",            // DFASM / Externat (4e-6e année)
  "edn_ecos",         // EDN / ECOS (concours)
  "internat",         // Internat / DES
  "these",            // Thèse d'exercice
  "other_progression", // Autre
] as const;

export type MedicalProgression = (typeof MEDICAL_PROGRESSIONS)[number];

// ---------- Education Profile ----------

export interface EducationProfile {
  stage: EducationStage;
  institution_type?: InstitutionType;
  field_category?: FieldCategory;
  field_of_study?: string;       // free text: "Droit constitutionnel", "Médecine générale"
  year_in_program?: number;       // e.g., L2 = 2, M1 = 1
  // Health-specific
  health_subfield?: HealthSubfield;
  medical_progression?: MedicalProgression;
}

// ---------- Stage Metadata for UI ----------

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

// ---------- Health Subfield Metadata (for conditional UI) ----------

export interface HealthSubfieldMetadata {
  subfield: HealthSubfield;
  label: string;
  emoji: string;
  description: string;
}

export const HEALTH_SUBFIELD_METADATA: HealthSubfieldMetadata[] = [
  { subfield: "pass", label: "PASS", emoji: "🎯", description: "Parcours Accès Santé Spécifique" },
  { subfield: "las", label: "LAS", emoji: "📖", description: "Licence Accès Santé" },
  { subfield: "medecine", label: "Médecine", emoji: "🩺", description: "Études de médecine" },
  { subfield: "pharmacie", label: "Pharmacie", emoji: "💊", description: "Études de pharmacie" },
  { subfield: "maieutique", label: "Maïeutique", emoji: "👶", description: "Sage-femme" },
  { subfield: "odontologie", label: "Odontologie", emoji: "🦷", description: "Chirurgie dentaire" },
  { subfield: "kinesitherapie", label: "Kinésithérapie", emoji: "🏃", description: "Masso-kinésithérapie" },
  { subfield: "infirmier", label: "Soins infirmiers", emoji: "💉", description: "IFSI / Sciences infirmières" },
  { subfield: "other_health", label: "Autre filière santé", emoji: "🏥", description: "Autre parcours de santé" },
];

// ---------- Medical Progression Metadata ----------

export interface MedicalProgressionMetadata {
  progression: MedicalProgression;
  label: string;
  description: string;
}

export const MEDICAL_PROGRESSION_METADATA: MedicalProgressionMetadata[] = [
  { progression: "pass_las", label: "PASS / LAS", description: "Première année" },
  { progression: "dfgsm", label: "DFGSM (2e-3e année)", description: "Diplôme de Formation Générale en Sciences Médicales" },
  { progression: "dfasm", label: "DFASM / Externat", description: "4e à 6e année — stages hospitaliers" },
  { progression: "edn_ecos", label: "EDN / ECOS", description: "Préparation aux examens nationaux" },
  { progression: "internat", label: "Internat / DES", description: "Diplôme d'Études Spécialisées" },
  { progression: "these", label: "Thèse d'exercice", description: "Thèse de fin d'études" },
  { progression: "other_progression", label: "Autre", description: "Autre étape du cursus" },
];

// ---------- Field Labels (for UI) ----------

export const FIELD_LABELS: Record<FieldCategory, string> = {
  sciences: "Sciences",
  humanities: "Lettres & Sciences humaines",
  languages: "Langues",
  law_political: "Droit & Sciences politiques",
  health_medical: "Santé & Médecine",
  engineering_tech: "Ingénierie & Technologie",
  business_management: "Commerce & Gestion",
  arts_design: "Arts & Design",
  education: "Éducation & Formation",
  social_sciences: "Sciences sociales",
  sport: "STAPS & Sport",
  other: "Autre",
};

// ---------- Helper: is health/medical stage ----------

export function isHealthStage(stage: EducationStage): boolean {
  return stage === "medical";
}
