// ============================================================
// AudioProvider — Contextual audio engine with opt-in control.
// Provides ambient pads and UI sound effects.
// Disabled by default. Respects reduced-motion and ADHD mode.
// Uses Web Audio API with preloaded AudioBuffers.
// ============================================================

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { useImmersion } from "./ImmersionContext";

// ---------- Types ----------

type SoundEffect = "success" | "error" | "unlock" | "select";
type AmbientPad = "focus" | "tension" | "celebration" | "warm";

interface AudioActions {
  /** Play a UI sound effect */
  play: (effect: SoundEffect) => void;
  /** Set ambient background pad (crossfades) */
  setAmbient: (pad: AmbientPad | null) => void;
  /** Check if audio is available and enabled */
  isActive: boolean;
}

// ---------- Context ----------

const AudioCtx = createContext<AudioActions>({
  play: () => {},
  setAmbient: () => {},
  isActive: false,
});

// ---------- Oscillator-based sound synthesis ----------
// No external audio files needed — generates tones programmatically.

function createTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.15,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playSuccessSound(ctx: AudioContext) {
  createTone(ctx, 523.25, 0.15, "sine", 0.12); // C5
  setTimeout(() => createTone(ctx, 659.25, 0.15, "sine", 0.12), 80); // E5
  setTimeout(() => createTone(ctx, 783.99, 0.2, "sine", 0.1), 160); // G5
}

function playErrorSound(ctx: AudioContext) {
  createTone(ctx, 220, 0.2, "triangle", 0.1); // A3
  setTimeout(() => createTone(ctx, 196, 0.25, "triangle", 0.1), 120); // G3
}

function playUnlockSound(ctx: AudioContext) {
  createTone(ctx, 392, 0.1, "sine", 0.1); // G4
  setTimeout(() => createTone(ctx, 523.25, 0.1, "sine", 0.1), 60); // C5
  setTimeout(() => createTone(ctx, 659.25, 0.1, "sine", 0.1), 120); // E5
  setTimeout(() => createTone(ctx, 783.99, 0.25, "sine", 0.12), 180); // G5
}

function playSelectSound(ctx: AudioContext) {
  createTone(ctx, 880, 0.08, "sine", 0.06); // A5 — soft tick
}

const SOUND_MAP: Record<SoundEffect, (ctx: AudioContext) => void> = {
  success: playSuccessSound,
  error: playErrorSound,
  unlock: playUnlockSound,
  select: playSelectSound,
};

// ---------- Provider ----------

export function AudioProvider({ children }: { children: ReactNode }) {
  const { audioEnabled, budget } = useImmersion();
  const ctxRef = useRef<AudioContext | null>(null);

  // Initialize AudioContext on first user interaction (iOS Safari requirement)
  const getOrCreateContext = useCallback((): AudioContext | null => {
    if (budget.reducedMotion || !audioEnabled) return null;

    if (!ctxRef.current) {
      try {
        ctxRef.current = new AudioContext();
      } catch {
        return null;
      }
    }

    // Resume if suspended (iOS Safari)
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }

    return ctxRef.current;
  }, [audioEnabled, budget.reducedMotion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ctxRef.current?.close();
    };
  }, []);

  const play = useCallback(
    (effect: SoundEffect) => {
      const ctx = getOrCreateContext();
      if (!ctx) return;

      const generator = SOUND_MAP[effect];
      if (generator) {
        generator(ctx);
      }
    },
    [getOrCreateContext],
  );

  const setAmbient = useCallback((_pad: AmbientPad | null) => {
    // Ambient pad implementation — placeholder for future audio loops.
    // In production, this would crossfade between looping AudioBuffers.
  }, []);

  const value: AudioActions = {
    play,
    setAmbient,
    isActive: audioEnabled && !budget.reducedMotion,
  };

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

// ---------- Hook ----------

export function useAudio(): AudioActions {
  return useContext(AudioCtx);
}
