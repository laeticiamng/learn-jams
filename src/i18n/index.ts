import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import fr from "./locales/fr.json";
import en from "./locales/en.json";
import de from "./locales/de.json";
import es from "./locales/es.json";
import ar from "./locales/ar.json";
import zh from "./locales/zh.json";
import hi from "./locales/hi.json";

import { LOCALE_REGISTRY } from "./localeRegistry";
import { applyDocumentDirection } from "./direction";
import { I18N_CONFIG } from "./config";

// Re-export for backwards compatibility
export const supportedLanguages = LOCALE_REGISTRY;
export type LangCode = (typeof LOCALE_REGISTRY)[number]["code"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      de: { translation: de },
      es: { translation: es },
      ar: { translation: ar },
      zh: { translation: zh },
      hi: { translation: hi },
    },
    ...I18N_CONFIG,
  });

applyDocumentDirection(i18n.language || "fr");
i18n.on("languageChanged", applyDocumentDirection);

export default i18n;
