import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { pointsForUser } from "@/lib/members";
import { nowIso, readJson } from "@/lib/util";
import type { Me } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Bitte anmelden." }, { status: 401 });

  const history = await getDb()
    .prepare(
      "SELECT id, points, reason, created_at FROM point_events WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 20"
    )
    .all<Me["history"][number]>(user.id);

  return NextResponse.json({
    name: user.display_name,
    show_on_leaderboard: user.show_on_leaderboard,
    points: await pointsForUser(user.id),
    history,
  } satisfies Me);
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Bitte anmelden." }, { status: 401 });

  const body = await readJson(req);
  const show = body.show_on_leaderboard ? 1 : 0;
  await getDb()
    .prepare("UPDATE users SET show_on_leaderboard = ?, updated_at = ? WHERE id = ?")
    .run(show, nowIso(), user.id);

  return NextResponse.json({ ok: true });
}
