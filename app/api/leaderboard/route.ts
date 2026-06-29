import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { currentUser, deviceId, requireAdmin } from "@/lib/auth";
import { buildLeaderboard, type RawLeaderboardRow } from "@/lib/leaderboard";
import { leaderboardIsActive, setLeaderboardActive } from "@/lib/app-settings";
import { readJson } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Nur Accounts, die aktuell sichtbar sind. Sichtbarkeit ist standardmäßig an und kann ausgeschaltet werden.
export async function GET(req: Request) {
  const db = getDb();
  const user = await currentUser();
  const device = deviceId(req);
  const active = await leaderboardIsActive();
  if (!active) return NextResponse.json({ active, board: [] });

  const rows = await db
    .prepare(
      `SELECT u.id AS user_id, NULL AS device_id, u.display_name AS name,
              COALESCE((SELECT SUM(points) FROM point_events p WHERE p.user_id = u.id AND p.deleted_at IS NULL), 0) AS points
       FROM users u
       WHERE u.show_on_leaderboard = 1
       ORDER BY points DESC, u.sort_name ASC`
    )
    .all<RawLeaderboardRow>();

  return NextResponse.json({ active, board: buildLeaderboard(rows, user?.id ?? null, device) });
}

export async function PATCH(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const body = await readJson(req);
  if (typeof body.active !== "boolean") {
    return NextResponse.json({ error: "active fehlt." }, { status: 400 });
  }

  await setLeaderboardActive(body.active);
  return NextResponse.json({ ok: true, active: body.active });
}
