"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import type { EventDetail, MemberRow, Milestone, Slot } from "@/lib/types";
import {
  Card,
  MilestoneBar,
  EventStatusPill,
  Skeleton,
  BottomSheet,
  Button,
  AdminDots,
  SheetAction,
} from "@/components/ui";
import { Field, Input, Textarea, Select } from "@/components/form";
import { IconCheck, IconPencil, IconPlus, IconRadioOff, IconRadioOn, IconTarget, IconTrash, IconUser } from "@/components/icons";
import { centsFromEuroInput, euroInputValue, money, relativeDay } from "@/lib/format";
import Comments from "@/components/Comments";
import AccountMultiSelect from "@/components/AccountMultiSelect";

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const { admin } = useApp();
  const router = useRouter();
  const [ev, setEv] = useState<EventDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [adminSheet, setAdminSheet] = useState(false);
  const [editSheet, setEditSheet] = useState(false);
  const [joinSlot, setJoinSlot] = useState<Slot | null>(null);
  const [accounts, setAccounts] = useState<MemberRow[]>([]);
  const [assignFor, setAssignFor] = useState<Milestone | null>(null);
  const [assignIds, setAssignIds] = useState<string[]>([]);
  const [assignPoints, setAssignPoints] = useState("0");
  const [newMs, setNewMs] = useState("");

  const load = useCallback(() => {
    (api(`/api/events/${params.id}`) as Promise<{ event: EventDetail }>)
      .then((d) => setEv(d.event))
      .catch(() => setNotFound(true));
  }, [params.id]);
  useEffect(load, [load]);
  useEffect(() => {
    if (!admin) return;
    (api("/api/members") as Promise<{ members: MemberRow[] }>)
      .then((data) => setAccounts(data.members))
      .catch(() => setAccounts([]));
  }, [admin]);

  function idsForAssignee(value: string | null): string[] {
    const names = new Set((value || "").split(",").map((name) => name.trim()).filter(Boolean));
    return accounts.filter((account) => names.has(account.name)).map((account) => account.user_id);
  }

  function openAssign(milestone: Milestone) {
    setAssignFor(milestone);
    // Verlaessliche Zuordnung bevorzugen; Namen nur als Legacy-Fallback auflösen.
    setAssignIds(milestone.assignee_ids.length ? milestone.assignee_ids : idsForAssignee(milestone.assignee));
    setAssignPoints(milestone.points ? String(milestone.points) : "0");
  }

  async function toggleMs(mid: string, done: boolean) {
    setEv((prev) =>
      prev
        ? {
            ...prev,
            milestones: prev.milestones.map((m) => (m.id === mid ? { ...m, done: !done } : m)),
            done_count: prev.done_count + (done ? -1 : 1),
          }
        : prev
    );
    // Neu laden, damit der "vergeben"-Status (Punkte) sichtbar wird.
    try {
      await api(`/api/milestones/${mid}`, { method: "PATCH", body: { done: !done } });
    } finally {
      load();
    }
  }

  async function addMs() {
    if (!newMs.trim()) return;
    await api(`/api/events/${params.id}/milestones`, { method: "POST", body: { title: newMs.trim() } });
    setNewMs("");
    load();
  }

  async function saveAssignment() {
    if (!assignFor) return;
    const points = Math.max(0, parseInt(assignPoints, 10) || 0);
    // Server leitet die Anzeigenamen aus assignee_ids ab — IDs sind die Quelle der Wahrheit.
    await api(`/api/milestones/${assignFor.id}`, { method: "PATCH", body: { assignee_ids: assignIds, points } });
    setAssignFor(null);
    setAssignIds([]);
    load();
  }

  async function setStatus(status: string) {
    await api(`/api/events/${params.id}`, { method: "PATCH", body: { status } });
    setAdminSheet(false);
    load();
  }

  async function del() {
    await api(`/api/events/${params.id}`, { method: "DELETE" });
    router.push("/events");
  }

  if (notFound)
    return (
      <div className="sp-in pt-10 text-center text-muted">
        <p>Event nicht gefunden.</p>
        <Link href="/events" className="mt-3 inline-block text-signal-text">
          Zurück
        </Link>
      </div>
    );

  if (!ev)
    return (
      <div className="space-y-3 pt-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );

  return (
    <div className="sp-in pb-6">
      <header className="mb-3 rounded-[24px] bg-[color:var(--dark)] p-5 text-white shadow-[6px_6px_0_color-mix(in_srgb,var(--ink)_18%,transparent)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/60">Event</p>
            <h1 className="font-display text-[34px] font-black leading-[0.92] tracking-normal">{ev.title}</h1>
          </div>
          {admin && <AdminDots onClick={() => setAdminSheet(true)} />}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md bg-white/12 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.05em]">
            {statusLabel(ev.status)}
          </span>
          {ev.start_at && (
            <span className="rounded-md bg-[color:var(--pop)] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.05em] text-[color:var(--ink)]">
              {relativeDay(ev.start_at)}
            </span>
          )}
        </div>
      </header>

      {ev.description && (
        <p className="mb-4 whitespace-pre-wrap rounded-[18px] border border-line bg-[color:var(--soft)] px-4 py-3 text-[15px] leading-relaxed text-muted">
          {ev.description}
        </p>
      )}

      {ev.money_goal_cents ? (
        <div className="mb-5 flex items-start gap-3 rounded-[18px] border-2 border-dashed border-[color:var(--pop)] bg-[color:var(--pop-soft)] p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[color:var(--warn)]">
            <IconTarget size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Kassenziel</p>
            <p className="tabular font-display text-[26px] font-black leading-none">{money(ev.money_goal_cents)}</p>
            {ev.money_goal_note && <p className="mt-1 text-small text-muted">{ev.money_goal_note}</p>}
          </div>
        </div>
      ) : null}

      {/* Meilensteine */}
      <section className="mb-5 rounded-[20px] border border-line bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Fortschritt</h2>
          <span className="text-[12px] text-muted">
            {ev.done_count} / {ev.total_count}
          </span>
        </div>
        <MilestoneBar done={ev.done_count} total={ev.total_count} />
        <div className="mt-3 flex flex-col gap-1.5">
          {ev.milestones.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-[14px] bg-[color:var(--soft)] px-3 py-2.5"
            >
              <button
                onClick={() => admin && toggleMs(m.id, m.done)}
                disabled={!admin}
                aria-label="Abhaken"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                style={{
                  borderColor: m.done ? "var(--success)" : "var(--border)",
                  background: m.done ? "var(--success)" : "transparent",
                }}
              >
                {m.done && <IconCheck size={13} strokeWidth={3.2} style={{ color: "white" }} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-small ${m.done ? "text-muted line-through" : ""}`}>{m.title}</p>
                {(m.assignee || m.due_at) && (
                  <p className="text-[12px] text-muted">
                    {m.assignee}
                    {m.assignee && m.due_at ? " · " : ""}
                    {m.due_at ? relativeDay(m.due_at) : ""}
                  </p>
                )}
                {m.points > 0 && (
                  <span
                    className="mt-1 inline-flex items-center gap-1 rounded-md bg-[color:var(--pop-soft)] px-2 py-0.5 text-[11px] font-extrabold text-[color:var(--ink)]"
                    title={m.points_awarded ? "Punkte wurden vergeben" : "Punkte werden beim Abhaken vergeben"}
                  >
                    {m.points_awarded && <IconCheck size={11} strokeWidth={3} />}
                    +{m.points} Pkt{m.points_awarded ? " vergeben" : ""}
                  </span>
                )}
              </div>
              {admin && (
                <button
                  type="button"
                  onClick={() => openAssign(m)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] border border-line bg-surface text-muted"
                  aria-label="Aufgabe zuordnen"
                >
                  <IconUser size={16} />
                </button>
              )}
            </div>
          ))}
          {ev.milestones.length === 0 && <p className="text-small text-muted">Keine Meilensteine.</p>}
        </div>
        {admin && (
          <div className="mt-2 flex gap-2">
            <Input value={newMs} onChange={(e) => setNewMs(e.target.value)} placeholder="Neuer Meilenstein…" />
            <Button onClick={addMs} variant="surface" disabled={!newMs.trim()}>
              <IconPlus size={17} />
              <span className="sr-only">Meilenstein hinzufügen</span>
            </Button>
          </div>
        )}
      </section>

      {/* Eintragungslisten */}
      {ev.lists.map((list) => (
        <section key={list.id} className="mb-5">
          <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">{list.title}</h2>
          <div className="flex flex-col gap-2.5">
            {list.slots.map((slot) => (
              <SlotRow key={slot.id} slot={slot} onChanged={load} onJoin={() => setJoinSlot(slot)} />
            ))}
          </div>
        </section>
      ))}

      <Comments type="event" id={ev.id} />

      {/* Admin-Sheet */}
      <BottomSheet open={adminSheet} onClose={() => setAdminSheet(false)} title="Verwalten">
        <div className="space-y-1">
          <SheetAction label="Bearbeiten" icon={<IconPencil size={18} />} onClick={() => { setAdminSheet(false); setEditSheet(true); }} />
          <p className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-wide text-muted">Status</p>
          {[
            ["idea", "Idee"],
            ["planning", "In Planung"],
            ["active", "Aktiv"],
            ["done", "Erledigt"],
            ["cancelled", "Abgesagt"],
          ].map(([v, l]) => (
            <SheetAction
              key={v}
              label={l}
              icon={ev.status === v ? <IconRadioOn size={18} /> : <IconRadioOff size={18} />}
              onClick={() => setStatus(v)}
            />
          ))}
          <div className="my-1 h-px bg-line" />
          <SheetAction label="In den Papierkorb" icon={<IconTrash size={18} />} danger onClick={del} />
        </div>
      </BottomSheet>

      <EditEventSheet
        open={editSheet}
        ev={ev}
        onClose={() => setEditSheet(false)}
        onSaved={() => {
          setEditSheet(false);
          load();
        }}
      />

      {/* Eintrag-Sheet */}
      <JoinSheet
        slot={joinSlot}
        onClose={() => setJoinSlot(null)}
        onJoined={() => {
          setJoinSlot(null);
          load();
        }}
      />

      <BottomSheet open={!!assignFor} onClose={() => setAssignFor(null)} title="Aufgabe zuordnen">
        {assignFor && (
          <div className="space-y-3">
            <div className="rounded-[16px] bg-[color:var(--soft)] px-3 py-2.5">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">Aufgabe</p>
              <p className="font-display text-[20px] font-black leading-tight">{assignFor.title}</p>
            </div>
            <AccountMultiSelect
              accounts={accounts}
              selected={assignIds}
              onChange={setAssignIds}
              placeholder="Namen suchen"
              emptyText="Keine Accounts gefunden."
            />
            <Field
              label="Punkte bei Erledigung"
              hint="0 = keine Punkte. Werden beim Abhaken automatisch an die Zugeordneten vergeben."
            >
              <Input
                inputMode="numeric"
                value={assignPoints}
                onChange={(e) => setAssignPoints(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
              />
            </Field>
            {assignFor.points_awarded && (
              <p className="text-[12px] text-muted">
                Für diese Aufgabe wurden bereits Punkte vergeben. Eine Änderung vergibt sie nicht erneut.
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={() => setAssignIds([])} variant="surface">
                Leeren
              </Button>
              <Button onClick={saveAssignment} full>
                Zuordnung speichern
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function SlotRow({ slot, onChanged, onJoin }: { slot: Slot; onChanged: () => void; onJoin: () => void }) {
  async function leave() {
    await api(`/api/slots/${slot.id}/signups`, { method: "DELETE" });
    onChanged();
  }
  const cap = slot.capacity != null ? `${slot.taken}/${slot.capacity}` : `${slot.taken}`;
  return (
    <Card className="p-3.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-[color:var(--info-soft)] text-[color:var(--info)]">
            <IconUser size={18} />
          </span>
          <p className="truncate font-extrabold">{slot.label}</p>
        </div>
        <span className="tabular rounded-md bg-[color:var(--surface-2)] px-2 py-1 text-[12px] font-bold text-muted">{cap}</span>
      </div>
      {slot.signups.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {slot.signups.map((s) => (
            <span
              key={s.id}
              className="rounded-md px-2.5 py-1 text-[12px] font-bold"
              style={{
                background: s.status === "waitlist" ? "var(--surface-2)" : "color-mix(in srgb, var(--signal) 12%, transparent)",
                color: s.status === "waitlist" ? "var(--text-muted)" : "var(--signal-text)",
              }}
            >
              {s.display_name}
              {s.status === "waitlist" ? " · Warteliste" : ""}
              {s.mine ? " (du)" : ""}
            </span>
          ))}
        </div>
      )}
      {slot.mine ? (
        <Button onClick={leave} variant="surface" full>
          Austragen
        </Button>
      ) : slot.full ? (
        <Button onClick={onJoin} variant="surface" full>
          Voll — auf Warteliste
        </Button>
      ) : (
        <Button onClick={onJoin} variant="primary" full>
          Eintragen
        </Button>
      )}
    </Card>
  );
}

function statusLabel(status: EventDetail["status"]): string {
  const labels: Record<EventDetail["status"], string> = {
    idea: "Idee",
    planning: "In Planung",
    active: "Aktiv",
    done: "Erledigt",
    cancelled: "Abgesagt",
  };
  return labels[status];
}

function JoinSheet({ slot, onClose, onJoined }: { slot: Slot | null; onClose: () => void; onJoined: () => void }) {
  const [err, setErr] = useState("");

  async function join() {
    if (!slot) return;
    setErr("");
    try {
      await api(`/api/slots/${slot.id}/signups`, { method: "POST" });
      onJoined();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <BottomSheet open={!!slot} onClose={onClose} title={slot?.full ? "Auf die Warteliste" : "Eintragen"}>
      <p className="mb-3 text-small text-muted">
        Du wirst mit deinem Accountnamen in die Liste eingetragen.
      </p>
      {err && <p className="mb-2 text-small text-danger">{err}</p>}
      <Button onClick={join} full>
        {slot?.full ? "Auf Warteliste setzen" : "Eintragen"}
      </Button>
    </BottomSheet>
  );
}

function EditEventSheet({
  open,
  ev,
  onClose,
  onSaved,
}: {
  open: boolean;
  ev: EventDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(ev.title);
  const [description, setDescription] = useState(ev.description);
  const [moneyGoal, setMoneyGoal] = useState(euroInputValue(ev.money_goal_cents));
  const [moneyGoalNote, setMoneyGoalNote] = useState(ev.money_goal_note || "");
  const [err, setErr] = useState("");
  useEffect(() => {
    setTitle(ev.title);
    setDescription(ev.description);
    setMoneyGoal(euroInputValue(ev.money_goal_cents));
    setMoneyGoalNote(ev.money_goal_note || "");
    setErr("");
  }, [ev, open]);

  async function save() {
    const moneyGoalCents = centsFromEuroInput(moneyGoal);
    if (moneyGoal.trim() && moneyGoalCents == null) return setErr("Kassenziel ist ungültig.");
    await api(`/api/events/${ev.id}`, {
      method: "PATCH",
      body: { title, description, money_goal_cents: moneyGoalCents, money_goal_note: moneyGoalNote },
    });
    onSaved();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Event bearbeiten">
      <Field label="Titel">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Beschreibung">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="rounded-xl border border-line bg-surface p-3">
        <Field label="Kassenziel (€)" hint="Leer lassen, um das Ziel zu entfernen.">
          <Input inputMode="decimal" value={moneyGoal} onChange={(e) => setMoneyGoal(e.target.value)} placeholder="0,00" />
        </Field>
        {moneyGoal.trim() && (
          <Field label="Notiz zum Ziel (optional)">
            <Input value={moneyGoalNote} onChange={(e) => setMoneyGoalNote(e.target.value)} maxLength={160} />
          </Field>
        )}
      </div>
      {err && <p className="mb-2 text-small text-danger">{err}</p>}
      <Button onClick={save} full>
        Speichern
      </Button>
    </BottomSheet>
  );
}
