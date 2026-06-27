import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { currentUser, deviceId, voterHash } from "@/lib/auth";
import { autoClose } from "@/lib/polls";
import type { TodayDigest, NewsItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const db = getDb();
  const device = deviceId(req);
  const user = await currentUser();
  const now = Date.now();
  const nowText = new Date(now).toISOString();

  // 1. Beförderte News (max 3, abgelaufene featured_until fallen raus).
  const featuredRaw = await db
    .prepare(
      `SELECT * FROM news
       WHERE deleted_at IS NULL AND status = 'published' AND featured = 1
       ORDER BY COALESCE(published_at, created_at) DESC`
    )
    .all<any>();
  const featuredNews: NewsItem[] = featuredRaw
    .filter((n) => !n.featured_until || new Date(n.featured_until).getTime() > now)
    .slice(0, 3)
    .map((n) => ({ ...n, featured: true }));

  // Auto-Close offene Polls mit abgelaufener Frist.
  const openPollsRaw = await db.prepare("SELECT * FROM polls WHERE deleted_at IS NULL AND status = 'open'").all<any>();
  const livePolls = (await Promise.all(openPollsRaw.map((p) => autoClose(p))))
    .filter((p) => p.status === "open")
    .sort((a, b) => {
      if (!a.closes_at && !b.closes_at) {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      if (!a.closes_at) return 1;
      if (!b.closes_at) return -1;
      return new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime();
    });

  // 2. Dringendes: Dringende News plus Polls/Events mit Frist in den nächsten 3 Tagen.
  const soon = now + 3 * 864e5;
  const urgent: TodayDigest["urgent"] = [];
  livePolls.forEach((p) => {
    if (p.closes_at && new Date(p.closes_at).getTime() <= soon) {
      urgent.push({ type: "poll", id: p.id, title: p.question, closes_at: p.closes_at });
    }
  });
  const urgentNews = await db
    .prepare(
      `SELECT id, title, COALESCE(published_at, created_at) AS published_at
       FROM news
       WHERE deleted_at IS NULL AND status = 'published' AND priority = 'dringend'
       ORDER BY COALESCE(published_at, created_at) DESC
       LIMIT 5`
    )
    .all<{ id: string; title: string; published_at: string }>();
  urgentNews.forEach((n) =>
    urgent.push({ type: "news", id: n.id, title: n.title, closes_at: n.published_at || nowText })
  );
  const soonEvents = await db
    .prepare(
      `SELECT id, title, start_at FROM events
       WHERE deleted_at IS NULL AND status NOT IN ('done','cancelled')
         AND start_at IS NOT NULL AND start_at <= ? AND start_at >= ?
       ORDER BY start_at ASC`
    )
    .all<any>(new Date(soon).toISOString(), nowText);
  soonEvents.forEach((e) => urgent.push({ type: "event", id: e.id, title: e.title, closes_at: e.start_at }));
  urgent.sort((a, b) => {
    if (a.type === "news" && b.type !== "news") return -1;
    if (a.type !== "news" && b.type === "news") return 1;
    return new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime();
  });

  // 3. Kommt: kommende Events mit Meilenstein-Fortschritt.
  const upcoming = await db
    .prepare(
      `SELECT e.id, e.title, e.status, e.start_at, e.money_goal_cents, e.money_goal_note,
              (SELECT COUNT(*) FROM milestones m WHERE m.event_id = e.id AND m.deleted_at IS NULL) AS total_count,
              (SELECT COUNT(*) FROM milestones m WHERE m.event_id = e.id AND m.deleted_at IS NULL AND m.done = 1) AS done_count
       FROM events e
       WHERE e.deleted_at IS NULL AND e.status NOT IN ('done','cancelled')
         AND (COALESCE(e.end_at, e.start_at) IS NULL OR COALESCE(e.end_at, e.start_at) >= ?)
       ORDER BY (e.start_at IS NULL), e.start_at ASC
       LIMIT 5`
    )
    .all<TodayDigest["upcoming"][number]>(nowText);

  // 4. Offene Abstimmungen (gekürzt — nie der volle Stimmzettel).
  const openPolls = await Promise.all(
    livePolls.map(async (p) => {
      const totalRow = await db.prepare("SELECT COUNT(*) AS n FROM ballots WHERE poll_id = ?").get<{ n: number }>(p.id);
      let voted = false;
      if (user) {
        const col = p.anonymous ? "voter_hash" : "user_id";
        const val = p.anonymous ? voterHash(p.poll_secret, `user:${user.id}`) : user.id;
        voted = !!(await db.prepare(`SELECT 1 AS x FROM ballots WHERE poll_id = ? AND ${col} = ?`).get(p.id, val));
      }
      if (!voted && device) {
        const col = p.anonymous ? "voter_hash" : "device_id";
        const val = p.anonymous ? voterHash(p.poll_secret, device) : device;
        voted = !!(await db.prepare(`SELECT 1 AS x FROM ballots WHERE poll_id = ? AND ${col} = ?`).get(p.id, val));
      }
      return { id: p.id, question: p.question, total_ballots: totalRow?.n ?? 0, voted, closes_at: p.closes_at };
    })
  );

  const digest: TodayDigest = { featuredNews, urgent, upcoming, openPolls };
  return NextResponse.json(digest, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
