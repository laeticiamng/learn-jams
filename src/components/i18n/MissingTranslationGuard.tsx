// ============================================================
// Missing Translation Guard — Dev-mode warning for missing keys
// ============================================================

import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * In development mode, logs a warning when a translation key falls back.
 * Mount this once at app root. Does nothing in production.
 */
export default function MissingTranslationGuard() {
  const { i18n } = useTranslation();

  useEffect(() => {
    if (import.meta.env.PROD) return;

    const handler = (lngs: readonly string[], ns: string, key: string, fallbackValue: string) => {
      console.warn(
        `[i18n] Missing translation: key="${key}" ns="${ns}" lang="${lngs.join(",")}" fallback="${fallbackValue}"`,
      );
    };

    i18n.on("missingKey", handler);
    return () => {
      i18n.off("missingKey", handler);
    };
  }, [i18n]);

  return null;
}
