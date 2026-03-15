import { useTranslation } from "react-i18next";
import {
  STAGE_METADATA,
  type EducationStage,
  type EducationProfile,
  FIELD_CATEGORIES,
  type FieldCategory,
  INSTITUTION_TYPES,
  type InstitutionType,
  HEALTH_SUBFIELD_METADATA,
  type HealthSubfield,
  MEDICAL_PROGRESSION_METADATA,
  type MedicalProgression,
  isHealthStage,
  FIELD_LABELS,
} from "@/domain/cognitio/educationStages.types";

interface EducationStageSelectorProps {
  profile: EducationProfile;
  onChange: (profile: EducationProfile) => void;
  compact?: boolean;
}

export function EducationStageSelector({
  profile,
  onChange,
  compact = false,
}: EducationStageSelectorProps) {
  const { t } = useTranslation();

  const isHealth = isHealthStage(profile.stage);

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">
        {t("education.stage_question", { defaultValue: "Quel est ton parcours ?" })}
      </h4>

      {/* Stage selection grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {STAGE_METADATA.map((meta) => (
          <button
            key={meta.stage}
            onClick={() => onChange({
              ...profile,
              stage: meta.stage,
              // Reset health fields when switching away from medical
              health_subfield: meta.stage === "medical" ? profile.health_subfield : undefined,
              medical_progression: meta.stage === "medical" ? profile.medical_progression : undefined,
              // Auto-set field for medical
              field_category: meta.stage === "medical" ? "health_medical" : profile.field_category,
            })}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-xs font-medium ${
              profile.stage === meta.stage
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/30 text-muted-foreground hover:border-primary/30 hover:bg-muted/20"
            }`}
          >
            <span className="text-lg">{meta.emoji}</span>
            <span>{t(meta.label_key, { defaultValue: meta.stage })}</span>
            <span className="text-[10px] opacity-60">{meta.typical_age_range}</span>
          </button>
        ))}
      </div>

      {/* Health subfield selector (shown when stage=medical) */}
      {isHealth && !compact && (
        <div className="space-y-3 mt-3">
          <h5 className="text-xs font-semibold text-muted-foreground">
            {t("education.health_subfield_question", { defaultValue: "Quelle filière santé ?" })}
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {HEALTH_SUBFIELD_METADATA.map((meta) => (
              <button
                key={meta.subfield}
                onClick={() => onChange({
                  ...profile,
                  health_subfield: meta.subfield,
                  field_of_study: meta.label,
                })}
                className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-xs ${
                  profile.health_subfield === meta.subfield
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border/30 text-muted-foreground hover:border-primary/30 hover:bg-muted/20"
                }`}
              >
                <span className="text-base">{meta.emoji}</span>
                <div className="text-left">
                  <span className="block">{meta.label}</span>
                  <span className="text-[10px] opacity-60 block">{meta.description}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Medical progression (shown when a health subfield needing progression is selected) */}
          {profile.health_subfield && ["medecine", "pharmacie", "odontologie", "maieutique"].includes(profile.health_subfield) && (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-muted-foreground">
                {t("education.medical_progression_question", { defaultValue: "Où en es-tu dans ton cursus ?" })}
              </h5>
              <div className="flex flex-wrap gap-2">
                {MEDICAL_PROGRESSION_METADATA.map((meta) => (
                  <button
                    key={meta.progression}
                    onClick={() => onChange({ ...profile, medical_progression: meta.progression })}
                    className={`px-3 py-1.5 rounded-full border transition-all text-xs ${
                      profile.medical_progression === meta.progression
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border/30 text-muted-foreground hover:border-primary/30"
                    }`}
                    title={meta.description}
                  >
                    {meta.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Field & institution selectors (non-health, non-compact) */}
      {profile.stage && !compact && !isHealth && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {t("education.field_category", { defaultValue: "Domaine d'études" })}
            </label>
            <select
              value={profile.field_category ?? ""}
              onChange={(e) =>
                onChange({
                  ...profile,
                  field_category: (e.target.value || undefined) as FieldCategory | undefined,
                })
              }
              className="w-full rounded-lg border border-border/30 bg-background px-3 py-2 text-sm"
            >
              <option value="">{t("education.select_field", { defaultValue: "Sélectionner..." })}</option>
              {FIELD_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {FIELD_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {t("education.institution_type", { defaultValue: "Type d'établissement" })}
            </label>
            <select
              value={profile.institution_type ?? ""}
              onChange={(e) =>
                onChange({
                  ...profile,
                  institution_type: (e.target.value || undefined) as InstitutionType | undefined,
                })
              }
              className="w-full rounded-lg border border-border/30 bg-background px-3 py-2 text-sm"
            >
              <option value="">
                {t("education.select_institution", { defaultValue: "Sélectionner..." })}
              </option>
              {INSTITUTION_TYPES.map((inst) => (
                <option key={inst} value={inst}>
                  {t(`education.institution.${inst}`, { defaultValue: inst.replace(/_/g, " ") })}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {t("education.field_of_study", { defaultValue: "Matière / spécialité" })}
            </label>
            <input
              type="text"
              value={profile.field_of_study ?? ""}
              onChange={(e) =>
                onChange({ ...profile, field_of_study: e.target.value || undefined })
              }
              placeholder={t("education.field_placeholder", {
                defaultValue: "Ex: Droit constitutionnel, Biologie cellulaire...",
              })}
              className="w-full rounded-lg border border-border/30 bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {/* Simplified field for health students (already set by subfield) */}
      {isHealth && !compact && profile.health_subfield && (
        <div className="mt-3">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            {t("education.field_of_study", { defaultValue: "Matière / spécialité" })}
          </label>
          <input
            type="text"
            value={profile.field_of_study ?? ""}
            onChange={(e) =>
              onChange({ ...profile, field_of_study: e.target.value || undefined })
            }
            placeholder={t("education.health_field_placeholder", {
              defaultValue: "Ex: Pneumologie, Cardiologie, Pharmacologie...",
            })}
            className="w-full rounded-lg border border-border/30 bg-background px-3 py-2 text-sm"
          />
        </div>
      )}
    </div>
  );
}
