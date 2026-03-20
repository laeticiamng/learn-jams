// ============================================================
// ImmersionContext — Central brain of the Experience Layer.
// Provides immersion state to all experience components.
// Detects device performance at boot and adapts immersion
// level accordingly. Respects reduced-motion and a11y modes.
// ============================================================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  detectPerformanceBudget,
  type PerformanceBudget,
  type PerformanceTier,
} from "./performanceBudget";

// ---------- Types ----------

export type ImmersionLevel = 0 | 1 | 2 | 3;
export type AmbientMood = "warm" | "focus" | "tension" | "celebration";

export interface AmbientPulse {
  color: string;
  intensity: number;
  id: number;
}

interface ImmersionState {
  /** Current page-declared immersion level (capped by device capability) */
  level: ImmersionLevel;
  /** Device performance tier */
  performanceTier: PerformanceTier;
  /** Full performance budget */
  budget: PerformanceBudget;
  /** Current ambient mood */
  ambientMood: AmbientMood;
  /** Whether audio is user-enabled */
  audioEnabled: boolean;
  /** Active ambient pulse (for feedback) */
  activePulse: AmbientPulse | null;
}

interface ImmersionActions {
  /** Set the page-level immersion (called via useImmersionLevel hook) */
  setPageLevel: (level: ImmersionLevel) => void;
  /** Change ambient mood with transition */
  setMood: (mood: AmbientMood) => void;
  /** Fire an ambient pulse (success/error feedback) */
  pulse: (color: string, intensity: number) => void;
  /** Toggle audio on/off */
  toggleAudio: () => void;
}

type ImmersionContextValue = ImmersionState & ImmersionActions;

// ---------- Context ----------

const ImmersionCtx = createContext<ImmersionContextValue | null>(null);

// ---------- Provider ----------

export function ImmersionProvider({ children }: { children: ReactNode }) {
  const [budget, setBudget] = useState<PerformanceBudget>(() => detectPerformanceBudget());
  const [pageLevel, setPageLevel] = useState<ImmersionLevel>(1);
  const [ambientMood, setAmbientMood] = useState<AmbientMood>("warm");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [activePulse, setActivePulse] = useState<AmbientPulse | null>(null);
  const pulseIdRef = useRef(0);

  // Re-detect on a11y class changes (ADHD mode toggle)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const html = document.documentElement;
      if (html.classList.contains("a11y-adhd")) {
        setBudget((prev) => ({ ...prev, reducedMotion: true, tier: "low" as const }));
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Effective level: capped by device capability
  const effectiveLevel: ImmersionLevel = budget.reducedMotion
    ? 0
    : budget.tier === "low"
      ? Math.min(pageLevel, 1) as ImmersionLevel
      : budget.tier === "mid"
        ? Math.min(pageLevel, 2) as ImmersionLevel
        : pageLevel;

  const pulse = useCallback((color: string, intensity: number) => {
    const id = ++pulseIdRef.current;
    setActivePulse({ color, intensity, id });
    // Auto-clear after animation
    setTimeout(() => {
      setActivePulse((current) => (current?.id === id ? null : current));
    }, 800);
  }, []);

  const toggleAudio = useCallback(() => {
    setAudioEnabled((prev) => !prev);
  }, []);

  const setMood = useCallback((mood: AmbientMood) => {
    setAmbientMood(mood);
  }, []);

  const value: ImmersionContextValue = {
    level: effectiveLevel,
    performanceTier: budget.tier,
    budget,
    ambientMood,
    audioEnabled,
    activePulse,
    setPageLevel,
    setMood,
    pulse,
    toggleAudio,
  };

  return <ImmersionCtx.Provider value={value}>{children}</ImmersionCtx.Provider>;
}

// ---------- Hooks ----------

export function useImmersion(): ImmersionContextValue {
  const ctx = useContext(ImmersionCtx);
  if (!ctx) {
    throw new Error("useImmersion must be used within ImmersionProvider");
  }
  return ctx;
}

/**
 * Declare the immersion level for the current page.
 * Call once at the top of each page component.
 */
export function useImmersionLevel(
  level: ImmersionLevel,
  options?: { mood?: AmbientMood },
) {
  const { setPageLevel, setMood } = useImmersion();

  useEffect(() => {
    setPageLevel(level);
    if (options?.mood) {
      setMood(options.mood);
    }
    // Reset to default on unmount
    return () => {
      setPageLevel(1);
      setMood("warm");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, options?.mood]);
}
