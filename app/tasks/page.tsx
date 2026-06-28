"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import type { MyAssignedMilestone, MySignupTask, MyTasksData } from "@/lib/types";
import { Card, SkeletonList } from "@/components/ui";
import { IconCalendar, IconCheck, IconClock, IconTarget, IconUser } from "@/components/icons";
import { relativeDay } from "@/lib/format";
import { useCountUp } from "@/lib/useCountUp";

type TaskView = "open" | "signups" | "done";

export default function TasksPage() {
  const [data, setData] = useState<MyTasksData | null>(null);
  const [err, setErr] = useState("");
  const [view, setView] = useState<TaskView>("open");

  useEffect(() => {
    api<MyTasksData>("/api/tasks")
      .then(setData)
      .catch((e) => setErr(e.message));
  }, []);

  const counts = useMemo(
    () => ({
      open: data?.open_milestones.length ?? 0,
      signups: data?.signups.length ?? 0,
      done: data?.done_milestones.length ?? 0,
    }),
    [data]
  );
  const activeCount = counts.open + counts.signups;
  const totalCount = activeCount + counts.done;
  const completion = totalCount > 0 ? Math.round((counts.done / totalCount) * 100) : 100;
  const animCompletion = useCountUp(completion);
  const focus = useMemo(() => {
    if (!data) return null;
    const milestone = data.open_milestones[0];
    if (milestone) {
      const dateLabel = milestone.due_at
        ? relativeDay(milestone.due_at)
        : milestone.event_start_at
          ? relativeDay(milestone.event_start_at)
          : "ohne Datum";
      return {
        href: `/events/${milestone.event_id}`,
        eyebrow: "Nächster Fokus",
        title: milestone.title,
        meta: `${milestone.event_title} · ${dateLabel}`,
      };
    }
    const signup = data.signups[0];
    if (signup) {
      return {
        href: `/events/${signup.event_id}`,
        eyebrow: signup.status === "waitlist" ? "Warteliste" : "Dein Slot",
        title: signup.slot_label,
        meta: `${signup.list_title} · ${signup.event_title}`,
      };
    }
    return null;
  }, [data]);

  return (
    <div className="sp-in pb-6">
      <header className="mb-4">
        <p className="sp-section-kicker">Dein Plan</p>
        <h1 className="sp-page-title">Meine Aufgaben</h1>
      </header>

      {err && <p className="mb-3 text-small text-danger">{err}</p>}
      {!data && !err && <SkeletonList rows={4} />}

      {data && (
        <>
          <section className="mb-4 overflow-hidden rounded-[26px] bg-[color:var(--dark)] p-5 text-white shadow-[6px_6px_0_color-mix(in_srgb,var(--ink)_15%,transparent)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white/12 text-[color:var(--pop)]">
                  <IconTarget size={23} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/55">Einteilungsboard</p>
                  <p className="font-display text-[28px] font-black leading-none">
                    {activeCount ? `${activeCount} aktiv` : "Alles klar"}
                  </p>
                  <p className="mt-1 text-[12px] font-semibold text-white/58">{completion}% erledigt</p>
                </div>
              </div>
              <div
                className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full p-[5px]"
                style={{
                  background: `conic-gradient(var(--pop) ${animCompletion * 3.6}deg, rgba(255,255,255,0.16) 0deg)`,
                }}
                aria-label={`${completion}% erledigt`}
              >
                <span className="flex h-full w-full items-center justify-center rounded-full bg-[color:var(--dark)] font-display text-[17px] font-black">
                  {Math.round(animCompletion)}
                </span>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/12">
              <div
                className="sp-bar-grow h-full rounded-full bg-[color:var(--pop)] transition-all duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Stat value={counts.open} label="offen" tone="pop" />
              <Stat value={counts.signups} label="Slots" />
              <Stat value={counts.done} label="erledigt" tone="ok" />
            </div>

            {focus ? (
              <Link
                href={focus.href}
                className="mt-3 flex min-h-[66px] items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.07] px-3.5 py-3 transition active:scale-[0.99]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[color:var(--pop)] text-[color:var(--ink)]">
                  <IconClock size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/50">
                    {focus.eyebrow}
                  </span>
                  <span className="block truncate font-display text-[18px] font-black leading-tight">{focus.title}</span>
                  <span className="mt-0.5 block truncate text-[12px] font-semibold text-white/60">{focus.meta}</span>
                </span>
              </Link>
            ) : (
              <div className="mt-3 rounded-[18px] border border-white/10 bg-white/[0.06] px-3.5 py-3 text-[13px] font-semibold text-white/62">
                Keine aktive Einteilung. Sobald etwas bei dir landet, steht es hier als nächster Fokus.
              </div>
            )}
          </section>

          <div className="mb-4 grid grid-cols-3 gap-2 rounded-[18px] border border-line bg-surface p-1">
            <SegmentButton active={view === "open"} onClick={() => setView("open")} label="Offen" count={counts.open} />
            <SegmentButton active={view === "signups"} onClick={() => setView("signups")} label="Slots" count={counts.signups} />
            <SegmentButton active={view === "done"} onClick={() => setView("done")} label="Erledigt" count={counts.done} />
          </div>

          {view === "open" && (
            <TaskList
              emptyTitle="Keine offenen Aufgaben"
              emptyBody="Sobald du bei einem Meilenstein eingeteilt bist, steht er hier."
            >
              {data.open_milestones.map((task) => (
                <MilestoneTaskCard key={task.id} task={task} />
              ))}
            </TaskList>
          )}

          {view === "signups" && (
            <TaskList
              emptyTitle="Keine Eintragungen"
              emptyBody="Wenn du dich in einen Event-Slot einträgst, findest du ihn hier."
            >
              {data.signups.map((signup) => (
                <SignupTaskCard key={signup.id} signup={signup} />
              ))}
            </TaskList>
          )}

          {view === "done" && (
            <TaskList
              emptyTitle="Noch nichts erledigt"
              emptyBody="Abgehakte Aufgaben bleiben hier sichtbar, solange das Event noch relevant ist."
            >
              {data.done_milestones.map((task) => (
                <MilestoneTaskCard key={task.id} task={task} done />
              ))}
            </TaskList>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: "pop" | "ok" }) {
  const color = tone === "ok" ? "var(--success)" : tone === "pop" ? "var(--pop)" : "white";
  return (
    <div className="rounded-[15px] bg-white/10 px-2 py-2">
      <p className="font-display text-[27px] font-black leading-none" style={{ color }}>
        {value}
      </p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.06em] text-white/65">{label}</p>
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[44px] rounded-[14px] px-2 text-center transition active:scale-[0.98]"
      style={{
        background: active ? "var(--ink)" : "transparent",
        color: active ? "var(--paper)" : "var(--text-muted)",
      }}
    >
      <span className="block text-[13px] font-extrabold">{label}</span>
      <span className="block text-[10px] font-bold opacity-75">{count}</span>
    </button>
  );
}

function TaskList({
  children,
  emptyTitle,
  emptyBody,
}: {
  children: React.ReactNode;
  emptyTitle: string;
  emptyBody: string;
}) {
  const list = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  if (list.length === 0) {
    return (
      <Card className="overflow-hidden p-0 text-center">
        <div className="relative px-5 py-7 text-muted">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[16px] border border-line bg-[color:var(--soft)] text-[color:var(--success)]">
            <IconCheck size={22} />
          </div>
          <p className="font-extrabold text-text">{emptyTitle}</p>
          <p className="mx-auto mt-1 max-w-[260px] text-[13px] leading-relaxed">{emptyBody}</p>
        </div>
      </Card>
    );
  }

  return <div className="sp-stagger flex flex-col gap-3">{children}</div>;
}

function MilestoneTaskCard({ task, done = false }: { task: MyAssignedMilestone; done?: boolean }) {
  const dateLabel = task.due_at
    ? relativeDay(task.due_at)
    : task.event_start_at
      ? relativeDay(task.event_start_at)
      : "Ohne Datum";

  return (
    <Link href={`/events/${task.event_id}`}>
      <Card className={`overflow-hidden p-0 transition active:scale-[0.99] ${done ? "opacity-72" : ""}`}>
        <div className="relative p-4">
          <div className="absolute left-0 top-0 h-full w-[5px]" style={{ background: done ? "var(--success)" : "var(--accent)" }} />
          <div className="flex gap-3 pl-1">
            <div className="flex shrink-0 flex-col items-center">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 bg-surface"
                style={{ borderColor: done ? "var(--success)" : "var(--accent)", color: done ? "var(--success)" : "var(--accent)" }}
              >
                {done ? <IconCheck size={18} /> : <IconClock size={18} />}
              </span>
              <span className="mt-2 h-full min-h-[46px] w-px bg-line" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-start justify-between gap-3">
                <span
                  className="inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.06em]"
                  style={{
                    color: done ? "var(--success)" : "var(--accent)",
                    background: done ? "color-mix(in srgb, var(--success) 12%, transparent)" : "var(--accent-soft)",
                  }}
                >
                  {done ? <IconCheck size={12} /> : <IconClock size={12} />}
                  {done ? "Erledigt" : "Deine Aufgabe"}
                </span>
                <span className="shrink-0 text-[12px] font-bold text-muted">{dateLabel}</span>
              </div>
              <h2 className="font-display text-[20px] font-black leading-tight">{task.title}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] font-bold text-muted">
                <IconCalendar size={14} />
                <span className="truncate">{task.event_title}</span>
                {task.points > 0 && (
                  <span
                    className="inline-flex items-center gap-1 rounded-md bg-[color:var(--pop-soft)] px-2 py-0.5 text-[11px] font-extrabold text-[color:var(--ink)]"
                    title={done ? "Punkte für diese Aufgabe" : "Punkte, wenn die Aufgabe abgehakt wird"}
                  >
                    {done ? <IconCheck size={11} strokeWidth={3} /> : <IconTarget size={11} />}
                    +{task.points} Pkt
                  </span>
                )}
              </div>
              {task.assignee && (
                <div className="mt-2 flex items-start gap-2 text-[12px] text-muted">
                  <IconUser size={14} className="mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{task.assignee}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function SignupTaskCard({ signup }: { signup: MySignupTask }) {
  const statusLabel = signup.status === "waitlist" ? "Warteliste" : "Eingeteilt";
  const statusColor = signup.status === "waitlist" ? "var(--warn)" : "var(--info)";
  const dateLabel = signup.event_start_at ? relativeDay(signup.event_start_at) : "Ohne Datum";

  return (
    <Link href={`/events/${signup.event_id}`}>
      <Card className="overflow-hidden p-0 transition active:scale-[0.99]">
        <div className="relative p-4">
          <div className="absolute left-0 top-0 h-full w-[5px]" style={{ background: statusColor }} />
          <div className="flex gap-3 pl-1">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-surface"
              style={{ borderColor: statusColor, color: statusColor }}
            >
              <IconUser size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-start justify-between gap-3">
                <span
                  className="inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.06em]"
                  style={{ color: statusColor, background: `color-mix(in srgb, ${statusColor} 12%, transparent)` }}
                >
                  <IconUser size={12} />
                  {statusLabel}
                </span>
                <span className="shrink-0 text-[12px] font-bold text-muted">{dateLabel}</span>
              </div>
              <h2 className="font-display text-[20px] font-black leading-tight">{signup.slot_label}</h2>
              <p className="mt-2 text-[13px] font-bold text-muted">
                {signup.list_title} · {signup.event_title}
              </p>
              {signup.capacity != null && (
                <p className="mt-2 text-[12px] text-muted">Kapazität: {signup.capacity}</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
