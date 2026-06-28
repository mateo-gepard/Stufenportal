"use client";

import { useId } from "react";

/**
 * Gefüllter Verlaufs-Sparkline (reines SVG, keine Abhängigkeiten).
 * Werte in chronologischer Reihenfolge; die Linie skaliert auf min/max mit
 * etwas Luft, eine 0-Linie wird eingeblendet, wenn der Bereich sie kreuzt.
 */
export function TrendArea({
  values,
  width = 320,
  height = 72,
  stroke = "var(--pop)",
  fill = "var(--pop)",
  baseline,
  className = "",
}: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  /** Optionaler Referenzwert (z. B. 0), der als gestrichelte Linie erscheint. */
  baseline?: number;
  className?: string;
}) {
  const gradientId = useId();
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  // Luft nach oben/unten, damit eine fast flache Reihe nicht am Rand klebt.
  const pad = (max - min) * 0.16 || Math.abs(max) * 0.16 || 1;
  const lo = Math.min(min - pad, baseline ?? Infinity);
  const hi = Math.max(max + pad, baseline ?? -Infinity);
  const span = hi - lo || 1;

  const stepX = width / (values.length - 1);
  const xOf = (i: number) => i * stepX;
  const yOf = (v: number) => height - ((v - lo) / span) * height;

  const points = values.map((v, i) => [xOf(i), yOf(v)] as const);
  const line = points
    .map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const [lastX, lastY] = points[points.length - 1];
  const showBaseline = baseline != null && baseline > lo && baseline < hi;
  const baseY = showBaseline ? yOf(baseline as number) : 0;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={`block w-full ${className}`}
      style={{ height }}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={0.34} />
          <stop offset="100%" stopColor={fill} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {showBaseline && (
        <line
          x1={0}
          y1={baseY}
          x2={width}
          y2={baseY}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="3 4"
          opacity={0.35}
        />
      )}
      <path className="sp-fade-in" d={area} fill={`url(#${gradientId})`} />
      <path
        className="sp-draw"
        pathLength={1}
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2.4}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle className="sp-fade-in" cx={lastX} cy={lastY} r={3.4} fill={stroke} style={{ animationDelay: "650ms" }} />
    </svg>
  );
}
