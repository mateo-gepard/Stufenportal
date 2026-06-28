import { NextResponse } from "next/server";
import { createSession, verifyPassword, DUMMY_PASSWORD_HASH } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { nowIso, readJson, trimmed } from "@/lib/util";
import { accountRosterEntries, normalizeRosterName } from "@/lib/stufenliste";
import { throttleRetryAfter, registerFailure, clearThrottle } from "@/lib/throttle";

export const runtime = "nodejs";

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function lockedResponse(retryAfter: number): NextResponse {
  const res = NextResponse.json(
    { error: "Zu viele Versuche. Bitte spaeter erneut probieren." },
    { status: 429 }
  );
  res.headers.set("Retry-After", String(retryAfter));
  return res;
}

function rosterKeyForLoginName(raw: string): string | null | "ambiguous" {
  const normalized = normalizeRosterName(raw);
  if (!normalized) return null;
  const matches = new Set<string>();
  for (const entry of accountRosterEntries()) {
    const aliases = [
      entry.roster_key,
      normalizeRosterName(entry.display_name),
      normalizeRosterName(entry.sort_name),
      ...entry.aliases,
    ];
    if (aliases.includes(normalized)) matches.add(entry.roster_key);
  }
  if (matches.size === 1) return Array.from(matches)[0];
  if (matches.size > 1) return "ambiguous";
  return normalized;
}

export async function POST(req: Request) {
  const ipKey = `ip:${clientIp(req)}`;
  const ipLock = await throttleRetryAfter(ipKey);
  if (ipLock) return lockedResponse(ipLock);

  const body = await readJson(req);
  const rawName = trimmed(body.name || body.roster_key);
  const rosterKey = rosterKeyForLoginName(rawName);
  const password = trimmed(body.password);
  if (!rosterKey || password.length < 4 || password.length > 32) {
    await registerFailure(ipKey);
    return NextResponse.json({ error: "Name oder Passwort fehlt." }, { status: 400 });
  }
  if (rosterKey === "ambiguous") {
    return NextResponse.json({ error: "Name ist nicht eindeutig. Bitte Vor- und Nachname eingeben." }, { status: 400 });
  }

  const accountKey = `acct:${rosterKey}`;
  const acctLock = await throttleRetryAfter(accountKey);
  if (acctLock) return lockedResponse(acctLock);

  const user = await getDb()
    .prepare(
      `SELECT id, roster_key, display_name, sort_name, password_hash, role, show_on_leaderboard
       FROM users WHERE roster_key = ?`
    )
    .get<any>(rosterKey);
  // Bei unbekanntem Account trotzdem hashen (konstante Antwortzeit, keine Enumeration).
  const ok = user
    ? verifyPassword(password, String(user.password_hash))
    : (verifyPassword(password, DUMMY_PASSWORD_HASH), false);
  if (!ok) {
    await registerFailure(ipKey);
    await registerFailure(accountKey);
    return NextResponse.json({ error: "Name oder Passwort ist falsch." }, { status: 401 });
  }

  await clearThrottle(ipKey);
  await clearThrottle(accountKey);
  await getDb().prepare("UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?").run(nowIso(), nowIso(), user.id);
  const res = NextResponse.json({
    user: {
      id: user.id,
      roster_key: user.roster_key,
      display_name: user.display_name,
      sort_name: user.sort_name,
      role: user.role,
      show_on_leaderboard: !!user.show_on_leaderboard,
    },
    speaker: user.role === "sprecher",
  });
  await createSession(String(user.id), res);
  return res;
}
