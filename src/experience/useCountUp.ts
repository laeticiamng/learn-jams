// ============================================================
// useCountUp — Animated number counter hook.
// Counts from 0 to target with easeOutExpo curve.
// Triggers on visibility via IntersectionObserver.
// Respects reduced-motion: shows final value instantly.
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";

interface UseCountUpOptions {
  duration?: number;
  delay?: number;
  decimals?: number;
  /** If true, starts counting immediately without IntersectionObserver */
  immediate?: boolean;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function useCountUp(
  target: number,
  options: UseCountUpOptions = {},
): { value: number; ref: React.RefObject<HTMLElement | null> } {
  const { duration = 1500, delay = 0, decimals = 0, immediate = false } = options;
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLElement | null>(null);
  const hasStarted = useRef(false);

  const animate = useCallback(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    // Respect reduced-motion
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      setValue(target);
      return;
    }

    const startTime = performance.now() + delay;

    function tick(now: number) {
      const elapsed = now - startTime;
      if (elapsed < 0) {
        requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      const current = eased * target;

      setValue(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.round(current));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [target, duration, delay, decimals]);

  useEffect(() => {
    // Reset when target changes
    hasStarted.current = false;
    setValue(0);

    if (immediate) {
      animate();
      return;
    }

    const element = ref.current;
    if (!element) {
      // No element to observe, start immediately
      animate();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [target, animate, immediate]);

  return { value, ref };
}
