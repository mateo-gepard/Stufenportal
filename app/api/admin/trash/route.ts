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

  const events = db
    .prepare("SELECT id, title, deleted_at FROM events WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
    .all();
  const news = db
    .prepare("SELECT id, title, deleted_at FROM news WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
    .all();
  const polls = db
    .prepare("SELECT id, question AS title, deleted_at FROM polls WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
    .all();
  const ledger = db
    .prepare("SELECT id, description AS title, deleted_at FROM ledger WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
    .all();

  return NextResponse.json({
    items: [
      ...(events as any[]).map((r) => ({ ...r, type: "event" })),
      ...(news as any[]).map((r) => ({ ...r, type: "news" })),
      ...(polls as any[]).map((r) => ({ ...r, type: "poll" })),
      ...(ledger as any[]).map((r) => ({ ...r, type: "ledger" })),
    ].sort((a, b) => (a.deleted_at < b.deleted_at ? 1 : -1)),
  });
}
