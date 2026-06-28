import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getDb, batch } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteImage } from "@/lib/storage";
import { readJson, oneOf, trimmed } from "@/lib/util";

export const runtime = "nodejs";

// Nur noch fuer Legacy-Datei-Uploads relevant; neue Bilder liegen als Blob in der DB.
const LEGACY_UPLOAD_DIR = path.join(process.cwd(), "data", "uploads", "abizeitung");

const TABLES: Record<string, string> = {
  event: "events",
  news: "news",
  poll: "polls",
  ledger: "ledger",
  abizeitung: "abizeitung_entries",
};

export async function POST(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const type = oneOf(body.type, ["event", "news", "poll", "ledger", "abizeitung"], "event");
  const id = trimmed(body.id);
  const purge = body.purge === true;
  if (!id) return NextResponse.json({ error: "ID fehlt." }, { status: 400 });
  const table = TABLES[type];
  const db = getDb();

  if (purge) {
    // Endgültiges Löschen nur aus dem Papierkorb.
    if (type === "abizeitung") {
      const row = await db
        .prepare("SELECT image_path FROM abizeitung_entries WHERE id = ? AND deleted_at IS NOT NULL")
        .get<{ image_path: string | null }>(id);
      if (row?.image_path) {
        await deleteImage(row.image_path);
        // Legacy-Datei (falls vorhanden) ebenfalls best-effort entfernen.
        await fs.unlink(path.join(LEGACY_UPLOAD_DIR, path.basename(row.image_path))).catch(() => {});
      }
    }
    await db.prepare(`DELETE FROM ${table} WHERE id = ? AND deleted_at IS NOT NULL`).run(id);
    return NextResponse.json({ ok: true, purged: true });
  }

  const stmts: { sql: string; args: import("@libsql/client").InValue[] }[] = [
    { sql: `UPDATE ${table} SET deleted_at = NULL WHERE id = ?`, args: [id] },
  ];
  // Event-Wiederherstellung holt mit-soft-gelöschte Kinder zurück.
  if (type === "event") {
    stmts.push({ sql: "UPDATE milestones SET deleted_at = NULL WHERE event_id = ?", args: [id] });
    stmts.push({ sql: "UPDATE signup_lists SET deleted_at = NULL WHERE event_id = ?", args: [id] });
  }
  await batch(stmts);
  return NextResponse.json({ ok: true });
}
