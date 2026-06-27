import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { currentUser, deviceId } from "@/lib/auth";
import { newId, nowIso, readJson, trimmed, oneOf } from "@/lib/util";
import type { Comment } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "";
  const id = url.searchParams.get("id") || "";
  const device = deviceId(req);
  const user = await currentUser();
  if (!type || !id) return NextResponse.json({ comments: [] });

  const rows = await getDb()
    .prepare(
      "SELECT id,author_name,body,created_at,device_id,user_id FROM comments WHERE target_type = ? AND target_id = ? AND deleted_at IS NULL ORDER BY created_at ASC"
    )
    .all<Comment & { device_id: string; user_id: string | null }>(type, id);

  return NextResponse.json({
    comments: rows.map((r) => ({
      id: r.id,
      author_name: r.author_name,
      body: r.body,
      created_at: r.created_at,
      mine: (!!user && r.user_id === user.id) || (!!device && r.device_id === device),
    })),
  });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Bitte anmelden." }, { status: 401 });

  const body = await readJson(req);
  const type = oneOf(body.target_type, ["event", "news"], "event");
  const targetId = trimmed(body.target_id);
  const text = trimmed(body.body).slice(0, 2000);
  if (!targetId || !text) return NextResponse.json({ error: "Kommentar fehlt." }, { status: 400 });

  const id = newId();
  const db = getDb();
  await db
    .prepare("INSERT INTO comments (id,target_type,target_id,device_id,user_id,author_name,body,created_at) VALUES (?,?,?,?,?,?,?,?)")
    .run(id, type, targetId, `user:${user.id}`, user.id, user.display_name, text, nowIso());

  return NextResponse.json({ id }, { status: 201 });
}
