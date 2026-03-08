import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  playing: boolean;
  gradient: string;
}

const BAR_COUNT = 32;

export function AudioVisualizer({ audioElement, playing, gradient }: AudioVisualizerProps) {
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(4));
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!audioElement) return;

    // Only create context once per audio element
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      const source = ctx.createMediaElementSource(audioElement);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [audioElement]);

  useEffect(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    if (!playing) {
      cancelAnimationFrame(rafRef.current);
      // Decay to idle
      setBars(prev => prev.map(v => Math.max(4, v * 0.85)));
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const step = Math.floor(data.length / BAR_COUNT);
      const next: number[] = [];
      for (let i = 0; i < BAR_COUNT; i++) {
        const val = data[i * step] || 0;
        next.push(4 + (val / 255) * 56); // 4-60px range
      }
      setBars(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  return (
    <div className="flex items-end justify-center gap-[2px] h-16 w-full" aria-hidden="true">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className={`w-[3px] rounded-full bg-gradient-to-t ${gradient}`}
          animate={{ height: h }}
          transition={{ duration: 0.08, ease: "linear" }}
          style={{ opacity: 0.4 + (h / 60) * 0.6 }}
        />
      ))}
    </div>
  );
}
