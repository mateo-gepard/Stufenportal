"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import type { EventSummary } from "@/lib/types";
import { Card, MilestoneBar, EventStatusPill, SkeletonList, BottomSheet, Button } from "@/components/ui";
import { Field, Input, Textarea, Select } from "@/components/form";
import { relativeDay } from "@/lib/format";

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
            + Neu
          </Button>
        )}
      </header>

      {!events && <SkeletonList rows={3} />}
      {events && events.length === 0 && (
        <Card className="text-center text-muted">
          <p className="py-6">Noch keine Events.</p>
        </Card>
      )}

      <div className="flex flex-col gap-2.5">
        {events?.map((e) => (
          <Link key={e.id} href={`/events/${e.id}`}>
            <Card>
              <div className="mb-2 flex items-start justify-between gap-2">
                <h2 className="font-medium leading-snug">{e.title}</h2>
                <EventStatusPill status={e.status} />
              </div>
              <MilestoneBar done={e.done_count} total={e.total_count} />
              <div className="mt-1.5 flex items-center justify-between text-[12px] text-muted">
                <span>
                  {e.total_count > 0 ? `${e.done_count} von ${e.total_count} Schritten` : "Keine Meilensteine"}
                </span>
                {e.start_at && <span>{relativeDay(e.start_at)}</span>}
              </div>
            </Card>
          </Link>
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
  const [listTitle, setListTitle] = useState("");
  const [overflow, setOverflow] = useState("block");
  const [slots, setSlots] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!title.trim()) return setErr("Titel fehlt.");
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
          milestones: ms,
          lists,
        },
      });
      setTitle("");
      setDescription("");
      setStart("");
      setMilestones("");
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
