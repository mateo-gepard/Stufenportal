import { deviceId, voterHash, type AuthUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { autoClose } from "@/lib/polls";
import { getMyTasks } from "@/lib/tasks";

export const badgeSections = ["events", "votes", "tasks", "news"] as const;
export type BadgeSection = (typeof badgeSections)[number];

export type BadgeItemKeys = Record<BadgeSection, string[]>;

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export async function getCurrentBadgeItemKeys(req: Request, user: AuthUser | null): Promise<BadgeItemKeys> {
  const db = getDb();
  const device = deviceId(req);
  const now = Date.now();
  const nowText = new Date(now).toISOString();
  const soonText = new Date(now + 3 * 864e5).toISOString();

  const eventRows = await db
    .prepare(
      `SELECT id
       FROM events
       WHERE deleted_at IS NULL
         AND status NOT IN ('idea','done','cancelled')
         AND start_at IS NOT NULL
         AND start_at >= ?
         AND start_at <= ?`
    )
    .all<{ id: string }>(nowText, soonText);

  const openPollsRaw = await db.prepare("SELECT * FROM polls WHERE deleted_at IS NULL AND status = 'open'").all<any>();
  const livePolls = (await Promise.all(openPollsRaw.map((poll) => autoClose(poll)))).filter((poll) => poll.status === "open");
  const unvotedPollIds: string[] = [];
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
    if (!voted) unvotedPollIds.push(String(poll.id));
  }

  const tasks = user ? await getMyTasks(user) : null;
  const taskKeys = tasks
    ? [
        ...tasks.open_milestones.map((task) => `m:${task.id}`),
        ...tasks.signups.map((signup) => `s:${signup.id}`),
      ]
    : [];

  const newsRows = await db
    .prepare(
      `SELECT id
       FROM news
       WHERE deleted_at IS NULL
         AND status = 'published'
       ORDER BY COALESCE(published_at, created_at) DESC
       LIMIT 99`
    )
    .all<{ id: string }>();

  return {
    events: unique(eventRows.map((row) => String(row.id))),
    votes: unique(unvotedPollIds),
    tasks: unique(taskKeys),
    news: unique(newsRows.map((row) => String(row.id))),
  };
}

export async function unseenCount(userId: string, section: BadgeSection, itemKeys: string[]): Promise<number> {
  if (itemKeys.length === 0) return 0;
  const rows = await getDb()
    .prepare("SELECT item_key FROM user_seen_items WHERE user_id = ? AND section = ?")
    .all<{ item_key: string }>(userId, section);
  const seen = new Set(rows.map((row) => row.item_key));
  return itemKeys.filter((key) => !seen.has(key)).length;
}
