"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EventSummary } from "@/lib/types";
import { appDayDiff, appDayIndex, formatAppDate } from "@/lib/time";
import { IconChevronRight } from "@/components/icons";

type TimelinePoll = { id: string; question: string; closes_at: string | null };

type TimelineItem = { kind: "event" | "poll"; id: string; title: string; time: string; at: number };
type TimelineDay = { i: number; weekday: string; day: string; items: TimelineItem[] };

// Auf der dunklen Karte: Gold für Events, Rot für Fristen (beide gut lesbar auf Teal).
const EVENT_COLOR = "var(--pop)";
const POLL_COLOR = "var(--accent)";

function buildDays(events: EventSummary[], polls: TimelinePoll[]): TimelineDay[] {
  const base = appDayIndex(Date.now());
  const days: TimelineDay[] = Array.from({ length: 7 }, (_, i) => {
    const ts = (base + i) * 864e5;
    return {
      i,
      weekday: formatAppDate(ts, { weekday: "short" }).replace(".", ""),
      day: formatAppDate(ts, { day: "numeric" }),
      items: [],
    };
  });
  const place = (iso: string | null, item: Omit<TimelineItem, "time" | "at">) => {
    if (!iso) return;
    const d = appDayDiff(iso);
    if (d < 0 || d > 6) return;
    days[d].items.push({
      ...item,
      time: formatAppDate(iso, { hour: "2-digit", minute: "2-digit" }),
      at: new Date(iso).getTime(),
    });
  };
  for (const e of events) place(e.start_at, { kind: "event", id: e.id, title: e.title });
  for (const p of polls) place(p.closes_at, { kind: "poll", id: p.id, title: p.question });
  for (const d of days) d.items.sort((a, b) => a.at - b.at);
  return days;
}

function dayLabel(day: TimelineDay): string {
  if (day.i === 0) return "Heute";
  if (day.i === 1) return "Morgen";
  return formatAppDate((appDayIndex(Date.now()) + day.i) * 864e5, { weekday: "long", day: "numeric", month: "long" });
}

export default function WeekTimeline({
  events,
  polls,
  embedded = false,
}: {
  events: EventSummary[];
  polls: TimelinePoll[];
  embedded?: boolean;
}) {
  const days = useMemo(() => buildDays(events, polls), [events, polls]);
  // Heute zeigt Orientierung; ist heute leer, öffne den nächsten Tag mit Inhalt.
  const initial = days[0].items.length > 0 ? 0 : Math.max(0, days.findIndex((d) => d.items.length > 0));
  const [selected, setSelected] = useState(initial);
  // Standalone blendet sich bei leerer Woche aus; eingebettet (per Toggle) zeigt es den Leerzustand.
  if (!embedded && !days.some((d) => d.items.length > 0)) return null;
  const active = days[selected];

  return (
    <div className="sp-hero-dark relative overflow-hidden rounded-[22px] px-4 py-[18px]">
      <div className="sp-half absolute -right-3 -top-3 h-[90px] w-[90px] text-white/15" />
      <div className="absolute left-[18px] top-3.5 text-[9.5px] font-bold uppercase tracking-[0.18em] opacity-50">Diese Woche</div>

      <div className="mt-8 flex gap-1.5">
        {days.map((d) => {
          const isToday = d.i === 0;
          const isSel = d.i === selected;
          // Weiß = „hier / heute / gewählt"; Gold + Rot = Kategorien.
          const tileBg = isSel ? "#fff" : isToday ? "transparent" : "rgba(255,255,255,.10)";
          const tileColor = isSel ? "var(--ink)" : "rgba(255,255,255,.9)";
          const tileBorder = isToday && !isSel ? "2px solid rgba(255,255,255,.7)" : "2px solid transparent";
          return (
            <button
              key={d.i}
              type="button"
              onClick={() => setSelected(d.i)}
              aria-pressed={isSel}
              aria-label={`${dayLabel(d)}, ${d.items.length} Einträge`}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <span
                className="text-[10px] font-extrabold uppercase tracking-[0.08em]"
                style={{ color: isToday ? "#fff" : "rgba(255,255,255,.5)" }}
              >
                {d.weekday}
              </span>
              <span
                className="flex h-9 w-full items-center justify-center rounded-[11px] font-display text-[16px] font-black transition-colors"
                style={{ background: tileBg, color: tileColor, border: tileBorder }}
              >
                {d.day}
              </span>
              <span className="flex h-2 items-center gap-[3px]">
                {d.items.slice(0, 3).map((it, idx) => (
                  <span key={idx} className="h-1.5 w-1.5 rounded-full" style={{ background: it.kind === "event" ? EVENT_COLOR : POLL_COLOR }} />
                ))}
                {d.items.length > 3 && <span className="text-[9px] font-extrabold leading-none text-white/55">+</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-2 mt-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-white/55">{dayLabel(active)}</p>
        <div className="flex items-center gap-3 text-[10px] font-bold text-white/50">
          <Legend color={EVENT_COLOR} label="Events" />
          <Legend color={POLL_COLOR} label="Fristen" />
        </div>
      </div>

      <div key={selected} className="sp-in">
        {active.items.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-white/15 px-4 py-4 text-center text-[13px] text-white/55">
            Nichts an diesem Tag.
          </div>
        ) : (
          <div className="sp-stagger flex flex-col gap-2">
            {active.items.map((it) => (
              <Link
                key={it.kind + it.id}
                href={it.kind === "event" ? `/events/${it.id}` : `/polls/${it.id}`}
                className="flex items-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.07] px-3 py-2.5 transition active:scale-[0.99]"
              >
                <span className="flex w-11 shrink-0 flex-col items-center">
                  <span className="h-2 w-2 rounded-full" style={{ background: it.kind === "event" ? EVENT_COLOR : POLL_COLOR }} />
                  <span className="tabular mt-1 text-[11px] font-bold text-white/60">{it.time}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold leading-tight text-white">{it.title}</p>
                  <p className="text-[11px] font-semibold text-white/50">{it.kind === "event" ? "Event" : "Vote endet"}</p>
                </div>
                <IconChevronRight size={16} className="shrink-0 text-white/40" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
