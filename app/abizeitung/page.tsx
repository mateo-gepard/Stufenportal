"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getDeviceId } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import type { AbizeitungEntry } from "@/lib/types";
import { Card, SkeletonList, BottomSheet, Button, AdminDots, SheetAction } from "@/components/ui";
import { Field, Input, Textarea } from "@/components/form";
import { IconPlus, IconTrash } from "@/components/icons";

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
      <p className="mb-7 text-[17px] font-medium leading-[1.55] text-muted">
        Zitate, Schnappschüsse und Sprüche für die Abizeitung - sammelt alles an einem Ort.
      </p>

      {!entries && <SkeletonList rows={3} />}
      {entries && entries.length === 0 && (
        <Card className="text-center text-muted">
          <p className="py-6">Noch keine Einreichungen.</p>
        </Card>
      )}

      <div className="columns-2 gap-4 [column-fill:_balance]">
        {entries?.map((entry) => (
          <article
            key={entry.id}
            className={`relative mb-4 break-inside-avoid border border-line bg-surface shadow-[0_8px_18px_rgba(17,51,61,0.08)] ${
              entry.image_url
                ? "rotate-[1.2deg] rounded-[5px] p-2 pb-3"
                : "rotate-[-1.1deg] rounded-[13px] px-4 pb-4 pt-3"
            }`}
          >
            {(entry.mine || admin) && (
              <div className="absolute right-2 top-2 z-10">
                <AdminDots onClick={() => setSheetFor(entry)} />
              </div>
            )}

            {entry.image_url && (
              <div className="relative mb-3">
                <span className="absolute left-1/2 top-[-16px] z-10 h-6 w-[58px] -translate-x-1/2 rotate-[4deg] rounded-sm bg-[color:var(--pop)]/70 shadow-sm" />
                <img
                  src={entry.image_url}
                  alt={entry.caption || entry.image_name || "Abizeitung-Bild"}
                  className="aspect-[4/3] w-full rounded-[3px] object-cover"
                />
              </div>
            )}

            {entry.quote && (
              <blockquote className="relative">
                <span className="mb-3 block font-display text-[34px] font-black leading-none text-[color:var(--accent)]">"</span>
                <p
                  className="whitespace-pre-wrap font-display text-[19px] font-black leading-[1.25]"
                  style={{
                    textDecorationLine: "underline",
                    textDecorationColor: "color-mix(in srgb, var(--pop) 45%, transparent)",
                    textDecorationThickness: "0.48em",
                    textUnderlineOffset: "-0.24em",
                    textDecorationSkipInk: "none",
                  }}
                >
                  {entry.quote}
                </p>
                <p className="mt-4 text-[13px] font-semibold text-muted">- {entry.author_name || "anonym"}</p>
              </blockquote>
            )}

            {entry.caption && <p className="mt-2 whitespace-pre-wrap text-[13px] font-extrabold leading-tight">{entry.caption}</p>}
          </article>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setCreate(true)}
        className="mt-3 flex min-h-[62px] w-full items-center justify-center gap-2 rounded-[15px] border-2 border-dashed px-4 font-display text-[19px] font-black transition active:scale-[0.98]"
        style={{ borderColor: "var(--ink)", color: "var(--ink)" }}
      >
        <IconPlus size={20} strokeWidth={2.4} />
        Beitrag einreichen
      </button>

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
