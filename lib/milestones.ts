import { getDb, batch } from "./db";
import { int, newId, nowIso } from "./util";

export interface ResolvedAssignees {
  ids: string[];
  names: string;
}

const MAX_TASK_POINTS = 1000;

/** Normalisiert eine Punktangabe auf 0..MAX (negative/ungueltige -> 0). */
export function clampPoints(raw: unknown): number {
  const n = int(raw);
  if (n == null || n < 0) return 0;
  return Math.min(n, MAX_TASK_POINTS);
}

/**
 * Wandelt eine Liste von Account-IDs in gepruefte IDs + Anzeigenamen um.
 * Unbekannte IDs werden verworfen, damit assignee/assignee_ids konsistent bleiben.
 */
export async function resolveAssignees(rawIds: unknown): Promise<ResolvedAssignees> {
  const list = Array.isArray(rawIds)
    ? rawIds.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean)
    : [];
  const unique = Array.from(new Set(list));
  if (unique.length === 0) return { ids: [], names: "" };

  const db = getDb();
  const ids: string[] = [];
  const names: string[] = [];
  for (const id of unique) {
    const user = await db
      .prepare("SELECT id, display_name FROM users WHERE id = ?")
      .get<{ id: string; display_name: string }>(id);
    if (user) {
      ids.push(user.id);
      names.push(user.display_name);
    }
  }
  return { ids, names: names.join(", ") };
}

export interface AwardableMilestone {
  id: string;
  title: string;
  points: number | null;
  assignee_ids: string | null;
  points_awarded_at: string | null;
}

/**
 * Vergibt die Punkte einer erledigten Aufgabe einmalig an alle zugeordneten Accounts.
 * Idempotent ueber points_awarded_at: erneutes Abhaken vergibt keine Punkte doppelt.
 * Gibt true zurueck, wenn Punkte vergeben wurden.
 */
export async function awardMilestonePoints(milestone: AwardableMilestone): Promise<boolean> {
  if (milestone.points_awarded_at) return false;
  const points = milestone.points ?? 0;
  if (points <= 0) return false;
  const ids = (milestone.assignee_ids || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return false;

  const createdAt = nowIso();
  const reason = `Aufgabe erledigt: ${milestone.title}`.slice(0, 120);
  const statements = ids.map((uid) => ({
    sql: "INSERT INTO point_events (id, device_id, user_id, points, reason, source, created_at) VALUES (?,?,?,?,?, 'task', ?)",
    args: [newId(), `user:${uid}`, uid, points, reason, createdAt],
  }));
  statements.push({
    sql: "UPDATE milestones SET points_awarded_at = ? WHERE id = ?",
    args: [createdAt, milestone.id],
  });
  await batch(statements);
  return true;
}
