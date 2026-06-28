import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { nowIso, readJson, trimmed } from "@/lib/util";
import { awardMilestonePoints, clampPoints, resolveAssignees } from "@/lib/milestones";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const db = getDb();
  const before = await db
    .prepare("SELECT id FROM milestones WHERE id = ? AND deleted_at IS NULL")
    .get(params.id);
  if (!before) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });

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
  // assignee_ids ist die verlaessliche Zuordnung; der Anzeigename wird daraus abgeleitet.
  if (body.assignee_ids !== undefined) {
    const { ids, names } = await resolveAssignees(body.assignee_ids);
    sets.push("assignee_ids = ?");
    vals.push(ids.length ? ids.join(",") : null);
    sets.push("assignee = ?");
    vals.push(names || null);
  }
  if (body.points !== undefined) {
    sets.push("points = ?");
    vals.push(clampPoints(body.points));
  }
  if (body.due_at !== undefined) {
    sets.push("due_at = ?");
    vals.push(trimmed(body.due_at) || null);
  }
  if (sets.length) {
    vals.push(params.id);
    await db.prepare(`UPDATE milestones SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  }

  // Nach dem Update: erledigte Aufgabe mit Punkten -> einmalig an Zugeordnete vergeben.
  const after = await db
    .prepare("SELECT id, title, done, points, assignee_ids, points_awarded_at FROM milestones WHERE id = ?")
    .get<{
      id: string;
      title: string;
      done: number;
      points: number | null;
      assignee_ids: string | null;
      points_awarded_at: string | null;
    }>(params.id);

  let pointsAwarded = false;
  if (after && after.done) {
    pointsAwarded = await awardMilestonePoints(after);
  }
  return NextResponse.json({ ok: true, points_awarded: pointsAwarded });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  await getDb()
    .prepare("UPDATE milestones SET deleted_at = ? WHERE id = ?")
    .run(nowIso(), params.id);
  return NextResponse.json({ ok: true });
}
