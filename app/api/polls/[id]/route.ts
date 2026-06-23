import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin, isAdmin, deviceId } from "@/lib/auth";
import { nowIso, readJson, oneOf } from "@/lib/util";
import { buildPollDetail } from "@/lib/polls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPoll(id: string) {
  return getDb().prepare("SELECT * FROM polls WHERE id = ? AND deleted_at IS NULL").get(id) as any;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const poll = getPoll(params.id);
  if (!poll) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  const detail = buildPollDetail(getDb(), poll, deviceId(req), isAdmin());
  return NextResponse.json({ poll: detail });
}

// Admin: Status setzen (z. B. vorzeitig schließen) — Frage/Optionen bleiben eingefroren.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const forbidden = requireAdmin();
  if (forbidden) return forbidden;
  const poll = getPoll(params.id);
  if (!poll) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  const body = await readJson(req);
  if (body.status !== undefined) {
    const status = oneOf(body.status, ["open", "closed", "invalid"], poll.status);
    getDb().prepare("UPDATE polls SET status = ? WHERE id = ?").run(status, params.id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const forbidden = requireAdmin();
  if (forbidden) return forbidden;
  getDb().prepare("UPDATE polls SET deleted_at = ? WHERE id = ?").run(nowIso(), params.id);
  return NextResponse.json({ ok: true });
}
