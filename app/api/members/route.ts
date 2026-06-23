import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import type { MemberRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sprecher: alle bekannten Mitglieder (zum Punkte-Vergeben & Zuteilen).
export async function GET() {
  const forbidden = requireAdmin();
  if (forbidden) return forbidden;
  const db = getDb();
  const rows = await db
    .prepare(
      `SELECT m.device_id AS device_id, m.name AS name,
              COALESCE((SELECT SUM(points) FROM point_events p WHERE p.device_id = m.device_id AND p.deleted_at IS NULL), 0) AS points
       FROM members m
       ORDER BY m.name ASC`
    )
    .all<MemberRow>();
  return NextResponse.json({ members: rows });
}
