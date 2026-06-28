"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Zählt eine Zahl weich auf den Zielwert hoch (easeOutCubic). Beim ersten
 * Erscheinen von 0, danach von der vorigen Zahl. Respektiert
 * prefers-reduced-motion (springt dann direkt auf den Zielwert).
 */
export function useCountUp(target: number, durationMs = 850): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    if (reduce || from === target || durationMs <= 0) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
        setValue(target);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}
