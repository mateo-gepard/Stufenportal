import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin, deviceId } from "@/lib/auth";
import { nowIso, readJson, trimmed, str, oneOf } from "@/lib/util";
import type { EventDetail, EventStatus, SignupList } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["idea", "planning", "active", "done", "cancelled"] as const;

function buildEventDetail(eventId: string, device: string | null): EventDetail | null {
  const db = getDb();
  const e = db
    .prepare("SELECT * FROM events WHERE id = ? AND deleted_at IS NULL")
    .get(eventId) as
    | {
        id: string;
        title: string;
        description: string;
        status: EventStatus;
        start_at: string | null;
        end_at: string | null;
      }
    | undefined;
  if (!e) return null;

  const milestones = db
    .prepare(
      "SELECT id,title,done,assignee,due_at,ord FROM milestones WHERE event_id = ? AND deleted_at IS NULL ORDER BY ord"
    )
    .all(eventId)
    .map((m: any) => ({ ...m, done: !!m.done }));

  const lists = db
    .prepare(
      "SELECT id,title,overflow FROM signup_lists WHERE event_id = ? AND deleted_at IS NULL ORDER BY ord"
    )
    .all(eventId) as { id: string; title: string; overflow: "block" | "waitlist" }[];

  const fullLists: SignupList[] = lists.map((l) => {
    const slots = db
      .prepare("SELECT id,label,capacity,ord FROM slots WHERE list_id = ? ORDER BY ord")
      .all(l.id) as { id: string; label: string; capacity: number | null; ord: number }[];
    return {
      ...l,
      slots: slots.map((s) => {
        const signups = db
          .prepare(
            "SELECT id,display_name,status,device_id FROM signups WHERE slot_id = ? ORDER BY created_at"
          )
          .all(s.id) as {
          id: string;
          display_name: string;
          status: "confirmed" | "waitlist";
          device_id: string;
        }[];
        const confirmed = signups.filter((su) => su.status === "confirmed");
        return {
          id: s.id,
          label: s.label,
          capacity: s.capacity,
          ord: s.ord,
          taken: confirmed.length,
          full: s.capacity != null && confirmed.length >= s.capacity,
          mine: !!device && signups.some((su) => su.device_id === device),
          signups: signups.map((su) => ({
            id: su.id,
            display_name: su.display_name,
            status: su.status,
            mine: su.device_id === device,
          })),
        };
      }),
    };
  });

  const done_count = milestones.filter((m: any) => m.done).length;
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    status: e.status,
    start_at: e.start_at,
    end_at: e.end_at,
    done_count,
    total_count: milestones.length,
    milestones,
    lists: fullLists,
  };
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const detail = buildEventDetail(params.id, deviceId(req));
  if (!detail) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  return NextResponse.json({ event: detail });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const forbidden = requireAdmin();
  if (forbidden) return forbidden;
  const db = getDb();
  const exists = db.prepare("SELECT id FROM events WHERE id = ? AND deleted_at IS NULL").get(params.id);
  if (!exists) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });

  const body = await readJson(req);
  const sets: string[] = [];
  const vals: unknown[] = [];
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
  if (sets.length) {
    vals.push(params.id);
    db.prepare(`UPDATE events SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const forbidden = requireAdmin();
  if (forbidden) return forbidden;
  const db = getDb();
  const now = nowIso();
  // Soft-Delete kaskadiert auf Meilensteine & Listen (wiederherstellbar).
  const tx = db.transaction(() => {
    db.prepare("UPDATE events SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL").run(now, params.id);
    db.prepare("UPDATE milestones SET deleted_at = ? WHERE event_id = ? AND deleted_at IS NULL").run(now, params.id);
    db.prepare("UPDATE signup_lists SET deleted_at = ? WHERE event_id = ? AND deleted_at IS NULL").run(now, params.id);
  });
  tx();
  return NextResponse.json({ ok: true });
}
