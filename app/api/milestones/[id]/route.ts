import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { nowIso, readJson, trimmed, str } from "@/lib/util";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const forbidden = requireAdmin();
  if (forbidden) return forbidden;
  const db = getDb();
  const m = await db.prepare("SELECT id FROM milestones WHERE id = ? AND deleted_at IS NULL").get(params.id);
  if (!m) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });

  const body = await readJson(req);
  const sets: string[] = [];
  const vals: import("@libsql/client").InValue[] = [];
  if (body.done !== undefined) {
    sets.push("done = ?");
    vals.push(body.done ? 1 : 0);
  }
  if (body.title !== undefined) {
    const t = trimmed(body.title);
    if (!t) return NextResponse.json({ error: "Titel fehlt." }, { status: 400 });
    sets.push("title = ?");
    vals.push(t);
  }
  if (body.assignee !== undefined) {
    sets.push("assignee = ?");
    vals.push(str(body.assignee) || null);
  }
  if (body.due_at !== undefined) {
    sets.push("due_at = ?");
    vals.push(str(body.due_at) || null);
  }
  if (sets.length) {
    vals.push(params.id);
    await db.prepare(`UPDATE milestones SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const forbidden = requireAdmin();
  if (forbidden) return forbidden;
  await getDb()
    .prepare("UPDATE milestones SET deleted_at = ? WHERE id = ?")
    .run(nowIso(), params.id);
  return NextResponse.json({ ok: true });
}
