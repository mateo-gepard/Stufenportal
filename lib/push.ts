import webpush from "web-push";
import { getDb } from "./db";

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:stufe@example.org";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

/** Sendet eine Push an alle abonnierten Geräte. Tote Subscriptions werden entfernt. */
export async function broadcast(payload: { title: string; body: string; url?: string }) {
  if (!configure()) return { sent: 0, skipped: "no-vapid" as const };
  const db = getDb();
  const subs = await db
    .prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions")
    .all<{ id: string; endpoint: string; p256dh: string; auth: string }>();
  const body = JSON.stringify(payload);
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body
        );
        sent++;
      } catch (err: unknown) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await db.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(s.id);
        }
      }
    })
  );
  return { sent };
}
