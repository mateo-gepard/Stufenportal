import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { nowIso } from "@/lib/util";
import type { MyAssignedMilestone, MySignupTask, MyTasksData } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function assigneeMatchesUser(value: string | null, userNames: string[]): boolean {
  if (!value) return false;
  const normalizedWhole = normalizeName(value);
  const ownNames = userNames.map(normalizeName).filter(Boolean);
  if (ownNames.includes(normalizedWhole)) return true;

  const parts = value
    .split(",")
    .map(normalizeName)
    .filter(Boolean);
  if (ownNames.some((name) => parts.includes(name))) return true;

  return ownNames.some((name) => name.length > 4 && normalizedWhole.includes(name));
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Bitte anmelden." }, { status: 401 });

  const db = getDb();
  const now = nowIso();
  const rawMilestones = await db
    .prepare(
      `SELECT m.id, m.title, m.done, m.assignee, m.due_at,
              e.id AS event_id, e.title AS event_title, e.start_at AS event_start_at, e.status AS event_status
       FROM milestones m
       JOIN events e ON e.id = m.event_id
       WHERE m.deleted_at IS NULL
         AND e.deleted_at IS NULL
         AND e.status NOT IN ('done','cancelled')
         AND m.assignee IS NOT NULL
         AND TRIM(m.assignee) != ''
         AND (COALESCE(e.end_at, e.start_at) IS NULL OR COALESCE(e.end_at, e.start_at) >= ?)
       ORDER BY m.done ASC, (m.due_at IS NULL), COALESCE(m.due_at, e.start_at, e.created_at) ASC`
    )
    .all<MyAssignedMilestone>(now);

  const milestones = rawMilestones
    .filter((task) => assigneeMatchesUser(task.assignee, [user.display_name, user.sort_name]))
    .map((task) => ({ ...task, done: !!task.done }));

  const signups = await db
    .prepare(
      `SELECT su.id, su.status,
              e.id AS event_id, e.title AS event_title, e.start_at AS event_start_at,
              l.title AS list_title, s.label AS slot_label, s.capacity
       FROM signups su
       JOIN slots s ON s.id = su.slot_id
       JOIN signup_lists l ON l.id = s.list_id
       JOIN events e ON e.id = l.event_id
       WHERE su.user_id = ?
         AND l.deleted_at IS NULL
         AND e.deleted_at IS NULL
         AND e.status NOT IN ('done','cancelled')
         AND (COALESCE(e.end_at, e.start_at) IS NULL OR COALESCE(e.end_at, e.start_at) >= ?)
       ORDER BY (su.status = 'waitlist'), (e.start_at IS NULL), e.start_at ASC, l.ord ASC, s.ord ASC`
    )
    .all<MySignupTask>(user.id, now);

  const data: MyTasksData = {
    open_milestones: milestones.filter((task) => !task.done),
    done_milestones: milestones.filter((task) => task.done),
    signups,
  };

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

