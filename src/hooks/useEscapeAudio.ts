// ============================================================
// Hook: useEscapeAudio — Ambient sound and SFX manager for
// the escape game. Uses Web Audio API to generate procedural
// ambient tones and play UI sound effects without external
// audio files.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";

// ---------- Types ----------

export type AmbientPreset =
  | "briefing"     // calm, low hum
  | "exploration"  // mysterious, soft pad
  | "analysis"     // digital, clinical beeps
  | "diagnostic"   // heartbeat-like pulse
  | "decision"     // tense, rising
  | "synthesis"    // harmonious, resolving
  | "final"        // dramatic, intense
  | "debrief";     // triumphant, warm

export type SoundEffect =
  | "puzzle_correct"
  | "puzzle_wrong"
  | "room_unlock"
  | "code_fragment"
  | "item_collected"
  | "hint_reveal"
  | "discovery"
  | "achievement"
  | "tick";

// ---------- Preset Configurations ----------

interface AmbientConfig {
  frequency: number;
  type: OscillatorType;
  gain: number;
  lfoFrequency: number; // low frequency oscillation for movement
  filterFrequency: number;
}

const AMBIENT_PRESETS: Record<AmbientPreset, AmbientConfig> = {
  briefing:    { frequency: 110, type: "sine",     gain: 0.06, lfoFrequency: 0.3,  filterFrequency: 400 },
  exploration: { frequency: 146, type: "triangle", gain: 0.05, lfoFrequency: 0.5,  filterFrequency: 600 },
  analysis:    { frequency: 220, type: "sine",     gain: 0.04, lfoFrequency: 1.0,  filterFrequency: 800 },
  diagnostic:  { frequency: 73,  type: "sine",     gain: 0.07, lfoFrequency: 1.2,  filterFrequency: 300 },
  decision:    { frequency: 165, type: "sawtooth", gain: 0.03, lfoFrequency: 0.8,  filterFrequency: 500 },
  synthesis:   { frequency: 196, type: "sine",     gain: 0.05, lfoFrequency: 0.4,  filterFrequency: 700 },
  final:       { frequency: 130, type: "square",   gain: 0.03, lfoFrequency: 1.5,  filterFrequency: 400 },
  debrief:     { frequency: 261, type: "sine",     gain: 0.04, lfoFrequency: 0.2,  filterFrequency: 1000 },
};

// ---------- SFX Configurations ----------

interface SfxConfig {
  frequencies: number[];
  durations: number[];
  type: OscillatorType;
  gain: number;
}

const SFX_CONFIGS: Record<SoundEffect, SfxConfig> = {
  puzzle_correct:  { frequencies: [523, 659, 784],    durations: [0.1, 0.1, 0.2],   type: "sine",     gain: 0.12 },
  puzzle_wrong:    { frequencies: [200, 180],         durations: [0.15, 0.2],        type: "square",   gain: 0.08 },
  room_unlock:     { frequencies: [330, 440, 550, 660], durations: [0.08, 0.08, 0.08, 0.15], type: "sine", gain: 0.1 },
  code_fragment:   { frequencies: [440, 554, 659],    durations: [0.1, 0.1, 0.15],   type: "triangle", gain: 0.1 },
  item_collected:  { frequencies: [587, 740],         durations: [0.1, 0.15],        type: "sine",     gain: 0.1 },
  hint_reveal:     { frequencies: [392, 440],         durations: [0.15, 0.2],        type: "triangle", gain: 0.06 },
  discovery:       { frequencies: [330, 392, 494],    durations: [0.1, 0.1, 0.2],    type: "sine",     gain: 0.1 },
  achievement:     { frequencies: [523, 659, 784, 1047], durations: [0.1, 0.1, 0.1, 0.3], type: "sine", gain: 0.12 },
  tick:            { frequencies: [880],              durations: [0.03],             type: "square",   gain: 0.04 },
};

// ---------- Hook ----------

export function useEscapeAudio(enabled = true) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientNodesRef = useRef<{ osc: OscillatorNode; gain: GainNode; lfo: OscillatorNode; lfoGain: GainNode } | null>(null);
  const [muted, setMuted] = useState(!enabled);
  const [currentPreset, setCurrentPreset] = useState<AmbientPreset | null>(null);

  // Initialize AudioContext lazily (requires user gesture)
  const getAudioContext = useCallback((): AudioContext | null => {
    if (muted) return null;
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new AudioContext();
      } catch {
        return null;
      }
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, [muted]);

  // ---------- Ambient ----------

  const startAmbient = useCallback((preset: AmbientPreset) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Stop existing ambient
    stopAmbient();

    const config = AMBIENT_PRESETS[preset];

    // Main oscillator
    const osc = ctx.createOscillator();
    osc.type = config.type;
    osc.frequency.value = config.frequency;

    // Filter for warmth
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = config.filterFrequency;
    filter.Q.value = 1;

    // Main gain
    const gain = ctx.createGain();
    gain.gain.value = 0;

    // LFO for subtle movement
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = config.lfoFrequency;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = config.frequency * 0.02; // subtle pitch variation

    // Connect: LFO → osc.frequency, osc → filter → gain → output
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    // Start with fade in
    osc.start();
    lfo.start();
    gain.gain.linearRampToValueAtTime(config.gain, ctx.currentTime + 2);

    ambientNodesRef.current = { osc, gain, lfo, lfoGain };
    setCurrentPreset(preset);
  }, [getAudioContext]);

  const stopAmbient = useCallback(() => {
    const nodes = ambientNodesRef.current;
    if (!nodes) return;

    const ctx = audioCtxRef.current;
    if (ctx) {
      nodes.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      setTimeout(() => {
        try {
          nodes.osc.stop();
          nodes.lfo.stop();
        } catch { /* already stopped */ }
      }, 1200);
    } else {
      try {
        nodes.osc.stop();
        nodes.lfo.stop();
      } catch { /* already stopped */ }
    }
    ambientNodesRef.current = null;
    setCurrentPreset(null);
  }, []);

  const crossfadeAmbient = useCallback((preset: AmbientPreset) => {
    if (currentPreset === preset) return;
    // Simple crossfade: stop current with fade, start new
    stopAmbient();
    setTimeout(() => startAmbient(preset), 800);
  }, [currentPreset, stopAmbient, startAmbient]);

  // ---------- SFX ----------

  const playSfx = useCallback((effect: SoundEffect) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const config = SFX_CONFIGS[effect];
    let time = ctx.currentTime;

    for (let i = 0; i < config.frequencies.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = config.type;
      osc.frequency.value = config.frequencies[i];

      const gain = ctx.createGain();
      gain.gain.value = config.gain;
      gain.gain.linearRampToValueAtTime(0, time + config.durations[i]);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + config.durations[i]);

      time += config.durations[i];
    }
  }, [getAudioContext]);

  // ---------- Controls ----------

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      if (next) {
        stopAmbient();
      }
      return next;
    });
  }, [stopAmbient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAmbient();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [stopAmbient]);

  return {
    muted,
    currentPreset,
    startAmbient,
    stopAmbient,
    crossfadeAmbient,
    playSfx,
    toggleMute,
  };
}
