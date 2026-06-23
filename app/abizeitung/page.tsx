"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, getDeviceId } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import type { AbizeitungEntry } from "@/lib/types";
import { Card, SkeletonList, BottomSheet, Button, AdminDots, SheetAction } from "@/components/ui";
import { Field, Input, Textarea } from "@/components/form";
import { IconChevronLeft, IconPlus, IconTrash } from "@/components/icons";
import { dateTime } from "@/lib/format";

export default function AbizeitungPage() {
  const { admin } = useApp();
  const [entries, setEntries] = useState<AbizeitungEntry[] | null>(null);
  const [create, setCreate] = useState(false);
  const [sheetFor, setSheetFor] = useState<AbizeitungEntry | null>(null);

  const load = useCallback(() => {
    (api("/api/abizeitung") as Promise<{ entries: AbizeitungEntry[] }>)
      .then((d) => setEntries(d.entries))
      .catch(() => setEntries([]));
  }, []);
  useEffect(load, [load]);

  async function del(entry: AbizeitungEntry) {
    await api(`/api/abizeitung/${entry.id}`, { method: "DELETE" });
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
        <h1 className="font-display text-display">Abizeitung</h1>
        <Button onClick={() => setCreate(true)}>
          <IconPlus size={17} />
          Beitrag
        </Button>
      </header>

      <p className="mb-4 text-small text-muted">
        Sammle Zitate, Schnappschüsse und kleine Erinnerungen für die Abizeitung.
      </p>

      {!entries && <SkeletonList rows={3} />}
      {entries && entries.length === 0 && (
        <Card className="text-center text-muted">
          <p className="py-6">Noch keine Einreichungen.</p>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {entries?.map((entry) => (
          <Card key={entry.id}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{entry.author_name}</p>
                <p className="text-[11px] text-muted">{dateTime(entry.created_at)}</p>
              </div>
              {(entry.mine || admin) && <AdminDots onClick={() => setSheetFor(entry)} />}
            </div>

            {entry.image_url && (
              <img
                src={entry.image_url}
                alt={entry.caption || entry.image_name || "Abizeitung-Bild"}
                className="mb-3 aspect-[4/3] w-full rounded-lg border border-line object-cover"
              />
            )}

            {entry.quote && (
              <blockquote className="rounded-lg bg-[color:var(--surface-2)] px-3.5 py-3">
                <p className="whitespace-pre-wrap font-display text-h2 leading-snug">„{entry.quote}“</p>
                {entry.quoted_name && <p className="mt-2 text-small text-muted">- {entry.quoted_name}</p>}
              </blockquote>
            )}

            {entry.caption && <p className="mt-2 whitespace-pre-wrap text-small text-muted">{entry.caption}</p>}
          </Card>
        ))}
      </div>

      <SubmitSheet
        open={create}
        onClose={() => setCreate(false)}
        onSaved={() => {
          setCreate(false);
          load();
        }}
      />

      <BottomSheet open={!!sheetFor} onClose={() => setSheetFor(null)} title="Einreichung">
        {sheetFor && (
          <div className="space-y-1">
            <p className="px-3 py-2 text-small text-muted">
              {sheetFor.quote ? "Zitat" : "Bild"} von {sheetFor.author_name}
            </p>
            <SheetAction label="In den Papierkorb" icon={<IconTrash size={18} />} danger onClick={() => del(sheetFor)} />
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function SubmitSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [authorName, setAuthorName] = useState("");
  const [quote, setQuote] = useState("");
  const [quotedName, setQuotedName] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setAuthorName(localStorage.getItem("sp_name") || "");
    setErr("");
  }, [open]);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function submit() {
    if (!quote.trim() && !file) return setErr("Bitte Zitat oder Bild hinzufügen.");
    if (file && file.size > 5 * 1024 * 1024) return setErr("Bild ist zu groß (max. 5 MB).");

    setBusy(true);
    setErr("");
    try {
      const form = new FormData();
      form.append("author_name", authorName.trim());
      form.append("quote", quote.trim());
      form.append("quoted_name", quotedName.trim());
      form.append("caption", caption.trim());
      if (file) form.append("image", file);

      const res = await fetch("/api/abizeitung", {
        method: "POST",
        headers: { "x-device-id": getDeviceId() },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || `Fehler ${res.status}`);

      if (authorName.trim()) localStorage.setItem("sp_name", authorName.trim());
      setQuote("");
      setQuotedName("");
      setCaption("");
      setFile(null);
      setFileKey((k) => k + 1);
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Für die Abizeitung">
      <Field label="Dein Name (optional)">
        <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Anonym" maxLength={40} />
      </Field>
      <Field label="Zitat" hint="Optional, wenn du nur ein Bild hochlädst.">
        <Textarea value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="Was soll in die Abizeitung?" maxLength={600} />
      </Field>
      <Field label="Gesagt von (optional)">
        <Input value={quotedName} onChange={(e) => setQuotedName(e.target.value)} placeholder="Name oder Kurs" maxLength={80} />
      </Field>
      <Field label="Bild" hint="JPG, PNG, WebP oder GIF bis 5 MB.">
        <input
          key={fileKey}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full rounded-xl border border-line bg-[color:var(--bg)] px-3.5 py-3 text-[15px] text-text"
        />
      </Field>
      {preview && (
        <img src={preview} alt="Vorschau" className="mb-3 aspect-[4/3] w-full rounded-lg border border-line object-cover" />
      )}
      <Field label="Bildunterschrift (optional)">
        <Input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={160} />
      </Field>
      {err && <p className="mb-2 text-small text-danger">{err}</p>}
      <Button onClick={submit} disabled={busy} full>
        {busy ? "Hochladen…" : "Einreichen"}
      </Button>
    </BottomSheet>
  );
}
