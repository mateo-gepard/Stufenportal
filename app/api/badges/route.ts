import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getCurrentBadgeItemKeys, unseenCount } from "@/lib/badges";
import type { AppBadges } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) {
    const empty: AppBadges = { events: 0, votes: 0, tasks: 0, news: 0, more: false };
    return NextResponse.json(empty, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  const items = await getCurrentBadgeItemKeys(req, user);
  const [events, votes, tasks, news] = await Promise.all([
    unseenCount(user.id, "events", items.events),
    unseenCount(user.id, "votes", items.votes),
    unseenCount(user.id, "tasks", items.tasks),
    unseenCount(user.id, "news", items.news),
  ]);

  const badges: AppBadges = {
    events,
    votes,
    tasks,
    news,
    more: news > 0,
  };

  return NextResponse.json(badges, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
