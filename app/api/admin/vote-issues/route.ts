import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { nowIso, readJson, trimmed } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const forbidden = requireAdmin();
  if (forbidden) return forbidden;

  const rows = await getDb()
    .prepare(
      `SELECT f.id, f.poll_id, p.question, f.voter_name, f.created_at
       FROM anonymous_vote_name_flags f
       JOIN polls p ON p.id = f.poll_id
       WHERE f.status = 'open'
       ORDER BY f.created_at DESC`
    )
    .all<{ id: string; poll_id: string; question: string; voter_name: string; created_at: string }>();

  return NextResponse.json({ issues: rows });
}

export async function PATCH(req: Request) {
  const forbidden = requireAdmin();
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const id = trimmed(body.id);
  if (!id) return NextResponse.json({ error: "ID fehlt." }, { status: 400 });

  await getDb()
    .prepare("UPDATE anonymous_vote_name_flags SET status = 'resolved', resolved_at = ? WHERE id = ?")
    .run(nowIso(), id);

  return NextResponse.json({ ok: true });
}
