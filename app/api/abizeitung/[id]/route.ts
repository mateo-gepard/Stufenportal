import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { currentUser, deviceId, isAdmin } from "@/lib/auth";
import { nowIso } from "@/lib/util";

export const runtime = "nodejs";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const row = await getDb()
    .prepare("SELECT device_id, user_id FROM abizeitung_entries WHERE id = ? AND deleted_at IS NULL")
    .get<{ device_id: string; user_id: string | null }>(params.id);
  if (!row) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });

  const user = await currentUser();
  const owner = (!!user && row.user_id === user.id) || deviceId(req) === row.device_id;
  if (!owner && !(await isAdmin())) return NextResponse.json({ error: "Nicht erlaubt." }, { status: 403 });

  await getDb().prepare("UPDATE abizeitung_entries SET deleted_at = ? WHERE id = ?").run(nowIso(), params.id);
  return NextResponse.json({ ok: true });
}
