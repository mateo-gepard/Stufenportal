"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import type { EventSummary } from "@/lib/types";
import { Card, MilestoneBar, SkeletonList, BottomSheet, Button } from "@/components/ui";
import { Field, Input, Textarea, Select } from "@/components/form";
import { centsFromEuroInput, relativeDay } from "@/lib/format";
import { IconPlus } from "@/components/icons";

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
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="sp-section-kicker">Stufenportal</p>
          <h1 className="sp-page-title">Events</h1>
        </div>
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

      {events && events.length > 0 && <EventsList events={events} />}

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

function EventsList({ events }: { events: EventSummary[] }) {
  const sorted = [...events].sort((a, b) => {
    const at = a.start_at ? new Date(a.start_at).getTime() : Number.MAX_SAFE_INTEGER;
    const bt = b.start_at ? new Date(b.start_at).getTime() : Number.MAX_SAFE_INTEGER;
    return at - bt;
  });
  const hero = sorted.find((e) => e.status !== "done" && e.status !== "cancelled") || sorted[0];
  const rest = sorted.filter((e) => e.id !== hero.id);

  return (
    <>
      <Link href={`/events/${hero.id}`} className="sp-hero-dark relative mt-1 block overflow-hidden rounded-[24px] p-5">
        <div className="sp-half absolute -right-4 -top-4 h-[130px] w-[130px] text-white/15" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[color:var(--pop)]">Als nächstes</span>
            <h2 className="sp-display mt-2 text-[27px] leading-[1.02]">{hero.title}</h2>
            <p className="mt-1 text-[12.5px] opacity-75">{hero.start_at ? new Date(hero.start_at).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }) : "Ohne Datum"}</p>
          </div>
          <Countdown iso={hero.start_at} />
        </div>
        {hero.total_count > 0 && (
          <>
            <div className="relative mt-5">
              <MilestoneBar done={hero.done_count} total={hero.total_count} />
            </div>
            <p className="relative mt-2 text-[11.5px] font-semibold opacity-75">{hero.done_count}/{hero.total_count} Meilensteine erledigt</p>
          </>
        )}
      </Link>

      <div className="sp-section-kicker mb-3 mt-6">Alle Events</div>
      <div className="flex flex-col gap-3">
        {rest.map((e) => (
          <Link key={e.id} href={`/events/${e.id}`}>
            <EventCard event={e} />
          </Link>
        ))}
      </div>
    </>
  );
}

function EventCard({ event }: { event: EventSummary }) {
  const d = event.start_at ? new Date(event.start_at) : null;
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex">
        <div className="w-[5px] shrink-0" style={{ background: statusColor(event.status) }} />
        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[13px] border border-line bg-[color:var(--soft)] leading-none">
              <span className="font-display text-[20px] font-extrabold">{d ? String(d.getDate()).padStart(2, "0") : "--"}</span>
              <span className="text-[9px] font-extrabold uppercase tracking-[0.05em] text-muted">{d ? d.toLocaleDateString("de-DE", { month: "short" }).replace(".", "") : ""}</span>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="rounded-md px-2 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.06em]" style={{ color: statusColor(event.status), background: statusBg(event.status) }}>{statusLabel(event.status)}</span>
                <span className="ml-auto text-[11px] font-bold text-muted">{event.start_at ? relativeDay(event.start_at) : "Ohne Datum"}</span>
              </div>
              <h2 className="sp-display mt-2 text-[17px] leading-tight">{event.title}</h2>
            </div>
          </div>
          {event.total_count > 0 && (
            <>
              <div className="mt-3">
                <MilestoneBar done={event.done_count} total={event.total_count} />
              </div>
              <p className="mt-2 text-[11px] font-semibold text-muted">{event.done_count}/{event.total_count} Schritte</p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function Countdown({ iso }: { iso?: string | null }) {
  if (!iso) {
    return (
      <div className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-3 text-center">
        <div className="font-display text-[28px] font-extrabold leading-none text-[color:var(--pop)]">?</div>
        <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] opacity-70">Datum</div>
      </div>
    );
  }
  const days = Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
  return (
    <div className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-3 text-center">
      <div className="font-display text-[32px] font-extrabold leading-none text-[color:var(--pop)]">{days}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] opacity-70">{days === 1 ? "Tag" : "Tage"}</div>
    </div>
  );
}

function statusColor(status: EventSummary["status"]) {
  if (status === "done") return "var(--ok)";
  if (status === "cancelled") return "var(--accent)";
  if (status === "active") return "var(--info)";
  if (status === "idea") return "var(--warn)";
  return "var(--accent)";
}

function statusBg(status: EventSummary["status"]) {
  if (status === "done") return "var(--ok-soft)";
  if (status === "active") return "var(--info-soft)";
  if (status === "idea") return "var(--warn-soft)";
  return "var(--accent-soft)";
}

function statusLabel(status: EventSummary["status"]) {
  return {
    idea: "Idee",
    planning: "Planung",
    active: "Aktiv",
    done: "Fertig",
    cancelled: "Abgesagt",
  }[status];
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
