import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { newId, nowIso, readJson, trimmed, int } from "@/lib/util";

export const runtime = "nodejs";

// Sprecher vergeben Punkte an ein bekanntes Mitglied (mit Grund, transparent geloggt).
export async function POST(req: Request) {
  const forbidden = requireAdmin();
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const target = trimmed(body.device_id);
  const points = int(body.points);
  const reason = trimmed(body.reason).slice(0, 120);
  if (!target) return NextResponse.json({ error: "Empfänger fehlt." }, { status: 400 });
  if (points == null || points === 0) return NextResponse.json({ error: "Punktzahl fehlt." }, { status: 400 });

  const db = getDb();
  const member = db.prepare("SELECT device_id FROM members WHERE device_id = ?").get(target);
  if (!member) return NextResponse.json({ error: "Mitglied unbekannt." }, { status: 404 });

  db.prepare(
    "INSERT INTO point_events (id, device_id, points, reason, source, created_at) VALUES (?,?,?,?, 'sprecher', ?)"
  ).run(newId(), target, points, reason, nowIso());

  return NextResponse.json({ ok: true }, { status: 201 });
}
