import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { newId, nowIso, readJson } from "@/lib/util";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await readJson(req);
  const sub = body.subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: "Ungültiges Abo." }, { status: 400 });
  }
  const db = getDb();
  db.prepare(
    `INSERT INTO push_subscriptions (id,endpoint,p256dh,auth,created_at)
     VALUES (?,?,?,?,?)
     ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`
  ).run(newId(), sub.endpoint, sub.keys.p256dh, sub.keys.auth, nowIso());
  return NextResponse.json({ ok: true });
}
