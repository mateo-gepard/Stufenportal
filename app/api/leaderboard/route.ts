import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { currentUser, deviceId } from "@/lib/auth";
import { buildLeaderboard, type RawLeaderboardRow } from "@/lib/leaderboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Nur Accounts, die aktuell sichtbar sind. Sichtbarkeit ist standardmäßig an und kann ausgeschaltet werden.
export async function GET(req: Request) {
  const db = getDb();
  const user = await currentUser();
  const device = deviceId(req);
  const rows = await db
    .prepare(
      `SELECT u.id AS user_id, NULL AS device_id, u.display_name AS name,
              COALESCE((SELECT SUM(points) FROM point_events p WHERE p.user_id = u.id AND p.deleted_at IS NULL), 0) AS points
       FROM users u
       WHERE u.show_on_leaderboard = 1
       ORDER BY points DESC, u.sort_name ASC`
    )
    .all<RawLeaderboardRow>();

  return NextResponse.json({ board: buildLeaderboard(rows, user?.id ?? null, device) });
}
