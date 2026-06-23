import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { readJson, oneOf, trimmed } from "@/lib/util";

export const runtime = "nodejs";

const TABLES: Record<string, string> = {
  event: "events",
  news: "news",
  poll: "polls",
  ledger: "ledger",
};

export async function POST(req: Request) {
  const forbidden = requireAdmin();
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const type = oneOf(body.type, ["event", "news", "poll", "ledger"], "event");
  const id = trimmed(body.id);
  const purge = body.purge === true;
  if (!id) return NextResponse.json({ error: "ID fehlt." }, { status: 400 });
  const table = TABLES[type];
  const db = getDb();

  if (purge) {
    // Endgültiges Löschen nur aus dem Papierkorb.
    db.prepare(`DELETE FROM ${table} WHERE id = ? AND deleted_at IS NOT NULL`).run(id);
    return NextResponse.json({ ok: true, purged: true });
  }

  const tx = db.transaction(() => {
    db.prepare(`UPDATE ${table} SET deleted_at = NULL WHERE id = ?`).run(id);
    // Event-Wiederherstellung holt mit-soft-gelöschte Kinder zurück.
    if (type === "event") {
      db.prepare("UPDATE milestones SET deleted_at = NULL WHERE event_id = ?").run(id);
      db.prepare("UPDATE signup_lists SET deleted_at = NULL WHERE event_id = ?").run(id);
    }
  });
  tx();
  return NextResponse.json({ ok: true });
}
