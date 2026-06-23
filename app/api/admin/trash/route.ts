import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Papierkorb: soft-gelöschte Objekte über alle Typen.
export async function GET() {
  const forbidden = requireAdmin();
  if (forbidden) return forbidden;
  const db = getDb();

  const events = await db
    .prepare("SELECT id, title, deleted_at FROM events WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
    .all<any>();
  const news = await db
    .prepare("SELECT id, title, deleted_at FROM news WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
    .all<any>();
  const polls = await db
    .prepare("SELECT id, question AS title, deleted_at FROM polls WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
    .all<any>();
  const ledger = await db
    .prepare("SELECT id, description AS title, deleted_at FROM ledger WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
    .all<any>();
  const abizeitung = await db
    .prepare(
      `SELECT id, COALESCE(quote, caption, image_name, 'Abizeitung') AS title, deleted_at
       FROM abizeitung_entries
       WHERE deleted_at IS NOT NULL
       ORDER BY deleted_at DESC`
    )
    .all<any>();

  return NextResponse.json({
    items: [
      ...events.map((r) => ({ ...r, type: "event" })),
      ...news.map((r) => ({ ...r, type: "news" })),
      ...polls.map((r) => ({ ...r, type: "poll" })),
      ...ledger.map((r) => ({ ...r, type: "ledger" })),
      ...abizeitung.map((r) => ({ ...r, type: "abizeitung" })),
    ].sort((a, b) => (a.deleted_at < b.deleted_at ? 1 : -1)),
  });
}
