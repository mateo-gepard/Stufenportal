"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import { Card, SkeletonList, Button } from "@/components/ui";
import { IconChevronRight, IconLock } from "@/components/icons";
import { dateTime } from "@/lib/format";

interface TrashItem {
  id: string;
  title: string;
  deleted_at: string;
  type: "event" | "news" | "poll" | "ledger" | "abizeitung";
}

interface VoteIssue {
  id: string;
  poll_id: string;
  question: string;
  voter_name: string;
  created_at: string;
}

const typeLabel: Record<TrashItem["type"], string> = {
  event: "Event",
  news: "News",
  poll: "Abstimmung",
  ledger: "Buchung",
  abizeitung: "Abizeitung",
};

export default function AdminPage() {
  const { admin, ready } = useApp();
  const [items, setItems] = useState<TrashItem[] | null>(null);
  const [issues, setIssues] = useState<VoteIssue[] | null>(null);

  const load = useCallback(() => {
    if (!admin) return;
    (api("/api/admin/trash") as Promise<{ items: TrashItem[] }>)
      .then((d) => setItems(d.items))
      .catch(() => setItems([]));
    (api("/api/admin/vote-issues") as Promise<{ issues: VoteIssue[] }>)
      .then((d) => setIssues(d.issues))
      .catch(() => setIssues([]));
  }, [admin]);
  useEffect(load, [load]);

  async function restore(it: TrashItem, purge: boolean) {
    if (purge && !confirm("Endgültig löschen? Das lässt sich nicht rückgängig machen.")) return;
    await api("/api/admin/restore", { method: "POST", body: { type: it.type, id: it.id, purge } });
    load();
  }

  async function resolveIssue(id: string) {
    await api("/api/admin/vote-issues", { method: "PATCH", body: { id } });
    load();
  }

  if (ready && !admin)
    return (
      <div className="sp-in pt-10 text-center text-muted">
        <IconLock size={26} className="mx-auto mb-2" />
        <p>Nur im Sprecher-Modus.</p>
        <Link href="/more" className="mt-3 inline-flex items-center justify-center gap-1 text-signal-text">
          Zu „Mehr" freischalten
          <IconChevronRight size={15} />
        </Link>
      </div>
    );

  return (
    <div className="sp-in pb-6">
      <div className="mb-4">
        <p className="sp-section-kicker">Sprecher-Modus</p>
        <h1 className="sp-page-title">Verwaltung</h1>
      </div>

      <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Schnellzugriff</h2>
      <div className="mb-6 grid grid-cols-2 gap-2.5">
        <QuickLink href="/events" label="Events" />
        <QuickLink href="/news" label="News" />
        <QuickLink href="/polls" label="Abstimmungen" />
        <QuickLink href="/abizeitung" label="Abizeitung" />
        <QuickLink href="/kasse" label="Kasse" />
      </div>

      <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Abstimmungsprobleme</h2>
      {!issues && <SkeletonList rows={1} />}
      {issues && issues.length === 0 && (
        <Card className="mb-6 text-center text-muted">
          <p className="py-4">Keine offenen Meldungen.</p>
        </Card>
      )}
      {issues && issues.length > 0 && (
        <div className="mb-6 flex flex-col gap-2">
          {issues.map((issue) => (
            <Card key={issue.id}>
              <div className="mb-2">
                <p className="font-medium">{issue.voter_name}</p>
                <p className="text-[12px] text-muted">
                  {issue.question} · {dateTime(issue.created_at)}
                </p>
              </div>
              <Button onClick={() => resolveIssue(issue.id)} variant="surface" full>
                Als erledigt markieren
              </Button>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Papierkorb</h2>
      {!items && <SkeletonList rows={2} />}
      {items && items.length === 0 && (
        <Card className="text-center text-muted"><p className="py-6">Papierkorb ist leer.</p></Card>
      )}
      <div className="flex flex-col gap-2">
        {items?.map((it) => (
          <Card key={it.type + it.id}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{it.title || "(ohne Titel)"}</p>
                <p className="text-[12px] text-muted">{typeLabel[it.type]}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => restore(it, false)} variant="surface" full>
                Wiederherstellen
              </Button>
              <Button onClick={() => restore(it, true)} variant="surface">
                <span style={{ color: "var(--danger)" }}>Endgültig</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href}>
      <Card className="sp-half min-h-[70px] overflow-hidden text-center"><p className="relative z-[1] py-1 font-extrabold">{label}</p></Card>
    </Link>
  );
}
