import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { newId, readJson, trimmed, str } from "@/lib/util";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const db = getDb();
  const e = await db.prepare("SELECT id FROM events WHERE id = ? AND deleted_at IS NULL").get(params.id);
  if (!e) return NextResponse.json({ error: "Event nicht gefunden." }, { status: 404 });

  const body = await readJson(req);
  const title = trimmed(body.title);
  if (!title) return NextResponse.json({ error: "Titel fehlt." }, { status: 400 });

  const maxRow = await db
    .prepare("SELECT MAX(ord) AS m FROM milestones WHERE event_id = ?")
    .get<{ m: number | null }>(params.id);
  const ord = (maxRow?.m ?? -1) + 1;
  const id = newId();
  await db
    .prepare("INSERT INTO milestones (id,event_id,title,done,assignee,due_at,ord) VALUES (?,?,?,0,?,?,?)")
    .run(id, params.id, title, str(body.assignee) || null, str(body.due_at) || null, ord);
  return NextResponse.json({ id }, { status: 201 });
}
