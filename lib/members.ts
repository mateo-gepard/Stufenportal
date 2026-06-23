import type Database from "better-sqlite3";
import { nowIso } from "./util";

// Legt/aktualisiert ein Mitglied (Geräte-ID + Name) an, ohne die
// Leaderboard-Einstellung zu verändern. Wird aufgerufen, wenn jemand
// mit Namen aktiv wird (Eintragen, Einstellungen) → wird dadurch creditbar.
export function upsertMember(db: Database.Database, deviceId: string, name: string): void {
  const n = name.trim().slice(0, 40);
  if (!n || n.toLowerCase() === "anonym") return;
  const now = nowIso();
  db.prepare(
    `INSERT INTO members (device_id, name, show_on_leaderboard, created_at, updated_at)
     VALUES (?, ?, 0, ?, ?)
     ON CONFLICT(device_id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at`
  ).run(deviceId, n, now, now);
}

export function pointsFor(db: Database.Database, deviceId: string): number {
  return (
    db
      .prepare("SELECT COALESCE(SUM(points),0) AS p FROM point_events WHERE device_id = ? AND deleted_at IS NULL")
      .get(deviceId) as { p: number }
  ).p;
}
