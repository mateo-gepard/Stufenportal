import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { batch } from "@/lib/db";
import { badgeSections, getCurrentBadgeItemKeys, type BadgeSection } from "@/lib/badges";
import { nowIso, readJson } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isBadgeSection(value: unknown): value is BadgeSection {
  return typeof value === "string" && (badgeSections as readonly string[]).includes(value);
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Bitte anmelden." }, { status: 401 });

  const body = await readJson(req);
  if (!isBadgeSection(body.section)) {
    return NextResponse.json({ error: "Unbekannter Bereich." }, { status: 400 });
  }

  const section = body.section;
  const items = await getCurrentBadgeItemKeys(req, user);
  const keys = items[section];
  if (keys.length === 0) return NextResponse.json({ ok: true, seen: 0 });

  const now = nowIso();
  await batch(
    keys.map((key) => ({
      sql: `INSERT OR IGNORE INTO user_seen_items (user_id, section, item_key, seen_at)
            VALUES (?,?,?,?)`,
      args: [user.id, section, key, now],
    }))
  );

  return NextResponse.json({ ok: true, seen: keys.length });
}
