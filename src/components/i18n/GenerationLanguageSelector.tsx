// ============================================================
// Generation Language Selector — Inline picker for content generation
// ============================================================

import { useTranslation } from "react-i18next";
import { LOCALE_REGISTRY, type LocaleCode } from "@/i18n/localeRegistry";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GenerationLanguageSelectorProps {
  value: string;
  onChange: (lang: LocaleCode) => void;
  compact?: boolean;
}

/**
 * Dropdown selector for choosing the language of generated content.
 * Used in the creation flow and settings.
 */
export default function GenerationLanguageSelector({
  value,
  onChange,
  compact = false,
}: GenerationLanguageSelectorProps) {
  const { t } = useTranslation();
  const current = LOCALE_REGISTRY.find((l) => l.code === value) ?? LOCALE_REGISTRY[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={compact ? "sm" : "default"} className="gap-2">
          <Languages className="w-4 h-4" />
          <span>{current.flag} {compact ? current.code.toUpperCase() : current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
          {t("prompts.generation_language_label", "Generation Language")}
        </div>
        {LOCALE_REGISTRY.map((locale) => (
          <DropdownMenuItem
            key={locale.code}
            onClick={() => onChange(locale.code as LocaleCode)}
            className={value === locale.code ? "bg-accent" : ""}
          >
            <span className="mr-2">{locale.flag}</span>
            {locale.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
