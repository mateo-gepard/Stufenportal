"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import type { LedgerEntry } from "@/lib/types";
import { Card, Skeleton, BottomSheet, Button, AdminDots, SheetAction } from "@/components/ui";
import { Field, Input, Select } from "@/components/form";
import { IconArrowDown, IconArrowUp, IconChevronLeft, IconPlus, IconTrash } from "@/components/icons";
import { money, date } from "@/lib/format";

interface LedgerData {
  entries: LedgerEntry[];
  balance: number;
  income: number;
  expense: number;
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
      <Link href="/more" className="mb-2 inline-flex items-center gap-1 text-small text-muted">
        <IconChevronLeft size={15} />
        Mehr
      </Link>
      <header className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-display">Kasse</h1>
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
        <Card className="mb-5 text-center">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Kassenstand</p>
          <p className="tabular font-display text-[40px] leading-none" style={{ color: data.balance >= 0 ? "var(--text)" : "var(--danger)" }}>
            {money(data.balance)}
          </p>
          <div className="mt-3 flex justify-center gap-6 text-small text-muted">
            <span className="tabular inline-flex items-center gap-1.5">
              <IconArrowDown size={14} />
              {money(data.income)}
            </span>
            <span className="tabular inline-flex items-center gap-1.5">
              <IconArrowUp size={14} />
              {money(data.expense)}
            </span>
          </div>
        </Card>
      )}

      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Kassenbuch</h2>
      <div className="flex flex-col gap-2">
        {data?.entries.map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3.5 py-2.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px]"
              style={{
                color: e.kind === "income" ? "var(--success)" : "var(--danger)",
                background: e.kind === "income" ? "color-mix(in srgb, var(--success) 12%, transparent)" : "color-mix(in srgb, var(--danger) 12%, transparent)",
              }}
            >
              {e.kind === "income" ? <IconArrowDown size={18} /> : <IconArrowUp size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{e.description}</p>
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
