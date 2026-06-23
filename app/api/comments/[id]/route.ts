import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdmin, deviceId } from "@/lib/auth";
import { nowIso } from "@/lib/util";

export const runtime = "nodejs";

// Eigenen Kommentar darf der Verfasser (Gerät) löschen; Admin jeden.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const db = getDb();
  const c = await db
    .prepare("SELECT device_id FROM comments WHERE id = ? AND deleted_at IS NULL")
    .get<{ device_id: string }>(params.id);
  if (!c) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });

  const owner = deviceId(req) === c.device_id;
  if (!owner && !isAdmin()) return NextResponse.json({ error: "Nicht erlaubt." }, { status: 403 });

  await db.prepare("UPDATE comments SET deleted_at = ? WHERE id = ?").run(nowIso(), params.id);
  return NextResponse.json({ ok: true });
}
