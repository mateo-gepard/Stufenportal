import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { deviceId } from "@/lib/auth";
import { newId, nowIso, readJson, trimmed } from "@/lib/util";
import { normalizeRosterName } from "@/lib/stufenliste";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const device = deviceId(req);
  if (!device) return NextResponse.json({ error: "Keine Geräte-ID." }, { status: 400 });

  const db = getDb();
  const poll = await db
    .prepare("SELECT id, anonymous FROM polls WHERE id = ? AND deleted_at IS NULL")
    .get<{ id: string; anonymous: number }>(params.id);
  if (!poll) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  if (!poll.anonymous) return NextResponse.json({ error: "Nur bei anonymen Abstimmungen." }, { status: 400 });

  const body = await readJson(req);
  const voterName = trimmed(body.voter_name).slice(0, 100);
  const normalized = normalizeRosterName(voterName);
  if (!normalized) return NextResponse.json({ error: "Name fehlt." }, { status: 400 });

  const known = await db
    .prepare("SELECT 1 AS ok FROM poll_roster_aliases WHERE poll_id = ? AND normalized_alias = ? LIMIT 1")
    .get<{ ok: number }>(params.id, normalized);
  if (!known) return NextResponse.json({ error: "Name ist nicht auf der Stufenliste." }, { status: 400 });

  await db
    .prepare(
      `INSERT INTO anonymous_vote_name_flags
       (id, poll_id, device_id, voter_name, normalized_name, status, created_at)
       VALUES (?,?,?,?,?, 'open', ?)
       ON CONFLICT(poll_id, device_id, normalized_name)
       DO UPDATE SET voter_name = excluded.voter_name, status = 'open', resolved_at = NULL, created_at = excluded.created_at`
    )
    .run(newId(), params.id, device, voterName, normalized, nowIso());

  return NextResponse.json({ ok: true }, { status: 201 });
}
