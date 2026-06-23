import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { deviceId, voterHash } from "@/lib/auth";
import { autoClose } from "@/lib/polls";
import type { TodayDigest, NewsItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const db = getDb();
  const device = deviceId(req);
  const now = Date.now();

  // 1. Beförderte News (max 3, abgelaufene featured_until fallen raus).
  const featuredRaw = db
    .prepare(
      `SELECT * FROM news
       WHERE deleted_at IS NULL AND status = 'published' AND featured = 1
       ORDER BY COALESCE(published_at, created_at) DESC`
    )
    .all() as any[];
  const featuredNews: NewsItem[] = featuredRaw
    .filter((n) => !n.featured_until || new Date(n.featured_until).getTime() > now)
    .slice(0, 3)
    .map((n) => ({ ...n, featured: true }));

  // Auto-Close offene Polls mit abgelaufener Frist.
  const openPollsRaw = db.prepare("SELECT * FROM polls WHERE deleted_at IS NULL AND status = 'open'").all() as any[];
  openPollsRaw.forEach((p) => autoClose(db, p));
  const livePolls = db
    .prepare("SELECT * FROM polls WHERE deleted_at IS NULL AND status = 'open' ORDER BY (closes_at IS NULL), closes_at ASC")
    .all() as any[];

  // 2. Dringendes: Polls/Events mit Frist in den nächsten 3 Tagen.
  const soon = now + 3 * 864e5;
  const urgent: TodayDigest["urgent"] = [];
  livePolls.forEach((p) => {
    if (p.closes_at && new Date(p.closes_at).getTime() <= soon) {
      urgent.push({ type: "poll", id: p.id, title: p.question, closes_at: p.closes_at });
    }
  });
  const soonEvents = db
    .prepare(
      `SELECT id, title, start_at FROM events
       WHERE deleted_at IS NULL AND status NOT IN ('done','cancelled')
         AND start_at IS NOT NULL AND start_at <= ? AND start_at >= ?
       ORDER BY start_at ASC`
    )
    .all(new Date(soon).toISOString(), new Date(now).toISOString()) as any[];
  soonEvents.forEach((e) => urgent.push({ type: "event", id: e.id, title: e.title, closes_at: e.start_at }));
  urgent.sort((a, b) => new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime());

  // 3. Kommt: kommende Events mit Meilenstein-Fortschritt.
  const upcoming = db
    .prepare(
      `SELECT e.id, e.title, e.status, e.start_at,
              (SELECT COUNT(*) FROM milestones m WHERE m.event_id = e.id AND m.deleted_at IS NULL) AS total_count,
              (SELECT COUNT(*) FROM milestones m WHERE m.event_id = e.id AND m.deleted_at IS NULL AND m.done = 1) AS done_count
       FROM events e
       WHERE e.deleted_at IS NULL AND e.status NOT IN ('done','cancelled')
       ORDER BY (e.start_at IS NULL), e.start_at ASC
       LIMIT 5`
    )
    .all() as TodayDigest["upcoming"];

  // 4. Offene Abstimmungen (gekürzt — nie der volle Stimmzettel).
  const openPolls = livePolls.map((p) => {
    const total = (db.prepare("SELECT COUNT(*) AS n FROM ballots WHERE poll_id = ?").get(p.id) as { n: number }).n;
    let voted = false;
    if (device) {
      const col = p.anonymous ? "voter_hash" : "device_id";
      const val = p.anonymous ? voterHash(p.poll_secret, device) : device;
      voted = !!db.prepare(`SELECT 1 FROM ballots WHERE poll_id = ? AND ${col} = ?`).get(p.id, val);
    }
    return { id: p.id, question: p.question, total_ballots: total, voted, closes_at: p.closes_at };
  });

  const digest: TodayDigest = { featuredNews, urgent, upcoming, openPolls };
  return NextResponse.json(digest);
}
