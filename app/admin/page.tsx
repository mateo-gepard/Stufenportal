"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useApp } from "@/components/AppContext";
import { Card, SkeletonList, Button } from "@/components/ui";

interface TrashItem {
  id: string;
  title: string;
  deleted_at: string;
  type: "event" | "news" | "poll" | "ledger" | "abizeitung";
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

  const load = useCallback(() => {
    if (!admin) return;
    (api("/api/admin/trash") as Promise<{ items: TrashItem[] }>)
      .then((d) => setItems(d.items))
      .catch(() => setItems([]));
  }, [admin]);
  useEffect(load, [load]);

  async function restore(it: TrashItem, purge: boolean) {
    if (purge && !confirm("Endgültig löschen? Das lässt sich nicht rückgängig machen.")) return;
    await api("/api/admin/restore", { method: "POST", body: { type: it.type, id: it.id, purge } });
    load();
  }

  if (ready && !admin)
    return (
      <div className="sp-in pt-10 text-center text-muted">
        <p className="mb-2 text-2xl">🔒</p>
        <p>Nur im Sprecher-Modus.</p>
        <Link href="/more" className="mt-3 inline-block text-signal-text">Zu „Mehr" → freischalten</Link>
      </div>
    );

  return (
    <div className="sp-in pb-6">
      <Link href="/more" className="mb-2 inline-flex items-center gap-1 text-small text-muted">← Mehr</Link>
      <h1 className="mb-4 font-display text-display">Verwaltung</h1>

      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Schnellzugriff</h2>
      <div className="mb-6 grid grid-cols-2 gap-2.5">
        <QuickLink href="/events" label="Events" />
        <QuickLink href="/news" label="News" />
        <QuickLink href="/polls" label="Abstimmungen" />
        <QuickLink href="/abizeitung" label="Abizeitung" />
        <QuickLink href="/kasse" label="Kasse" />
      </div>

      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Papierkorb</h2>
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
      <Card className="text-center"><p className="py-1 font-medium">{label}</p></Card>
    </Link>
  );
}
