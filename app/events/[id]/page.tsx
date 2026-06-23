"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import type { EventDetail, Slot } from "@/lib/types";
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
import { IconCheck, IconChevronLeft, IconPencil, IconPlus, IconRadioOff, IconRadioOn, IconTrash } from "@/components/icons";
import { relativeDay } from "@/lib/format";
import Comments from "@/components/Comments";

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const { admin } = useApp();
  const router = useRouter();
  const [ev, setEv] = useState<EventDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [adminSheet, setAdminSheet] = useState(false);
  const [editSheet, setEditSheet] = useState(false);
  const [joinSlot, setJoinSlot] = useState<Slot | null>(null);
  const [newMs, setNewMs] = useState("");

  const load = useCallback(() => {
    (api(`/api/events/${params.id}`) as Promise<{ event: EventDetail }>)
      .then((d) => setEv(d.event))
      .catch(() => setNotFound(true));
  }, [params.id]);
  useEffect(load, [load]);

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
    await api(`/api/milestones/${mid}`, { method: "PATCH", body: { done: !done } }).catch(load);
  }

  async function addMs() {
    if (!newMs.trim()) return;
    await api(`/api/events/${params.id}/milestones`, { method: "POST", body: { title: newMs.trim() } });
    setNewMs("");
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
      <Link href="/events" className="mb-2 inline-flex items-center gap-1 text-small text-muted">
        <IconChevronLeft size={15} />
        Events
      </Link>

      <header className="mb-3 flex items-start justify-between gap-3">
        <h1 className="font-display text-h1 leading-tight">{ev.title}</h1>
        {admin && <AdminDots onClick={() => setAdminSheet(true)} />}
      </header>

      <div className="mb-3 flex items-center gap-2">
        <EventStatusPill status={ev.status} />
        {ev.start_at && <span className="text-small text-muted">{relativeDay(ev.start_at)}</span>}
      </div>

      {ev.description && <p className="mb-4 whitespace-pre-wrap text-body text-muted">{ev.description}</p>}

      {/* Meilensteine */}
      <section className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Fortschritt</h2>
          <span className="text-[12px] text-muted">
            {ev.done_count} / {ev.total_count}
          </span>
        </div>
        <MilestoneBar done={ev.done_count} total={ev.total_count} />
        <div className="mt-3 flex flex-col gap-1.5">
          {ev.milestones.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5"
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
              </div>
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
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{list.title}</h2>
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
    <Card>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="font-medium">{slot.label}</p>
        <span className="tabular text-[12px] text-muted">{cap}</span>
      </div>
      {slot.signups.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {slot.signups.map((s) => (
            <span
              key={s.id}
              className="rounded-full px-2.5 py-1 text-[12px]"
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

function JoinSheet({ slot, onClose, onJoined }: { slot: Slot | null; onClose: () => void; onJoined: () => void }) {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    if (slot) setName(localStorage.getItem("sp_name") || "");
  }, [slot]);

  async function join() {
    if (!slot) return;
    setErr("");
    try {
      if (name.trim()) localStorage.setItem("sp_name", name.trim());
      await api(`/api/slots/${slot.id}/signups`, { method: "POST", body: { display_name: name } });
      onJoined();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <BottomSheet open={!!slot} onClose={onClose} title={slot?.full ? "Auf die Warteliste" : "Eintragen"}>
      <Field label="Dein Name (optional)" hint="Damit die Liste zeigt, wer dabei ist. Du kannst auch anonym bleiben.">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Anonym" maxLength={40} />
      </Field>
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
  useEffect(() => {
    setTitle(ev.title);
    setDescription(ev.description);
  }, [ev, open]);

  async function save() {
    await api(`/api/events/${ev.id}`, { method: "PATCH", body: { title, description } });
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
      <Button onClick={save} full>
        Speichern
      </Button>
    </BottomSheet>
  );
}
