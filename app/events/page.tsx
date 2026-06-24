"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import type { EventSummary } from "@/lib/types";
import { Card, MilestoneBar, EventStatusPill, SkeletonList, BottomSheet, Button } from "@/components/ui";
import { Field, Input, Textarea, Select } from "@/components/form";
import { centsFromEuroInput, money, relativeDay } from "@/lib/format";
import { IconCalendar, IconPlus, IconTarget } from "@/components/icons";

export default function EventsPage() {
  const { admin } = useApp();
  const [events, setEvents] = useState<EventSummary[] | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    (api("/api/events") as Promise<{ events: EventSummary[] }>)
      .then((d) => setEvents(d.events))
      .catch(() => setEvents([]));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="sp-in pb-6">
      <header className="mb-3 flex items-center justify-between">
        <h1 className="font-display text-display">Events</h1>
        {admin && (
          <Button onClick={() => setOpen(true)} variant="primary">
            <IconPlus size={17} />
            Neu
          </Button>
        )}
      </header>

      {!events && <SkeletonList rows={3} />}
      {events && events.length === 0 && (
        <Card className="text-center text-muted">
          <p className="py-6">Noch keine Events.</p>
        </Card>
      )}

      <div className="space-y-5">
        {events && groupEvents(events).map((group) => (
          <section key={group.label}>
            <div className="mb-2 flex items-center gap-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              <span className="h-px flex-1 bg-line" />
              {group.label}
              <span className="h-px flex-1 bg-line" />
            </div>
            <div className="flex flex-col gap-3">
              {group.events.map((e) => (
                <Link key={e.id} href={`/events/${e.id}`}>
                  <EventCard event={e} />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      {admin && (
        <CreateEventSheet
          open={open}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function groupEvents(events: EventSummary[]) {
  const groups = new Map<string, EventSummary[]>();
  events.forEach((event) => {
    const label = event.start_at ? relativeDay(event.start_at) : event.status === "idea" ? "Ideen" : "Ohne Datum";
    groups.set(label, [...(groups.get(label) || []), event]);
  });
  return Array.from(groups.entries()).map(([label, groupedEvents]) => ({ label, events: groupedEvents }));
}

function EventCard({ event }: { event: EventSummary }) {
  const progress = event.total_count > 0 ? Math.round((event.done_count / event.total_count) * 100) : 0;
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex gap-3 p-4">
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-[color:var(--surface-2)] text-[color:var(--signal-text)]">
          <IconCalendar size={20} />
          {event.start_at && <span className="mt-0.5 text-[10px] font-semibold text-muted">{relativeDay(event.start_at).slice(0, 3)}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <h2 className="font-display text-h2 leading-tight">{event.title}</h2>
            <EventStatusPill status={event.status} />
          </div>
          <MilestoneBar done={event.done_count} total={event.total_count} />
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
            <span>{event.total_count > 0 ? `${progress}% erledigt` : "Noch keine Schritte"}</span>
            {event.money_goal_cents ? (
              <span className="inline-flex items-center gap-1 text-[color:var(--signal-text)]">
                <IconTarget size={13} />
                {money(event.money_goal_cents)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

function CreateEventSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [status, setStatus] = useState("planning");
  const [milestones, setMilestones] = useState("");
  const [moneyGoal, setMoneyGoal] = useState("");
  const [moneyGoalNote, setMoneyGoalNote] = useState("");
  const [listTitle, setListTitle] = useState("");
  const [overflow, setOverflow] = useState("block");
  const [slots, setSlots] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!title.trim()) return setErr("Titel fehlt.");
    const moneyGoalCents = centsFromEuroInput(moneyGoal);
    if (moneyGoal.trim() && moneyGoalCents == null) return setErr("Kassenziel ist ungültig.");
    setBusy(true);
    setErr("");
    try {
      const ms = milestones
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((title) => ({ title }));
      const lists = [];
      if (listTitle.trim()) {
        const slotRows = slots
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => {
            const [label, cap] = l.split("|").map((x) => x.trim());
            return { label, capacity: cap ? Number(cap) : null };
          });
        lists.push({ title: listTitle.trim(), overflow, slots: slotRows });
      }
      await api("/api/events", {
        method: "POST",
        body: {
          title: title.trim(),
          description,
          start_at: start ? new Date(start).toISOString() : null,
          status,
          money_goal_cents: moneyGoalCents,
          money_goal_note: moneyGoalNote,
          milestones: ms,
          lists,
        },
      });
      setTitle("");
      setDescription("");
      setStart("");
      setMilestones("");
      setMoneyGoal("");
      setMoneyGoalNote("");
      setListTitle("");
      setSlots("");
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Neues Event">
      <Field label="Titel">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Kuchenverkauf" />
      </Field>
      <Field label="Beschreibung">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="Datum">
            <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="idea">Idee</option>
              <option value="planning">In Planung</option>
              <option value="active">Aktiv</option>
            </Select>
          </Field>
        </div>
      </div>
      <Field label="Meilensteine" hint="Einer pro Zeile.">
        <Textarea
          value={milestones}
          onChange={(e) => setMilestones(e.target.value)}
          placeholder={"Standplatz klären\nBackliste füllen"}
        />
      </Field>
      <div className="rounded-xl border border-line bg-surface p-3">
        <Field label="Kassenziel (€)" hint="Optionaler Planwert. Er erscheint separat in der Kasse.">
          <Input inputMode="decimal" value={moneyGoal} onChange={(e) => setMoneyGoal(e.target.value)} placeholder="0,00" />
        </Field>
        {moneyGoal.trim() && (
          <Field label="Notiz zum Ziel (optional)">
            <Input value={moneyGoalNote} onChange={(e) => setMoneyGoalNote(e.target.value)} placeholder="z. B. erwartete Einnahme" maxLength={160} />
          </Field>
        )}
      </div>
      <Field label="Eintragungsliste (optional)" hint="Lass das Feld leer, wenn keine Liste nötig ist.">
        <Input value={listTitle} onChange={(e) => setListTitle(e.target.value)} placeholder="z. B. Standdienst" />
      </Field>
      {listTitle.trim() && (
        <>
          <Field label="Slots" hint={'Einer pro Zeile. Kapazität optional mit | dahinter, z. B. „8–10 Uhr | 3“.'}>
            <Textarea value={slots} onChange={(e) => setSlots(e.target.value)} placeholder={"8–10 Uhr | 3\n10–12 Uhr | 3"} />
          </Field>
          <Field label="Wenn voll">
            <Select value={overflow} onChange={(e) => setOverflow(e.target.value)}>
              <option value="block">Harter Stopp</option>
              <option value="waitlist">Warteliste</option>
            </Select>
          </Field>
        </>
      )}
      {err && <p className="mb-2 text-small text-danger">{err}</p>}
      <Button onClick={submit} disabled={busy} full>
        {busy ? "Speichern…" : "Event erstellen"}
      </Button>
    </BottomSheet>
  );
}
