import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { deviceId } from "@/lib/auth";
import type { LeaderboardRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RawLeaderboardRow = { device_id: string; name: string; points: number };

function normalizeLeaderboardName(name: string) {
  return name
    .trim()
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("de-DE");
}

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

  const deduped = new Map<string, RawLeaderboardRow & { mine: boolean }>();
  for (const row of rows) {
    const key = normalizeLeaderboardName(row.name);
    if (!key) continue;
    const mine = !!device && row.device_id === device;
    const current = deduped.get(key);
    if (!current) {
      deduped.set(key, { ...row, mine });
      continue;
    }
    if (row.points > current.points || (row.points === current.points && mine && !current.mine)) {
      deduped.set(key, { ...row, mine: current.mine || mine });
    } else if (mine) {
      current.mine = true;
    }
  }

  const board: LeaderboardRow[] = Array.from(deduped.values())
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "de-DE"))
    .map((r, i) => ({
      name: r.name,
      points: r.points,
      rank: i + 1,
      mine: r.mine,
    }));
  return NextResponse.json({ board });
}
