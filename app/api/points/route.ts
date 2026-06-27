import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { newId, nowIso, readJson, trimmed, int } from "@/lib/util";

export const runtime = "nodejs";

// Sprecher vergeben Punkte an ein bekanntes Mitglied (mit Grund, transparent geloggt).
export async function POST(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const targets = Array.isArray(body.user_ids)
    ? body.user_ids.filter((id): id is string => typeof id === "string").map((id) => id.trim()).filter(Boolean)
    : [trimmed(body.user_id || body.device_id)].filter(Boolean);
  const points = int(body.points);
  const reason = trimmed(body.reason).slice(0, 120);
  if (targets.length === 0) return NextResponse.json({ error: "Empfänger fehlt." }, { status: 400 });
  if (points == null || points === 0) return NextResponse.json({ error: "Punktzahl fehlt." }, { status: 400 });

  const db = getDb();
  const uniqueTargets = Array.from(new Set(targets));
  const users: { id: string }[] = [];
  for (const target of uniqueTargets) {
    const user = await db.prepare("SELECT id FROM users WHERE id = ?").get<{ id: string }>(target);
    if (!user) return NextResponse.json({ error: "Account unbekannt." }, { status: 404 });
    users.push(user);
  }

  const createdAt = nowIso();
  for (const user of users) {
    await db
      .prepare("INSERT INTO point_events (id, device_id, user_id, points, reason, source, created_at) VALUES (?,?,?,?,?, 'sprecher', ?)")
      .run(newId(), `user:${user.id}`, user.id, points, reason, createdAt);
  }

  return NextResponse.json({ ok: true, count: users.length }, { status: 201 });
}
