import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { deviceId } from "@/lib/auth";
import { buildLeaderboard, type RawLeaderboardRow } from "@/lib/leaderboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Nur Mitglieder, die sich selbst sichtbar geschaltet haben (opt-in).
export async function GET(req: Request) {
  const db = getDb();
  const device = deviceId(req);
  const rows = await db
    .prepare(
      `SELECT m.device_id AS device_id, m.name AS name,
              COALESCE((SELECT SUM(points) FROM point_events p WHERE p.device_id = m.device_id AND p.deleted_at IS NULL), 0) AS points
      FROM members m
      WHERE m.show_on_leaderboard = 1
      ORDER BY points DESC, m.name ASC`
    )
    .all<RawLeaderboardRow>();

  return NextResponse.json({ board: buildLeaderboard(rows, device) });
}
