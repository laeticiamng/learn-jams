import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export interface AccessibilitySettings {
  dyslexiaFont: boolean;
  adhdMode: boolean;
  colorblindSafe: boolean;
  fontSize: number; // 1 = normal, 1.25 = large, 1.5 = extra large
  highContrast: boolean;
}

const defaults: AccessibilitySettings = {
  dyslexiaFont: false,
  adhdMode: false,
  colorblindSafe: false,
  fontSize: 1,
  highContrast: false,
};

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  update: (partial: Partial<AccessibilitySettings>) => void;
  reset: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const STORAGE_KEY = "studybeats_a11y";

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    } catch {
      return defaults;
    }
  });

  const applySettings = useCallback((s: AccessibilitySettings) => {
    const root = document.documentElement;
    root.classList.toggle("a11y-dyslexia", s.dyslexiaFont);
    root.classList.toggle("a11y-adhd", s.adhdMode);
    root.classList.toggle("a11y-colorblind", s.colorblindSafe);
    root.classList.toggle("a11y-highcontrast", s.highContrast);
    root.style.setProperty("--a11y-font-scale", String(s.fontSize));
  }, []);

  useEffect(() => {
    applySettings(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, applySettings]);

  const update = useCallback((partial: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => setSettings(defaults), []);

  return (
    <AccessibilityContext.Provider value={{ settings, update, reset }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}
