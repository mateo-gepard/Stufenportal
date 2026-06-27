"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import type { EventGoal, LedgerEntry } from "@/lib/types";
import { Card, Skeleton, BottomSheet, Button, AdminDots, SheetAction } from "@/components/ui";
import { Field, Input, Select } from "@/components/form";
import { IconArrowDown, IconArrowUp, IconChart, IconPlus, IconTarget, IconTrash } from "@/components/icons";
import { money, date, relativeDay } from "@/lib/format";

interface LedgerData {
  entries: LedgerEntry[];
  balance: number;
  income: number;
  expense: number;
  event_goal_total: number;
  event_goals: EventGoal[];
}

export default function KassePage() {
  const { admin } = useApp();
  const [data, setData] = useState<LedgerData | null>(null);
  const [create, setCreate] = useState(false);
  const [sheetFor, setSheetFor] = useState<LedgerEntry | null>(null);

  const load = useCallback(() => {
    api<LedgerData>("/api/ledger").then(setData).catch(() => {});
  }, []);
  useEffect(load, [load]);

  async function del(id: string) {
    await api(`/api/ledger/${id}`, { method: "DELETE" });
    setSheetFor(null);
    load();
  }

  return (
    <div className="sp-in pb-6">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="sp-section-kicker">Finanzen</p>
          <h1 className="sp-page-title">Kasse</h1>
        </div>
        {admin && (
          <Button onClick={() => setCreate(true)}>
            <IconPlus size={17} />
            Buchung
          </Button>
        )}
      </header>

      {!data ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        <div className="mb-5 space-y-3">
          <div className="overflow-hidden rounded-[26px] bg-[color:var(--dark)] p-5 text-white shadow-[6px_6px_0_color-mix(in_srgb,var(--ink)_16%,transparent)]">
            <div className="mb-5">
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/55">Kassenstand</p>
              <p className="tabular font-display text-[46px] font-black leading-none" style={{ color: data.balance >= 0 ? "white" : "var(--pop)" }}>
                {money(data.balance)}
              </p>
            </div>
            <FinanceSplit income={data.income} expense={data.expense} />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <MoneyStat icon={<IconArrowDown size={15} />} label="Einnahmen" value={data.income} tone="success" />
              <MoneyStat icon={<IconArrowUp size={15} />} label="Ausgaben" value={data.expense} tone="danger" />
            </div>
          </div>

          {data.event_goals.length > 0 && (
            <Card className="border-2 border-dashed border-[color:var(--pop)] bg-[color:var(--pop-soft)] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[color:var(--warn)]">
                    <IconTarget size={18} />
                  </span>
                  <div>
                    <p className="font-extrabold">Geplante Event-Ziele</p>
                    <p className="text-[12px] text-muted">Nicht im Kassenstand eingerechnet.</p>
                  </div>
                </div>
                <span className="tabular font-display text-[24px] font-black">{money(data.event_goal_total)}</span>
              </div>
              <div className="space-y-2">
                {data.event_goals.map((goal) => (
                  <Link key={goal.id} href={`/events/${goal.id}`} className="flex items-center gap-3 rounded-[14px] bg-white/70 px-3 py-2.5">
                    <IconChart size={16} className="shrink-0 text-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-small font-extrabold">{goal.title}</p>
                      <p className="truncate text-[11px] text-muted">
                        {goal.start_at ? relativeDay(goal.start_at) : "Ohne Datum"}
                        {goal.money_goal_note ? ` · ${goal.money_goal_note}` : ""}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-small font-medium">{money(goal.money_goal_cents)}</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Kassenbuch</h2>
      <div className="flex flex-col gap-2.5">
        {data?.entries.map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-[16px] border border-line bg-surface px-3.5 py-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] text-[15px]"
              style={{
                color: e.kind === "income" ? "var(--success)" : "var(--danger)",
                background: e.kind === "income" ? "color-mix(in srgb, var(--success) 12%, transparent)" : "color-mix(in srgb, var(--danger) 12%, transparent)",
              }}
            >
              {e.kind === "income" ? <IconArrowDown size={18} /> : <IconArrowUp size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-extrabold">{e.description}</p>
              <p className="text-[12px] text-muted">
                {date(e.occurred_at)} · {e.category}
                {e.paid_by ? ` · ${e.paid_by}` : ""}
              </p>
            </div>
            <span className="tabular shrink-0 font-medium" style={{ color: e.kind === "income" ? "var(--success)" : "var(--text)" }}>
              {e.kind === "income" ? "+" : "-"}
              {money(e.amount)}
            </span>
            {admin && <AdminDots onClick={() => setSheetFor(e)} />}
          </div>
        ))}
        {data?.entries.length === 0 && <p className="text-small text-muted">Noch keine Buchungen.</p>}
      </div>
      {!data && <Skeleton className="h-32 w-full" />}

      {!admin && (
        <p className="mt-4 text-center text-[12px] text-muted">
          Wer was eingezahlt hat, sieht nur der Kassenwart.
        </p>
      )}

      {admin && <NewEntrySheet open={create} onClose={() => setCreate(false)} onSaved={() => { setCreate(false); load(); }} />}

      <BottomSheet open={!!sheetFor} onClose={() => setSheetFor(null)} title="Buchung">
        {sheetFor && (
          <div className="space-y-1">
            <p className="px-3 py-2 text-small text-muted">
              {sheetFor.description} · {money(sheetFor.amount)}
            </p>
            <SheetAction label="In den Papierkorb" icon={<IconTrash size={18} />} danger onClick={() => del(sheetFor.id)} />
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function MoneyStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "success" | "danger";
}) {
  return (
    <div className="rounded-[14px] border border-white/10 bg-white/10 px-3 py-3">
      <p className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white/55">
        {icon}
        {label}
      </p>
      <p className="tabular font-extrabold" style={{ color: tone === "success" ? "var(--ok-soft)" : "var(--accent-soft)" }}>
        {money(value)}
      </p>
    </div>
  );
}

function FinanceSplit({ income, expense }: { income: number; expense: number }) {
  const total = income + expense;
  const incomePct = total > 0 ? Math.max(4, Math.round((income / total) * 100)) : 50;
  const expensePct = total > 0 ? Math.max(4, 100 - incomePct) : 50;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-[0.08em] text-white/55">
        <span>Rein</span>
        <span>Raus</span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
        <div style={{ width: `${incomePct}%`, background: "var(--ok)" }} />
        <div style={{ width: `${expensePct}%`, background: "var(--accent)" }} />
      </div>
    </div>
  );
}

function NewEntrySheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState("income");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Allgemein");
  const [paidBy, setPaidBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    const cents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
    if (!cents || cents <= 0) return setErr("Betrag fehlt.");
    if (!description.trim()) return setErr("Beschreibung fehlt.");
    setBusy(true);
    setErr("");
    try {
      await api("/api/ledger", {
        method: "POST",
        body: { kind, amount: cents, description: description.trim(), category, paid_by: paidBy },
      });
      setAmount("");
      setDescription("");
      setPaidBy("");
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Neue Buchung">
      <div className="mb-3 grid grid-cols-2 gap-2">
        {[["income", "Einnahme"], ["expense", "Ausgabe"]].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setKind(v)}
            className="min-h-[44px] rounded-xl border text-[15px] font-medium"
            style={{
              borderColor: kind === v ? "var(--signal)" : "var(--border)",
              color: kind === v ? "var(--signal-text)" : "var(--text)",
              background: kind === v ? "color-mix(in srgb, var(--signal) 10%, transparent)" : "transparent",
            }}
          >
            {l}
          </button>
        ))}
      </div>
      <Field label="Betrag (€)">
        <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
      </Field>
      <Field label="Beschreibung">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label="Kategorie">
        <Input value={category} onChange={(e) => setCategory(e.target.value)} />
      </Field>
      <Field label="Eingezahlt von (optional)" hint="Nur für Kassenwart sichtbar.">
        <Input value={paidBy} onChange={(e) => setPaidBy(e.target.value)} placeholder="Name" />
      </Field>
      {err && <p className="mb-2 text-small text-danger">{err}</p>}
      <Button onClick={submit} disabled={busy} full>
        {busy ? "Speichern…" : "Buchen"}
      </Button>
    </BottomSheet>
  );
}
