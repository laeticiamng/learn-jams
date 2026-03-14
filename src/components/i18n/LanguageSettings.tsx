// ============================================================
// Language Settings Component — UI/Generation/Guardian language pickers
// ============================================================

import { useTranslation } from "react-i18next";
import { LOCALE_REGISTRY, type LocaleCode } from "@/i18n/localeRegistry";
import { Globe, Languages, Shield } from "lucide-react";

interface LanguageSettingsProps {
  uiLanguage: string;
  generationLanguage: string;
  guardianLanguage?: string | null;
  showGuardianLanguage?: boolean;
  onUILanguageChange: (lang: LocaleCode) => void;
  onGenerationLanguageChange: (lang: LocaleCode) => void;
  onGuardianLanguageChange?: (lang: LocaleCode) => void;
}

function LanguageSelect({
  value,
  onChange,
  label,
  icon: Icon,
  description,
}: {
  value: string;
  onChange: (lang: LocaleCode) => void;
  label: string;
  icon: React.ElementType;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/20 border border-border/20">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <label className="text-sm font-medium block mb-1">{label}</label>
        <p className="text-xs text-muted-foreground mb-3">{description}</p>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as LocaleCode)}
          className="w-full px-3 py-2 rounded-lg bg-background border border-border/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {LOCALE_REGISTRY.map((locale) => (
            <option key={locale.code} value={locale.code}>
              {locale.flag} {locale.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function LanguageSettings({
  uiLanguage,
  generationLanguage,
  guardianLanguage,
  showGuardianLanguage = false,
  onUILanguageChange,
  onGenerationLanguageChange,
  onGuardianLanguageChange,
}: LanguageSettingsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">{t("settings.language_section", "Language Settings")}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t("settings.language_section_desc", "Choose languages for interface, content, and guardian communication")}
        </p>
      </div>

      <LanguageSelect
        value={uiLanguage}
        onChange={onUILanguageChange}
        label={t("settings.ui_language", "Interface Language")}
        icon={Globe}
        description={t("settings.ui_language_desc", "Language for menus, buttons, and navigation")}
      />

      <LanguageSelect
        value={generationLanguage}
        onChange={onGenerationLanguageChange}
        label={t("settings.generation_language", "Generation Language")}
        icon={Languages}
        description={t("settings.generation_language_desc", "Language for generated content (missions, songs, quizzes)")}
      />

      {showGuardianLanguage && onGuardianLanguageChange && (
        <LanguageSelect
          value={guardianLanguage ?? uiLanguage}
          onChange={onGuardianLanguageChange}
          label={t("settings.guardian_language", "Guardian Language")}
          icon={Shield}
          description={t("settings.guardian_language_desc", "Language for guardian emails and notifications")}
        />
      )}
    </div>
  );
}
