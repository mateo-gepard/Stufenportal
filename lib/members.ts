import { getDb } from "./db";
import { nowIso } from "./util";

// Legt/aktualisiert ein Mitglied (Geräte-ID + Name) an, ohne die
// Leaderboard-Einstellung zu verändern. Wird aufgerufen, wenn jemand
// mit Namen aktiv wird (Eintragen, Einstellungen) -> wird dadurch creditbar.
export async function upsertMember(deviceId: string, name: string): Promise<void> {
  const n = name.trim().slice(0, 40);
  if (!n || n.toLowerCase() === "anonym") return;
  const now = nowIso();
  await getDb()
    .prepare(
      `INSERT INTO members (device_id, name, show_on_leaderboard, created_at, updated_at)
       VALUES (?, ?, 0, ?, ?)
       ON CONFLICT(device_id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at`
    )
    .run(deviceId, n, now, now);
}

export async function pointsFor(deviceId: string): Promise<number> {
  const row = await getDb()
    .prepare("SELECT COALESCE(SUM(points),0) AS p FROM point_events WHERE device_id = ? AND deleted_at IS NULL")
    .get<{ p: number }>(deviceId);
  return row?.p ?? 0;
}
