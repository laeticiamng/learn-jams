import { useTranslation } from "react-i18next";
import {
  EDUCATION_STAGES,
  STAGE_METADATA,
  type EducationStage,
  type EducationProfile,
  FIELD_CATEGORIES,
  type FieldCategory,
  INSTITUTION_TYPES,
  type InstitutionType,
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

  // Render a grid of stage cards with emoji + label
  // When a stage is selected, show additional fields:
  // - InstitutionType dropdown (if not compact)
  // - FieldCategory dropdown
  // - Free text field_of_study
  // - Year in program (if applicable)

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">
        {t("education.stage_question", { defaultValue: "Quel est ton niveau d'études ?" })}
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {STAGE_METADATA.map((meta) => (
          <button
            key={meta.stage}
            onClick={() => onChange({ ...profile, stage: meta.stage })}
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

      {profile.stage && !compact && (
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
                  {t(`education.field.${cat}`, { defaultValue: cat.replace(/_/g, " ") })}
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
    </div>
  );
}
