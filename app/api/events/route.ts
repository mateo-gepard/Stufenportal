import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { newId, nowIso, readJson, trimmed, str, int, oneOf } from "@/lib/util";
import type { EventSummary, EventStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["idea", "planning", "active", "done", "cancelled"] as const;

function listEvents(includeDone = true): EventSummary[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT e.id, e.title, e.status, e.start_at,
              (SELECT COUNT(*) FROM milestones m WHERE m.event_id = e.id AND m.deleted_at IS NULL) AS total_count,
              (SELECT COUNT(*) FROM milestones m WHERE m.event_id = e.id AND m.deleted_at IS NULL AND m.done = 1) AS done_count
       FROM events e
       WHERE e.deleted_at IS NULL
       ORDER BY (e.start_at IS NULL), e.start_at ASC, e.created_at DESC`
    )
    .all() as EventSummary[];
  return includeDone ? rows : rows.filter((r) => r.status !== "done" && r.status !== "cancelled");
}

export async function GET() {
  return NextResponse.json({ events: listEvents() });
}

export async function POST(req: Request) {
  const forbidden = requireAdmin();
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const title = trimmed(body.title);
  if (!title) return NextResponse.json({ error: "Titel fehlt." }, { status: 400 });

  const db = getDb();
  const id = newId();
  const status = oneOf<EventStatus>(body.status, STATUSES, "planning");

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO events (id,title,description,type,status,start_at,created_at)
       VALUES (?,?,?,?,?,?,?)`
    ).run(
      id,
      title,
      str(body.description),
      "event",
      status,
      str(body.start_at) || null,
      nowIso()
    );

    const milestones = Array.isArray(body.milestones) ? body.milestones : [];
    milestones.forEach((m: unknown, i: number) => {
      const mt = trimmed((m as { title?: unknown }).title);
      if (!mt) return;
      db.prepare(
        `INSERT INTO milestones (id,event_id,title,done,assignee,due_at,ord) VALUES (?,?,?,0,?,?,?)`
      ).run(
        newId(),
        id,
        mt,
        str((m as { assignee?: unknown }).assignee) || null,
        str((m as { due_at?: unknown }).due_at) || null,
        i
      );
    });

    const lists = Array.isArray(body.lists) ? body.lists : [];
    lists.forEach((l: unknown, li: number) => {
      const lt = trimmed((l as { title?: unknown }).title);
      if (!lt) return;
      const listId = newId();
      db.prepare(
        `INSERT INTO signup_lists (id,event_id,title,overflow,ord) VALUES (?,?,?,?,?)`
      ).run(listId, id, lt, oneOf((l as { overflow?: unknown }).overflow, ["block", "waitlist"], "block"), li);
      const slots = Array.isArray((l as { slots?: unknown }).slots) ? (l as { slots: unknown[] }).slots : [];
      slots.forEach((s: unknown, si: number) => {
        const sl = trimmed((s as { label?: unknown }).label);
        if (!sl) return;
        db.prepare(`INSERT INTO slots (id,list_id,label,capacity,ord) VALUES (?,?,?,?,?)`).run(
          newId(),
          listId,
          sl,
          int((s as { capacity?: unknown }).capacity),
          si
        );
      });
    });
  });
  tx();

  return NextResponse.json({ id }, { status: 201 });
}
