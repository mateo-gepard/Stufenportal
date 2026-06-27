"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import type { MyAssignedMilestone, MySignupTask, MyTasksData } from "@/lib/types";
import { Card, SkeletonList } from "@/components/ui";
import { IconCalendar, IconCheck, IconClock, IconSparkle, IconUser } from "@/components/icons";
import { relativeDay } from "@/lib/format";

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
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white/12 text-[color:var(--pop)]">
                <IconCheck size={23} />
              </span>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/55">Einteilungen</p>
                <p className="font-display text-[28px] font-black leading-none">
                  {counts.open + counts.signups} aktiv
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat value={counts.open} label="offen" tone="pop" />
              <Stat value={counts.signups} label="Slots" />
              <Stat value={counts.done} label="erledigt" tone="ok" />
            </div>
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
      <Card className="text-center">
        <div className="flex flex-col items-center gap-2 py-7 text-muted">
          <IconSparkle size={23} />
          <p className="font-extrabold text-text">{emptyTitle}</p>
          <p className="max-w-[260px] text-[13px] leading-relaxed">{emptyBody}</p>
        </div>
      </Card>
    );
  }

  return <div className="flex flex-col gap-3">{children}</div>;
}

function MilestoneTaskCard({ task, done = false }: { task: MyAssignedMilestone; done?: boolean }) {
  const dateLabel = task.due_at
    ? relativeDay(task.due_at)
    : task.event_start_at
      ? relativeDay(task.event_start_at)
      : "Ohne Datum";

  return (
    <Link href={`/events/${task.event_id}`}>
      <Card className={`p-0 ${done ? "opacity-72" : ""}`}>
        <div className="flex">
          <div className="w-[5px] shrink-0" style={{ background: done ? "var(--success)" : "var(--accent)" }} />
          <div className="min-w-0 flex-1 p-4">
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
            <div className="mt-3 flex items-center gap-2 text-[12.5px] font-bold text-muted">
              <IconCalendar size={14} />
              <span className="truncate">{task.event_title}</span>
            </div>
            {task.assignee && (
              <div className="mt-2 flex items-start gap-2 text-[12px] text-muted">
                <IconUser size={14} className="mt-0.5 shrink-0" />
                <span className="line-clamp-2">{task.assignee}</span>
              </div>
            )}
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
      <Card className="p-4">
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
      </Card>
    </Link>
  );
}

