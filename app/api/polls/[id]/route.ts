import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin, isAdmin, deviceId, currentUser } from "@/lib/auth";
import { nowIso, readJson, oneOf } from "@/lib/util";
import { buildPollDetail } from "@/lib/polls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPoll(id: string) {
  return getDb().prepare("SELECT * FROM polls WHERE id = ? AND deleted_at IS NULL").get<any>(id);
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const poll = await getPoll(params.id);
  if (!poll) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  const user = await currentUser();
  const detail = await buildPollDetail(poll, deviceId(req), await isAdmin(), user?.id ?? null);
  return NextResponse.json({ poll: detail });
}

// Admin: Status setzen (z. B. vorzeitig schließen) — Frage/Optionen bleiben eingefroren.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const poll = await getPoll(params.id);
  if (!poll) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  const body = await readJson(req);
  if (body.status !== undefined) {
    const status = oneOf(body.status, ["open", "closed", "invalid"], poll.status);
    await getDb().prepare("UPDATE polls SET status = ? WHERE id = ?").run(status, params.id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  await getDb().prepare("UPDATE polls SET deleted_at = ? WHERE id = ?").run(nowIso(), params.id);
  return NextResponse.json({ ok: true });
}
