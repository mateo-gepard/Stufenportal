import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { deviceId } from "@/lib/auth";
import { newId, nowIso, readJson, trimmed, oneOf } from "@/lib/util";
import { upsertMember } from "@/lib/members";
import type { Comment } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "";
  const id = url.searchParams.get("id") || "";
  const device = deviceId(req);
  if (!type || !id) return NextResponse.json({ comments: [] });

  const rows = await getDb()
    .prepare(
      "SELECT id,author_name,body,created_at,device_id FROM comments WHERE target_type = ? AND target_id = ? AND deleted_at IS NULL ORDER BY created_at ASC"
    )
    .all<Comment & { device_id: string }>(type, id);

  return NextResponse.json({
    comments: rows.map((r) => ({
      id: r.id,
      author_name: r.author_name,
      body: r.body,
      created_at: r.created_at,
      mine: !!device && r.device_id === device,
    })),
  });
}

export async function POST(req: Request) {
  const device = deviceId(req);
  if (!device) return NextResponse.json({ error: "Keine Geräte-ID." }, { status: 400 });

  const body = await readJson(req);
  const type = oneOf(body.target_type, ["event", "news"], "event");
  const targetId = trimmed(body.target_id);
  const text = trimmed(body.body).slice(0, 2000);
  if (!targetId || !text) return NextResponse.json({ error: "Kommentar fehlt." }, { status: 400 });

  const id = newId();
  const authorName = trimmed(body.author_name).slice(0, 40) || "Anonym";
  const db = getDb();
  await db
    .prepare("INSERT INTO comments (id,target_type,target_id,device_id,author_name,body,created_at) VALUES (?,?,?,?,?,?,?)")
    .run(id, type, targetId, device, authorName, text, nowIso());
  await upsertMember(device, authorName);

  return NextResponse.json({ id }, { status: 201 });
}
