"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import type { NewsItem, Priority, NewsStatus } from "@/lib/types";
import {
  Card,
  SkeletonList,
  BottomSheet,
  Button,
  AdminDots,
  SheetAction,
} from "@/components/ui";
import { Field, Input, Textarea, Select } from "@/components/form";
import { IconBookmark, IconMegaphone, IconPencil, IconPlus, IconRadioOff, IconRadioOn, IconTrash } from "@/components/icons";
import { appDayDiff, formatAppDate } from "@/lib/time";

const newsFilters = ["Alle", "Wichtig", "Orga", "Sozial"] as const;
type NewsFilter = (typeof newsFilters)[number];

export default function NewsPage() {
  const { admin } = useApp();
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [create, setCreate] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [sheetFor, setSheetFor] = useState<NewsItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<NewsFilter>("Alle");

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

  const filteredNews = news?.filter((n) => matchesFilter(n, categoryFilter)) ?? null;

  return (
    <div className="sp-in pb-6">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="sp-section-kicker">Stufenportal</p>
          <h1 className="sp-page-title">News</h1>
        </div>
        {admin && (
          <Button onClick={() => setCreate(true)}>
            <IconPlus size={17} />
            Neu
          </Button>
        )}
      </header>

      {!news && <SkeletonList rows={3} />}
      {news && news.length === 0 && (
        <Card className="text-center text-muted"><p className="py-6">Noch keine News.</p></Card>
      )}

      {news && news.length > 0 && (
        <div className="-mx-4 mb-[20px] overflow-x-auto px-4 [scrollbar-width:none]">
          <div className="flex min-w-max gap-[10px]">
            {newsFilters.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className="min-h-[48px] rounded-[14px] border px-5 text-[15px] font-extrabold transition active:scale-[0.98]"
                style={{
                  borderColor: categoryFilter === cat ? "var(--ink)" : "var(--line)",
                  background: categoryFilter === cat ? "var(--ink)" : "var(--surface)",
                  color: categoryFilter === cat ? "white" : "var(--muted)",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-[18px]">
        {filteredNews?.map((n) => (
          n.featured ? (
            <FeaturedNewsCard key={n.id} item={n} admin={admin} onAdmin={() => setSheetFor(n)} />
          ) : (
            <NewsListCard key={n.id} item={n} admin={admin} onAdmin={() => setSheetFor(n)} />
          )
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

function FeaturedNewsCard({
  item,
  admin,
  onAdmin,
}: {
  item: NewsItem;
  admin: boolean;
  onAdmin: () => void;
}) {
  return (
    <article className="relative overflow-hidden rounded-[20px] bg-[color:var(--dark)] p-[22px] text-white shadow-[0_1px_0_rgba(17,51,61,0.04)]">
      <div className="sp-half absolute bottom-0 right-0 top-0 w-[35%] text-white/16" aria-hidden />
      <div className="relative">
        <div className="mb-[18px] flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <NewsBadge label={categoryLabel(item)} tone="light" />
            {item.priority === "dringend" && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.05em] text-[color:var(--accent)]">
                <IconMegaphone size={12} strokeWidth={2.3} />
                Dringend
              </span>
            )}
            {admin && item.status !== "published" && <NewsBadge label={statusLabel[item.status]} tone="muted" />}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-small font-medium text-white/70">{newsDateLabel(item.published_at || item.created_at)}</span>
            {admin && <AdminDots onClick={onAdmin} />}
          </div>
        </div>
        <h2 className="font-display text-[26px] font-black leading-[1.02]">{item.title}</h2>
        {item.body && <p className="mt-3 whitespace-pre-wrap text-[17px] font-semibold leading-[1.45] text-white/78">{item.body}</p>}
      </div>
    </article>
  );
}

function NewsListCard({
  item,
  admin,
  onAdmin,
}: {
  item: NewsItem;
  admin: boolean;
  onAdmin: () => void;
}) {
  const tone = categoryTone(item);
  return (
    <article className="relative overflow-hidden rounded-[20px] border border-line bg-surface p-[22px] pl-[28px] shadow-[0_1px_0_rgba(17,51,61,0.03)]">
      <span className="absolute bottom-0 left-0 top-0 w-[6px]" style={{ background: tone.color }} aria-hidden />
      <div className="mb-[16px] flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <NewsBadge label={categoryLabel(item)} tone={tone.name} />
          {item.priority === "dringend" && <NewsBadge label="Dringend" tone="danger" />}
          {admin && item.status !== "published" && <NewsBadge label={statusLabel[item.status]} tone="muted" />}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-small font-semibold text-muted">{newsDateLabel(item.published_at || item.created_at)}</span>
          {admin && <AdminDots onClick={onAdmin} />}
        </div>
      </div>
      <h2 className="font-display text-[25px] font-black leading-[1.05] text-text">{item.title}</h2>
      {item.body && <p className="mt-3 whitespace-pre-wrap text-[17px] font-medium leading-[1.45] text-muted">{item.body}</p>}
    </article>
  );
}

function NewsBadge({
  label,
  tone,
}: {
  label: string;
  tone: "blue" | "green" | "danger" | "light" | "muted";
}) {
  const styles = {
    blue: { background: "var(--info-soft)", color: "var(--info)" },
    green: { background: "var(--ok-soft)", color: "var(--success)" },
    danger: { background: "var(--accent-soft)", color: "var(--danger)" },
    light: { background: "rgba(255,255,255,.16)", color: "white" },
    muted: { background: "var(--surface-2)", color: "var(--muted)" },
  }[tone];
  return (
    <span
      className="inline-flex items-center rounded-[7px] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.04em]"
      style={styles}
    >
      {label}
    </span>
  );
}

function matchesFilter(item: NewsItem, filter: NewsFilter): boolean {
  if (filter === "Alle") return true;
  const category = normalizeNewsText(item.category);
  if (filter === "Wichtig") return item.priority !== "normal" || category.includes("wichtig");
  if (filter === "Orga") return category.includes("orga") || category.includes("organ");
  return category.includes("sozial") || category.includes("social");
}

function categoryLabel(item: NewsItem): string {
  const category = normalizeNewsText(item.category);
  if (item.priority !== "normal" || category.includes("wichtig")) return "Wichtig";
  if (category.includes("sozial") || category.includes("social")) return "Sozial";
  if (category.includes("orga") || category.includes("organ")) return "Orga";
  return item.category || "Info";
}

function categoryTone(item: NewsItem): { name: "blue" | "green" | "danger" | "muted"; color: string } {
  const label = normalizeNewsText(categoryLabel(item));
  if (item.priority === "dringend") return { name: "danger", color: "var(--accent)" };
  if (label.includes("sozial")) return { name: "green", color: "var(--success)" };
  if (label.includes("wichtig") || label.includes("orga")) return { name: "blue", color: "var(--info)" };
  return { name: "muted", color: "var(--line)" };
}

function normalizeNewsText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function newsDateLabel(iso: string): string {
  const diff = -appDayDiff(iso);
  if (diff === 0) return "Heute";
  if (diff === 1) return "Gestern";
  if (diff > 1 && diff < 7) return `${diff} Tage`;
  return formatAppDate(iso, { day: "2-digit", month: "short" });
}

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
