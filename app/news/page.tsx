"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import type { NewsItem, Priority, NewsStatus } from "@/lib/types";
import {
  Card,
  PriorityPill,
  Pill,
  SkeletonList,
  BottomSheet,
  Button,
  AdminDots,
  SheetAction,
} from "@/components/ui";
import { Field, Input, Textarea, Select } from "@/components/form";
import { IconBookmark, IconPencil, IconRadioOff, IconRadioOn, IconTrash } from "@/components/icons";
import { dateTime } from "@/lib/format";

export default function NewsPage() {
  const { admin } = useApp();
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [create, setCreate] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [sheetFor, setSheetFor] = useState<NewsItem | null>(null);

  const load = useCallback(() => {
    (api("/api/news") as Promise<{ news: NewsItem[] }>)
      .then((d) => setNews(d.news))
      .catch(() => setNews([]));
  }, []);
  useEffect(load, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    await api(`/api/news/${id}`, { method: "PATCH", body });
    setSheetFor(null);
    load();
  }
  async function del(id: string) {
    await api(`/api/news/${id}`, { method: "DELETE" });
    setSheetFor(null);
    load();
  }

  return (
    <div className="sp-in pb-6">
      <header className="mb-3 flex items-center justify-between">
        <h1 className="font-display text-display">News</h1>
        {admin && <Button onClick={() => setCreate(true)}>+ Neu</Button>}
      </header>

      {!news && <SkeletonList rows={3} />}
      {news && news.length === 0 && (
        <Card className="text-center text-muted"><p className="py-6">Noch keine News.</p></Card>
      )}

      <div className="flex flex-col gap-2.5">
        {news?.map((n) => (
          <Card key={n.id}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{n.category}</span>
              <div className="flex items-center gap-1.5">
                {n.featured && <Pill label="Auf Heute" color="var(--signal-text)" />}
                {admin && n.status !== "published" && <Pill label={statusLabel[n.status]} color="var(--text-muted)" />}
                <PriorityPill priority={n.priority} />
                {admin && <AdminDots onClick={() => setSheetFor(n)} />}
              </div>
            </div>
            <h2 className="font-display text-h2 leading-tight">{n.title}</h2>
            {n.body && <p className="mt-1.5 whitespace-pre-wrap text-small text-muted">{n.body}</p>}
            <p className="mt-2 text-[11px] text-muted">{dateTime(n.published_at || n.created_at)}</p>
          </Card>
        ))}
      </div>

      {admin && (
        <NewsEditor
          open={create || !!editing}
          item={editing}
          onClose={() => {
            setCreate(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreate(false);
            setEditing(null);
            load();
          }}
        />
      )}

      {/* Inline-Admin-Sheet */}
      <BottomSheet open={!!sheetFor} onClose={() => setSheetFor(null)} title="Verwalten">
        {sheetFor && (
          <div className="space-y-1">
            <SheetAction label="Bearbeiten" icon={<IconPencil size={18} />} onClick={() => { setEditing(sheetFor); setSheetFor(null); }} />
            <SheetAction
              label={sheetFor.featured ? "Von Heute entfernen" : "Auf Heute befördern"}
              icon={<IconBookmark size={18} />}
              onClick={() => patch(sheetFor.id, { featured: !sheetFor.featured })}
            />
            <p className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-wide text-muted">Priorität</p>
            {(["normal", "wichtig", "dringend"] as Priority[]).map((p) => (
              <SheetAction
                key={p}
                label={prioLabel[p]}
                icon={sheetFor.priority === p ? <IconRadioOn size={18} /> : <IconRadioOff size={18} />}
                onClick={() => patch(sheetFor.id, { priority: p })}
              />
            ))}
            <p className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-wide text-muted">Sichtbarkeit</p>
            {(["published", "hidden", "draft", "archived"] as NewsStatus[]).map((s) => (
              <SheetAction
                key={s}
                label={statusLabel[s]}
                icon={sheetFor.status === s ? <IconRadioOn size={18} /> : <IconRadioOff size={18} />}
                onClick={() => patch(sheetFor.id, { status: s })}
              />
            ))}
            <div className="my-1 h-px bg-line" />
            <SheetAction label="In den Papierkorb" icon={<IconTrash size={18} />} danger onClick={() => del(sheetFor.id)} />
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

const prioLabel: Record<Priority, string> = { normal: "Normal", wichtig: "Wichtig", dringend: "Dringend" };
const statusLabel: Record<NewsStatus, string> = {
  draft: "Entwurf",
  published: "Veröffentlicht",
  hidden: "Versteckt",
  archived: "Archiviert",
};

function NewsEditor({
  open,
  item,
  onClose,
  onSaved,
}: {
  open: boolean;
  item: NewsItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("Allgemein");
  const [priority, setPriority] = useState<Priority>("normal");
  const [status, setStatus] = useState<NewsStatus>("published");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(item?.title || "");
      setBody(item?.body || "");
      setCategory(item?.category || "Allgemein");
      setPriority(item?.priority || "normal");
      setStatus(item?.status || "published");
      setErr("");
    }
  }, [open, item]);

  async function submit() {
    if (!title.trim()) return setErr("Titel fehlt.");
    setBusy(true);
    try {
      const payload = { title: title.trim(), body, category, priority, status };
      if (item) await api(`/api/news/${item.id}`, { method: "PATCH", body: payload });
      else await api("/api/news", { method: "POST", body: payload });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={item ? "News bearbeiten" : "Neue News"}>
      <Field label="Titel">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Text">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="Kategorie">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Priorität" hint="Wichtig/dringend löst Push aus.">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="normal">Normal</option>
              <option value="wichtig">Wichtig</option>
              <option value="dringend">Dringend</option>
            </Select>
          </Field>
        </div>
      </div>
      <Field label="Sichtbarkeit">
        <Select value={status} onChange={(e) => setStatus(e.target.value as NewsStatus)}>
          <option value="published">Veröffentlicht</option>
          <option value="draft">Entwurf</option>
          <option value="hidden">Versteckt</option>
          <option value="archived">Archiviert</option>
        </Select>
      </Field>
      {err && <p className="mb-2 text-small text-danger">{err}</p>}
      <Button onClick={submit} disabled={busy} full>
        {busy ? "Speichern…" : item ? "Speichern" : "Veröffentlichen"}
      </Button>
    </BottomSheet>
  );
}
