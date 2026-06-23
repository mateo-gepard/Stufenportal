import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { deviceId } from "@/lib/auth";
import { newId, nowIso, readJson, trimmed } from "@/lib/util";
import { upsertMember } from "@/lib/members";

export const runtime = "nodejs";

function slotInfo(slotId: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT s.id, s.capacity, l.overflow
       FROM slots s JOIN signup_lists l ON l.id = s.list_id
       WHERE s.id = ? AND l.deleted_at IS NULL`
    )
    .get(slotId) as { id: string; capacity: number | null; overflow: "block" | "waitlist" } | undefined;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const device = deviceId(req);
  if (!device) return NextResponse.json({ error: "Keine Geräte-ID." }, { status: 400 });

  const db = getDb();
  const slot = slotInfo(params.id);
  if (!slot) return NextResponse.json({ error: "Slot nicht gefunden." }, { status: 404 });

  const existing = db
    .prepare("SELECT id FROM signups WHERE slot_id = ? AND device_id = ?")
    .get(params.id, device);
  if (existing) return NextResponse.json({ error: "Schon eingetragen." }, { status: 409 });

  const body = await readJson(req);
  const name = trimmed(body.display_name).slice(0, 40) || "Anonym";

  const confirmed = (
    db.prepare("SELECT COUNT(*) AS n FROM signups WHERE slot_id = ? AND status = 'confirmed'").get(params.id) as {
      n: number;
    }
  ).n;

  let status: "confirmed" | "waitlist" = "confirmed";
  if (slot.capacity != null && confirmed >= slot.capacity) {
    if (slot.overflow === "waitlist") status = "waitlist";
    else return NextResponse.json({ error: "Slot ist voll." }, { status: 409 });
  }

  db.prepare(
    "INSERT INTO signups (id,slot_id,device_id,display_name,status,created_at) VALUES (?,?,?,?,?,?)"
  ).run(newId(), params.id, device, name, status, nowIso());

  // Wer sich mit Namen einträgt, wird „bekannt" und damit creditbar.
  upsertMember(db, device, name);

  return NextResponse.json({ status }, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const device = deviceId(req);
  if (!device) return NextResponse.json({ error: "Keine Geräte-ID." }, { status: 400 });

  const db = getDb();
  const mine = db
    .prepare("SELECT id, status FROM signups WHERE slot_id = ? AND device_id = ?")
    .get(params.id, device) as { id: string; status: string } | undefined;
  if (!mine) return NextResponse.json({ error: "Nicht eingetragen." }, { status: 404 });

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM signups WHERE id = ?").run(mine.id);
    // Nachrücken: ältesten Wartelisten-Eintrag bestätigen, wenn ein Platz frei wird.
    if (mine.status === "confirmed") {
      const next = db
        .prepare(
          "SELECT id FROM signups WHERE slot_id = ? AND status = 'waitlist' ORDER BY created_at LIMIT 1"
        )
        .get(params.id) as { id: string } | undefined;
      if (next) db.prepare("UPDATE signups SET status = 'confirmed' WHERE id = ?").run(next.id);
    }
  });
  tx();
  return NextResponse.json({ ok: true });
}
