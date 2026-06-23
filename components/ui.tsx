"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { EventStatus, Priority, PollStatus } from "@/lib/types";

export function Card({
  children,
  className = "",
  onClick,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`rounded-lg border border-line bg-surface p-3.5 ${onClick ? "cursor-pointer active:scale-[0.995] transition-transform" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 mt-5 px-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
      {children}
    </h2>
  );
}

const eventStatusMeta: Record<EventStatus, { label: string; color: string }> = {
  idea: { label: "Idee", color: "var(--text-muted)" },
  planning: { label: "In Planung", color: "var(--signal-text)" },
  active: { label: "Aktiv", color: "var(--signal-text)" },
  done: { label: "Erledigt", color: "var(--success)" },
  cancelled: { label: "Abgesagt", color: "var(--danger)" },
};

const pollStatusMeta: Record<PollStatus, { label: string; color: string }> = {
  open: { label: "Offen", color: "var(--signal-text)" },
  closed: { label: "Geschlossen", color: "var(--text-muted)" },
  invalid: { label: "Ungültig", color: "var(--warning)" },
};

const priorityMeta: Record<Priority, { label: string; color: string }> = {
  normal: { label: "Normal", color: "var(--text-muted)" },
  wichtig: { label: "Wichtig", color: "var(--warning)" },
  dringend: { label: "Dringend", color: "var(--danger)" },
};

export function Pill({ label, color, dot = true }: { label: string; color: string; dot?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{ color, background: "color-mix(in srgb, " + color + " 14%, transparent)" }}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
      {label}
    </span>
  );
}

export function EventStatusPill({ status }: { status: EventStatus }) {
  const m = eventStatusMeta[status];
  return <Pill label={m.label} color={m.color} />;
}
export function PollStatusPill({ status }: { status: PollStatus }) {
  const m = pollStatusMeta[status];
  return <Pill label={m.label} color={m.color} />;
}
export function PriorityPill({ priority }: { priority: Priority }) {
  if (priority === "normal") return null;
  const m = priorityMeta[priority];
  return <Pill label={m.label} color={m.color} />;
}

// Signatur-Element: Meilenstein-Leiste als Segmente, die sich mit dem Signal füllen.
export function MilestoneBar({ done, total }: { done: number; total: number }) {
  if (total === 0)
    return <div className="h-1.5 w-full rounded-full" style={{ background: "var(--surface-2)" }} />;
  return (
    <div className="flex w-full gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 flex-1 rounded-full transition-colors"
          style={{ background: i < done ? "var(--signal)" : "var(--surface-2)" }}
        />
      ))}
    </div>
  );
}

export function SignalDot() {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "var(--signal)" }} />
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--signal)" }} />
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`sp-skeleton ${className}`} />;
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}

// Bottom-Sheet (mobile-first) statt Modal/Hover-Menü.
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  // Portal an document.body: löst das Sheet aus jedem transformierten Vorfahren
  // (z. B. .sp-in mit zurückbleibendem transform), damit `fixed` am echten
  // Viewport hängt und voll scrollbar bleibt.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="sp-sheet relative max-h-[88dvh] w-full max-w-screen-sm overflow-y-auto overscroll-contain rounded-t-[20px] border-t border-line bg-surface px-4 pb-8 pt-2"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
      >
        <div className="sticky top-0 -mx-4 mb-2 bg-surface px-4 pb-2 pt-2">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: "var(--surface-2)" }} />
          {title && <h3 className="text-h2 font-semibold">{title}</h3>}
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  full,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "surface";
  type?: "button" | "submit";
  disabled?: boolean;
  full?: boolean;
}) {
  const base =
    "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-medium transition active:scale-[0.98] disabled:opacity-40";
  const styles: Record<string, string> = {
    primary: "text-white",
    ghost: "text-[color:var(--signal-text)]",
    surface: "border border-line text-text",
    danger: "text-white",
  };
  const bg: Record<string, string> = {
    primary: "var(--signal)",
    ghost: "transparent",
    surface: "var(--surface)",
    danger: "var(--danger)",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant]} ${full ? "w-full" : ""}`}
      style={{ background: bg[variant] }}
    >
      {children}
    </button>
  );
}

// Dezentes ⋯-Overflow für Berechtigte (leicht im Akzent getönt).
export function AdminDots({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label="Verwalten"
      className="flex h-9 w-9 items-center justify-center rounded-full"
      style={{ color: "var(--signal-text)", background: "color-mix(in srgb, var(--signal) 12%, transparent)" }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="5" cy="12" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="19" cy="12" r="1.8" />
      </svg>
    </button>
  );
}

export function SheetAction({
  label,
  onClick,
  danger,
  icon,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] active:bg-[color:var(--surface-2)]"
      style={{ color: danger ? "var(--danger)" : "var(--text)" }}
    >
      <span className="w-5 text-center opacity-80">{icon}</span>
      {label}
    </button>
  );
}
