import { NextResponse } from "next/server";
import { getDb, tx } from "@/lib/db";
import { deviceId } from "@/lib/auth";
import { newId, nowIso, readJson, trimmed } from "@/lib/util";
import { upsertMember } from "@/lib/members";

export const runtime = "nodejs";

async function slotInfo(slotId: string) {
  return getDb()
    .prepare(
      `SELECT s.id, s.capacity, l.overflow
       FROM slots s JOIN signup_lists l ON l.id = s.list_id
       WHERE s.id = ? AND l.deleted_at IS NULL`
    )
    .get<{ id: string; capacity: number | null; overflow: "block" | "waitlist" }>(slotId);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const device = deviceId(req);
  if (!device) return NextResponse.json({ error: "Keine Geräte-ID." }, { status: 400 });

  const db = getDb();
  const slot = await slotInfo(params.id);
  if (!slot) return NextResponse.json({ error: "Slot nicht gefunden." }, { status: 404 });

  const existing = await db
    .prepare("SELECT id FROM signups WHERE slot_id = ? AND device_id = ?")
    .get(params.id, device);
  if (existing) return NextResponse.json({ error: "Schon eingetragen." }, { status: 409 });

  const body = await readJson(req);
  const name = trimmed(body.display_name).slice(0, 40) || "Anonym";

  const cntRow = await db
    .prepare("SELECT COUNT(*) AS n FROM signups WHERE slot_id = ? AND status = 'confirmed'")
    .get<{ n: number }>(params.id);
  const confirmed = cntRow?.n ?? 0;

  let status: "confirmed" | "waitlist" = "confirmed";
  if (slot.capacity != null && confirmed >= slot.capacity) {
    if (slot.overflow === "waitlist") status = "waitlist";
    else return NextResponse.json({ error: "Slot ist voll." }, { status: 409 });
  }

  await db
    .prepare("INSERT INTO signups (id,slot_id,device_id,display_name,status,created_at) VALUES (?,?,?,?,?,?)")
    .run(newId(), params.id, device, name, status, nowIso());

  // Wer sich mit Namen einträgt, wird „bekannt" und damit creditbar.
  await upsertMember(device, name);

  return NextResponse.json({ status }, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const device = deviceId(req);
  if (!device) return NextResponse.json({ error: "Keine Geräte-ID." }, { status: 400 });

  const mine = await getDb()
    .prepare("SELECT id, status FROM signups WHERE slot_id = ? AND device_id = ?")
    .get<{ id: string; status: string }>(params.id, device);
  if (!mine) return NextResponse.json({ error: "Nicht eingetragen." }, { status: 404 });

  await tx(async (t) => {
    await t.execute({ sql: "DELETE FROM signups WHERE id = ?", args: [mine.id] });
    // Nachrücken: ältesten Wartelisten-Eintrag bestätigen, wenn ein Platz frei wird.
    if (mine.status === "confirmed") {
      const next = await t.execute({
        sql: "SELECT id FROM signups WHERE slot_id = ? AND status = 'waitlist' ORDER BY created_at LIMIT 1",
        args: [params.id],
      });
      const nextId = next.rows[0]?.id as string | undefined;
      if (nextId) await t.execute({ sql: "UPDATE signups SET status = 'confirmed' WHERE id = ?", args: [nextId] });
    }
  });
  return NextResponse.json({ ok: true });
}
