import { NextResponse } from "next/server";
import { getDb, batch } from "@/lib/db";
import { currentUser, requireAdmin, deviceId } from "@/lib/auth";
import { nowIso, readJson, trimmed, str, oneOf } from "@/lib/util";
import { parseMoneyGoalCents, parseMoneyGoalNote } from "@/lib/eventGoals";
import type { EventDetail, EventStatus, SignupList } from "@/lib/types";
import type { InValue } from "@libsql/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["idea", "planning", "active", "done", "cancelled"] as const;

async function buildEventDetail(eventId: string, device: string | null, userId: string | null): Promise<EventDetail | null> {
  const db = getDb();
  const e = await db
    .prepare("SELECT * FROM events WHERE id = ? AND deleted_at IS NULL")
    .get<{
      id: string;
      title: string;
      description: string;
      status: EventStatus;
      start_at: string | null;
      end_at: string | null;
      money_goal_cents: number | null;
      money_goal_note: string | null;
    }>(eventId);
  if (!e) return null;

  const milestones = (
    await db
      .prepare(
        "SELECT id,title,done,assignee,assignee_ids,points,points_awarded_at,due_at,ord FROM milestones WHERE event_id = ? AND deleted_at IS NULL ORDER BY ord"
      )
      .all<any>(eventId)
  ).map((m: any) => ({
    id: m.id,
    title: m.title,
    done: !!m.done,
    assignee: m.assignee,
    assignee_ids: (m.assignee_ids || "").split(",").map((s: string) => s.trim()).filter(Boolean),
    points: m.points ?? 0,
    points_awarded: !!m.points_awarded_at,
    due_at: m.due_at,
    ord: m.ord,
  }));

  const lists = await db
    .prepare("SELECT id,title,overflow FROM signup_lists WHERE event_id = ? AND deleted_at IS NULL ORDER BY ord")
    .all<{ id: string; title: string; overflow: "block" | "waitlist" }>(eventId);

  const fullLists: SignupList[] = await Promise.all(
    lists.map(async (l) => {
      const slots = await db
        .prepare("SELECT id,label,capacity,ord FROM slots WHERE list_id = ? ORDER BY ord")
        .all<{ id: string; label: string; capacity: number | null; ord: number }>(l.id);
      const slotViews = await Promise.all(
        slots.map(async (s) => {
          const signups = await db
            .prepare("SELECT id,display_name,status,device_id,user_id FROM signups WHERE slot_id = ? ORDER BY created_at")
            .all<{ id: string; display_name: string; status: "confirmed" | "waitlist"; device_id: string; user_id: string | null }>(s.id);
          const confirmed = signups.filter((su) => su.status === "confirmed");
          const isMine = (su: { device_id: string; user_id: string | null }) =>
            (!!userId && su.user_id === userId) || (!!device && su.device_id === device);
          return {
            id: s.id,
            label: s.label,
            capacity: s.capacity,
            ord: s.ord,
            taken: confirmed.length,
            full: s.capacity != null && confirmed.length >= s.capacity,
            mine: signups.some(isMine),
            signups: signups.map((su) => ({
              id: su.id,
              display_name: su.display_name,
              status: su.status,
              mine: isMine(su),
            })),
          };
        })
      );
      return { ...l, slots: slotViews };
    })
  );

  const done_count = milestones.filter((m: any) => m.done).length;
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    status: e.status,
    start_at: e.start_at,
    end_at: e.end_at,
    money_goal_cents: e.money_goal_cents,
    money_goal_note: e.money_goal_note,
    done_count,
    total_count: milestones.length,
    milestones,
    lists: fullLists,
  };
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  const detail = await buildEventDetail(params.id, deviceId(req), user?.id ?? null);
  if (!detail) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  return NextResponse.json({ event: detail });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const db = getDb();
  const exists = await db.prepare("SELECT id FROM events WHERE id = ? AND deleted_at IS NULL").get(params.id);
  if (!exists) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });

  const body = await readJson(req);
  const sets: string[] = [];
  const vals: InValue[] = [];
  if (body.title !== undefined) {
    const t = trimmed(body.title);
    if (!t) return NextResponse.json({ error: "Titel fehlt." }, { status: 400 });
    sets.push("title = ?");
    vals.push(t);
  }
  if (body.description !== undefined) {
    sets.push("description = ?");
    vals.push(str(body.description));
  }
  if (body.status !== undefined) {
    sets.push("status = ?");
    vals.push(oneOf<EventStatus>(body.status, STATUSES, "planning"));
  }
  if (body.start_at !== undefined) {
    sets.push("start_at = ?");
    vals.push(str(body.start_at) || null);
  }
  if (body.money_goal_cents !== undefined) {
    const cents = parseMoneyGoalCents(body.money_goal_cents);
    if (cents instanceof Error) return NextResponse.json({ error: cents.message }, { status: 400 });
    sets.push("money_goal_cents = ?");
    vals.push(cents);
    sets.push("money_goal_note = ?");
    vals.push(parseMoneyGoalNote(body.money_goal_note, cents));
  } else if (body.money_goal_note !== undefined) {
    sets.push("money_goal_note = ?");
    vals.push(trimmed(body.money_goal_note).slice(0, 160) || null);
  }
  if (sets.length) {
    vals.push(params.id);
    await db.prepare(`UPDATE events SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const now = nowIso();
  // Soft-Delete kaskadiert auf Meilensteine & Listen (wiederherstellbar).
  await batch([
    { sql: "UPDATE events SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL", args: [now, params.id] },
    { sql: "UPDATE milestones SET deleted_at = ? WHERE event_id = ? AND deleted_at IS NULL", args: [now, params.id] },
    { sql: "UPDATE signup_lists SET deleted_at = ? WHERE event_id = ? AND deleted_at IS NULL", args: [now, params.id] },
  ]);
  return NextResponse.json({ ok: true });
}
