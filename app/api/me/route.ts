import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { deviceId } from "@/lib/auth";
import { nowIso, readJson, trimmed } from "@/lib/util";
import { upsertMember, pointsFor } from "@/lib/members";
import type { Me } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const device = deviceId(req);
  const empty: Me = { name: "", show_on_leaderboard: false, points: 0, history: [] };
  if (!device) return NextResponse.json(empty);

  const db = getDb();
  const m = await db
    .prepare("SELECT name, show_on_leaderboard FROM members WHERE device_id = ?")
    .get<{ name: string; show_on_leaderboard: number }>(device);
  const history = await db
    .prepare(
      "SELECT id, points, reason, created_at FROM point_events WHERE device_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 20"
    )
    .all<Me["history"][number]>(device);

  return NextResponse.json({
    name: m?.name ?? "",
    show_on_leaderboard: !!m?.show_on_leaderboard,
    points: await pointsFor(device),
    history,
  } satisfies Me);
}

export async function POST(req: Request) {
  const device = deviceId(req);
  if (!device) return NextResponse.json({ error: "Keine Geräte-ID." }, { status: 400 });

  const body = await readJson(req);
  const name = trimmed(body.name).slice(0, 40);
  const show = body.show_on_leaderboard ? 1 : 0;
  if (!name) return NextResponse.json({ error: "Name fehlt." }, { status: 400 });

  const db = getDb();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO members (device_id, name, show_on_leaderboard, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(device_id) DO UPDATE SET name = excluded.name, show_on_leaderboard = excluded.show_on_leaderboard, updated_at = excluded.updated_at`
    )
    .run(device, name, show, now, now);

  return NextResponse.json({ ok: true });
}
