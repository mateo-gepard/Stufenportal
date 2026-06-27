import { NextResponse } from "next/server";
import { currentUser, deviceId, voterHash } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { autoClose } from "@/lib/polls";
import { getMyTasks } from "@/lib/tasks";
import type { AppBadges } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const db = getDb();
  const user = await currentUser();
  const device = deviceId(req);
  const now = Date.now();
  const nowText = new Date(now).toISOString();
  const soonText = new Date(now + 3 * 864e5).toISOString();

  const eventRows = await db
    .prepare(
      `SELECT id
       FROM events
       WHERE deleted_at IS NULL
         AND status NOT IN ('done','cancelled')
         AND start_at IS NOT NULL
         AND start_at >= ?
         AND start_at <= ?`
    )
    .all<{ id: string }>(nowText, soonText);

  const openPollsRaw = await db.prepare("SELECT * FROM polls WHERE deleted_at IS NULL AND status = 'open'").all<any>();
  const livePolls = (await Promise.all(openPollsRaw.map((poll) => autoClose(poll)))).filter((poll) => poll.status === "open");
  let unvotedPolls = 0;
  for (const poll of livePolls) {
    let voted = false;
    if (user) {
      const col = poll.anonymous ? "voter_hash" : "user_id";
      const val = poll.anonymous ? voterHash(poll.poll_secret, `user:${user.id}`) : user.id;
      voted = !!(await db.prepare(`SELECT 1 AS x FROM ballots WHERE poll_id = ? AND ${col} = ?`).get(poll.id, val));
    }
    if (!voted && device) {
      const col = poll.anonymous ? "voter_hash" : "device_id";
      const val = poll.anonymous ? voterHash(poll.poll_secret, device) : device;
      voted = !!(await db.prepare(`SELECT 1 AS x FROM ballots WHERE poll_id = ? AND ${col} = ?`).get(poll.id, val));
    }
    if (!voted) unvotedPolls += 1;
  }

  const tasks = user ? await getMyTasks(user) : null;
  const taskCount = tasks ? tasks.open_milestones.length + tasks.signups.length : 0;

  const newsRows = await db
    .prepare(
      `SELECT id
       FROM news
       WHERE deleted_at IS NULL
         AND status = 'published'
         AND (
           priority = 'dringend'
           OR priority = 'wichtig'
           OR (featured = 1 AND (featured_until IS NULL OR featured_until > ?))
         )
       LIMIT 9`
    )
    .all<{ id: string }>(nowText);

  const badges: AppBadges = {
    events: eventRows.length,
    votes: unvotedPolls,
    tasks: taskCount,
    news: newsRows.length,
    more: newsRows.length > 0,
  };

  return NextResponse.json(badges, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

