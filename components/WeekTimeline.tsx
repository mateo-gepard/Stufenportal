"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EventSummary } from "@/lib/types";
import { appDayDiff, appDayIndex, formatAppDate } from "@/lib/time";
import { IconChevronRight } from "@/components/icons";

type TimelinePoll = { id: string; question: string; closes_at: string | null };

type TimelineItem = { kind: "event" | "poll"; id: string; title: string; time: string; at: number };
type TimelineDay = { i: number; weekday: string; day: string; items: TimelineItem[] };

const EVENT_COLOR = "var(--info)";
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

export default function WeekTimeline({ events, polls }: { events: EventSummary[]; polls: TimelinePoll[] }) {
  const days = useMemo(() => buildDays(events, polls), [events, polls]);
  // Heute zeigt Orientierung; ist heute leer, öffne den nächsten Tag mit Inhalt.
  const initial = days[0].items.length > 0 ? 0 : Math.max(0, days.findIndex((d) => d.items.length > 0));
  const [selected, setSelected] = useState(initial);
  if (!days.some((d) => d.items.length > 0)) return null;
  const active = days[selected];

  return (
    <section className="mt-[30px]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[18px] font-extrabold">Diese Woche</h2>
        <div className="flex items-center gap-3 text-[10.5px] font-bold text-muted">
          <Legend color={EVENT_COLOR} label="Events" />
          <Legend color={POLL_COLOR} label="Fristen" />
        </div>
      </div>

      <div className="flex gap-1.5">
        {days.map((d) => {
          const isToday = d.i === 0;
          const isSel = d.i === selected;
          const tileBg = isSel ? (isToday ? "var(--accent)" : "var(--ink)") : isToday ? "transparent" : "var(--soft)";
          const tileColor = isSel ? "var(--paper)" : isToday ? "var(--accent)" : "var(--text)";
          return (
            <button
              key={d.i}
              type="button"
              onClick={() => setSelected(d.i)}
              aria-pressed={isSel}
              aria-label={`${dayLabel(d)}, ${d.items.length} Einträge`}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <span className={`text-[10px] font-extrabold uppercase tracking-[0.08em] ${isToday ? "text-[color:var(--accent)]" : "text-muted"}`}>
                {d.weekday}
              </span>
              <span
                className="flex h-10 w-full items-center justify-center rounded-[12px] font-display text-[17px] font-black transition-colors"
                style={{ background: tileBg, color: tileColor, border: isToday && !isSel ? "2px solid var(--accent)" : "2px solid transparent" }}
              >
                {d.day}
              </span>
              <span className="flex h-2 items-center gap-[3px]">
                {d.items.slice(0, 3).map((it, idx) => (
                  <span key={idx} className="h-1.5 w-1.5 rounded-full" style={{ background: it.kind === "event" ? EVENT_COLOR : POLL_COLOR }} />
                ))}
                {d.items.length > 3 && <span className="text-[9px] font-extrabold leading-none text-muted">+</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div key={selected} className="sp-in mt-3">
        <p className="mb-2 px-0.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">{dayLabel(active)}</p>
        {active.items.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-line bg-surface px-4 py-5 text-center text-[13px] text-muted">
            Nichts an diesem Tag.
          </div>
        ) : (
          <div className="sp-stagger flex flex-col gap-2">
            {active.items.map((it) => (
              <Link
                key={it.kind + it.id}
                href={it.kind === "event" ? `/events/${it.id}` : `/polls/${it.id}`}
                className="flex items-center gap-3 rounded-[16px] border border-line bg-surface px-3.5 py-3 transition active:scale-[0.99]"
              >
                <span className="flex w-12 shrink-0 flex-col items-center">
                  <span className="h-2 w-2 rounded-full" style={{ background: it.kind === "event" ? EVENT_COLOR : POLL_COLOR }} />
                  <span className="tabular mt-1 text-[11px] font-bold text-muted">{it.time}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-bold leading-tight">{it.title}</p>
                  <p className="text-[11px] font-semibold text-muted">{it.kind === "event" ? "Event" : "Vote endet"}</p>
                </div>
                <IconChevronRight size={16} className="shrink-0 text-muted" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
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
